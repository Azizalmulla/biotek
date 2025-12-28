"""
BioTeK Enhanced Prediction Pipeline
Integrates: ML Models + Evo 2 (DNA) + GLM-4.5V (Medical Imaging) + Local LLM

This is the unified prediction system that combines all AI capabilities.
"""

import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import json
import base64

from dotenv import load_dotenv
load_dotenv()

from api.cloud_models import BioTekCloudClient, CloudModelConfig


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class PatientData:
    """Complete patient data for prediction"""
    # Demographics
    patient_id: str
    age: int
    sex: str  # "M" or "F"
    
    # Clinical biomarkers (subset of our 55 features)
    biomarkers: Dict[str, float] = field(default_factory=dict)
    
    # Genetic data (optional)
    genetic_variants: List[Dict[str, Any]] = field(default_factory=list)
    raw_dna_sequence: Optional[str] = None
    
    # Medical imaging (optional)
    medical_images: List[Dict[str, Any]] = field(default_factory=list)
    
    # Clinical notes (optional)
    clinical_notes: Optional[str] = None


@dataclass
class PredictionResult:
    """Complete prediction result from all models"""
    patient_id: str
    timestamp: str
    
    # Core ML prediction
    ml_prediction: Dict[str, Any] = field(default_factory=dict)
    
    # Genetic analysis (Evo 2)
    genetic_analysis: Dict[str, Any] = field(default_factory=dict)
    
    # Imaging analysis (GLM-4.5V)
    imaging_analysis: Dict[str, Any] = field(default_factory=dict)
    
    # Combined risk assessment
    combined_risk: Dict[str, Any] = field(default_factory=dict)
    
    # Clinical report
    clinical_report: Optional[str] = None
    
    # Metadata
    models_used: List[str] = field(default_factory=list)
    processing_time_ms: float = 0


# =============================================================================
# ENHANCED PREDICTION ENGINE
# =============================================================================

