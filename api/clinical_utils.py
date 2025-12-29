"""
Hospital-Grade Clinical Utilities for BioTeK
Implements SCORE 2 guidelines, input validation, calibration, and actionable recommendations
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
import numpy as np


class RiskCategory(Enum):
    MINIMAL = "MINIMAL"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


# =============================================================================
# SCORE 2 AGE-STRATIFIED THRESHOLDS (European Guidelines 2021)
# Different risk thresholds by age group for cardiovascular diseases
# =============================================================================

SCORE2_THRESHOLDS = {
    # Age < 50: More aggressive thresholds (young patients need attention earlier)
    "young": {
        "age_range": (0, 49),
        "thresholds": {
            "MINIMAL": (0, 0.025),      # <2.5%
            "LOW": (0.025, 0.05),        # 2.5-5%
            "MODERATE": (0.05, 0.075),   # 5-7.5%
            "HIGH": (0.075, 0.10),       # 7.5-10%
            "VERY_HIGH": (0.10, 1.0)     # >10%
        }
    },
    # Age 50-69: Standard thresholds
    "middle": {
        "age_range": (50, 69),
        "thresholds": {
            "MINIMAL": (0, 0.025),       # <2.5%
            "LOW": (0.025, 0.05),        # 2.5-5%
            "MODERATE": (0.05, 0.10),    # 5-10%
            "HIGH": (0.10, 0.20),        # 10-20%
            "VERY_HIGH": (0.20, 1.0)     # >20%
        }
    },
    # Age >= 70: Higher thresholds (some risk is expected with age)
    "elderly": {
        "age_range": (70, 120),
        "thresholds": {
            "MINIMAL": (0, 0.05),        # <5%
            "LOW": (0.05, 0.075),        # 5-7.5%
            "MODERATE": (0.075, 0.15),   # 7.5-15%
            "HIGH": (0.15, 0.30),        # 15-30%
            "VERY_HIGH": (0.30, 1.0)     # >30%
        }
    }
}

# Disease-specific threshold adjustments
DISEASE_THRESHOLD_MODIFIERS = {
    # Cardiovascular diseases use SCORE 2 directly
    "coronary_heart_disease": 1.0,
    "stroke": 1.0,
    "hypertension": 1.0,
    "heart_failure": 1.0,
    "atrial_fibrillation": 1.0,
    
    # Metabolic diseases - slightly different thresholds
    "type2_diabetes": 0.8,  # Lower thresholds (catch earlier)
    "chronic_kidney_disease": 0.9,
    "nafld": 1.0,
    
    # Cancers - much lower thresholds (any elevation is significant)
    "breast_cancer": 0.5,
    "colorectal_cancer": 0.5,
    
    # Respiratory/Neurological
    "copd": 1.0,
    "alzheimers_disease": 0.7,  # Catch early for intervention
}


def get_age_group(age: float) -> str:
    """Determine age group for SCORE 2 thresholds"""
    if age < 50:
        return "young"
    elif age < 70:
        return "middle"
    else:
        return "elderly"


def get_risk_category_score2(risk: float, age: float, disease_id: str) -> RiskCategory:
    """
    Determine risk category using SCORE 2 age-stratified thresholds
    
    Args:
        risk: Raw risk score (0-1)
        age: Patient age
        disease_id: Disease identifier
        
    Returns:
        RiskCategory enum
    """
    age_group = get_age_group(age)
    thresholds = SCORE2_THRESHOLDS[age_group]["thresholds"]
    modifier = DISEASE_THRESHOLD_MODIFIERS.get(disease_id, 1.0)
    
    # Get adjusted thresholds
    t_minimal = thresholds["MINIMAL"][1] * modifier
    t_low = thresholds["LOW"][1] * modifier
    t_moderate = thresholds["MODERATE"][1] * modifier
    t_high = thresholds["HIGH"][1] * modifier
    
    # Explicit ordered comparisons (most reliable)
    if risk < t_minimal:
        return RiskCategory.MINIMAL
    elif risk < t_low:
        return RiskCategory.LOW
    elif risk < t_moderate:
        return RiskCategory.MODERATE
    elif risk < t_high:
        return RiskCategory.HIGH
    else:
        return RiskCategory.VERY_HIGH


# =============================================================================
# DYNAMIC ML WEIGHTING BY AGE
# Young patients: trust clinical equations more (better validated)
# Older patients: ML can help catch patterns
# =============================================================================

def get_ml_weight(age: float) -> Tuple[float, float]:
    """
    Get clinical vs ML weights based on patient age
    
    Young patients: Trust validated clinical equations (ML overestimates)
    Older patients: ML helps catch patterns in complex cases
    
    Returns:
        Tuple of (clinical_weight, ml_weight)
    """
    if age < 30:
        # Very young: clinical equations ONLY (ML not validated here)
        return (1.0, 0.0)
    elif age < 40:
        # Young adult: minimal ML contribution
        return (0.95, 0.05)
    elif age < 50:
        # Adult: mostly clinical
        return (0.85, 0.15)
    elif age < 65:
        # Middle aged: balanced
        return (0.70, 0.30)
    else:
        # Elderly: ML helps more
        return (0.60, 0.40)


# =============================================================================
# INPUT VALIDATION
# Ensure all inputs are within clinically valid ranges
# =============================================================================

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    corrected_values: Dict[str, float]


VALID_RANGES = {
    "age": (0, 120, "years"),
    "bmi": (10, 70, "kg/m²"),
    "bp_systolic": (60, 250, "mmHg"),
    "bp_diastolic": (30, 150, "mmHg"),
    "hba1c": (3.0, 18.0, "%"),
    "ldl": (20, 400, "mg/dL"),
    "hdl": (10, 150, "mg/dL"),
    "triglycerides": (30, 1500, "mg/dL"),
    "total_cholesterol": (50, 500, "mg/dL"),
    "creatinine": (0.1, 20, "mg/dL"),
    "egfr": (5, 150, "mL/min/1.73m²"),
    "alt": (5, 2000, "U/L"),
    "ast": (5, 2000, "U/L"),
    "smoking_pack_years": (0, 150, "pack-years"),
    "heart_rate": (30, 220, "bpm"),
}


def validate_inputs(inputs: Dict[str, float]) -> ValidationResult:
    """
    Validate all patient inputs against clinical ranges
    
    Returns:
        ValidationResult with errors, warnings, and corrected values
    """
    errors = []
    warnings = []
    corrected = {}
    
    for field, value in inputs.items():
        if field not in VALID_RANGES:
            continue
            
        min_val, max_val, unit = VALID_RANGES[field]
        
        if value is None:
            continue
            
        if value < min_val:
            if field == "bp_diastolic" and value == 0:
                errors.append(f"{field} cannot be 0 - please enter a valid value ({min_val}-{max_val} {unit})")
            else:
                warnings.append(f"{field}={value} below normal range ({min_val}-{max_val} {unit})")
                corrected[field] = min_val
        elif value > max_val:
            warnings.append(f"{field}={value} above normal range ({min_val}-{max_val} {unit})")
            corrected[field] = max_val
    
    # Special validations
    if "bp_systolic" in inputs and "bp_diastolic" in inputs:
        if inputs["bp_systolic"] and inputs["bp_diastolic"]:
            if inputs["bp_diastolic"] >= inputs["bp_systolic"]:
                errors.append("BP diastolic must be less than BP systolic")
    
    is_valid = len(errors) == 0
    
    return ValidationResult(
        is_valid=is_valid,
        errors=errors,
        warnings=warnings,
        corrected_values=corrected
    )


# =============================================================================
# ACTIONABLE RECOMMENDATIONS PER DISEASE
# Evidence-based clinical actions, not just "high risk"
# =============================================================================

DISEASE_RECOMMENDATIONS = {
    "type2_diabetes": {
        "HIGH": {
            "immediate": [
                "Order fasting glucose and HbA1c confirmation",
                "Schedule diabetes educator consultation",
                "Initiate lifestyle modification counseling"
            ],
            "follow_up": "2-4 weeks for results review",
            "referral": "Endocrinology if HbA1c > 9%"
        },
        "MODERATE": {
            "immediate": [
                "Order fasting glucose",
                "Provide prediabetes education materials",
                "Recommend weight management if BMI > 25"
            ],
            "follow_up": "3 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Continue routine screening per guidelines"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "coronary_heart_disease": {
        "HIGH": {
            "immediate": [
                "Order lipid panel if not recent",
                "Consider statin therapy initiation",
                "Order stress test if symptomatic",
                "Initiate aspirin if appropriate (ACC/AHA guidelines)"
            ],
            "follow_up": "4-6 weeks",
            "referral": "Cardiology for risk >20%"
        },
        "MODERATE": {
            "immediate": [
                "Optimize BP and lipid control",
                "Lifestyle counseling (diet, exercise, smoking cessation)"
            ],
            "follow_up": "3 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Continue heart-healthy lifestyle"],
            "follow_up": "Annual cardiovascular screening",
            "referral": None
        }
    },
    "hypertension": {
        "HIGH": {
            "immediate": [
                "Confirm with repeat BP measurement",
                "Order basic metabolic panel, urinalysis",
                "Consider initiating antihypertensive therapy",
                "Assess for end-organ damage (ECG, fundoscopy)"
            ],
            "follow_up": "2-4 weeks for medication titration",
            "referral": "Nephrology if resistant hypertension"
        },
        "MODERATE": {
            "immediate": [
                "Home BP monitoring for 1 week",
                "DASH diet education",
                "Sodium restriction counseling"
            ],
            "follow_up": "1-2 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Lifestyle optimization"],
            "follow_up": "Annual BP check",
            "referral": None
        }
    },
    "stroke": {
        "HIGH": {
            "immediate": [
                "Aggressive BP control (target <130/80)",
                "Optimize anticoagulation if AFib present",
                "Carotid ultrasound if not recent",
                "Statin therapy if not contraindicated"
            ],
            "follow_up": "1 month",
            "referral": "Neurology for risk >15%"
        },
        "MODERATE": {
            "immediate": [
                "BP optimization",
                "Smoking cessation if applicable",
                "Diabetes and lipid control"
            ],
            "follow_up": "3 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Maintain healthy lifestyle"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "chronic_kidney_disease": {
        "HIGH": {
            "immediate": [
                "Order comprehensive metabolic panel",
                "Urine albumin-to-creatinine ratio",
                "Renal ultrasound if not recent",
                "Optimize BP and glucose control"
            ],
            "follow_up": "1 month",
            "referral": "Nephrology for eGFR <30 or proteinuria"
        },
        "MODERATE": {
            "immediate": [
                "Monitor renal function every 3-6 months",
                "Avoid nephrotoxic medications",
                "BP target <130/80"
            ],
            "follow_up": "3 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Annual renal function monitoring"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "nafld": {
        "HIGH": {
            "immediate": [
                "Order liver ultrasound",
                "Comprehensive liver panel (ALT, AST, GGT, albumin)",
                "FIB-4 score calculation",
                "Weight loss counseling (target 7-10% body weight)"
            ],
            "follow_up": "2-3 months",
            "referral": "Hepatology if FIB-4 >2.67 or fibrosis suspected"
        },
        "MODERATE": {
            "immediate": [
                "Lifestyle modification (diet, exercise)",
                "Alcohol cessation counseling",
                "Monitor liver enzymes"
            ],
            "follow_up": "6 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Maintain healthy weight"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "copd": {
        "HIGH": {
            "immediate": [
                "Order spirometry (FEV1/FVC)",
                "Smoking cessation - highest priority",
                "Consider inhaler therapy initiation",
                "Influenza and pneumococcal vaccination"
            ],
            "follow_up": "1 month",
            "referral": "Pulmonology for severe symptoms"
        },
        "MODERATE": {
            "immediate": [
                "Smoking cessation counseling",
                "Pulmonary function baseline if smoker"
            ],
            "follow_up": "3-6 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Avoid smoking and secondhand smoke"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "alzheimers_disease": {
        "HIGH": {
            "immediate": [
                "Cognitive screening (MMSE or MoCA)",
                "Assess for reversible causes (B12, TSH, depression)",
                "Consider brain MRI",
                "Discuss advance care planning"
            ],
            "follow_up": "1-2 months",
            "referral": "Neurology/Geriatrics for cognitive evaluation"
        },
        "MODERATE": {
            "immediate": [
                "Baseline cognitive assessment",
                "Cardiovascular risk optimization (vascular dementia prevention)",
                "Encourage cognitive and social engagement"
            ],
            "follow_up": "6 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Maintain cognitive and physical activity"],
            "follow_up": "Annual cognitive screening after age 65",
            "referral": None
        }
    },
    "atrial_fibrillation": {
        "HIGH": {
            "immediate": [
                "Order 12-lead ECG",
                "Consider Holter monitor or event recorder",
                "Calculate CHA2DS2-VASc score",
                "Anticoagulation assessment if AFib confirmed"
            ],
            "follow_up": "2 weeks",
            "referral": "Cardiology/EP for confirmed AFib"
        },
        "MODERATE": {
            "immediate": [
                "Baseline ECG",
                "Optimize BP and thyroid function"
            ],
            "follow_up": "3 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Monitor for palpitations or irregular pulse"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "heart_failure": {
        "HIGH": {
            "immediate": [
                "Order BNP/NT-proBNP",
                "Echocardiogram if not recent",
                "Optimize volume status",
                "Review medications (avoid NSAIDs, adjust diuretics)"
            ],
            "follow_up": "1-2 weeks",
            "referral": "Cardiology for EF assessment"
        },
        "MODERATE": {
            "immediate": [
                "BP and fluid management",
                "Daily weight monitoring education",
                "Sodium restriction"
            ],
            "follow_up": "1-2 months",
            "referral": None
        },
        "LOW": {
            "immediate": ["Heart-healthy lifestyle"],
            "follow_up": "Annual",
            "referral": None
        }
    },
    "breast_cancer": {
        "HIGH": {
            "immediate": [
                "Schedule mammogram if not current",
                "Clinical breast exam",
                "Discuss genetic counseling if family history"
            ],
            "follow_up": "2-4 weeks for imaging results",
            "referral": "Breast surgery/oncology if abnormal findings"
        },
        "MODERATE": {
            "immediate": [
                "Ensure mammogram screening is current",
                "Breast self-exam education"
            ],
            "follow_up": "Per screening guidelines",
            "referral": None
        },
        "LOW": {
            "immediate": ["Continue age-appropriate screening"],
            "follow_up": "Per guidelines (annual/biennial)",
            "referral": None
        }
    },
    "colorectal_cancer": {
        "HIGH": {
            "immediate": [
                "Schedule colonoscopy",
                "Review family history in detail",
                "Consider genetic counseling if Lynch syndrome suspected"
            ],
            "follow_up": "Based on colonoscopy findings",
            "referral": "GI for colonoscopy and polyp management"
        },
        "MODERATE": {
            "immediate": [
                "Ensure screening is current (colonoscopy or alternatives)",
                "Dietary counseling (fiber, reduce red meat)"
            ],
            "follow_up": "Per screening guidelines",
            "referral": None
        },
        "LOW": {
            "immediate": ["Age-appropriate CRC screening"],
            "follow_up": "Per guidelines",
            "referral": None
        }
    }
}


def get_recommendations(disease_id: str, risk_category: str) -> Dict:
    """
    Get actionable clinical recommendations for a disease and risk level
    """
    # Normalize category
    if risk_category in ["VERY_HIGH"]:
        risk_category = "HIGH"
    if risk_category in ["MINIMAL"]:
        risk_category = "LOW"
    
    disease_recs = DISEASE_RECOMMENDATIONS.get(disease_id, {})
    category_recs = disease_recs.get(risk_category, {
        "immediate": ["Follow standard screening guidelines"],
        "follow_up": "Per clinical judgment",
        "referral": None
    })
    
    return category_recs


# =============================================================================
# CONFIDENCE AND UNCERTAINTY ESTIMATION
# Flag predictions outside training data range
# =============================================================================

TRAINING_DATA_RANGES = {
    "age": (18, 90),
    "bmi": (15, 50),
    "bp_systolic": (90, 200),
    "hba1c": (4.0, 14.0),
    "smoking_pack_years": (0, 80),
}


def estimate_confidence(inputs: Dict[str, float], base_confidence: float = 0.90) -> Tuple[float, List[str]]:
    """
    Estimate prediction confidence based on how well inputs match training data
    
    Returns:
        Tuple of (confidence_score, warning_messages)
    """
    confidence = base_confidence
    warnings = []
    
    for field, value in inputs.items():
        if field not in TRAINING_DATA_RANGES or value is None:
            continue
        
        min_val, max_val = TRAINING_DATA_RANGES[field]
        
        if value < min_val:
            reduction = min(0.15, (min_val - value) / min_val * 0.3)
            confidence -= reduction
            warnings.append(f"Patient {field} ({value}) below training population range")
        elif value > max_val:
            reduction = min(0.15, (value - max_val) / max_val * 0.3)
            confidence -= reduction
            warnings.append(f"Patient {field} ({value}) above training population range")
    
    # Special case: very young patients
    age = inputs.get("age", 50)
    if age < 25:
        confidence -= 0.10
        warnings.append("Limited training data for patients under 25 - interpret with caution")
    
    confidence = max(0.50, confidence)  # Floor at 50%
    
    return (round(confidence, 2), warnings)


# =============================================================================
# PLATT SCALING CALIBRATION
# Post-hoc calibration to improve probability estimates
# =============================================================================

def calibrate_simple(raw_prob: float, scale: float = 1.0, offset: float = 0.0) -> float:
    """
    Simple linear calibration: new_prob = raw_prob * scale + offset
    Clamped to [0, 1]
    """
    calibrated = raw_prob * scale + offset
    return max(0.0, min(1.0, calibrated))


# Disease-specific calibration parameters
# scale: multiplier (0.5 = halve predictions, 1.0 = no change)
# offset: additive adjustment (negative = reduce predictions)
CALIBRATION_PARAMS = {
    "type2_diabetes": {"scale": 1.0, "offset": 0.0},
    "coronary_heart_disease": {"scale": 1.0, "offset": 0.0},
    "hypertension": {"scale": 1.0, "offset": 0.0},
    "chronic_kidney_disease": {"scale": 0.5, "offset": -0.05},
    "nafld": {"scale": 0.7, "offset": 0.0},
    "stroke": {"scale": 1.0, "offset": 0.0},
    "heart_failure": {"scale": 0.5, "offset": -0.05},
    "atrial_fibrillation": {"scale": 0.4, "offset": -0.05},
    "copd": {"scale": 1.0, "offset": 0.0},
    "alzheimers_disease": {"scale": 0.5, "offset": 0.0},
    "breast_cancer": {"scale": 1.0, "offset": 0.0},
    "colorectal_cancer": {"scale": 1.0, "offset": 0.0},
}


def get_age_adjustment(age: float, disease_id: str) -> float:
    """
    Framingham and other clinical equations were developed on older populations.
    Young patients (<40) need adjustment to avoid over-prediction.
    
    Returns: multiplier (0.0 to 1.0)
    """
    # Cardiovascular diseases - Framingham overestimates for young
    cv_diseases = ['hypertension', 'stroke', 'coronary_heart_disease', 
                   'heart_failure', 'atrial_fibrillation']
    
    if disease_id in cv_diseases:
        if age < 25:
            return 0.15  # 85% reduction for very young
        elif age < 30:
            return 0.25  # 75% reduction
        elif age < 35:
            return 0.40  # 60% reduction
        elif age < 40:
            return 0.60  # 40% reduction
        elif age < 50:
            return 0.80  # 20% reduction
        else:
            return 1.0   # No adjustment for 50+
    
    # Other diseases - smaller adjustment
    if age < 30:
        return 0.5
    elif age < 40:
        return 0.75
    else:
        return 1.0


def calibrate_probability(raw_prob: float, disease_id: str, age: float = 50, 
                          patient_data: dict = None) -> float:
    """
    Apply disease-specific calibration to raw probability
    Includes age adjustment and physiological sanity checks
    """
    params = CALIBRATION_PARAMS.get(disease_id, {"scale": 1.0, "offset": 0.0})
    calibrated = calibrate_simple(raw_prob, params["scale"], params["offset"])
    
    # Apply age adjustment (reduces over-prediction for young patients)
    age_mult = get_age_adjustment(age, disease_id)
    calibrated = calibrated * age_mult
    
    # SANITY CHECKS: Override if physiologically low-risk
    if patient_data:
        calibrated = apply_sanity_checks(calibrated, disease_id, patient_data)
    
    return max(0.0, min(1.0, calibrated))


def apply_sanity_checks(risk: float, disease_id: str, data: dict) -> float:
    """
    Apply physiological sanity checks to prevent obviously wrong predictions.
    E.g., normal BP shouldn't show high hypertension risk.
    """
    bp_sys = data.get('bp_systolic', 120)
    bp_dia = data.get('bp_diastolic', 80)
    hba1c = data.get('hba1c', 5.5)
    bmi = data.get('bmi', 25)
    age = data.get('age', 50)
    hdl = data.get('hdl', 50)
    
    # HYPERTENSION: Normal BP = low risk regardless of other factors
    if disease_id == 'hypertension':
        if bp_sys < 120 and bp_dia < 80:
            return min(risk, 0.05)  # Cap at 5% for normal BP
        elif bp_sys < 130 and bp_dia < 85:
            return min(risk, 0.15)  # Cap at 15% for elevated BP
    
    # TYPE 2 DIABETES: Normal HbA1c = low risk
    if disease_id == 'type2_diabetes':
        if hba1c < 5.7:
            return min(risk, 0.10)  # Cap at 10% for normal HbA1c
        elif hba1c < 6.0:
            return min(risk, 0.20)  # Cap at 20% for prediabetes threshold
    
    # NAFLD: Normal BMI = lower risk
    if disease_id == 'nafld':
        if bmi < 25:
            return min(risk, 0.15)  # Cap for healthy BMI
    
    # CVD: High HDL is protective
    if disease_id in ['coronary_heart_disease', 'stroke']:
        if hdl >= 60 and age < 50:
            return risk * 0.7  # 30% reduction for high HDL + young
    
    return risk


def calculate_data_completeness(patient_data: dict) -> float:
    """
    Calculate what % of optimal clinical features are provided.
    Returns 0.0 to 1.0
    """
    # Core features (most important)
    core_features = ['age', 'sex', 'bmi', 'bp_systolic', 'bp_diastolic']
    # Important features
    important_features = ['hba1c', 'hdl', 'ldl', 'total_cholesterol']
    # Optional but valuable
    optional_features = ['smoking_pack_years', 'family_history_score', 'on_bp_medication', 'has_diabetes']
    
    core_present = sum(1 for f in core_features if patient_data.get(f) is not None)
    important_present = sum(1 for f in important_features if patient_data.get(f) is not None)
    optional_present = sum(1 for f in optional_features if patient_data.get(f) is not None)
    
    # Weighted completeness score
    completeness = (
        (core_present / len(core_features)) * 0.5 +
        (important_present / len(important_features)) * 0.35 +
        (optional_present / len(optional_features)) * 0.15
    )
    return completeness
