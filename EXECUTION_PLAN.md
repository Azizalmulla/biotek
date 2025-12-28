# BioTeK Multi-Disease Platform: Complete Execution Plan
## Competing with Owkin, Tempus, 23andMe — While Being Fully Private

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BioTeK Platform                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  FRONTEND (Next.js 14 + React + TailwindCSS + Framer Motion)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Multi-Disease│ │  Genetic    │ │   Risk      │ │  Clinical   │           │
│  │  Dashboard   │ │  Insights   │ │  Timeline   │ │   Reports   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│  API LAYER (FastAPI + Python)                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ /predict    │ │ /explain    │ │ /federated  │ │ /genetics   │           │
│  │ multi-disease│ │ SHAP + LLM  │ │  training   │ │  PRS calc   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ML LAYER (Scikit-learn + SHAP)                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  12 Disease-Specific Models (Lasso + RandomForest Ensemble)  │          │
│  │  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐│          │
│  │  │Diabetes││  CVD   ││ Stroke ││  CKD   ││ Cancer ││Alzheimer││          │
│  │  └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘│          │
│  └──────────────────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRIVACY LAYER                                                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ Federated       │ │ Differential    │ │ Local LLM       │               │
│  │ Learning (FL)   │ │ Privacy (ε=3.0) │ │ (Qwen3 8B)      │               │
│  │ FedAvg + Secure │ │ Laplace noise   │ │ No cloud calls  │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
├─────────────────────────────────────────────────────────────────────────────┤
│  GENETIC LAYER                                                               │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  5 Disease-Category PRS Panels (Real GWAS SNPs)             │           │
│  │  Metabolic | Cardiovascular | Cancer | Neurological | Autoimmune       │
│  └─────────────────────────────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  55 Clinical Features (UK Biobank validated)                │           │
│  │  Demographics | Biomarkers | Lifestyle | Vitals | PRS       │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Data Layer (55 Features)

### Feature Schema

```python
FEATURE_SCHEMA = {
    # DEMOGRAPHICS (5)
    "demographics": [
        "age",              # 18-100 years
        "sex",              # 0=female, 1=male
        "ethnicity",        # 0-5 categorical
        "bmi",              # 15-50 kg/m²
        "family_history_score"  # 0-10 composite
    ],
    
    # METABOLIC PANEL (8)
    "metabolic": [
        "hba1c",            # 4.0-14.0 %
        "fasting_glucose",  # 50-300 mg/dL
        "insulin",          # 2-50 μU/mL
        "triglycerides",    # 30-500 mg/dL
        "hdl",              # 20-100 mg/dL
        "ldl",              # 40-250 mg/dL
        "total_cholesterol",# 100-350 mg/dL
        "waist_circumference" # 50-150 cm
    ],
    
    # LIVER PANEL (6)
    "liver": [
        "alt",              # 5-200 U/L
        "ast",              # 5-200 U/L
        "ggt",              # 5-300 U/L
        "bilirubin",        # 0.1-3.0 mg/dL
        "albumin",          # 2.5-5.5 g/dL
        "alkaline_phosphatase"  # 30-150 U/L
    ],
    
    # KIDNEY PANEL (5)
    "kidney": [
        "creatinine",       # 0.5-5.0 mg/dL
        "egfr",             # 15-120 mL/min
        "bun",              # 5-50 mg/dL
        "uric_acid",        # 2-12 mg/dL
        "urine_albumin_creatinine_ratio"  # 0-500 mg/g
    ],
    
    # CARDIAC MARKERS (4)
    "cardiac": [
        "bnp",              # 0-1000 pg/mL
        "troponin",         # 0-0.5 ng/mL
        "lipoprotein_a",    # 0-200 nmol/L
        "homocysteine"      # 5-30 μmol/L
    ],
    
    # INFLAMMATORY (5)
    "inflammatory": [
        "crp",              # 0-20 mg/L
        "esr",              # 0-100 mm/hr
        "wbc",              # 3-15 x10^9/L
        "neutrophils",      # 1-10 x10^9/L
        "lymphocytes"       # 0.5-5 x10^9/L
    ],
    
    # BLOOD PANEL (6)
    "blood": [
        "hemoglobin",       # 8-18 g/dL
        "hematocrit",       # 25-55 %
        "platelets",        # 100-500 x10^9/L
        "rbc",              # 3-7 x10^12/L
        "mcv",              # 70-110 fL
        "rdw"               # 10-20 %
    ],
    
    # VITAL SIGNS (4)
    "vitals": [
        "bp_systolic",      # 80-200 mmHg
        "bp_diastolic",     # 40-130 mmHg
        "heart_rate",       # 40-150 bpm
        "respiratory_rate"  # 10-30 breaths/min
    ],
    
    # LIFESTYLE (4)
    "lifestyle": [
        "smoking_pack_years",   # 0-100
        "alcohol_units_weekly", # 0-50
        "exercise_hours_weekly",# 0-20
        "diet_quality_score"    # 0-10
    ],
    
    # HORMONAL (3)
    "hormonal": [
        "tsh",              # 0.1-10 mIU/L
        "vitamin_d",        # 5-100 ng/mL
        "hba1c_variability" # 0-2 %
    ],
    
    # POLYGENIC RISK SCORES (5)
    "prs": [
        "prs_metabolic",
        "prs_cardiovascular",
        "prs_cancer",
        "prs_neurological",
        "prs_autoimmune"
    ]
}

TOTAL_FEATURES = 55
```

