"""
Patient Data Export & Sharing
Implements HIPAA Right of Access and GDPR Data Portability
"""

import json
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import hashlib

def generate_share_token() -> str:
    """Generate secure token for data sharing links"""
    timestamp = datetime.now().isoformat()
    random_str = hashlib.sha256(timestamp.encode()).hexdigest()[:16]
    return f"SHARE-{random_str.upper()}"

def create_patient_data_package(patient_id: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create complete patient data package for download
    Includes all medical information
    
    Args:
        patient_id: Patient ID
        patient_data: All patient information
        
    Returns:
        Complete data package
    """
    package = {
        "metadata": {
            "patient_id": patient_id,
            "generated_at": datetime.now().isoformat(),
            "format_version": "1.0.0",
            "hipaa_compliant": True,
            "gdpr_compliant": True
        },
        "demographics": {
            "name": patient_data.get("name", ""),
            "date_of_birth": patient_data.get("dob", ""),
            "gender": patient_data.get("gender", ""),
            "email": patient_data.get("email", ""),
            "patient_id": patient_id
        },
        "clinical_data": {
            "diagnoses": patient_data.get("diagnoses", []),
            "conditions": patient_data.get("conditions", []),
            "allergies": patient_data.get("allergies", []),
            "medications": patient_data.get("medications", []),
            "procedures": patient_data.get("procedures", [])
        },
        "lab_results": patient_data.get("lab_results", []),
        "vital_signs": patient_data.get("vitals", {}),
        "predictions": patient_data.get("predictions", []),
        "access_log": patient_data.get("access_log", [])
    }
    
    return package

def export_as_json(data_package: Dict[str, Any]) -> str:
    """Export patient data as JSON (machine-readable)"""
    return json.dumps(data_package, indent=2)

def export_as_fhir(patient_id: str, patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Export patient data in HL7 FHIR format (healthcare standard)
    FHIR = Fast Healthcare Interoperability Resources
    
    Args:
        patient_id: Patient ID
        patient_data: Patient information
        
    Returns:
        FHIR Bundle resource
    """
    # FHIR Bundle structure
    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": datetime.now().isoformat(),
        "entry": []
    }
    
    # Patient resource
    patient_resource = {
        "fullUrl": f"urn:uuid:patient-{patient_id}",
        "resource": {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [{
                "system": "http://biotek.local/patient-id",
                "value": patient_id
            }],
            "name": [{
                "text": patient_data.get("name", ""),
                "family": patient_data.get("last_name", ""),
                "given": [patient_data.get("first_name", "")]
            }],
            "gender": patient_data.get("gender", "unknown"),
            "birthDate": patient_data.get("dob", "")
        }
    }
    bundle["entry"].append(patient_resource)
    
    # Observation resources (lab results)
    for lab in patient_data.get("lab_results", []):
        observation = {
            "fullUrl": f"urn:uuid:observation-{lab.get('id', 'unknown')}",
            "resource": {
                "resourceType": "Observation",
                "status": "final",
                "code": {
                    "text": lab.get("test_name", "")
                },
                "subject": {
                    "reference": f"Patient/{patient_id}"
                },
                "effectiveDateTime": lab.get("date", ""),
                "valueQuantity": {
                    "value": lab.get("value", 0),
                    "unit": lab.get("unit", "")
                }
            }
        }
        bundle["entry"].append(observation)
    
    # MedicationStatement resources
    for med in patient_data.get("medications", []):
        medication = {
            "fullUrl": f"urn:uuid:medication-{med.get('id', 'unknown')}",
            "resource": {
                "resourceType": "MedicationStatement",
                "status": "active",
                "medicationCodeableConcept": {
                    "text": med.get("name", "")
                },
                "subject": {
                    "reference": f"Patient/{patient_id}"
                },
                "dosage": [{
                    "text": med.get("dosage", "")
                }]
            }
        }
        bundle["entry"].append(medication)
    
    # Condition resources (diagnoses)
    for diagnosis in patient_data.get("diagnoses", []):
        condition = {
            "fullUrl": f"urn:uuid:condition-{hashlib.md5(diagnosis.encode()).hexdigest()[:8]}",
            "resource": {
                "resourceType": "Condition",
                "clinicalStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active"
                    }]
                },
                "code": {
                    "text": diagnosis
                },
                "subject": {
                    "reference": f"Patient/{patient_id}"
                }
            }
        }
        bundle["entry"].append(condition)
    
    return bundle

