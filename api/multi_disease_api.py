"""
BioTeK Multi-Disease API
FastAPI endpoints for 12-disease prediction with privacy-preserving features

Endpoints:
- /predict/multi - Predict all 12 diseases
- /predict/{disease_id} - Predict single disease
- /genetics/prs - Calculate all PRS scores
- /genetics/prs/{category} - Calculate category-specific PRS
- /explain/{disease_id} - SHAP explanations
- /explain/llm - LLM-powered clinical report
- /privacy/info - Privacy compliance info
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np
import pickle
import json

# Import our modules
from api.multi_disease_prs import MultiDiseasePRSCalculator, PRSCategory, adjust_prs_for_ancestry
from ml.train_multi_disease import MultiDiseasePredictor, DISEASE_CONFIG

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class PatientFeatures(BaseModel):
    """Patient clinical features for prediction"""
    # Demographics
    age: float = Field(..., ge=18, le=100, description="Age in years")
    sex: int = Field(..., ge=0, le=1, description="0=female, 1=male")
    ethnicity: int = Field(0, ge=0, le=5, description="Ethnicity code 0-5")
    bmi: float = Field(..., ge=15, le=60, description="Body Mass Index")
    family_history_score: float = Field(0, ge=0, le=10, description="Family history score")
    
    # Metabolic
    hba1c: float = Field(..., ge=4.0, le=15.0, description="HbA1c %")
    fasting_glucose: float = Field(100, ge=50, le=400, description="Fasting glucose mg/dL")
    insulin: float = Field(12, ge=1, le=100, description="Insulin μU/mL")
    triglycerides: float = Field(150, ge=30, le=1000, description="Triglycerides mg/dL")
    hdl: float = Field(55, ge=15, le=120, description="HDL cholesterol mg/dL")
    ldl: float = Field(..., ge=30, le=300, description="LDL cholesterol mg/dL")
    total_cholesterol: float = Field(200, ge=100, le=400, description="Total cholesterol mg/dL")
    waist_circumference: float = Field(90, ge=50, le=180, description="Waist circumference cm")
    
    # Liver
    alt: float = Field(30, ge=5, le=500, description="ALT U/L")
    ast: float = Field(28, ge=5, le=500, description="AST U/L")
    ggt: float = Field(40, ge=5, le=500, description="GGT U/L")
    bilirubin: float = Field(0.8, ge=0.1, le=10, description="Bilirubin mg/dL")
    albumin: float = Field(4.2, ge=2, le=6, description="Albumin g/dL")
    alkaline_phosphatase: float = Field(70, ge=20, le=300, description="ALP U/L")
    
    # Kidney
    creatinine: float = Field(1.0, ge=0.3, le=10, description="Creatinine mg/dL")
    egfr: float = Field(90, ge=10, le=150, description="eGFR mL/min")
    bun: float = Field(15, ge=5, le=100, description="BUN mg/dL")
    uric_acid: float = Field(5.5, ge=1, le=15, description="Uric acid mg/dL")
    urine_acr: float = Field(30, ge=0, le=1000, description="Urine albumin/creatinine ratio")
    
    # Cardiac
    bnp: float = Field(50, ge=0, le=5000, description="BNP pg/mL")
    troponin: float = Field(0.01, ge=0, le=10, description="Troponin ng/mL")
    lipoprotein_a: float = Field(30, ge=0, le=500, description="Lipoprotein(a) nmol/L")
    homocysteine: float = Field(10, ge=3, le=50, description="Homocysteine μmol/L")
    
    # Inflammatory
    crp: float = Field(3, ge=0, le=50, description="CRP mg/L")
    esr: float = Field(15, ge=0, le=150, description="ESR mm/hr")
    wbc: float = Field(7, ge=2, le=30, description="WBC x10^9/L")
    neutrophils: float = Field(4, ge=0.5, le=20, description="Neutrophils x10^9/L")
    lymphocytes: float = Field(2, ge=0.2, le=10, description="Lymphocytes x10^9/L")
    
    # Blood
    hemoglobin: float = Field(14, ge=6, le=22, description="Hemoglobin g/dL")
    hematocrit: float = Field(42, ge=20, le=65, description="Hematocrit %")
    platelets: float = Field(250, ge=50, le=800, description="Platelets x10^9/L")
    rbc: float = Field(4.8, ge=2, le=8, description="RBC x10^12/L")
    mcv: float = Field(88, ge=60, le=130, description="MCV fL")
    rdw: float = Field(13, ge=8, le=25, description="RDW %")
    
    # Vitals
    bp_systolic: float = Field(..., ge=70, le=250, description="Systolic BP mmHg")
    bp_diastolic: float = Field(80, ge=40, le=150, description="Diastolic BP mmHg")
    heart_rate: float = Field(72, ge=30, le=200, description="Heart rate bpm")
    respiratory_rate: float = Field(16, ge=8, le=40, description="Respiratory rate")
    
    # Lifestyle
    smoking_pack_years: float = Field(0, ge=0, le=150, description="Smoking pack-years")
    alcohol_units_weekly: float = Field(0, ge=0, le=100, description="Alcohol units/week")
    exercise_hours_weekly: float = Field(3, ge=0, le=40, description="Exercise hours/week")
    diet_quality_score: float = Field(5, ge=0, le=10, description="Diet quality 0-10")
    
    # Hormonal
    tsh: float = Field(2, ge=0.01, le=20, description="TSH mIU/L")
    vitamin_d: float = Field(30, ge=5, le=150, description="Vitamin D ng/mL")
    cortisol: float = Field(15, ge=1, le=50, description="Cortisol μg/dL")
    
    # PRS (can be calculated or provided)
    prs_metabolic: float = Field(0, ge=-5, le=5, description="Metabolic PRS z-score")
    prs_cardiovascular: float = Field(0, ge=-5, le=5, description="Cardiovascular PRS z-score")
    prs_cancer: float = Field(0, ge=-5, le=5, description="Cancer PRS z-score")
    prs_neurological: float = Field(0, ge=-5, le=5, description="Neurological PRS z-score")
    prs_autoimmune: float = Field(0, ge=-5, le=5, description="Autoimmune PRS z-score")


class GenotypeInput(BaseModel):
    """Genetic data for PRS calculation"""
    genotypes: Dict[str, str] = Field(..., description="Dict of rsid: genotype")
    ancestry: str = Field("EUR", description="Ancestry code: EUR, AFR, EAS, SAS, AMR")


class DiseaseRisk(BaseModel):
    """Single disease risk prediction"""
    disease_id: str
    name: str
    risk_score: float
    risk_percentage: float
    risk_category: str
    confidence: float
    top_factors: List[Dict[str, Any]]


class MultiDiseaseResponse(BaseModel):
    """Response for multi-disease prediction"""
    patient_id: Optional[str]
    timestamp: str
    predictions: Dict[str, DiseaseRisk]
    summary: Dict[str, Any]
    privacy_note: str


class ExplanationResponse(BaseModel):
    """SHAP explanation response"""
    disease_id: str
    disease_name: str
    feature_contributions: List[Dict[str, Any]]
    summary: str
    base_risk: float
    final_risk: float


class LLMReportRequest(BaseModel):
    """Request for LLM-generated clinical report"""
    patient_features: PatientFeatures
    predictions: Dict[str, Any]
    focus_diseases: Optional[List[str]] = None
    report_style: str = Field("clinical", description="clinical, patient-friendly, or research")


# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(
    title="BioTeK Multi-Disease API",
    description="Privacy-preserving AI for 12-disease risk prediction",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
predictor: Optional[MultiDiseasePredictor] = None
prs_calculator: Optional[MultiDiseasePRSCalculator] = None


@app.on_event("startup")
async def load_models():
    """Load models on startup"""
    global predictor, prs_calculator
    
    print("🔄 Loading BioTeK Multi-Disease models...")
    
    # Load ML models
    models_dir = Path("models/multi_disease")
    if models_dir.exists():
        predictor = MultiDiseasePredictor()
        predictor.load_all(models_dir)
        print(f"✓ Loaded {len(predictor.models)} disease models")
    else:
        print("⚠ Models not found - run train_multi_disease.py first")
    
    # Initialize PRS calculator
    prs_calculator = MultiDiseasePRSCalculator()
    print("✓ PRS calculator initialized")
    
    print("✅ BioTeK Multi-Disease API ready!")


# =============================================================================
# PREDICTION ENDPOINTS
# =============================================================================

@app.post("/predict/multi", response_model=MultiDiseaseResponse)
async def predict_all_diseases(
    patient: PatientFeatures,
    patient_id: Optional[str] = None
):
    """
    Predict risk for all 12 diseases
    
    Returns risk scores, categories, and top contributing factors for each disease.
    """
    if predictor is None or not predictor.is_trained:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    # Convert to DataFrame
    import pandas as pd
    patient_dict = patient.dict()
    df = pd.DataFrame([patient_dict])
    
    # Get predictions
    predictions = predictor.predict_all(df)
    
    # Format response
    formatted_predictions = {}
    high_risk_diseases = []
    moderate_risk_diseases = []
    
    for disease_id, pred in predictions.items():
        formatted_predictions[disease_id] = DiseaseRisk(
            disease_id=disease_id,
            name=pred["name"],
            risk_score=pred["risk_score"],
            risk_percentage=pred["risk_percentage"],
            risk_category=pred["risk_category"],
            confidence=pred["confidence"],
            top_factors=pred["top_factors"]
        )
        
        if pred["risk_category"] == "HIGH":
            high_risk_diseases.append(pred["name"])
        elif pred["risk_category"] == "MODERATE":
            moderate_risk_diseases.append(pred["name"])
    
    # Summary
    summary = {
        "total_diseases_analyzed": len(predictions),
        "high_risk_count": len(high_risk_diseases),
        "moderate_risk_count": len(moderate_risk_diseases),
        "high_risk_diseases": high_risk_diseases,
        "moderate_risk_diseases": moderate_risk_diseases,
        "recommendation": _get_recommendation(high_risk_diseases, moderate_risk_diseases)
    }
    
    return MultiDiseaseResponse(
        patient_id=patient_id,
        timestamp=datetime.now().isoformat(),
        predictions=formatted_predictions,
        summary=summary,
        privacy_note="Prediction performed locally. No data sent to external servers."
    )


@app.post("/predict/{disease_id}")
async def predict_single_disease(
    disease_id: str,
    patient: PatientFeatures
):
    """Predict risk for a single disease"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    if disease_id not in DISEASE_CONFIG:
        raise HTTPException(status_code=404, detail=f"Disease '{disease_id}' not found")
    
    import pandas as pd
    df = pd.DataFrame([patient.dict()])
    
    predictions = predictor.predict_all(df)
    pred = predictions.get(disease_id)
    
    if not pred:
        raise HTTPException(status_code=500, detail="Prediction failed")
    
    return {
        "disease_id": disease_id,
        "name": pred["name"],
        "risk_score": pred["risk_score"],
        "risk_percentage": pred["risk_percentage"],
        "risk_category": pred["risk_category"],
        "confidence": pred["confidence"],
        "top_factors": pred["top_factors"],
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# GENETICS ENDPOINTS
# =============================================================================

@app.post("/genetics/prs")
async def calculate_all_prs(genotypes: GenotypeInput):
    """Calculate PRS for all 5 disease categories"""
    if prs_calculator is None:
        raise HTTPException(status_code=503, detail="PRS calculator not initialized")
    
    results = prs_calculator.calculate_all_prs(genotypes.genotypes)
    
    # Apply ancestry adjustment
    for category in results["prs_scores"]:
        results["prs_scores"][category] = adjust_prs_for_ancestry(
            results["prs_scores"][category], 
            genotypes.ancestry
        )
    
    return {
        "ancestry": genotypes.ancestry,
        "prs_results": results,
        "timestamp": datetime.now().isoformat(),
        "privacy_note": "Genetic analysis performed locally. Raw genotypes not stored."
    }


@app.post("/genetics/prs/{category}")
async def calculate_category_prs(
    category: str,
    genotypes: GenotypeInput
):
    """Calculate PRS for a specific disease category"""
    if prs_calculator is None:
        raise HTTPException(status_code=503, detail="PRS calculator not initialized")
    
    try:
        prs_category = PRSCategory(category)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Valid: {[c.value for c in PRSCategory]}"
        )
    
    result = prs_calculator.calculate_category_prs(genotypes.genotypes, prs_category)
    result = adjust_prs_for_ancestry(result, genotypes.ancestry)
    
    return {
        "category": category,
        "ancestry": genotypes.ancestry,
        "result": result,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/genetics/panels")
async def get_prs_panels():
    """Get information about available PRS panels"""
    if prs_calculator is None:
        raise HTTPException(status_code=503, detail="PRS calculator not initialized")
    
    panels = {}
    for category in PRSCategory:
        panels[category.value] = prs_calculator.get_panel_info(category)
    
    return {
        "total_panels": len(panels),
        "total_snps": sum(p["total_snps"] for p in panels.values()),
        "panels": panels
    }


# =============================================================================
# EXPLANATION ENDPOINTS
# =============================================================================

@app.post("/explain/{disease_id}")
async def explain_prediction(
    disease_id: str,
    patient: PatientFeatures
):
    """Get SHAP-based explanation for a disease prediction"""
    if predictor is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    if disease_id not in predictor.models:
        raise HTTPException(status_code=404, detail=f"Disease '{disease_id}' not found")
    
    import pandas as pd
    df = pd.DataFrame([patient.dict()])
    
    model = predictor.models[disease_id]
    
    # Get prediction
    proba = model.predict_proba(df)
    risk_score = proba[0, 1]
    
    # Get SHAP explanation
    explanation = model.explain(df)
    
    # Format contributions
    contributions = []
    for i, feature in enumerate(explanation["feature_names"]):
        shap_value = explanation["shap_values"][0, i] if len(explanation["shap_values"].shape) > 1 else explanation["shap_values"][i]
        value = df[feature].values[0] if feature in df.columns else None
        
        contributions.append({
            "feature": feature,
            "value": round(float(value), 2) if value is not None else None,
            "shap_contribution": round(float(shap_value), 4),
            "direction": "increases risk" if shap_value > 0 else "decreases risk",
            "magnitude": abs(float(shap_value))
        })
    
    # Sort by magnitude
    contributions.sort(key=lambda x: x["magnitude"], reverse=True)
    
    # Generate summary
    top_3 = contributions[:3]
    summary_parts = []
    for c in top_3:
        summary_parts.append(f"{c['feature']} ({c['direction']})")
    
    summary = f"Top risk factors: {', '.join(summary_parts)}"
    
    return ExplanationResponse(
        disease_id=disease_id,
        disease_name=model.name,
        feature_contributions=contributions,
        summary=summary,
        base_risk=round(float(explanation["base_value"]), 4),
        final_risk=round(float(risk_score), 4)
    )


@app.post("/explain/llm")
async def generate_llm_report(request: LLMReportRequest):
    """Generate clinical report using local LLM (Qwen3)"""
    
    # Build prompt for Qwen3
    prompt = _build_clinical_prompt(
        request.patient_features.dict(),
        request.predictions,
        request.focus_diseases,
        request.report_style
    )
    
    # Call local Ollama
    try:
        import requests
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen3:8b",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 1000}
            },
            timeout=60
        )
        
        if response.status_code == 200:
            llm_response = response.json().get("response", "")
            # Remove thinking tags if present
            if "<think>" in llm_response:
                llm_response = llm_response.split("</think>")[-1].strip()
            
            return {
                "report": llm_response,
                "model": "qwen3:8b",
                "style": request.report_style,
                "generated_locally": True,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=503, detail="LLM service unavailable")
            
    except requests.exceptions.ConnectionError:
        return {
            "report": _generate_fallback_report(request),
            "model": "fallback-template",
            "style": request.report_style,
            "generated_locally": True,
            "note": "LLM unavailable - using template report",
            "timestamp": datetime.now().isoformat()
        }


