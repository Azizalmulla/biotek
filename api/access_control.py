"""
BioTeK Access Control System
Implements RBAC + Purpose-Based Access (Hippocratic Database Model)
"""

from enum import Enum
from typing import Set, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

class Role(str, Enum):
    """User roles in the system"""
    DOCTOR = "doctor"
    NURSE = "nurse"
    RESEARCHER = "researcher"
    ADMIN = "admin"
    PATIENT = "patient"
    RECEPTIONIST = "receptionist"

class Purpose(str, Enum):
    """Access purposes for data"""
    TREATMENT = "treatment"
    RESEARCH = "research"
    BILLING = "billing"
    QUALITY_IMPROVEMENT = "quality_improvement"
    REGISTRATION = "registration"
    EMERGENCY = "emergency"

class DataType(str, Enum):
    """Types of data in the system"""
    CLINICAL = "clinical"
    GENETIC = "genetic"
    PREDICTIONS = "predictions"
    DEMOGRAPHICS = "demographics"
    AUDIT_LOGS = "audit_logs"
    ANONYMIZED_CLINICAL = "anonymized_clinical"
    MODEL_INFO = "model_info"

class AccessRequest(BaseModel):
    """Access request with role and purpose"""
    user_id: str
    role: Role
    purpose: Purpose
    data_type: DataType
    patient_id: Optional[str] = None
    timestamp: datetime = datetime.now()

class AccessDecision(BaseModel):
    """Result of access control check"""
    granted: bool
    reason: str
    conditions: Optional[dict] = None

# =============================================================================
# ACCESS CONTROL MATRIX - Hospital-Realistic Role Permissions
# =============================================================================
# Format: (Role, Purpose) -> Set of allowed data types
#
# IMPORTANT: This matrix controls SERVER-SIDE access. UI filtering is secondary.
# =============================================================================

ACCESS_POLICIES = {
    # =========================================================================
    # DOCTOR - Full clinical access
    # =========================================================================
    # Can: Full predictions, genetics, imaging, AI insights, create/modify
    (Role.DOCTOR, Purpose.TREATMENT): {
        DataType.CLINICAL,
        DataType.GENETIC,
        DataType.PREDICTIONS,
        DataType.DEMOGRAPHICS,
    },
    (Role.DOCTOR, Purpose.QUALITY_IMPROVEMENT): {
        DataType.ANONYMIZED_CLINICAL,
        DataType.PREDICTIONS,
        DataType.MODEL_INFO,
    },
    (Role.DOCTOR, Purpose.EMERGENCY): {
        DataType.CLINICAL,
        DataType.GENETIC,
        DataType.PREDICTIONS,
        DataType.DEMOGRAPHICS,
    },
    
    # =========================================================================
    # NURSE - Read-only clinical, NO ML internals, NO genetics raw data
    # =========================================================================
    # Can: Patient-visible results, labs, vitals, summaries
    # Cannot: Create predictions, access ML weights, genetic variants
    (Role.NURSE, Purpose.TREATMENT): {
        DataType.CLINICAL,
        DataType.DEMOGRAPHICS,
        DataType.PREDICTIONS,  # But API returns patient_summary only for nurses
    },
    (Role.NURSE, Purpose.EMERGENCY): {
        DataType.CLINICAL,
        DataType.DEMOGRAPHICS,
        DataType.PREDICTIONS,
        # NOTE: Genetic access removed - nurses get patient-safe summary only
    },
    
    # =========================================================================
    # RESEARCHER - Anonymized/aggregated ONLY, NO patient identifiers
    # =========================================================================
    # Can: Anonymized clinical data, model info, aggregate statistics
    # Cannot: Direct patient data, per-patient predictions, genetic data
    (Role.RESEARCHER, Purpose.RESEARCH): {
        DataType.ANONYMIZED_CLINICAL,
        DataType.MODEL_INFO,
    },
    (Role.RESEARCHER, Purpose.QUALITY_IMPROVEMENT): {
        DataType.ANONYMIZED_CLINICAL,
        DataType.MODEL_INFO,
        # NOTE: PREDICTIONS removed - researchers cannot access patient predictions
    },
    
    # =========================================================================
    # ADMIN - System metrics, audit trail, NO clinical decisions
    # =========================================================================
    # Can: Audit logs, system metrics, model info
    # Cannot: Patient predictions, clinical data, genetic data
    (Role.ADMIN, Purpose.QUALITY_IMPROVEMENT): {
        DataType.AUDIT_LOGS,
        DataType.MODEL_INFO,
        # NOTE: ANONYMIZED_CLINICAL removed - admins don't need clinical data
    },
    
    # =========================================================================
    # PATIENT - Own data ONLY, patient_summary_json ONLY
    # =========================================================================
    # Can: Their own predictions (sanitized), their own clinical data
    # Cannot: Other patients, ML internals, raw genetic variants
    (Role.PATIENT, Purpose.TREATMENT): {
        DataType.CLINICAL,      # Own clinical data only
        DataType.PREDICTIONS,   # API returns patient_summary_json only
        # NOTE: GENETIC removed - patients see patient-safe summaries only
    },
    
    # =========================================================================
    # RECEPTIONIST - Registration/scheduling ONLY, NO medical data
    # =========================================================================
    # Can: Patient demographics for registration/scheduling
    # Cannot: Predictions, clinical data, genetics, imaging
    (Role.RECEPTIONIST, Purpose.REGISTRATION): {
        DataType.DEMOGRAPHICS,
    },
    (Role.RECEPTIONIST, Purpose.BILLING): {
        DataType.DEMOGRAPHICS,
    },
}

