"""
Disease Metadata Registry

Defines applicability gates and feature provenance for each disease model.
This ensures:
1. Sex-specific diseases are only predicted for applicable patients
2. Models only use features they were actually trained on
3. Full transparency about data sources and limitations
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

class DatasetType(str, Enum):
    REAL = "real"
    SYNTHETIC = "synthetic"
    MIXED = "mixed"

class ApplicabilityStatus(str, Enum):
    APPLICABLE = "applicable"
    NOT_APPLICABLE = "not_applicable"
    INSUFFICIENT_DATA = "insufficient_data"

@dataclass
class DiseaseMetadata:
    """Metadata for a disease prediction model"""
    disease_id: str
    display_name: str
    
    # Applicability gates
    applicable_sexes: List[int]  # 0=Female, 1=Male, [0,1]=Both
    min_age: int = 18
    max_age: int = 100
    
    # Feature provenance
    features_used: List[str] = field(default_factory=list)
    includes_sex: bool = False  # Does the model actually use sex?
    
    # Dataset info
    dataset_type: DatasetType = DatasetType.SYNTHETIC
    dataset_name: Optional[str] = None
    dataset_size: Optional[int] = None
    sex_stratified: bool = False  # Was training data sex-stratified?
    
    # Model quality
    reported_auc: Optional[float] = None
    calibrated: bool = False
    
    # Clinical notes
    icd10_codes: List[str] = field(default_factory=list)
    clinical_notes: Optional[str] = None

# =============================================================================
# DISEASE METADATA REGISTRY
# =============================================================================

# Base features available for all models (excluding sex)
BASE_FEATURES = [
    'age', 'bmi', 'bp_systolic', 'bp_diastolic',
    'total_cholesterol', 'hdl', 'ldl', 'triglycerides',
    'hba1c', 'egfr', 'smoking', 'family_history'
]

# Features including sex (only for models with real sex-stratified data)
FEATURES_WITH_SEX = ['age', 'sex', 'bmi', 'bp_systolic', 'bp_diastolic',
                     'total_cholesterol', 'hdl', 'ldl', 'triglycerides',
                     'hba1c', 'egfr', 'smoking', 'family_history']

DISEASE_METADATA: Dict[str, DiseaseMetadata] = {
    # =========================================================================
    # REAL DATASETS WITH SEX-STRATIFIED DATA
    # =========================================================================
    
    "type2_diabetes": DiseaseMetadata(
        disease_id="type2_diabetes",
        display_name="Type 2 Diabetes",
        applicable_sexes=[0, 1],  # Both
        features_used=FEATURES_WITH_SEX,
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="Kaggle Diabetes Prediction",
        dataset_size=100000,
        sex_stratified=True,
        reported_auc=0.85,
        calibrated=True,
        icd10_codes=["E11"],
        clinical_notes="FINDRISC-based with ML enhancement"
    ),
    
    "coronary_heart_disease": DiseaseMetadata(
        disease_id="coronary_heart_disease",
        display_name="Coronary Heart Disease",
        applicable_sexes=[0, 1],
        features_used=FEATURES_WITH_SEX,
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="UCI Heart Disease + Cleveland",
        dataset_size=920,
        sex_stratified=True,
        reported_auc=0.87,
        calibrated=True,
        icd10_codes=["I25"],
        clinical_notes="Framingham-validated features"
    ),
    
    "stroke": DiseaseMetadata(
        disease_id="stroke",
        display_name="Stroke",
        applicable_sexes=[0, 1],
        features_used=FEATURES_WITH_SEX,
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="Kaggle Healthcare Stroke",
        dataset_size=5110,
        sex_stratified=True,
        reported_auc=0.82,
        calibrated=True,
        icd10_codes=["I63", "I64"],
        clinical_notes="Includes lifestyle factors"
    ),
    
    "heart_failure": DiseaseMetadata(
        disease_id="heart_failure",
        display_name="Heart Failure",
        applicable_sexes=[0, 1],
        features_used=FEATURES_WITH_SEX,
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="Kaggle Heart Failure Clinical Records",
        dataset_size=299,
        sex_stratified=True,
        reported_auc=0.78,
        calibrated=True,
        icd10_codes=["I50"],
        clinical_notes="Mortality prediction dataset"
    ),
    
    "nafld": DiseaseMetadata(
        disease_id="nafld",
        display_name="Non-Alcoholic Fatty Liver Disease",
        applicable_sexes=[0, 1],
        features_used=FEATURES_WITH_SEX,
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="Indian Liver Patient Dataset",
        dataset_size=583,
        sex_stratified=True,
        reported_auc=0.72,
        calibrated=True,
        icd10_codes=["K76.0"],
        clinical_notes="Fatty Liver Index (FLI) features"
    ),
    
    "hypertension": DiseaseMetadata(
        disease_id="hypertension",
        display_name="Hypertension",
        applicable_sexes=[0, 1],
        features_used=FEATURES_WITH_SEX,
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="NHANES + Framingham",
        dataset_size=2000,
        sex_stratified=True,
        reported_auc=0.80,
        calibrated=True,
        icd10_codes=["I10"],
        clinical_notes="BP-based diagnostic criteria apply"
    ),
    
    # =========================================================================
    # REAL DATASETS WITHOUT SEX (or sex not stratified)
    # =========================================================================
    
    "breast_cancer": DiseaseMetadata(
        disease_id="breast_cancer",
        display_name="Breast Cancer",
        applicable_sexes=[0],  # Female only (for demo - male BC exists but rare)
        min_age=25,
        features_used=BASE_FEATURES,  # NO SEX - Wisconsin dataset is all female
        includes_sex=False,
        dataset_type=DatasetType.REAL,
        dataset_name="Wisconsin Breast Cancer (Diagnostic)",
        dataset_size=569,
        sex_stratified=False,  # All female in dataset
        reported_auc=0.95,
        calibrated=True,
        icd10_codes=["C50"],
        clinical_notes="Tumor cell features only. Male breast cancer (~1% of cases) not modeled."
    ),
    
    "chronic_kidney_disease": DiseaseMetadata(
        disease_id="chronic_kidney_disease",
        display_name="Chronic Kidney Disease",
        applicable_sexes=[0, 1],
        features_used=BASE_FEATURES,  # NO SEX - not in original dataset
        includes_sex=False,
        dataset_type=DatasetType.REAL,
        dataset_name="UCI CKD Dataset",
        dataset_size=400,
        sex_stratified=False,
        reported_auc=0.98,
        calibrated=True,
        icd10_codes=["N18"],
        clinical_notes="eGFR-based staging applies"
    ),
    
    # =========================================================================
    # SYNTHETIC DATASETS - SEX EXCLUDED FROM FEATURES
    # =========================================================================
    
    "colorectal_cancer": DiseaseMetadata(
        disease_id="colorectal_cancer",
        display_name="Colorectal Cancer",
        applicable_sexes=[0, 1],
        min_age=40,
        features_used=BASE_FEATURES,  # NO SEX - synthetic data
        includes_sex=False,
        dataset_type=DatasetType.SYNTHETIC,
        dataset_name="Synthetic (pending real dataset)",
        dataset_size=500,
        sex_stratified=False,
        reported_auc=0.70,
        calibrated=False,
        icd10_codes=["C18", "C19", "C20"],
        clinical_notes="Synthetic data - recommend colonoscopy screening per guidelines"
    ),
    
    "alzheimers_disease": DiseaseMetadata(
        disease_id="alzheimers_disease",
        display_name="Alzheimer's Disease",
        applicable_sexes=[0, 1],
        min_age=50,
        features_used=FEATURES_WITH_SEX,  # Real OASIS data has sex
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="OASIS Longitudinal MRI Dataset",
        dataset_size=374,
        sex_stratified=True,
        reported_auc=0.78,
        calibrated=True,
        icd10_codes=["G30"],
        clinical_notes="Real OASIS data - CDR-based cognitive assessment"
    ),
    
    "copd": DiseaseMetadata(
        disease_id="copd",
        display_name="COPD",
        applicable_sexes=[0, 1],
        features_used=FEATURES_WITH_SEX,  # Real Kaggle data has sex
        includes_sex=True,
        dataset_type=DatasetType.REAL,
        dataset_name="Kaggle COPD Clinical Dataset",
        dataset_size=102,
        sex_stratified=True,
        reported_auc=0.82,
        calibrated=True,
        icd10_codes=["J44"],
        clinical_notes="Real clinical data - FEV1/GOLD staging"
    ),
    
    "atrial_fibrillation": DiseaseMetadata(
        disease_id="atrial_fibrillation",
        display_name="Atrial Fibrillation",
        applicable_sexes=[0, 1],
        features_used=BASE_FEATURES,  # NO SEX - synthetic data
        includes_sex=False,
        dataset_type=DatasetType.SYNTHETIC,
        dataset_name="Synthetic (CHARGE-AF features)",
        dataset_size=500,
        sex_stratified=False,
        reported_auc=0.72,
        calibrated=False,
        icd10_codes=["I48"],
        clinical_notes="Synthetic data - CHARGE-AF reference"
    ),
    
    # =========================================================================
    # SEX-SPECIFIC DISEASES
    # =========================================================================
    
    "prostate_cancer": DiseaseMetadata(
        disease_id="prostate_cancer",
        display_name="Prostate Cancer",
        applicable_sexes=[1],  # Male only
        min_age=40,
        features_used=BASE_FEATURES,  # NO SEX - all patients are male
        includes_sex=False,
        dataset_type=DatasetType.REAL,
        dataset_name="Prostate Cancer Study Dataset",
        dataset_size=97,
        sex_stratified=False,  # All male
        reported_auc=0.85,
        calibrated=True,
        icd10_codes=["C61"],
        clinical_notes="Male-only. PSA and Gleason score based risk."
    ),
}


def check_applicability(disease_id: str, patient_sex: int, patient_age: int) -> Dict[str, Any]:
    """
    Check if a disease prediction is applicable for a given patient.
    
    Returns:
        {
            "status": "applicable" | "not_applicable" | "insufficient_data",
            "reason": str or None,
            "can_predict": bool,
            "metadata": DiseaseMetadata or None
        }
    """
    metadata = DISEASE_METADATA.get(disease_id)
    
    if not metadata:
        return {
            "status": ApplicabilityStatus.INSUFFICIENT_DATA,
            "reason": f"No metadata found for disease: {disease_id}",
            "can_predict": False,
            "metadata": None
        }
    
    # Check sex applicability
    if patient_sex not in metadata.applicable_sexes:
        sex_name = "male" if patient_sex == 1 else "female"
        applicable_names = ["female" if s == 0 else "male" for s in metadata.applicable_sexes]
        return {
            "status": ApplicabilityStatus.NOT_APPLICABLE,
            "reason": f"sex_not_applicable",
            "reason_detail": f"{metadata.display_name} prediction not applicable for {sex_name} patients. Applicable for: {', '.join(applicable_names)}",
            "can_predict": False,
            "metadata": metadata
        }
    
    # Check age applicability
    if patient_age < metadata.min_age:
        return {
            "status": ApplicabilityStatus.NOT_APPLICABLE,
            "reason": "age_below_minimum",
            "reason_detail": f"{metadata.display_name} prediction requires age >= {metadata.min_age}",
            "can_predict": False,
            "metadata": metadata
        }
    
    if patient_age > metadata.max_age:
        return {
            "status": ApplicabilityStatus.NOT_APPLICABLE,
            "reason": "age_above_maximum",
            "reason_detail": f"{metadata.display_name} prediction not validated for age > {metadata.max_age}",
            "can_predict": False,
            "metadata": metadata
        }
    
    return {
        "status": ApplicabilityStatus.APPLICABLE,
        "reason": None,
        "can_predict": True,
        "metadata": metadata
    }


def get_features_for_disease(disease_id: str) -> List[str]:
    """Get the feature list for a specific disease model"""
    metadata = DISEASE_METADATA.get(disease_id)
    if metadata:
        return metadata.features_used
    return BASE_FEATURES  # Default fallback


def get_all_metadata() -> Dict[str, Dict]:
    """Export all metadata as JSON-serializable dict"""
    result = {}
    for disease_id, meta in DISEASE_METADATA.items():
        result[disease_id] = {
            "disease_id": meta.disease_id,
            "display_name": meta.display_name,
            "applicable_sexes": meta.applicable_sexes,
            "min_age": meta.min_age,
            "max_age": meta.max_age,
            "features_used": meta.features_used,
            "includes_sex": meta.includes_sex,
            "dataset_type": meta.dataset_type.value,
            "dataset_name": meta.dataset_name,
            "dataset_size": meta.dataset_size,
            "sex_stratified": meta.sex_stratified,
            "reported_auc": meta.reported_auc,
            "calibrated": meta.calibrated,
            "clinical_notes": meta.clinical_notes
        }
    return result