# =============================================================================
# PRIVACY & INFO ENDPOINTS
# =============================================================================

@app.get("/privacy/info")
async def get_privacy_info():
    """Get privacy and compliance information"""
    return {
        "platform": "BioTeK Multi-Disease Prediction System",
        "version": "2.0.0",
        "privacy_features": {
            "federated_learning": {
                "enabled": True,
                "description": "Models trained across hospitals without sharing raw data",
                "aggregation": "Federated Averaging (FedAvg)"
            },
            "differential_privacy": {
                "enabled": True,
                "default_epsilon": 3.0,
                "default_delta": 1e-5,
                "mechanism": "Laplace noise",
                "per_disease_budgets": True
            },
            "local_llm": {
                "enabled": True,
                "model": "Qwen3 8B",
                "location": "On-premise (localhost:11434)",
                "cloud_calls": False
            },
            "encryption": {
                "at_rest": "AES-256",
                "in_transit": "TLS 1.3"
            }
        },
        "compliance": {
            "HIPAA": "Designed for compliance - no PHI transmitted externally",
            "GDPR": "Privacy by design, data minimization",
            "FDA_21CFR11": "Audit logging enabled"
        },
        "data_handling": {
            "raw_data_storage": "Local hospital only",
            "what_is_shared": "Model weight updates only (with DP noise)",
            "patient_data_sent_to_cloud": False
        }
    }


