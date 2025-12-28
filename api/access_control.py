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

# Access Control Matrix
# Format: (Role, Purpose) -> Set of allowed data types
ACCESS_POLICIES = {
    # Doctors
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
    
    # Nurses
    (Role.NURSE, Purpose.TREATMENT): {
        DataType.CLINICAL,
        DataType.DEMOGRAPHICS,
        DataType.PREDICTIONS,
    },
    (Role.NURSE, Purpose.EMERGENCY): {
        DataType.CLINICAL,
        DataType.GENETIC,
        DataType.DEMOGRAPHICS,
        DataType.PREDICTIONS,
    },
    
    # Researchers
    (Role.RESEARCHER, Purpose.RESEARCH): {
        DataType.ANONYMIZED_CLINICAL,
        DataType.MODEL_INFO,
    },
    (Role.RESEARCHER, Purpose.QUALITY_IMPROVEMENT): {
        DataType.ANONYMIZED_CLINICAL,
        DataType.MODEL_INFO,
        DataType.PREDICTIONS,
    },
    
    # Admin
    (Role.ADMIN, Purpose.QUALITY_IMPROVEMENT): {
        DataType.AUDIT_LOGS,
        DataType.MODEL_INFO,
        DataType.ANONYMIZED_CLINICAL,
    },
    
    # Patients
    (Role.PATIENT, Purpose.TREATMENT): {
        DataType.CLINICAL,
        DataType.GENETIC,
        DataType.PREDICTIONS,
    },
    
    # Receptionist
    (Role.RECEPTIONIST, Purpose.REGISTRATION): {
        DataType.DEMOGRAPHICS,
    },
    (Role.RECEPTIONIST, Purpose.BILLING): {
        DataType.DEMOGRAPHICS,
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