def generate_pdf_content(patient_data: Dict[str, Any]) -> str:
    """
    Generate HTML content for PDF export
    Will be converted to PDF using a library like weasyprint
    
    Args:
        patient_data: Patient information
        
    Returns:
        HTML string ready for PDF conversion
    """
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Medical Records - {patient_data.get('name', 'Patient')}</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
            }}
            .section {{
                margin-bottom: 30px;
                padding: 20px;
                background: #f9f9f9;
                border-radius: 8px;
            }}
            h1 {{
                margin: 0;
                font-size: 28px;
            }}
            h2 {{
                color: #667eea;
                border-bottom: 2px solid #667eea;
                padding-bottom: 10px;
            }}
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }}
            .info-item {{
                padding: 10px;
                background: white;
                border-radius: 5px;
            }}
            .label {{
                font-weight: bold;
                color: #666;
                font-size: 12px;
            }}
            .value {{
                font-size: 16px;
                margin-top: 5px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }}
            th, td {{
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }}
            th {{
                background: #667eea;
                color: white;
            }}
            .footer {{
                margin-top: 50px;
                padding: 20px;
                background: #f0f0f0;
                border-radius: 8px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📋 Medical Records</h1>
            <p style="margin: 10px 0 0 0;">Patient: {patient_data.get('name', 'N/A')}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
        
        <div class="section">
            <h2>Demographics</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Patient ID</div>
                    <div class="value">{patient_data.get('patient_id', 'N/A')}</div>
                </div>
                <div class="info-item">
                    <div class="label">Date of Birth</div>
                    <div class="value">{patient_data.get('dob', 'N/A')}</div>
                </div>
                <div class="info-item">
                    <div class="label">Gender</div>
                    <div class="value">{patient_data.get('gender', 'N/A')}</div>
                </div>
                <div class="info-item">
                    <div class="label">Email</div>
                    <div class="value">{patient_data.get('email', 'N/A')}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>Diagnoses & Conditions</h2>
            <ul>
    """
    
    for diagnosis in patient_data.get("diagnoses", []):
        html += f"<li>{diagnosis}</li>"
    
    if not patient_data.get("diagnoses"):
        html += "<li>No diagnoses recorded</li>"
    
    html += """
            </ul>
        </div>
        
        <div class="section">
            <h2>Current Medications</h2>
            <table>
                <thead>
                    <tr>
                        <th>Medication</th>
                        <th>Dosage</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for med in patient_data.get("medications", []):
        html += f"""
                    <tr>
                        <td>{med.get('name', 'N/A')}</td>
                        <td>{med.get('dosage', 'N/A')}</td>
                    </tr>
        """
    
    if not patient_data.get("medications"):
        html += "<tr><td colspan='2'>No medications recorded</td></tr>"
    
    html += """
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Lab Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Value</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for lab in patient_data.get("lab_results", []):
        html += f"""
                    <tr>
                        <td>{lab.get('test_name', 'N/A')}</td>
                        <td>{lab.get('value', 'N/A')} {lab.get('unit', '')}</td>
                        <td>{lab.get('date', 'N/A')}</td>
                    </tr>
        """
    
    if not patient_data.get("lab_results"):
        html += "<tr><td colspan='3'>No lab results recorded</td></tr>"
    
    html += """
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Allergies</h2>
            <ul>
    """
    
    for allergy in patient_data.get("allergies", []):
        html += f"<li>{allergy}</li>"
    
    if not patient_data.get("allergies"):
        html += "<li>No known allergies</li>"
    
    html += """
            </ul>
        </div>
        
        <div class="footer">
            <p><strong>BioTeK Privacy-First Healthcare Platform</strong></p>
            <p>This document contains confidential patient information protected under HIPAA.</p>
            <p>Generated on {datetime.now().strftime('%B %d, %Y')}</p>
        </div>
    </body>
    </html>
    """
    
    return html

def create_shareable_link(patient_id: str, share_token: str, expires_hours: int = 24) -> Dict[str, Any]:
    """
    Create a shareable link for patient data
    
    Args:
        patient_id: Patient ID
        share_token: Unique share token
        expires_hours: Hours until link expires
        
    Returns:
        Share link information
    """
    expires_at = datetime.now() + timedelta(hours=expires_hours)
    
    return {
        "share_token": share_token,
        "share_url": f"https://biotek.com/shared/{share_token}",
        "patient_id": patient_id,
        "created_at": datetime.now().isoformat(),
        "expires_at": expires_at.isoformat(),
        "access_count": 0,
        "max_accesses": 1  # One-time access by default
    }