### Disease Targets (12)

```python
DISEASES = {
    # TIER 1: High Accuracy (AUC > 0.80)
    "type2_diabetes": {
        "name": "Type 2 Diabetes",
        "key_features": ["hba1c", "fasting_glucose", "bmi", "prs_metabolic"],
        "expected_auc": 0.82
    },
    "coronary_heart_disease": {
        "name": "Coronary Heart Disease",
        "key_features": ["ldl", "hdl", "bp_systolic", "smoking_pack_years", "prs_cardiovascular"],
        "expected_auc": 0.78
    },
    "hypertension": {
        "name": "Hypertension",
        "key_features": ["bp_systolic", "bp_diastolic", "bmi", "sodium", "prs_cardiovascular"],
        "expected_auc": 0.77
    },
    "chronic_kidney_disease": {
        "name": "Chronic Kidney Disease",
        "key_features": ["egfr", "creatinine", "urine_albumin_creatinine_ratio", "hba1c"],
        "expected_auc": 0.84
    },
    "nafld": {
        "name": "Non-Alcoholic Fatty Liver Disease",
        "key_features": ["alt", "ast", "bmi", "triglycerides", "waist_circumference"],
        "expected_auc": 0.79
    },
    
    # TIER 2: Moderate Accuracy (AUC 0.70-0.80)
    "stroke": {
        "name": "Stroke",
        "key_features": ["bp_systolic", "age", "smoking_pack_years", "ldl", "prs_cardiovascular"],
        "expected_auc": 0.73
    },
    "heart_failure": {
        "name": "Heart Failure",
        "key_features": ["bnp", "age", "bp_systolic", "bmi", "egfr"],
        "expected_auc": 0.75
    },
    "copd": {
        "name": "Chronic Obstructive Pulmonary Disease",
        "key_features": ["smoking_pack_years", "age", "bmi"],
        "expected_auc": 0.74
    },
    "atrial_fibrillation": {
        "name": "Atrial Fibrillation",
        "key_features": ["age", "bmi", "bp_systolic", "tsh", "prs_cardiovascular"],
        "expected_auc": 0.71
    },
    
    # TIER 3: Genetic-Heavy (PRS Critical)
    "breast_cancer": {
        "name": "Breast Cancer",
        "key_features": ["age", "family_history_score", "bmi", "prs_cancer"],
        "expected_auc": 0.68
    },
    "alzheimers_disease": {
        "name": "Alzheimer's Disease",
        "key_features": ["age", "prs_neurological", "family_history_score"],
        "expected_auc": 0.70
    },
    "colorectal_cancer": {
        "name": "Colorectal Cancer",
        "key_features": ["age", "family_history_score", "bmi", "prs_cancer"],
        "expected_auc": 0.65
    }
}
```

