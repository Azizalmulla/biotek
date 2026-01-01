"""
FHIR/EHR Integration Module for BioTeK
Supports SMART on FHIR for Epic, Cerner, and other EHR systems

Standards implemented:
- FHIR R4 (HL7 FHIR Release 4)
- SMART on FHIR (OAuth2-based app launch)
- CDS Hooks (Clinical Decision Support)
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import json


# =============================================================================
# FHIR RESOURCE MAPPINGS
# Maps FHIR resources to our internal patient model
# =============================================================================

@dataclass
class FHIRPatientData:
    """Extracted patient data from FHIR resources"""
    # Demographics
    patient_id: str
    age: Optional[float] = None
    sex: Optional[int] = None  # 0=Female, 1=Male
    birth_date: Optional[str] = None
    
    # Vitals (from Observation resources)
    bmi: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    heart_rate: Optional[float] = None
    
    # Labs (from Observation resources)
    hba1c: Optional[float] = None
    hdl: Optional[float] = None
    ldl: Optional[float] = None
    total_cholesterol: Optional[float] = None
    triglycerides: Optional[float] = None
    fasting_glucose: Optional[float] = None
    creatinine: Optional[float] = None
    egfr: Optional[float] = None
    
    # Conditions (from Condition resources)
    has_diabetes: Optional[int] = None
    has_hypertension: Optional[int] = None
    has_ckd: Optional[int] = None
    has_afib: Optional[int] = None
    
    # Medications (from MedicationStatement resources)
    on_bp_medication: Optional[int] = None
    on_statin: Optional[int] = None
    on_antidiabetic: Optional[int] = None
    
    # Social History
    smoking_pack_years: Optional[float] = None
    
    # Metadata
    data_source: str = "FHIR"
    last_updated: Optional[str] = None


# LOINC codes for common observations
LOINC_CODES = {
    # Vitals
    "85354-9": "bp_systolic_diastolic",  # Blood pressure panel
    "8480-6": "bp_systolic",              # Systolic BP
    "8462-4": "bp_diastolic",             # Diastolic BP
    "8867-4": "heart_rate",               # Heart rate
    "39156-5": "bmi",                     # BMI
    "29463-7": "weight",                  # Body weight
    "8302-2": "height",                   # Body height
    
    # Lipids
    "2093-3": "total_cholesterol",        # Total cholesterol
    "2085-9": "hdl",                      # HDL
    "2089-1": "ldl",                      # LDL calculated
    "13457-7": "ldl_direct",              # LDL direct
    "2571-8": "triglycerides",            # Triglycerides
    
    # Glycemic
    "4548-4": "hba1c",                    # HbA1c
    "17856-6": "hba1c_alt",               # HbA1c (alternate)
    "1558-6": "fasting_glucose",          # Fasting glucose
    "2345-7": "glucose",                  # Glucose
    
    # Kidney
    "2160-0": "creatinine",               # Creatinine
    "33914-3": "egfr",                    # eGFR
    "48642-3": "egfr_alt",                # eGFR (alternate)
    "14959-1": "microalbumin",            # Microalbumin
}

# SNOMED codes for conditions
SNOMED_CONDITIONS = {
    "73211009": "has_diabetes",           # Diabetes mellitus
    "44054006": "has_diabetes",           # Type 2 diabetes
    "38341003": "has_hypertension",       # Hypertensive disorder
    "59621000": "has_hypertension",       # Essential hypertension
    "709044004": "has_ckd",               # Chronic kidney disease
    "49436004": "has_afib",               # Atrial fibrillation
    "84114007": "has_heart_failure",      # Heart failure
}

# Medication classes (RxNorm or ATC codes)
MEDICATION_CLASSES = {
    # Antihypertensives
    "antihypertensive": ["lisinopril", "amlodipine", "losartan", "metoprolol", 
                         "hydrochlorothiazide", "atenolol", "valsartan"],
    # Statins
    "statin": ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"],
    # Antidiabetics
    "antidiabetic": ["metformin", "glipizide", "insulin", "sitagliptin", 
                     "empagliflozin", "liraglutide"],
}


def parse_fhir_patient(patient_resource: Dict[str, Any]) -> FHIRPatientData:
    """
    Parse FHIR Patient resource to extract demographics
    
    Args:
        patient_resource: FHIR Patient resource as dict
        
    Returns:
        FHIRPatientData with demographics filled in
    """
    data = FHIRPatientData(
        patient_id=patient_resource.get("id", "unknown")
    )
    
    # Extract birth date and calculate age
    if "birthDate" in patient_resource:
        data.birth_date = patient_resource["birthDate"]
        try:
            birth = datetime.strptime(data.birth_date, "%Y-%m-%d")
            today = datetime.now()
            data.age = (today - birth).days / 365.25
        except:
            pass
    
    # Extract sex
    gender = patient_resource.get("gender", "").lower()
    if gender == "female":
        data.sex = 0
    elif gender == "male":
        data.sex = 1
    
    return data


def parse_fhir_observations(observations: List[Dict[str, Any]], 
                            patient_data: FHIRPatientData) -> FHIRPatientData:
    """
    Parse FHIR Observation resources to extract vitals and labs
    
    Args:
        observations: List of FHIR Observation resources
        patient_data: Existing patient data to update
        
    Returns:
        Updated FHIRPatientData with vitals and labs
    """
    for obs in observations:
        # Get LOINC code
        code = None
        if "code" in obs and "coding" in obs["code"]:
            for coding in obs["code"]["coding"]:
                if coding.get("system") == "http://loinc.org":
                    code = coding.get("code")
                    break
        
        if not code or code not in LOINC_CODES:
            continue
        
        field_name = LOINC_CODES[code]
        
        # Extract value
        value = None
        if "valueQuantity" in obs:
            value = obs["valueQuantity"].get("value")
        elif "valueCodeableConcept" in obs:
            # Handle coded values (like smoking status)
            pass
        
        if value is None:
            continue
        
        # Map to patient data field
        if field_name == "bp_systolic":
            patient_data.bp_systolic = float(value)
        elif field_name == "bp_diastolic":
            patient_data.bp_diastolic = float(value)
        elif field_name == "heart_rate":
            patient_data.heart_rate = float(value)
        elif field_name == "bmi":
            patient_data.bmi = float(value)
        elif field_name == "total_cholesterol":
            patient_data.total_cholesterol = float(value)
        elif field_name == "hdl":
            patient_data.hdl = float(value)
        elif field_name in ["ldl", "ldl_direct"]:
            patient_data.ldl = float(value)
        elif field_name == "triglycerides":
            patient_data.triglycerides = float(value)
        elif field_name in ["hba1c", "hba1c_alt"]:
            patient_data.hba1c = float(value)
        elif field_name in ["fasting_glucose", "glucose"]:
            patient_data.fasting_glucose = float(value)
        elif field_name == "creatinine":
            patient_data.creatinine = float(value)
        elif field_name in ["egfr", "egfr_alt"]:
            patient_data.egfr = float(value)
    
    return patient_data


def parse_fhir_conditions(conditions: List[Dict[str, Any]], 
                          patient_data: FHIRPatientData) -> FHIRPatientData:
    """
    Parse FHIR Condition resources to extract diagnoses
    
    Args:
        conditions: List of FHIR Condition resources
        patient_data: Existing patient data to update
        
    Returns:
        Updated FHIRPatientData with condition flags
    """
    for condition in conditions:
        # Only consider active conditions
        clinical_status = condition.get("clinicalStatus", {})
        if isinstance(clinical_status, dict):
            status_code = clinical_status.get("coding", [{}])[0].get("code", "")
            if status_code not in ["active", "recurrence", "relapse"]:
                continue
        
        # Get SNOMED code
        code = None
        if "code" in condition and "coding" in condition["code"]:
            for coding in condition["code"]["coding"]:
                if "snomed" in coding.get("system", "").lower():
                    code = coding.get("code")
                    break
        
        if code and code in SNOMED_CONDITIONS:
            field_name = SNOMED_CONDITIONS[code]
            setattr(patient_data, field_name, 1)
    
    return patient_data


def parse_fhir_medications(medications: List[Dict[str, Any]], 
                           patient_data: FHIRPatientData) -> FHIRPatientData:
    """
    Parse FHIR MedicationStatement/MedicationRequest resources
    
    Args:
        medications: List of FHIR medication resources
        patient_data: Existing patient data to update
        
    Returns:
        Updated FHIRPatientData with medication flags
    """
    for med in medications:
        # Get medication name
        med_name = ""
        if "medicationCodeableConcept" in med:
            med_name = med["medicationCodeableConcept"].get("text", "").lower()
        elif "medicationReference" in med:
            # Would need to resolve reference
            pass
        
        # Check medication classes
        for med_class, drug_names in MEDICATION_CLASSES.items():
            if any(drug in med_name for drug in drug_names):
                if med_class == "antihypertensive":
                    patient_data.on_bp_medication = 1
                elif med_class == "statin":
                    patient_data.on_statin = 1
                elif med_class == "antidiabetic":
                    patient_data.on_antidiabetic = 1
    
    return patient_data


def fhir_bundle_to_patient(bundle: Dict[str, Any]) -> FHIRPatientData:
    """
    Convert a FHIR Bundle containing patient data to our format
    
    Args:
        bundle: FHIR Bundle resource with Patient, Observations, Conditions, etc.
        
    Returns:
        FHIRPatientData ready for risk prediction
    """
    patient_data = None
    observations = []
    conditions = []
    medications = []
    
    # Sort resources by type
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        resource_type = resource.get("resourceType")
        
        if resource_type == "Patient":
            patient_data = parse_fhir_patient(resource)
        elif resource_type == "Observation":
            observations.append(resource)
        elif resource_type == "Condition":
            conditions.append(resource)
        elif resource_type in ["MedicationStatement", "MedicationRequest"]:
            medications.append(resource)
    
    if patient_data is None:
        patient_data = FHIRPatientData(patient_id="unknown")
    
    # Parse additional resources
    patient_data = parse_fhir_observations(observations, patient_data)
    patient_data = parse_fhir_conditions(conditions, patient_data)
    patient_data = parse_fhir_medications(medications, patient_data)
    
    patient_data.last_updated = datetime.now().isoformat()
    
    return patient_data


def patient_data_to_api_input(fhir_data: FHIRPatientData) -> Dict[str, Any]:
    """
    Convert FHIRPatientData to our API's MultiDiseaseInput format
    
    Args:
        fhir_data: Parsed FHIR patient data
        
    Returns:
        Dict compatible with /predict/multi-disease endpoint
    """
    # Only include non-None values
    result = {}
    
    # Required fields (must have values)
    if fhir_data.age is not None:
        result["age"] = fhir_data.age
    if fhir_data.sex is not None:
        result["sex"] = fhir_data.sex
    if fhir_data.bmi is not None:
        result["bmi"] = fhir_data.bmi
    if fhir_data.bp_systolic is not None:
        result["bp_systolic"] = fhir_data.bp_systolic
    if fhir_data.bp_diastolic is not None:
        result["bp_diastolic"] = fhir_data.bp_diastolic
    
    # Optional fields
    if fhir_data.hba1c is not None:
        result["hba1c"] = fhir_data.hba1c
    if fhir_data.hdl is not None:
        result["hdl"] = fhir_data.hdl
    if fhir_data.ldl is not None:
        result["ldl"] = fhir_data.ldl
    if fhir_data.total_cholesterol is not None:
        result["total_cholesterol"] = fhir_data.total_cholesterol
    if fhir_data.triglycerides is not None:
        result["triglycerides"] = fhir_data.triglycerides
    if fhir_data.fasting_glucose is not None:
        result["fasting_glucose"] = fhir_data.fasting_glucose
    if fhir_data.creatinine is not None:
        result["creatinine"] = fhir_data.creatinine
    if fhir_data.egfr is not None:
        result["egfr"] = fhir_data.egfr
    if fhir_data.has_diabetes is not None:
        result["has_diabetes"] = fhir_data.has_diabetes
    if fhir_data.on_bp_medication is not None:
        result["on_bp_medication"] = fhir_data.on_bp_medication
    if fhir_data.smoking_pack_years is not None:
        result["smoking_pack_years"] = fhir_data.smoking_pack_years
    
    return result


# =============================================================================
# SMART ON FHIR APP CONFIGURATION
# =============================================================================

SMART_APP_CONFIG = {
    "client_id": "biotek-risk-predictor",
    "client_name": "BioTeK Multi-Disease Risk Predictor",
    "redirect_uris": [
        "http://localhost:3000/callback",
        "https://biotek.app/callback"
    ],
    "scope": "patient/*.read launch/patient openid fhirUser",
    "response_types": ["code"],
    "grant_types": ["authorization_code"],
    "token_endpoint_auth_method": "client_secret_basic"
}


# =============================================================================
# CDS HOOKS SERVICE
# Clinical Decision Support Hooks for EHR integration
# =============================================================================

CDS_HOOKS_DISCOVERY = {
    "services": [
        {
            "hook": "patient-view",
            "title": "BioTeK Multi-Disease Risk Assessment",
            "description": "Provides 13-disease risk prediction when viewing a patient",
            "id": "biotek-risk-assessment",
            "prefetch": {
                "patient": "Patient/{{context.patientId}}",
                "conditions": "Condition?patient={{context.patientId}}&clinical-status=active",
                "observations": "Observation?patient={{context.patientId}}&category=vital-signs,laboratory&_sort=-date&_count=50",
                "medications": "MedicationStatement?patient={{context.patientId}}&status=active"
            }
        }
    ]
}


def create_cds_response(predictions: Dict[str, Any], 
                        patient_id: str) -> Dict[str, Any]:
    """
    Create a CDS Hooks response from our predictions
    
    Args:
        predictions: Output from /predict/multi-disease endpoint
        patient_id: FHIR patient ID
        
    Returns:
        CDS Hooks response with cards
    """
    cards = []
    
    summary = predictions.get("summary", {})
    high_risk = summary.get("high_risk_diseases", [])
    data_quality = predictions.get("data_quality", {})
    
    # Main risk summary card
    if high_risk:
        cards.append({
            "uuid": f"biotek-risk-{patient_id}",
            "summary": f"⚠️ High risk detected for {len(high_risk)} conditions",
            "detail": f"Patient shows elevated risk for: {', '.join(high_risk)}. " +
                     "Click for detailed risk breakdown and recommendations.",
            "indicator": "critical" if len(high_risk) >= 3 else "warning",
            "source": {
                "label": "BioTeK Risk Predictor",
                "url": "https://biotek.app"
            },
            "links": [
                {
                    "label": "View Full Risk Report",
                    "url": f"https://biotek.app/patient/{patient_id}/risk",
                    "type": "absolute"
                }
            ]
        })
    else:
        cards.append({
            "uuid": f"biotek-risk-{patient_id}",
            "summary": "✓ No high-risk conditions detected",
            "detail": "Patient's risk profile is within normal limits. " +
                     "Continue routine preventive care.",
            "indicator": "info",
            "source": {
                "label": "BioTeK Risk Predictor"
            }
        })
    
    # Data quality warning if needed
    completeness = data_quality.get("completeness", 1.0)
    if completeness < 0.7:
        cards.append({
            "uuid": f"biotek-data-{patient_id}",
            "summary": "📊 Incomplete data may affect prediction accuracy",
            "detail": f"Only {completeness*100:.0f}% of recommended data available. " +
                     f"Missing: {', '.join(data_quality.get('imputed_fields', [])[:3])}. " +
                     "Consider ordering recommended tests.",
            "indicator": "info",
            "source": {
                "label": "BioTeK Risk Predictor"
            },
            "suggestions": [
                {
                    "label": "Order Lipid Panel",
                    "uuid": "order-lipid-panel",
                    "actions": []  # Would include FHIR actions to create orders
                }
            ] if "hdl" in data_quality.get("imputed_fields", []) else []
        })
    
    return {"cards": cards}
