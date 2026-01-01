"""
BioTeK Production-Grade Authorization System
RBAC + ABAC + Encounter-Scoped + Consent + Break-Glass + Audit

This module implements hospital-realistic access control:
- Role-based permissions (RBAC)
- Attribute-based access control (ABAC)
- Encounter-scoped access (must have active encounter)
- Consent enforcement (genetic, imaging, AI, research)
- Break-glass emergency override
- Comprehensive audit logging
"""

from enum import Enum
from typing import Optional, Dict, List, Set, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import uuid
import json
import sqlite3
import os
from functools import wraps

# =============================================================================
# ENUMS - Roles, Permissions, Purposes, Actions
# =============================================================================

class Role(str, Enum):
    DOCTOR = "doctor"
    NURSE = "nurse"
    RESEARCHER = "researcher"
    ADMIN = "admin"
    PATIENT = "patient"
    RECEPTIONIST = "receptionist"

class Permission(str, Enum):
    # Patient data
    PATIENT_READ = "patient:read"
    PATIENT_READ_LIMITED = "patient:read_limited"
    PATIENT_DEMOGRAPHICS_READ = "patient:demographics_read"
    PATIENT_DEMOGRAPHICS_WRITE = "patient:demographics_write"
    
    # Predictions
    PREDICTION_READ = "prediction:read"
    PREDICTION_RUN = "prediction:run"
    
    # Genetics
    GENETICS_READ = "genetics:read"
    GENETICS_WRITE = "genetics:write"
    
    # Imaging
    IMAGING_READ = "imaging:read"
    IMAGING_WRITE = "imaging:write"
    
    # Clinical notes
    NOTES_READ = "notes:read"
    NOTES_WRITE = "notes:write"
    
    # Treatment
    TREATMENT_READ = "treatment:read"
    TREATMENT_WRITE = "treatment:write"
    
    # Research
    DATASET_READ_ANONYMIZED = "dataset:read_anonymized"
    
    # Audit
    AUDIT_READ = "audit:read"
    AUDIT_READ_LIMITED = "audit:read_limited"
    
    # Admin
    STAFF_MANAGE = "staff:manage"
    SYSTEM_CONFIG = "system:config"
    
    # Break-glass
    BREAK_GLASS = "break_glass:use"

class Purpose(str, Enum):
    TREATMENT = "treatment"
    EMERGENCY = "emergency"
    RESEARCH = "research"
    BILLING = "billing"
    REGISTRATION = "registration"
    QUALITY_IMPROVEMENT = "quality_improvement"
    AUDIT = "audit"
    ADMIN = "admin"

class DataType(str, Enum):
    CLINICAL = "clinical"
    GENETIC = "genetic"
    IMAGING = "imaging"
    PREDICTIONS = "predictions"
    DEMOGRAPHICS = "demographics"
    NOTES = "notes"
    TREATMENT = "treatment"
    AUDIT_LOGS = "audit_logs"
    ANONYMIZED = "anonymized"

class EncounterStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CLOSED = "closed"

class AccessStatus(str, Enum):
    GRANTED = "granted"
    DENIED = "denied"
    BREAK_GLASS = "break_glass"