---

## PHASE 2: Genetic Layer (5 PRS Panels)

### Real GWAS SNPs by Disease Category

```python
PRS_PANELS = {
    "metabolic": {
        "diseases": ["Type 2 Diabetes", "Obesity", "Metabolic Syndrome"],
        "snps": [
            {"rsid": "rs7903146", "gene": "TCF7L2", "weight": 0.39},
            {"rsid": "rs10811661", "gene": "CDKN2A/B", "weight": 0.20},
            {"rsid": "rs8050136", "gene": "FTO", "weight": 0.15},
            {"rsid": "rs1801282", "gene": "PPARG", "weight": 0.14},
            {"rsid": "rs5219", "gene": "KCNJ11", "weight": 0.13},
            {"rsid": "rs13266634", "gene": "SLC30A8", "weight": 0.12},
            {"rsid": "rs4402960", "gene": "IGF2BP2", "weight": 0.11},
            {"rsid": "rs1111875", "gene": "HHEX", "weight": 0.10},
            {"rsid": "rs10923931", "gene": "NOTCH2", "weight": 0.09},
            {"rsid": "rs7754840", "gene": "CDKAL1", "weight": 0.08}
        ]
    },
    "cardiovascular": {
        "diseases": ["CAD", "Stroke", "Hypertension", "AF"],
        "snps": [
            {"rsid": "rs10757274", "gene": "9p21", "weight": 0.25},
            {"rsid": "rs4977574", "gene": "CDKN2A", "weight": 0.29},
            {"rsid": "rs1333049", "gene": "9p21.3", "weight": 0.20},
            {"rsid": "rs6725887", "gene": "WDR12", "weight": 0.15},
            {"rsid": "rs12190287", "gene": "TCF21", "weight": 0.12},
            {"rsid": "rs9982601", "gene": "KCNE2", "weight": 0.11},
            {"rsid": "rs1746048", "gene": "CXCL12", "weight": 0.10},
            {"rsid": "rs2891168", "gene": "9p21", "weight": 0.09}
        ]
    },
    "cancer": {
        "diseases": ["Breast Cancer", "Colorectal Cancer", "Prostate Cancer"],
        "snps": [
            {"rsid": "rs1799966", "gene": "BRCA1", "weight": 0.85},
            {"rsid": "rs80357906", "gene": "BRCA2", "weight": 0.80},
            {"rsid": "rs121913529", "gene": "APC", "weight": 0.70},
            {"rsid": "rs1800562", "gene": "HFE", "weight": 0.15},
            {"rsid": "rs6983267", "gene": "8q24", "weight": 0.12},
            {"rsid": "rs10936599", "gene": "TERT", "weight": 0.11}
        ]
    },
    "neurological": {
        "diseases": ["Alzheimer's", "Parkinson's"],
        "snps": [
            {"rsid": "rs429358", "gene": "APOE", "weight": 0.95},  # ε4 allele
            {"rsid": "rs7412", "gene": "APOE", "weight": 0.40},
            {"rsid": "rs34637584", "gene": "LRRK2", "weight": 0.35},
            {"rsid": "rs76763715", "gene": "GBA", "weight": 0.30},
            {"rsid": "rs356219", "gene": "SNCA", "weight": 0.15}
        ]
    },
    "autoimmune": {
        "diseases": ["Rheumatoid Arthritis", "Type 1 Diabetes", "Lupus"],
        "snps": [
            {"rsid": "rs2476601", "gene": "PTPN22", "weight": 0.50},
            {"rsid": "rs3087243", "gene": "CTLA4", "weight": 0.20},
            {"rsid": "rs2104286", "gene": "IL2RA", "weight": 0.18},
            {"rsid": "rs6897932", "gene": "IL7R", "weight": 0.15},
            {"rsid": "rs12722489", "gene": "IL2RA", "weight": 0.12}
        ]
    }
}
```