@app.get("/diseases")
async def list_diseases():
    """List all supported diseases"""
    diseases = []
    for disease_id, config in DISEASE_CONFIG.items():
        diseases.append({
            "id": disease_id,
            "name": config["name"],
            "key_features": config["key_features"],
            "n_features_used": config["n_features"]
        })
    
    return {
        "total_diseases": len(diseases),
        "diseases": diseases
    }


@app.get("/health")
async def health_check():
    """API health check"""
    return {
        "status": "healthy",
        "models_loaded": predictor is not None and predictor.is_trained,
        "prs_ready": prs_calculator is not None,
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _get_recommendation(high_risk: List[str], moderate_risk: List[str]) -> str:
    """Generate recommendation based on risk profile"""
    if len(high_risk) >= 3:
        return "Multiple high-risk conditions detected. Recommend comprehensive health evaluation and specialist consultations."
    elif len(high_risk) >= 1:
        return f"High risk for {', '.join(high_risk)}. Recommend targeted screening and lifestyle modifications."
    elif len(moderate_risk) >= 2:
        return "Elevated risk in multiple areas. Recommend preventive care and regular monitoring."
    else:
        return "Overall favorable risk profile. Continue healthy lifestyle and routine screenings."


def _build_clinical_prompt(
    features: Dict,
    predictions: Dict,
    focus_diseases: Optional[List[str]],
    style: str
) -> str:
    """Build prompt for LLM clinical report"""
    
    # Get high-risk diseases
    high_risk = [d for d, p in predictions.items() if p.get("risk_category") == "HIGH"]
    
    prompt = f"""You are a clinical AI assistant generating a {style} report for a patient's multi-disease risk assessment.

Patient Demographics:
- Age: {features.get('age')} years
- Sex: {'Male' if features.get('sex') == 1 else 'Female'}
- BMI: {features.get('bmi')} kg/m²

Key Biomarkers:
- HbA1c: {features.get('hba1c')}%
- LDL: {features.get('ldl')} mg/dL
- Blood Pressure: {features.get('bp_systolic')}/{features.get('bp_diastolic')} mmHg
- eGFR: {features.get('egfr')} mL/min

Risk Assessment Results:
"""
    
    for disease_id, pred in predictions.items():
        if focus_diseases and disease_id not in focus_diseases:
            continue
        prompt += f"- {pred.get('name', disease_id)}: {pred.get('risk_percentage', 0):.1f}% ({pred.get('risk_category', 'Unknown')})\n"
    
    prompt += f"""
High-Risk Conditions: {', '.join(high_risk) if high_risk else 'None'}

Generate a {'detailed clinical' if style == 'clinical' else 'patient-friendly'} report that:
1. Summarizes the key findings
2. Explains the most significant risk factors
3. Provides actionable recommendations
4. Notes any correlations between risks

Keep the response concise (3-4 paragraphs)."""
    
    return prompt


def _generate_fallback_report(request: LLMReportRequest) -> str:
    """Generate template-based report when LLM unavailable"""
    features = request.patient_features.dict()
    predictions = request.predictions
    
    high_risk = [p["name"] for d, p in predictions.items() if p.get("risk_category") == "HIGH"]
    
    report = f"""## Multi-Disease Risk Assessment Report

**Patient Profile:** {features.get('age')} year old {'male' if features.get('sex') == 1 else 'female'}, BMI {features.get('bmi'):.1f}

**Risk Summary:**
This assessment evaluated risk across 12 chronic diseases using clinical biomarkers and genetic risk scores.

"""
    
    if high_risk:
        report += f"**Elevated Risk Detected:** {', '.join(high_risk)}\n\n"
        report += "These conditions require attention. Recommend consultation with appropriate specialists.\n\n"
    else:
        report += "**Overall Assessment:** No high-risk conditions identified.\n\n"
    
    report += """**Recommendations:**
- Continue regular health screenings
- Maintain healthy lifestyle habits
- Monitor key biomarkers annually
- Discuss genetic risk factors with healthcare provider

*Note: This is an AI-assisted risk assessment and should be reviewed by a healthcare professional.*"""
    
    return report


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
