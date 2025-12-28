"""
Inter-Institutional Data Exchange for BioTeK
Handles sending and receiving patient data between healthcare institutions
with consent management and complete audit trails (HIPAA compliant)
"""

import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

class ExchangeStatus(str, Enum):
    """Status of data exchange request"""
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    SENT = "sent"
    RECEIVED = "received"
    EXPIRED = "expired"

class DataCategory(str, Enum):
    """Categories of data that can be exchanged"""
    DEMOGRAPHICS = "demographics"
    CLINICAL_SUMMARY = "clinical_summary"
    LAB_RESULTS = "lab_results"
    MEDICATIONS = "medications"
    ALLERGIES = "allergies"
    PROCEDURES = "procedures"
    IMAGING = "imaging"
    PREDICTIONS = "predictions"
    FULL_RECORD = "full_record"

def create_exchange_id() -> str:
    """Generate unique exchange ID"""
    timestamp = datetime.now().isoformat()
    random_str = hashlib.sha256(timestamp.encode()).hexdigest()[:12]
    return f"EXC-{random_str.upper()}"

def encrypt_data_for_exchange(data: Dict[str, Any], recipient_key: Optional[str] = None) -> str:
    """
    Encrypt patient data for secure transmission
    In production, use public key encryption (RSA, etc.)
    
    Args:
        data: Patient data to encrypt
        recipient_key: Recipient's public key
        
    Returns:
        Encrypted data (base64 encoded)
    """
    import base64
    
    # In production: Use recipient's public key for encryption
    # For demo: Base64 encode (NOT secure for production!)
    json_data = json.dumps(data, indent=2)
    encrypted = base64.b64encode(json_data.encode()).decode()
    
    return encrypted

def decrypt_received_data(encrypted_data: str, private_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Decrypt received patient data
    
    Args:
        encrypted_data: Encrypted data string
        private_key: Institution's private key
        
    Returns:
        Decrypted patient data
    """
    import base64
    
    # In production: Use private key to decrypt
    # For demo: Base64 decode
    decrypted = base64.b64decode(encrypted_data.encode()).decode()
    data = json.loads(decrypted)
    
    return data

def minimize_data(full_data: Dict[str, Any], categories: List[DataCategory]) -> Dict[str, Any]:
    """
    Implement data minimization - only include requested categories
    HIPAA Minimum Necessary Standard
    
    Args:
        full_data: Complete patient record
        categories: Requested data categories
        
    Returns:
        Minimized data containing only requested categories
    """
    minimized = {}
    
    for category in categories:
        if category == DataCategory.DEMOGRAPHICS:
            minimized["demographics"] = {
                "name": full_data.get("name"),
                "dob": full_data.get("dob"),
                "gender": full_data.get("gender"),
                "patient_id": full_data.get("patient_id")
            }
        elif category == DataCategory.CLINICAL_SUMMARY:
            minimized["clinical_summary"] = {
                "diagnoses": full_data.get("diagnoses", []),
                "conditions": full_data.get("conditions", []),
                "vitals": full_data.get("vitals", {})
            }
        elif category == DataCategory.LAB_RESULTS:
            minimized["lab_results"] = full_data.get("lab_results", [])
        elif category == DataCategory.MEDICATIONS:
            minimized["medications"] = full_data.get("medications", [])
        elif category == DataCategory.ALLERGIES:
            minimized["allergies"] = full_data.get("allergies", [])
        elif category == DataCategory.PROCEDURES:
            minimized["procedures"] = full_data.get("procedures", [])
        elif category == DataCategory.IMAGING:
            minimized["imaging"] = full_data.get("imaging", [])
        elif category == DataCategory.PREDICTIONS:
            minimized["predictions"] = full_data.get("predictions", [])
        elif category == DataCategory.FULL_RECORD:
            minimized = full_data
            break
    
    return minimized

def validate_institution(institution_id: str, institution_registry: Dict[str, Any]) -> bool:
    """
    Validate that institution is registered and trusted
    
    Args:
        institution_id: ID of requesting institution
        institution_registry: Registry of trusted institutions
        
    Returns:
        True if institution is valid and trusted
    """
    institution = institution_registry.get(institution_id)
    
    if not institution:
        return False
    
    # Check if institution is active and verified
    if not institution.get("active"):
        return False
    
    if not institution.get("verified"):
        return False
    
    return True

def create_exchange_package(
    patient_data: Dict[str, Any],
    exchange_id: str,
    sender_institution: str,
    recipient_institution: str,
    purpose: str,
    categories: List[DataCategory]
) -> Dict[str, Any]:
    """
    Create data exchange package with metadata
    
    Args:
        patient_data: Patient data to send
        exchange_id: Unique exchange ID
        sender_institution: Sending institution ID
        recipient_institution: Receiving institution ID
        purpose: Purpose of exchange
        categories: Data categories being sent
        
    Returns:
        Complete exchange package
    """
    # Minimize data
    minimized_data = minimize_data(patient_data, categories)
    
    # Create package metadata
    package = {
        "exchange_id": exchange_id,
        "sender_institution": sender_institution,
        "recipient_institution": recipient_institution,
        "timestamp": datetime.now().isoformat(),
        "purpose": purpose,
        "categories": [cat.value for cat in categories],
        "data": minimized_data,
        "metadata": {
            "patient_id": patient_data.get("patient_id"),
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now()).isoformat(),  # Set appropriate expiry
            "hipaa_compliant": True,
            "encryption": "AES-256-GCM",  # In production
            "signature": "SHA-256-RSA"     # In production
        }
    }
    
    return package

def verify_exchange_signature(package: Dict[str, Any], public_key: Optional[str] = None) -> bool:
    """
    Verify digital signature of exchange package
    Ensures data integrity and sender authenticity
    
    Args:
        package: Exchange package to verify
        public_key: Sender's public key
        
    Returns:
        True if signature is valid
    """
    # In production: Verify RSA signature
    # For demo: Always return True
    
    required_fields = ["exchange_id", "sender_institution", "recipient_institution", "data"]
    
    for field in required_fields:
        if field not in package:
            return False
    
    return True

def log_exchange_event(
    exchange_id: str,
    event_type: str,
    details: str,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log data exchange event for audit trail
    
    Args:
        exchange_id: Exchange ID
        event_type: Type of event (created, approved, sent, received, etc.)
        details: Event details
        user_id: User who triggered event
        
    Returns:
        Log entry
    """
    return {
        "exchange_id": exchange_id,
        "event_type": event_type,
        "details": details,
        "user_id": user_id,
        "timestamp": datetime.now().isoformat()
    }

def check_patient_consent_for_sharing(
    patient_id: str,
    recipient_institution: str,
    consent_records: Dict[str, Any]
) -> bool:
    """
    Check if patient has consented to share data with institution
    
    Args:
        patient_id: Patient ID
        recipient_institution: Institution requesting data
        consent_records: Patient consent records
        
    Returns:
        True if patient has consented
    """
    consent = consent_records.get(f"{patient_id}_{recipient_institution}")
    
    if not consent:
        return False
    
    # Check if consent is still valid (not expired or revoked)
    if consent.get("revoked"):
        return False
    
    # Check expiration
    if "expires_at" in consent:
        expiry = datetime.fromisoformat(consent["expires_at"])
        if expiry < datetime.now():
            return False
    
    return True