---

## PHASE 3: ML Layer (12 Disease Models)

### Model Architecture

```python
class DiseasePredictor:
    """Ensemble model for each disease"""
    
    def __init__(self, disease_name):
        self.disease = disease_name
        self.models = {
            "lasso": LogisticRegression(penalty="l1", solver="saga", C=0.1),
            "random_forest": RandomForestClassifier(n_estimators=100, max_depth=10),
            "xgboost": XGBClassifier(n_estimators=100, max_depth=5)
        }
        self.weights = {"lasso": 0.4, "random_forest": 0.4, "xgboost": 0.2}
        self.shap_explainer = None
        self.feature_selector = None
    
    def fit(self, X, y):
        # Feature selection based on disease-specific importance
        self.feature_selector = SelectKBest(f_classif, k=20)
        X_selected = self.feature_selector.fit_transform(X, y)
        
        for name, model in self.models.items():
            model.fit(X_selected, y)
        
        # Initialize SHAP for primary model
        self.shap_explainer = shap.TreeExplainer(self.models["random_forest"])
    
    def predict_proba(self, X):
        X_selected = self.feature_selector.transform(X)
        
        # Weighted ensemble prediction
        proba = np.zeros((X_selected.shape[0], 2))
        for name, model in self.models.items():
            proba += self.weights[name] * model.predict_proba(X_selected)
        
        return proba
    
    def explain(self, X):
        X_selected = self.feature_selector.transform(X)
        shap_values = self.shap_explainer.shap_values(X_selected)
        return shap_values
```

---

## PHASE 4: Privacy Layer

### Federated Learning (Enhanced)

```python
class SecureFederatedCoordinator:
    """FL with secure aggregation and differential privacy"""
    
    def __init__(self, epsilon=3.0, delta=1e-5):
        self.epsilon = epsilon
        self.delta = delta
        self.hospitals = {}
        self.global_models = {disease: None for disease in DISEASES}
    
    def secure_aggregate(self, weights_list):
        """FedAvg with DP noise injection"""
        # Standard FedAvg
        total_samples = sum(w["n_samples"] for w in weights_list)
        aggregated = {}
        
        for key in weights_list[0]["weights"]:
            weighted_sum = np.zeros_like(weights_list[0]["weights"][key])
            for w in weights_list:
                weighted_sum += (w["n_samples"] / total_samples) * w["weights"][key]
            
            # Add Laplace noise for differential privacy
            sensitivity = 1.0 / total_samples
            noise_scale = sensitivity / self.epsilon
            noise = np.random.laplace(0, noise_scale, weighted_sum.shape)
            
            aggregated[key] = weighted_sum + noise
        
        return aggregated
    
    def train_round(self, disease):
        """One round of federated training for a specific disease"""
        local_weights = []
        
        for hospital_id, hospital in self.hospitals.items():
            # Each hospital trains locally
            weights = hospital.train_local_model(
                disease=disease,
                global_weights=self.global_models[disease]
            )
            local_weights.append(weights)
        
        # Secure aggregation
        self.global_models[disease] = self.secure_aggregate(local_weights)
        
        return {
            "disease": disease,
            "hospitals_participated": len(local_weights),
            "privacy_guarantee": f"(ε={self.epsilon}, δ={self.delta})-DP"
        }
```

---

## PHASE 5: API Layer

### New Endpoints