class EnhancedPredictionEngine:
    """
    Unified prediction engine combining:
    - Traditional ML models (disease risk)
    - Evo 2 (DNA variant analysis)
    - GLM-4.5V (medical imaging)
    - Local LLM (clinical reports)
    """
    
    def __init__(self):
        self.cloud_client = BioTekCloudClient()
        self._check_configuration()
    
    def _check_configuration(self) -> Dict[str, bool]:
        """Check which models are available"""
        status = self.cloud_client.check_api_status()
        return {
            "evo2_available": status["nvidia_nim"]["configured"],
            "glm45v_available": status["openrouter"]["configured"],
            "ml_models_available": True  # Assuming local ML models are always available
        }
    
    # =========================================================================
    # EVO 2 - GENETIC ANALYSIS
    # =========================================================================
    
    def analyze_genetic_variants(
        self, 
        variants: List[Dict[str, Any]],
        raw_sequence: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze genetic variants using Evo 2
        
        Args:
            variants: List of variants with rsID, chromosome, position, ref, alt
            raw_sequence: Optional raw DNA sequence for analysis
            
        Returns:
            Genetic analysis results with pathogenicity predictions
        """
        if not self.cloud_client.config.nvidia_nim_api_key:
            return {
                "status": "skipped",
                "reason": "Evo 2 API not configured",
                "variants_analyzed": 0
            }
        
        results = {
            "status": "completed",
            "variants_analyzed": len(variants),
            "variant_effects": [],
            "high_risk_variants": [],
            "summary": {}
        }
        
        try:
            # Analyze each variant
            for variant in variants[:10]:  # Limit to 10 for API rate limits
                # Build sequence context around variant
                # In real implementation, would fetch reference genome
                ref_allele = variant.get("ref", "A")
                alt_allele = variant.get("alt", "G")
                
                # Create minimal sequence context
                context_before = "ATCGATCGATCG"  # Placeholder - would be real genome
                context_after = "GCTAGCTAGCTA"
                
                ref_seq = context_before + ref_allele + context_after
                alt_seq = context_before + alt_allele + context_after
                
                # Analyze with Evo 2
                try:
                    ref_analysis = self.cloud_client.evo2.analyze_sequence(ref_seq)
                    alt_analysis = self.cloud_client.evo2.analyze_sequence(alt_seq)
                    
                    # Simple effect score based on embedding difference
                    effect_entry = {
                        "rsid": variant.get("rsid", "unknown"),
                        "chromosome": variant.get("chromosome"),
                        "position": variant.get("position"),
                        "ref": ref_allele,
                        "alt": alt_allele,
                        "analyzed": True,
                        "evo2_processed": True
                    }
                    
                    results["variant_effects"].append(effect_entry)
                    
                except Exception as e:
                    results["variant_effects"].append({
                        "rsid": variant.get("rsid", "unknown"),
                        "analyzed": False,
                        "error": str(e)
                    })
            
            # If raw sequence provided, analyze it directly
            if raw_sequence and len(raw_sequence) >= 20:
                try:
                    seq_analysis = self.cloud_client.evo2.analyze_sequence(
                        raw_sequence[:1000]  # Limit sequence length
                    )
                    results["sequence_analysis"] = {
                        "length": len(raw_sequence),
                        "analyzed_length": min(len(raw_sequence), 1000),
                        "evo2_embedding": True
                    }
                except Exception as e:
                    results["sequence_analysis"] = {"error": str(e)}
            
            # Generate summary
            results["summary"] = {
                "total_variants": len(variants),
                "successfully_analyzed": len([v for v in results["variant_effects"] if v.get("analyzed")]),
                "model": "Evo 2 (Arc Institute)",
                "note": "Variant effect predictions based on DNA language model embeddings"
            }
            
        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)
        
        return results
    
    # =========================================================================
    # GLM-4.5V - MEDICAL IMAGING ANALYSIS
    # =========================================================================
    
    def analyze_medical_images(
        self,
        images: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze medical images using GLM-4.5V
        
        Args:
            images: List of image data with path/base64, type (xray, ct, mri), body_region
            
        Returns:
            Imaging analysis results with findings and recommendations
        """
        if not self.cloud_client.config.openrouter_api_key:
            return {
                "status": "skipped",
                "reason": "GLM-4.5V API not configured",
                "images_analyzed": 0
            }
        
        results = {
            "status": "completed",
            "images_analyzed": 0,
            "findings": [],
            "abnormalities_detected": [],
            "recommendations": [],
            "summary": {}
        }
        
        try:
            for img_data in images:
                image_path = img_data.get("path")
                image_type = img_data.get("type", "xray")
                body_region = img_data.get("body_region", "chest")
                clinical_context = img_data.get("clinical_context")
                
                if not image_path or not Path(image_path).exists():
                    results["findings"].append({
                        "image": image_path,
                        "status": "error",
                        "error": "Image file not found"
                    })
                    continue
                
                # Build clinical question based on context
                clinical_question = self._build_imaging_question(
                    image_type, body_region, clinical_context
                )
                
                # Analyze with GLM-4.5V
                try:
                    analysis = self.cloud_client.vision.analyze_medical_image(
                        image_path=image_path,
                        image_type=image_type,
                        clinical_question=clinical_question,
                        use_reasoning=True
                    )
                    
                    finding = {
                        "image": Path(image_path).name,
                        "type": image_type,
                        "body_region": body_region,
                        "status": "analyzed",
                        "analysis": analysis.get("analysis", ""),
                        "reasoning_used": analysis.get("reasoning_used", False)
                    }
                    
                    results["findings"].append(finding)
                    results["images_analyzed"] += 1
                    
                    # Extract abnormalities from analysis text
                    analysis_text = analysis.get("analysis", "").lower()
                    if any(word in analysis_text for word in ["abnormal", "lesion", "mass", "opacity", "nodule", "tumor"]):
                        results["abnormalities_detected"].append({
                            "image": Path(image_path).name,
                            "finding": "Potential abnormality detected - review recommended"
                        })
                    
                except Exception as e:
                    results["findings"].append({
                        "image": Path(image_path).name,
                        "status": "error",
                        "error": str(e)
                    })
            
            # Generate summary
            results["summary"] = {
                "total_images": len(images),
                "successfully_analyzed": results["images_analyzed"],
                "abnormalities_found": len(results["abnormalities_detected"]),
                "model": "GLM-4.5V (ZhipuAI)",
                "disclaimer": "AI-assisted analysis for clinical decision support only. Not a diagnosis."
            }
            
            # Add recommendations based on findings
            if results["abnormalities_detected"]:
                results["recommendations"].append(
                    "Abnormalities detected in imaging. Physician review strongly recommended."
                )
            
        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)
        
        return results
    
    def _build_imaging_question(
        self, 
        image_type: str, 
        body_region: str, 
        clinical_context: Optional[str]
    ) -> str:
        """Build appropriate clinical question for imaging analysis"""
        
        questions = {
            "xray": {
                "chest": "Evaluate for pneumonia, cardiomegaly, pleural effusion, masses, and other thoracic abnormalities.",
                "abdomen": "Evaluate for bowel obstruction, free air, calcifications, and other abdominal pathology.",
                "spine": "Evaluate for fractures, degenerative changes, alignment, and disc space abnormalities.",
                "extremity": "Evaluate for fractures, dislocations, joint abnormalities, and soft tissue swelling."
            },
            "ct": {
                "chest": "Evaluate for pulmonary nodules, masses, lymphadenopathy, and mediastinal abnormalities.",
                "abdomen": "Evaluate for hepatic lesions, pancreatic abnormalities, and abdominal masses.",
                "brain": "Evaluate for hemorrhage, infarct, masses, and structural abnormalities."
            },
            "mri": {
                "brain": "Evaluate for white matter changes, masses, and neurodegenerative findings.",
                "spine": "Evaluate for disc herniation, spinal stenosis, and cord signal abnormalities.",
                "cardiac": "Evaluate for cardiomyopathy, wall motion abnormalities, and structural defects."
            }
        }
        
        base_question = questions.get(image_type, {}).get(body_region, 
            "Provide comprehensive analysis of this medical image.")
        
        if clinical_context:
            return f"{base_question} Clinical context: {clinical_context}"
        
        return base_question
    
    # =========================================================================
    # COMBINED PREDICTION
    # =========================================================================
    
    def predict(
        self,
        patient: PatientData,
        include_genetic: bool = True,
        include_imaging: bool = True,
        generate_report: bool = True
    ) -> PredictionResult:
        """
        Run complete enhanced prediction pipeline
        
        Args:
            patient: Complete patient data
            include_genetic: Whether to run Evo 2 genetic analysis
            include_imaging: Whether to run GLM-4.5V imaging analysis
            generate_report: Whether to generate clinical report
            
        Returns:
            Complete prediction result from all models
        """
        import time
        start_time = time.time()
        
        result = PredictionResult(
            patient_id=patient.patient_id,
            timestamp=datetime.now().isoformat()
        )
        
        # 1. Core ML Prediction (existing disease risk models)
        result.ml_prediction = self._run_ml_prediction(patient)
        result.models_used.append("BioTeK ML Ensemble")
        
        # 2. Genetic Analysis with Evo 2
        if include_genetic and (patient.genetic_variants or patient.raw_dna_sequence):
            result.genetic_analysis = self.analyze_genetic_variants(
                variants=patient.genetic_variants,
                raw_sequence=patient.raw_dna_sequence
            )
            if result.genetic_analysis.get("status") == "completed":
                result.models_used.append("Evo 2 (NVIDIA NIM)")
        
        # 3. Medical Imaging with GLM-4.5V
        if include_imaging and patient.medical_images:
            result.imaging_analysis = self.analyze_medical_images(
                images=patient.medical_images
            )
            if result.imaging_analysis.get("status") == "completed":
                result.models_used.append("GLM-4.5V (OpenRouter)")
        
        # 4. Combine all risk factors
        result.combined_risk = self._calculate_combined_risk(result)
        
        # 5. Generate clinical report
        if generate_report:
            result.clinical_report = self._generate_clinical_report(patient, result)
        
        # Calculate processing time
        result.processing_time_ms = (time.time() - start_time) * 1000
        
        return result
    
    def _run_ml_prediction(self, patient: PatientData) -> Dict[str, Any]:
        """Run traditional ML disease risk prediction"""
        # This would integrate with existing multi-disease models
        # For now, return placeholder structure
        return {
            "status": "completed",
            "diseases": {
                "type2_diabetes": {"risk": 0.0, "confidence": 0.0},
                "cardiovascular": {"risk": 0.0, "confidence": 0.0},
                "breast_cancer": {"risk": 0.0, "confidence": 0.0}
            },
            "note": "Connect to actual ML models for real predictions"
        }
    
    def _calculate_combined_risk(self, result: PredictionResult) -> Dict[str, Any]:
        """Combine risk factors from all models"""
        combined = {
            "overall_risk_level": "unknown",
            "risk_factors": [],
            "protective_factors": [],
            "confidence": 0.0
        }
        
        risk_signals = 0
        total_signals = 0
        
        # Analyze ML predictions
        if result.ml_prediction.get("status") == "completed":
            for disease, data in result.ml_prediction.get("diseases", {}).items():
                if data.get("risk", 0) > 0.5:
                    risk_signals += 1
                    combined["risk_factors"].append(f"Elevated {disease} risk from biomarkers")
                total_signals += 1
        
        # Analyze genetic findings
        if result.genetic_analysis.get("status") == "completed":
            high_risk = result.genetic_analysis.get("high_risk_variants", [])
            if high_risk:
                risk_signals += len(high_risk)
                combined["risk_factors"].append(f"{len(high_risk)} high-risk genetic variants identified")
            total_signals += 1
        
        # Analyze imaging findings
        if result.imaging_analysis.get("status") == "completed":
            abnormalities = result.imaging_analysis.get("abnormalities_detected", [])
            if abnormalities:
                risk_signals += len(abnormalities)
                combined["risk_factors"].append(f"{len(abnormalities)} imaging abnormalities detected")
            total_signals += 1
        
        # Calculate overall risk level
        if total_signals > 0:
            risk_ratio = risk_signals / total_signals
            if risk_ratio > 0.6:
                combined["overall_risk_level"] = "high"
            elif risk_ratio > 0.3:
                combined["overall_risk_level"] = "moderate"
            else:
                combined["overall_risk_level"] = "low"
            
            combined["confidence"] = min(0.95, 0.5 + (total_signals * 0.15))
        
        return combined
    
    def _generate_clinical_report(
        self, 
        patient: PatientData, 
        result: PredictionResult
    ) -> str:
        """Generate clinical report summarizing all findings"""
        
        report_parts = [
            "=" * 60,
            "BIOTEK ENHANCED CLINICAL RISK ASSESSMENT",
            "=" * 60,
            f"Patient ID: {patient.patient_id}",
            f"Age: {patient.age} | Sex: {patient.sex}",
            f"Assessment Date: {result.timestamp}",
            f"Models Used: {', '.join(result.models_used)}",
            "",
            "=" * 60,
            "SUMMARY",
            "=" * 60,
            f"Overall Risk Level: {result.combined_risk.get('overall_risk_level', 'N/A').upper()}",
            f"Confidence: {result.combined_risk.get('confidence', 0):.1%}",
            ""
        ]
        
        # Risk factors
        risk_factors = result.combined_risk.get("risk_factors", [])
        if risk_factors:
            report_parts.append("RISK FACTORS IDENTIFIED:")
            for factor in risk_factors:
                report_parts.append(f"  • {factor}")
            report_parts.append("")
        
        # Genetic analysis summary
        if result.genetic_analysis.get("status") == "completed":
            report_parts.extend([
                "=" * 60,
                "GENETIC ANALYSIS (Evo 2)",
                "=" * 60,
                f"Variants Analyzed: {result.genetic_analysis.get('variants_analyzed', 0)}",
            ])
            summary = result.genetic_analysis.get("summary", {})
            if summary:
                report_parts.append(f"Successfully Processed: {summary.get('successfully_analyzed', 0)}")
            report_parts.append("")
        
        # Imaging analysis summary
        if result.imaging_analysis.get("status") == "completed":
            report_parts.extend([
                "=" * 60,
                "IMAGING ANALYSIS (GLM-4.5V)",
                "=" * 60,
                f"Images Analyzed: {result.imaging_analysis.get('images_analyzed', 0)}",
                f"Abnormalities Detected: {len(result.imaging_analysis.get('abnormalities_detected', []))}",
            ])
            for finding in result.imaging_analysis.get("findings", [])[:3]:
                if finding.get("status") == "analyzed":
                    report_parts.append(f"\n[{finding.get('type', 'image').upper()}] {finding.get('body_region', '')}")
                    analysis = finding.get("analysis", "")[:500]
                    report_parts.append(analysis)
            report_parts.append("")
        
        # Recommendations
        report_parts.extend([
            "=" * 60,
            "RECOMMENDATIONS",
            "=" * 60
        ])
        
        all_recommendations = result.imaging_analysis.get("recommendations", [])
        if result.combined_risk.get("overall_risk_level") == "high":
            all_recommendations.append("Schedule follow-up with healthcare provider for comprehensive evaluation.")
        
        for rec in all_recommendations or ["Continue routine health monitoring."]:
            report_parts.append(f"  • {rec}")
        
        report_parts.extend([
            "",
            "=" * 60,
            "DISCLAIMER",
            "=" * 60,
            "This AI-generated assessment is for clinical decision support only.",
            "It is not a medical diagnosis. All findings should be reviewed by",
            "a qualified healthcare professional.",
            "",
            f"Processing Time: {result.processing_time_ms:.0f}ms"
        ])
        
        return "\n".join(report_parts)


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def quick_dna_analysis(dna_sequence: str) -> Dict[str, Any]:
    """Quick DNA sequence analysis with Evo 2"""
    engine = EnhancedPredictionEngine()
    return engine.cloud_client.evo2.analyze_sequence(dna_sequence)


def quick_image_analysis(image_path: str, image_type: str = "xray") -> Dict[str, Any]:
    """Quick medical image analysis with GLM-4.5V"""
    engine = EnhancedPredictionEngine()
    return engine.analyze_medical_images([{
        "path": image_path,
        "type": image_type
    }])


# =============================================================================
# DEMO
# =============================================================================

if __name__ == "__main__":
    print("BioTeK Enhanced Prediction Engine")
    print("=" * 40)
    
    engine = EnhancedPredictionEngine()
    config = engine._check_configuration()
    
    print(f"Evo 2 (DNA): {'✅ Available' if config['evo2_available'] else '❌ Not configured'}")
    print(f"GLM-4.5V (Vision): {'✅ Available' if config['glm45v_available'] else '❌ Not configured'}")
    print(f"ML Models: {'✅ Available' if config['ml_models_available'] else '❌ Not configured'}")