# =============================================================================
# ROLE PERMISSIONS - What each role CAN do (RBAC)
# =============================================================================

ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.DOCTOR: {
        Permission.PATIENT_READ,
        Permission.PATIENT_DEMOGRAPHICS_READ,
        Permission.PREDICTION_READ,
        Permission.PREDICTION_RUN,
        Permission.GENETICS_READ,
        Permission.GENETICS_WRITE,
        Permission.IMAGING_READ,
        Permission.IMAGING_WRITE,
        Permission.NOTES_READ,
        Permission.NOTES_WRITE,
        Permission.TREATMENT_READ,
        Permission.TREATMENT_WRITE,
        Permission.BREAK_GLASS,
    },
    Role.NURSE: {
        Permission.PATIENT_READ_LIMITED,
        Permission.PATIENT_DEMOGRAPHICS_READ,
        Permission.NOTES_READ,
        Permission.AUDIT_READ_LIMITED,
        # NO: GENETICS, PREDICTION_RUN, TREATMENT_WRITE
    },
    Role.RESEARCHER: {
        Permission.DATASET_READ_ANONYMIZED,
        # NO: Any patient-identifiable data
    },
    Role.RECEPTIONIST: {
        Permission.PATIENT_DEMOGRAPHICS_READ,
        Permission.PATIENT_DEMOGRAPHICS_WRITE,
        # NO: Clinical data, predictions, genetics
    },
    Role.ADMIN: {
        Permission.STAFF_MANAGE,
        Permission.SYSTEM_CONFIG,
        Permission.AUDIT_READ,
        Permission.BREAK_GLASS,  # For emergency clinical access only
        # NO: Direct clinical read by default
    },
    Role.PATIENT: {
        Permission.PATIENT_READ_LIMITED,  # Own data only
        Permission.PREDICTION_READ,       # Own predictions only
        Permission.AUDIT_READ_LIMITED,    # Who accessed their data
    },
}

# =============================================================================
# PERMISSION REQUIREMENTS - What permissions are needed for each action
# =============================================================================

ACTION_PERMISSIONS: Dict[str, Set[Permission]] = {
    # Patient endpoints
    "read_patient": {Permission.PATIENT_READ, Permission.PATIENT_READ_LIMITED},
    "read_patient_demographics": {Permission.PATIENT_DEMOGRAPHICS_READ},
    "write_patient_demographics": {Permission.PATIENT_DEMOGRAPHICS_WRITE},
    
    # Prediction endpoints
    "read_prediction": {Permission.PREDICTION_READ},
    "run_prediction": {Permission.PREDICTION_RUN},
    
    # Genetics endpoints
    "read_genetics": {Permission.GENETICS_READ},
    "write_genetics": {Permission.GENETICS_WRITE},
    
    # Imaging endpoints
    "read_imaging": {Permission.IMAGING_READ},
    "write_imaging": {Permission.IMAGING_WRITE},
    
    # Notes endpoints
    "read_notes": {Permission.NOTES_READ},
    "write_notes": {Permission.NOTES_WRITE},
    
    # Treatment endpoints
    "read_treatment": {Permission.TREATMENT_READ},
    "write_treatment": {Permission.TREATMENT_WRITE},
    
    # Research endpoints
    "read_anonymized_data": {Permission.DATASET_READ_ANONYMIZED},
    
    # Audit endpoints
    "read_audit": {Permission.AUDIT_READ, Permission.AUDIT_READ_LIMITED},
    
    # Admin endpoints
    "manage_staff": {Permission.STAFF_MANAGE},
    "system_config": {Permission.SYSTEM_CONFIG},
}

# =============================================================================
# DATA MODELS
# =============================================================================

class StaffUser(BaseModel):
    """Staff user account"""
    user_id: str
    username: str
    role: Role
    department: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class Encounter(BaseModel):
    """Clinical encounter - required for patient data access"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    created_by: str  # user_id of creator
    assigned_staff: List[str] = []  # user_ids who can access
    status: EncounterStatus = EncounterStatus.DRAFT
    purpose: Purpose = Purpose.TREATMENT
    justification: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=24))
    break_glass_used: bool = False
    break_glass_reason: Optional[str] = None
    break_glass_approved_by: Optional[str] = None

class PatientConsent(BaseModel):
    """Patient consent flags"""
    patient_id: str
    consent_genetic: bool = False
    consent_imaging: bool = False
    consent_ai_analysis: bool = True  # Default true for basic AI
    consent_research: bool = False
    policy_version: str = "1.0"
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

class AuditLog(BaseModel):
    """Immutable audit log entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actor_user_id: str
    actor_role: Role
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    action: str
    permission_required: Optional[str] = None
    purpose: Optional[Purpose] = None
    data_type: Optional[DataType] = None
    status: AccessStatus
    reason: Optional[str] = None
    break_glass: bool = False
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_details: Optional[Dict] = None