```python
# Multi-disease prediction
@app.post("/predict/multi")
async def predict_multi_disease(patient: PatientInput) -> MultiDiseaseResponse:
    """Predict risk for all 12 diseases"""
    results = {}
    for disease_id, disease_info in DISEASES.items():
        risk = disease_models[disease_id].predict_proba(patient.features)
        results[disease_id] = {
            "name": disease_info["name"],
            "risk_score": risk[0, 1],
            "risk_category": categorize_risk(risk[0, 1]),
            "key_factors": get_top_factors(disease_id, patient),
            "confidence": calculate_confidence(risk)
        }
    return MultiDiseaseResponse(predictions=results)

# Disease-specific PRS
@app.post("/genetics/prs/{category}")
async def calculate_category_prs(category: str, genotypes: GenotypeInput):
    """Calculate PRS for a disease category"""
    panel = PRS_PANELS[category]
    prs = calculate_prs(genotypes, panel["snps"])
    return {
        "category": category,
        "prs_score": prs,
        "percentile": calculate_percentile(prs, category),
        "risk_interpretation": interpret_prs(prs, category)
    }

# Multi-disease explanation with LLM
@app.post("/explain/multi")
async def explain_multi_disease(patient_id: str, diseases: List[str]):
    """Generate clinical report for multiple diseases using local LLM"""
    # Fetch predictions
    predictions = get_patient_predictions(patient_id)
    
    # Generate comprehensive report with Qwen3
    prompt = build_multi_disease_prompt(predictions, diseases)
    report = await call_local_llm(prompt)
    
    return {
        "report": report,
        "diseases_analyzed": diseases,
        "generated_locally": True  # No cloud API calls
    }
```

---

## PHASE 6: Frontend

### New Components

1. **Multi-Disease Dashboard**
   - Grid of 12 disease risk cards
   - Color-coded by risk level (green/yellow/red)
   - Sparkline trends over time

2. **Genetic Insights Panel**
   - 5 PRS category scores
   - SNP breakdown per category
   - Ancestry-adjusted calculations

3. **Risk Timeline**
   - 10-year risk projection
   - Intervention impact simulation
   - What-if scenarios

4. **Clinical Report Generator**
   - LLM-powered reports
   - Exportable PDF
   - HIPAA-compliant formatting

---

## PHASE 7: What Makes This Best-in-Class

| Feature | Owkin | Tempus | 23andMe | **BioTeK** |
|---------|-------|--------|---------|------------|
| Multi-disease | ❌ (cancer only) | ❌ (cancer only) | ✅ (5 diseases) | ✅ **12 diseases** |
| Federated Learning | ✅ | ❌ | ❌ | ✅ |
| Differential Privacy | ❌ | ❌ | ❌ | ✅ **(ε=3.0)** |
| Local LLM | ❌ | ❌ | ❌ | ✅ **(Qwen3 8B)** |
| SHAP Explainability | ✅ | Partial | ❌ | ✅ |
| PRS Panels | ❌ | ✅ | ✅ | ✅ **(5 categories)** |
| Open Source | ❌ | ❌ | ❌ | ✅ |
| HIPAA Architecture | ✅ | ✅ | ✅ | ✅ |

---

## Execution Order

```
DAY 1:
├── PHASE 1: Data Layer (2-3 hours)
│   ├── Update generate_data.py with 55 features
│   ├── Add 12 disease label generation
│   └── Generate synthetic training data
│
├── PHASE 2: Genetic Layer (1-2 hours)
│   ├── Create 5 PRS panels with real SNPs
│   └── Update genomic_prs.py

DAY 2:
├── PHASE 3: ML Layer (3-4 hours)
│   ├── Create train_multi_disease.py
│   ├── Train 12 disease-specific models
│   └── Add SHAP explainers per disease
│
├── PHASE 4: Privacy Layer (1-2 hours)
│   ├── Update federated_learning.py for multi-disease
│   └── Add per-disease DP parameters

DAY 3:
├── PHASE 5: API Layer (2-3 hours)
│   ├── Add /predict/multi endpoint
│   ├── Add /genetics/prs/{category} endpoint
│   └── Update LLM prompts for multi-disease
│
├── PHASE 6: Frontend (3-4 hours)
│   ├── Create MultiDiseaseDashboard component
│   ├── Create GeneticInsights component
│   ├── Update platform page
│   └── Update /docs page

DAY 4:
└── PHASE 7: Documentation (2 hours)
    ├── Update medical_knowledge.json (12 diseases)
    ├── Update /docs technical documentation
    └── Prepare research paper outline

TOTAL: ~15-20 hours
```

---

## Ready to Execute?

Confirm and I'll start with Phase 1.