# =============================================================================
# ROLE CAPABILITIES SUMMARY (for documentation)
# =============================================================================
ROLE_CAPABILITIES = {
    "doctor": {
        "predictions": "full_access",           # Full prediction_json
        "genetics": "full_access",              # ACMG/AMP, pharmacogenomics
        "imaging": "full_access",               # AI analysis, findings
        "ai_insights": "full_access",           # Reasoning, treatment optimizer
        "can_create_predictions": True,
        "can_set_visibility": True,             # patient_visible / doctor_only
    },
    "nurse": {
        "predictions": "patient_summary_only",  # No ML internals
        "genetics": "none",                     # No genetic data
        "imaging": "summary_only",              # No raw analysis
        "ai_insights": "none",
        "can_create_predictions": False,
        "can_set_visibility": False,
    },
    "patient": {
        "predictions": "own_patient_summary",   # Own data, sanitized
        "genetics": "patient_safe_only",        # Approved summaries only
        "imaging": "none",
        "ai_insights": "none",
        "can_create_predictions": False,
        "can_set_visibility": False,
    },
    "researcher": {
        "predictions": "anonymized_aggregate",  # No patient identifiers
        "genetics": "none",
        "imaging": "none",
        "ai_insights": "none",
        "can_create_predictions": False,
        "can_set_visibility": False,
    },
    "admin": {
        "predictions": "none",                  # No clinical data
        "genetics": "none",
        "imaging": "none",
        "ai_insights": "none",
        "audit_logs": "full_access",
        "system_metrics": "full_access",
        "can_create_predictions": False,
        "can_set_visibility": False,
    },
    "receptionist": {
        "predictions": "none",
        "genetics": "none",
        "imaging": "none",
        "ai_insights": "none",
        "demographics": "read_write",           # Registration only
        "can_create_predictions": False,
        "can_set_visibility": False,
    },
}

def check_access(request: AccessRequest) -> AccessDecision:
    """
    Check if access should be granted based on RBAC + Purpose
    
    Args:
        request: AccessRequest with role, purpose, and data type
        
    Returns:
        AccessDecision with granted status and reason
    """
    # Get allowed data types for this role-purpose combination
    allowed_data_types = ACCESS_POLICIES.get((request.role, request.purpose), set())
    
    if request.data_type in allowed_data_types:
        # Additional checks for sensitive data
        if request.data_type == DataType.GENETIC:
            # Genetic data requires explicit patient consent
            if request.purpose not in [Purpose.TREATMENT, Purpose.EMERGENCY]:
                return AccessDecision(
                    granted=False,
                    reason=f"Genetic data access requires treatment or emergency purpose. Current: {request.purpose}"
                )
        
        return AccessDecision(
            granted=True,
            reason=f"Access granted: {request.role} can access {request.data_type} for {request.purpose}",
            conditions={
                "max_duration_hours": 24 if request.purpose == Purpose.TREATMENT else None,
                "requires_audit": True,
            }
        )
    
    return AccessDecision(
        granted=False,
        reason=f"Access denied: {request.role} cannot access {request.data_type} for {request.purpose}"
    )

def get_allowed_purposes(role: Role) -> Set[Purpose]:
    """Get all valid purposes for a given role"""
    purposes = set()
    for (r, p), _ in ACCESS_POLICIES.items():
        if r == role:
            purposes.add(p)
    return purposes

def get_allowed_data_types(role: Role, purpose: Purpose) -> Set[DataType]:
    """Get all data types accessible for a role-purpose combination"""
    return ACCESS_POLICIES.get((role, purpose), set())