class AuthorizationRequest(BaseModel):
    """Request for authorization check"""
    user_id: str
    role: Role
    action: str
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    purpose: Optional[Purpose] = None
    data_type: Optional[DataType] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuthorizationResult(BaseModel):
    """Result of authorization check"""
    granted: bool
    reason: str
    requires_encounter: bool = False
    requires_consent: bool = False
    break_glass_available: bool = False
    audit_id: Optional[str] = None

# =============================================================================
# DATABASE OPERATIONS
# =============================================================================

DB_PATH = os.path.join(os.path.dirname(__file__), "biotek_auth.db")

def get_auth_db():
    """Get connection to authorization database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_auth_db():
    """Initialize authorization database tables"""
    conn = get_auth_db()
    cursor = conn.cursor()
    
    # Staff users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS staff_users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role TEXT NOT NULL,
            department TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT
        )
    """)
    
    # Encounters table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS encounters (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            purpose TEXT DEFAULT 'treatment',
            justification TEXT,
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            break_glass_used INTEGER DEFAULT 0,
            break_glass_reason TEXT,
            break_glass_approved_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Encounter staff assignment (many-to-many)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS encounter_staff (
            encounter_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (encounter_id, user_id),
            FOREIGN KEY (encounter_id) REFERENCES encounters(id)
        )
    """)
    
    # Patient consents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_consents (
            patient_id TEXT PRIMARY KEY,
            consent_genetic INTEGER DEFAULT 0,
            consent_imaging INTEGER DEFAULT 0,
            consent_ai_analysis INTEGER DEFAULT 1,
            consent_research INTEGER DEFAULT 0,
            policy_version TEXT DEFAULT '1.0',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT
        )
    """)
    
    # Audit logs table (immutable)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            actor_user_id TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            patient_id TEXT,
            encounter_id TEXT,
            action TEXT NOT NULL,
            permission_required TEXT,
            purpose TEXT,
            data_type TEXT,
            status TEXT NOT NULL,
            reason TEXT,
            break_glass INTEGER DEFAULT 0,
            ip_address TEXT,
            user_agent TEXT,
            request_details TEXT
        )
    """)
    
    # Access requests table (for pending access requests)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS access_requests (
            id TEXT PRIMARY KEY,
            requester_user_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            purpose TEXT NOT NULL,
            justification TEXT,
            status TEXT DEFAULT 'pending',
            reviewed_by TEXT,
            reviewed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit_logs(patient_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)")
    
    # Insert default admin user if not exists
    cursor.execute("""
        INSERT OR IGNORE INTO staff_users (user_id, username, role, department)
        VALUES ('admin_001', 'admin', 'admin', 'Administration')
    """)
    
    # Insert demo staff users
    demo_staff = [
        ('doctor_DOC001', 'dr.smith', 'doctor', 'Internal Medicine'),
        ('nurse_NUR001', 'nurse.jones', 'nurse', 'Internal Medicine'),
        ('researcher_RES001', 'researcher.chen', 'researcher', 'Research'),
        ('receptionist_REC001', 'front.desk', 'receptionist', 'Front Office'),
    ]
    for user_id, username, role, dept in demo_staff:
        cursor.execute("""
            INSERT OR IGNORE INTO staff_users (user_id, username, role, department)
            VALUES (?, ?, ?, ?)
        """, (user_id, username, role, dept))
    
    conn.commit()
    conn.close()

# Initialize DB on module load
init_auth_db()

# =============================================================================
# AUTHORIZATION ENGINE
# =============================================================================

class AuthorizationEngine:
    """
    Production-grade authorization engine
    Enforces RBAC + ABAC + Encounter + Consent + Audit
    """
    
    def __init__(self):
        self.db_path = DB_PATH
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # -------------------------------------------------------------------------
    # STAFF USER OPERATIONS
    # -------------------------------------------------------------------------
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get staff user by ID"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staff_users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get staff user by username"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM staff_users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def create_user(self, user: StaffUser, created_by: str) -> bool:
        """Create a new staff user"""
        conn = self._get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO staff_users (user_id, username, role, department, created_by)
                VALUES (?, ?, ?, ?, ?)
            """, (user.user_id, user.username, user.role.value, user.department, created_by))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()
    
    # -------------------------------------------------------------------------
    # ENCOUNTER OPERATIONS
    # -------------------------------------------------------------------------
    
    def create_encounter(self, encounter: Encounter) -> str:
        """Create a new encounter"""
        conn = self._get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO encounters (id, patient_id, created_by, status, purpose, justification, 
                                   started_at, expires_at, break_glass_used, break_glass_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            encounter.id, encounter.patient_id, encounter.created_by,
            encounter.status.value, encounter.purpose.value, encounter.justification,
            encounter.started_at.isoformat(), encounter.expires_at.isoformat(),
            1 if encounter.break_glass_used else 0, encounter.break_glass_reason
        ))
        
        # Add creator to assigned staff
        cursor.execute("""
            INSERT INTO encounter_staff (encounter_id, user_id)
            VALUES (?, ?)
        """, (encounter.id, encounter.created_by))
        
        # Add other assigned staff
        for staff_id in encounter.assigned_staff:
            if staff_id != encounter.created_by:
                cursor.execute("""
                    INSERT OR IGNORE INTO encounter_staff (encounter_id, user_id)
                    VALUES (?, ?)
                """, (encounter.id, staff_id))
        
        conn.commit()
        conn.close()
        return encounter.id
    
    def get_encounter(self, encounter_id: str) -> Optional[Dict]:
        """Get encounter by ID"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM encounters WHERE id = ?", (encounter_id,))
        row = cursor.fetchone()
        
        if row:
            encounter = dict(row)
            # Get assigned staff
            cursor.execute("SELECT user_id FROM encounter_staff WHERE encounter_id = ?", (encounter_id,))
            encounter['assigned_staff'] = [r['user_id'] for r in cursor.fetchall()]
            conn.close()
            return encounter
        
        conn.close()
        return None
    
    def get_active_encounter(self, patient_id: str, user_id: str) -> Optional[Dict]:
        """Get active encounter for patient-user pair"""
        conn = self._get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT e.* FROM encounters e
            JOIN encounter_staff es ON e.id = es.encounter_id
            WHERE e.patient_id = ? AND es.user_id = ? 
            AND e.status = 'active' AND e.expires_at > datetime('now')
            ORDER BY e.started_at DESC LIMIT 1
        """, (patient_id, user_id))
        
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def update_encounter_status(self, encounter_id: str, status: EncounterStatus) -> bool:
        """Update encounter status"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE encounters SET status = ? WHERE id = ?", (status.value, encounter_id))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    
    # -------------------------------------------------------------------------
    # CONSENT OPERATIONS
    # -------------------------------------------------------------------------
    
    def get_consent(self, patient_id: str) -> Optional[Dict]:
        """Get patient consent flags"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patient_consents WHERE patient_id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def set_consent(self, consent: PatientConsent) -> bool:
        """Set or update patient consent"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO patient_consents 
            (patient_id, consent_genetic, consent_imaging, consent_ai_analysis, 
             consent_research, policy_version, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            consent.patient_id,
            1 if consent.consent_genetic else 0,
            1 if consent.consent_imaging else 0,
            1 if consent.consent_ai_analysis else 0,
            1 if consent.consent_research else 0,
            consent.policy_version,
            consent.updated_at.isoformat(),
            consent.updated_by
        ))
        conn.commit()
        conn.close()
        return True
    
    # -------------------------------------------------------------------------
    # AUDIT LOGGING
    # -------------------------------------------------------------------------
    
    def log_audit(self, log: AuditLog) -> str:
        """Create immutable audit log entry"""
        conn = self._get_db()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO audit_logs 
            (id, timestamp, actor_user_id, actor_role, patient_id, encounter_id,
             action, permission_required, purpose, data_type, status, reason,
             break_glass, ip_address, user_agent, request_details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            log.id, log.timestamp.isoformat(), log.actor_user_id, log.actor_role.value,
            log.patient_id, log.encounter_id, log.action, log.permission_required,
            log.purpose.value if log.purpose else None,
            log.data_type.value if log.data_type else None,
            log.status.value, log.reason, 1 if log.break_glass else 0,
            log.ip_address, log.user_agent,
            json.dumps(log.request_details) if log.request_details else None
        ))
        
        conn.commit()
        conn.close()
        return log.id
    
    def get_patient_audit_trail(self, patient_id: str, limit: int = 100) -> List[Dict]:
        """Get audit trail for a patient (for patient visibility)"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM audit_logs 
            WHERE patient_id = ? 
            ORDER BY timestamp DESC LIMIT ?
        """, (patient_id, limit))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_user_audit_trail(self, user_id: str, limit: int = 100) -> List[Dict]:
        """Get audit trail for a user"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM audit_logs 
            WHERE actor_user_id = ? 
            ORDER BY timestamp DESC LIMIT ?
        """, (user_id, limit))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_break_glass_events(self, limit: int = 100) -> List[Dict]:
        """Get all break-glass events for admin review"""
        conn = self._get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM audit_logs 
            WHERE break_glass = 1 
            ORDER BY timestamp DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    # -------------------------------------------------------------------------
    # BREAK-GLASS
    # -------------------------------------------------------------------------
    
    def create_break_glass_encounter(self, user_id: str, patient_id: str, 
                                     reason: str, purpose: Purpose = Purpose.EMERGENCY) -> Encounter:
        """Create emergency break-glass encounter"""
        encounter = Encounter(
            patient_id=patient_id,
            created_by=user_id,
            status=EncounterStatus.ACTIVE,
            purpose=purpose,
            justification=f"BREAK-GLASS: {reason}",
            expires_at=datetime.utcnow() + timedelta(hours=4),  # Short expiry
            break_glass_used=True,
            break_glass_reason=reason
        )
        self.create_encounter(encounter)
        return encounter
    
    # -------------------------------------------------------------------------
    # MAIN AUTHORIZATION CHECK
    # -------------------------------------------------------------------------
    
    def authorize(self, request: AuthorizationRequest) -> AuthorizationResult:
        """
        Main authorization check - enforces all access control rules
        
        Steps:
        1. RBAC permission check
        2. Purpose check (must exist for clinical access)
        3. Encounter check (must exist + active + assigned)
        4. Consent check (for genetics/imaging/AI)
        5. Time window check
        6. Log audit result
        7. Return allow/deny
        """
        audit_log = AuditLog(
            actor_user_id=request.user_id,
            actor_role=request.role,
            patient_id=request.patient_id,
            encounter_id=request.encounter_id,
            action=request.action,
            purpose=request.purpose,
            data_type=request.data_type,
            ip_address=request.ip_address,
            user_agent=request.user_agent,
            status=AccessStatus.DENIED,  # Default to denied
            break_glass=False
        )
        
        # =====================================================================
        # STEP 1: RBAC Permission Check
        # =====================================================================
        role_permissions = ROLE_PERMISSIONS.get(request.role, set())
        required_permissions = ACTION_PERMISSIONS.get(request.action, set())
        
        if not required_permissions:
            audit_log.reason = f"Unknown action: {request.action}"
            self.log_audit(audit_log)
            return AuthorizationResult(
                granted=False,
                reason=audit_log.reason,
                audit_id=audit_log.id
            )
        
        has_permission = bool(role_permissions & required_permissions)
        if not has_permission:
            audit_log.reason = f"Role {request.role.value} lacks permission for {request.action}"
            audit_log.permission_required = str(list(required_permissions))
            self.log_audit(audit_log)
            return AuthorizationResult(
                granted=False,
                reason=audit_log.reason,
                audit_id=audit_log.id
            )
        
        # =====================================================================
        # STEP 2: Researcher special case - no patient data
        # =====================================================================
        if request.role == Role.RESEARCHER:
            if request.patient_id:
                audit_log.reason = "Researchers cannot access patient-identifiable data"
                self.log_audit(audit_log)
                return AuthorizationResult(
                    granted=False,
                    reason=audit_log.reason,
                    audit_id=audit_log.id
                )
            # Researchers can only access anonymized endpoints
            if request.action == "read_anonymized_data":
                audit_log.status = AccessStatus.GRANTED
                audit_log.reason = "Researcher access to anonymized data granted"
                self.log_audit(audit_log)
                return AuthorizationResult(
                    granted=True,
                    reason=audit_log.reason,
                    audit_id=audit_log.id
                )
        
        # =====================================================================
        # STEP 3: Purpose Check (required for clinical access)
        # =====================================================================
        clinical_actions = {'read_patient', 'read_prediction', 'run_prediction', 
                          'read_genetics', 'write_genetics', 'read_imaging', 
                          'read_notes', 'write_notes', 'read_treatment', 'write_treatment'}
        
        if request.action in clinical_actions and not request.purpose:
            audit_log.reason = "Purpose of use required for clinical data access"
            self.log_audit(audit_log)
            return AuthorizationResult(
                granted=False,
                reason=audit_log.reason,
                requires_encounter=True,
                audit_id=audit_log.id
            )
        
        # =====================================================================
        # STEP 4: Encounter Check (required for patient data)
        # =====================================================================
        if request.patient_id and request.action in clinical_actions:
            # Check for active encounter
            if request.encounter_id:
                encounter = self.get_encounter(request.encounter_id)
            else:
                encounter = self.get_active_encounter(request.patient_id, request.user_id)
            
            if not encounter:
                audit_log.reason = "No active encounter for this patient"
                self.log_audit(audit_log)
                return AuthorizationResult(
                    granted=False,
                    reason=audit_log.reason,
                    requires_encounter=True,
                    break_glass_available=Permission.BREAK_GLASS in role_permissions,
                    audit_id=audit_log.id
                )
            
            # Check encounter is active
            if encounter.get('status') != 'active':
                audit_log.reason = f"Encounter is {encounter.get('status')}, not active"
                self.log_audit(audit_log)
                return AuthorizationResult(
                    granted=False,
                    reason=audit_log.reason,
                    requires_encounter=True,
                    audit_id=audit_log.id
                )
            
            # Check encounter hasn't expired
            expires_at = datetime.fromisoformat(encounter.get('expires_at', '2000-01-01'))
            if expires_at < datetime.utcnow():
                audit_log.reason = "Encounter has expired"
                self.log_audit(audit_log)
                return AuthorizationResult(
                    granted=False,
                    reason=audit_log.reason,
                    requires_encounter=True,
                    audit_id=audit_log.id
                )
            
            # Check user is assigned to encounter
            assigned_staff = encounter.get('assigned_staff', [])
            if request.user_id not in assigned_staff:
                audit_log.reason = "User not assigned to this encounter"
                self.log_audit(audit_log)
                return AuthorizationResult(
                    granted=False,
                    reason=audit_log.reason,
                    requires_encounter=True,
                    audit_id=audit_log.id
                )
            
            # Update audit log with encounter
            audit_log.encounter_id = encounter.get('id')
            audit_log.break_glass = bool(encounter.get('break_glass_used'))
        
        # =====================================================================
        # STEP 5: Consent Check (for genetics/imaging/AI)
        # =====================================================================
        if request.patient_id:
            consent = self.get_consent(request.patient_id)
            
            # Default consent if none exists
            if not consent:
                consent = {
                    'consent_genetic': 0,
                    'consent_imaging': 0,
                    'consent_ai_analysis': 1,
                    'consent_research': 0
                }
            
            # Check genetic consent
            if request.action in {'read_genetics', 'write_genetics'}:
                if not consent.get('consent_genetic'):
                    audit_log.reason = "Patient has not consented to genetic data access"
                    self.log_audit(audit_log)
                    return AuthorizationResult(
                        granted=False,
                        reason=audit_log.reason,
                        requires_consent=True,
                        audit_id=audit_log.id
                    )
            
            # Check imaging consent
            if request.action in {'read_imaging', 'write_imaging'}:
                if not consent.get('consent_imaging'):
                    audit_log.reason = "Patient has not consented to imaging data access"
                    self.log_audit(audit_log)
                    return AuthorizationResult(
                        granted=False,
                        reason=audit_log.reason,
                        requires_consent=True,
                        audit_id=audit_log.id
                    )
            
            # Check AI consent for predictions
            if request.action in {'run_prediction'}:
                if not consent.get('consent_ai_analysis'):
                    audit_log.reason = "Patient has not consented to AI analysis"
                    self.log_audit(audit_log)
                    return AuthorizationResult(
                        granted=False,
                        reason=audit_log.reason,
                        requires_consent=True,
                        audit_id=audit_log.id
                    )
        
        # =====================================================================
        # STEP 6: All checks passed - GRANT ACCESS
        # =====================================================================
        audit_log.status = AccessStatus.GRANTED
        audit_log.reason = "All authorization checks passed"
        self.log_audit(audit_log)
        
        return AuthorizationResult(
            granted=True,
            reason="Access granted",
            audit_id=audit_log.id
        )

# =============================================================================
# GLOBAL ENGINE INSTANCE
# =============================================================================

auth_engine = AuthorizationEngine()

# =============================================================================
# DECORATOR FOR ENDPOINT AUTHORIZATION
# =============================================================================

def require_authorization(action: str, get_patient_id=None, get_encounter_id=None):
    """
    Decorator to enforce authorization on endpoints
    
    Usage:
        @require_authorization("read_patient", get_patient_id=lambda req: req.path_params.get('patient_id'))
        async def get_patient(request, patient_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from args (FastAPI passes it)
            request = kwargs.get('request') or (args[0] if args else None)
            
            # Get authorization context from headers/session
            user_id = request.headers.get('X-User-ID', 'anonymous')
            user_role = request.headers.get('X-User-Role', 'patient')
            encounter_id = request.headers.get('X-Encounter-ID')
            purpose = request.headers.get('X-Purpose', 'treatment')
            
            # Get patient_id if applicable
            patient_id = None
            if get_patient_id:
                patient_id = get_patient_id(request) or kwargs.get('patient_id')
            
            # Create authorization request
            auth_request = AuthorizationRequest(
                user_id=user_id,
                role=Role(user_role) if user_role in [r.value for r in Role] else Role.PATIENT,
                action=action,
                patient_id=patient_id,
                encounter_id=encounter_id or (get_encounter_id(request) if get_encounter_id else None),
                purpose=Purpose(purpose) if purpose in [p.value for p in Purpose] else Purpose.TREATMENT,
                ip_address=request.client.host if hasattr(request, 'client') else None,
                user_agent=request.headers.get('User-Agent')
            )
            
            # Check authorization
            result = auth_engine.authorize(auth_request)
            
            if not result.granted:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "Access denied",
                        "reason": result.reason,
                        "requires_encounter": result.requires_encounter,
                        "requires_consent": result.requires_consent,
                        "break_glass_available": result.break_glass_available,
                        "audit_id": result.audit_id
                    }
                )
            
            # Add authorization context to request state
            request.state.auth = {
                "user_id": user_id,
                "role": user_role,
                "encounter_id": encounter_id,
                "audit_id": result.audit_id
            }
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def log_access_attempt(user_id: str, role: str, action: str, patient_id: str = None,
                       encounter_id: str = None, purpose: str = None, 
                       data_type: str = None, status: str = "granted",
                       reason: str = None, break_glass: bool = False,
                       ip_address: str = None):
    """Helper function to log access attempts"""
    log = AuditLog(
        actor_user_id=user_id,
        actor_role=Role(role) if role in [r.value for r in Role] else Role.PATIENT,
        patient_id=patient_id,
        encounter_id=encounter_id,
        action=action,
        purpose=Purpose(purpose) if purpose and purpose in [p.value for p in Purpose] else None,
        data_type=DataType(data_type) if data_type and data_type in [d.value for d in DataType] else None,
        status=AccessStatus(status) if status in [s.value for s in AccessStatus] else AccessStatus.DENIED,
        reason=reason,
        break_glass=break_glass,
        ip_address=ip_address
    )
    return auth_engine.log_audit(log)
