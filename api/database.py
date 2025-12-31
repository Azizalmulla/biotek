"""
Database layer for BioTeK
PostgreSQL ONLY - No SQLite fallback in production
"""

import os
import sys
from contextlib import contextmanager
from typing import Optional, List, Tuple, Any

# =============================================================================
# POSTGRESQL REQUIRED - No SQLite fallback
# =============================================================================

DATABASE_URL = os.getenv('DATABASE_URL')

# Check for local development mode
LOCAL_DEV_MODE = os.getenv('LOCAL_DEV', 'false').lower() == 'true'

if not DATABASE_URL:
    if LOCAL_DEV_MODE:
        # Allow SQLite only for explicit local development
        print("⚠ LOCAL_DEV=true: Using SQLite for local development")
        USE_POSTGRES = False
    else:
        print("\n" + "=" * 60)
        print("❌ FATAL: DATABASE_URL not set — PostgreSQL required")
        print("=" * 60)
        print("\nBioTeK requires PostgreSQL in production.")
        print("Please set DATABASE_URL environment variable.")
        print("\nExample: DATABASE_URL=postgres://user:pass@host:5432/dbname")
        print("=" * 60 + "\n")
        sys.exit(1)
else:
    if not DATABASE_URL.startswith('postgres'):
        print("\n" + "=" * 60)
        print("❌ FATAL: DATABASE_URL must be a PostgreSQL URL")
        print("=" * 60)
        print(f"\nReceived: {DATABASE_URL[:30]}...")
        print("Expected: postgres://... or postgresql://...")
        print("=" * 60 + "\n")
        sys.exit(1)
    USE_POSTGRES = True

# Import database driver
if USE_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    # Test connection on startup
    try:
        test_conn = psycopg2.connect(DATABASE_URL)
        test_conn.close()
        print("✓ PostgreSQL connection verified")
    except Exception as e:
        print(f"\n❌ FATAL: PostgreSQL connection failed: {e}")
        sys.exit(1)
else:
    import sqlite3
    SQLITE_DB_PATH = "biotek_local.db"


def get_placeholder():
    """Return the correct placeholder for the database type"""
    return "%s" if USE_POSTGRES else "?"


def adapt_query(query: str) -> str:
    """Adapt SQLite query syntax to PostgreSQL if needed"""
    if USE_POSTGRES:
        # Replace ? with %s for PostgreSQL
        query = query.replace("?", "%s")
        # Replace AUTOINCREMENT with SERIAL
        query = query.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        # Replace INTEGER PRIMARY KEY (without AUTOINCREMENT) 
        # but keep TEXT PRIMARY KEY as is
    return query


@contextmanager
def get_db_connection():
    """Get a database connection (PostgreSQL or SQLite)"""
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        try:
            yield conn
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        try:
            yield conn
        finally:
            conn.close()


@contextmanager
def get_db_cursor(conn):
    """Get a cursor from a connection"""
    if USE_POSTGRES:
        cursor = conn.cursor()
    else:
        cursor = conn.cursor()
    try:
        yield cursor
    finally:
        cursor.close()


def execute_query(query: str, params: tuple = (), fetch: str = None) -> Any:
    """
    Execute a database query with automatic connection handling
    
    Args:
        query: SQL query string
        params: Query parameters
        fetch: 'one', 'all', or None
    
    Returns:
        Query results if fetch is specified, otherwise None
    """
    query = adapt_query(query)
    
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            cursor.execute(query, params)
            
            if fetch == 'one':
                result = cursor.fetchone()
            elif fetch == 'all':
                result = cursor.fetchall()
            else:
                result = None
                conn.commit()
            
            return result


def execute_many(query: str, params_list: List[tuple]) -> None:
    """Execute a query multiple times with different parameters"""
    query = adapt_query(query)
    
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            cursor.executemany(query, params_list)
            conn.commit()


def init_postgres_tables():
    """Initialize PostgreSQL tables"""
    if not USE_POSTGRES:
        return
    
    with get_db_connection() as conn:
        with get_db_cursor(conn) as cursor:
            # Access logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS access_log (
                    id SERIAL PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_role TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    data_type TEXT,
                    patient_id TEXT,
                    granted BOOLEAN NOT NULL,
                    reason TEXT,
                    ip_address TEXT
                )
            """)
            
            # Predictions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id SERIAL PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    patient_id TEXT,
                    input_data TEXT,
                    risk_score REAL,
                    risk_category TEXT,
                    used_genetics BOOLEAN DEFAULT FALSE,
                    consent_id TEXT,
                    model_version TEXT
                )
            """)
            
            # Staff accounts
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS staff_accounts (
                    user_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    full_name TEXT,
                    employee_id TEXT,
                    department TEXT,
                    created_at TEXT NOT NULL,
                    created_by TEXT,
                    activated BOOLEAN DEFAULT FALSE,
                    activation_token TEXT,
                    two_factor_enabled BOOLEAN DEFAULT FALSE,
                    two_factor_secret TEXT,
                    backup_codes TEXT,
                    last_login TEXT,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TEXT
                )
            """)
            
            # Admin accounts
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admin_accounts (
                    admin_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT,
                    created_at TEXT NOT NULL,
                    super_admin BOOLEAN DEFAULT FALSE,
                    two_factor_enabled BOOLEAN DEFAULT FALSE,
                    two_factor_secret TEXT,
                    backup_codes TEXT,
                    last_login TEXT,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TEXT
                )
            """)
            
            # Patient records
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_records (
                    patient_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    updated_by TEXT NOT NULL,
                    age INTEGER,
                    sex INTEGER,
                    bmi REAL,
                    bp_systolic INTEGER,
                    bp_diastolic INTEGER,
                    heart_rate INTEGER,
                    total_cholesterol REAL,
                    hdl REAL,
                    ldl REAL,
                    triglycerides REAL,
                    hba1c REAL,
                    fasting_glucose REAL,
                    egfr REAL,
                    smoking_pack_years REAL,
                    exercise_hours_weekly REAL,
                    has_diabetes INTEGER,
                    on_bp_medication INTEGER,
                    family_history_score INTEGER,
                    consent_given INTEGER DEFAULT 1,
                    data_retention_days INTEGER DEFAULT 365,
                    deletion_requested_at TEXT
                )
            """)
            
            # Clinical encounters - links all diagnostic outputs together
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS encounters (
                    encounter_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    created_by_role TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    encounter_type TEXT DEFAULT 'risk_assessment',
                    status TEXT DEFAULT 'draft',
                    completed_at TEXT,
                    visibility TEXT DEFAULT 'clinician_only',
                    notes TEXT
                )
            """)
            
            # Patient prediction results (with visibility control)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_prediction_results (
                    patient_id TEXT PRIMARY KEY,
                    updated_at TEXT NOT NULL,
                    created_by TEXT,
                    visibility TEXT DEFAULT 'patient_visible',
                    prediction_json TEXT NOT NULL,
                    patient_summary_json TEXT
                )
            """)
            
            # Encounter prediction results (linked to encounter)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS encounter_predictions (
                    id SERIAL PRIMARY KEY,
                    encounter_id TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    prediction_json TEXT NOT NULL,
                    patient_summary_json TEXT,
                    visibility TEXT DEFAULT 'patient_visible'
                )
            """)
            
            # Encounter genetic variant results (linked to encounter)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS encounter_genetic_results (
                    id SERIAL PRIMARY KEY,
                    encounter_id TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    variant_input TEXT NOT NULL,
                    gene TEXT,
                    classification TEXT NOT NULL,
                    confidence REAL,
                    result_json TEXT NOT NULL,
                    visibility TEXT DEFAULT 'clinician_only'
                )
            """)
            
            # Encounter imaging results (linked to encounter)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS encounter_imaging_results (
                    id SERIAL PRIMARY KEY,
                    encounter_id TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    study_type TEXT NOT NULL,
                    file_reference TEXT,
                    finding_summary TEXT,
                    result_json TEXT NOT NULL,
                    visibility TEXT DEFAULT 'clinician_only'
                )
            """)
            
            # Encounter AI notes (linked to encounter)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS encounter_ai_notes (
                    id SERIAL PRIMARY KEY,
                    encounter_id TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    note_type TEXT NOT NULL,
                    prompt_hash TEXT,
                    response_summary TEXT,
                    result_json TEXT NOT NULL,
                    visibility TEXT DEFAULT 'clinician_only'
                )
            """)
            
            # Encounter PRS/Genetics data (for combined risk calculation)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS encounter_genetics (
                    id SERIAL PRIMARY KEY,
                    encounter_id TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    consent_genetics BOOLEAN DEFAULT FALSE,
                    ancestry_group TEXT,
                    prs_percentiles_json TEXT,
                    high_impact_flags_json TEXT,
                    qc_json TEXT,
                    visibility TEXT DEFAULT 'clinician_only'
                )
            """)
            
            # Legacy tables (kept for backwards compatibility)
            # Patient variant results
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_variant_results (
                    id SERIAL PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    variant TEXT NOT NULL,
                    gene TEXT,
                    classification TEXT NOT NULL,
                    confidence REAL,
                    result_json TEXT NOT NULL
                )
            """)
            
            # Patient imaging results
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_imaging_results (
                    id SERIAL PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    image_type TEXT NOT NULL,
                    finding_summary TEXT,
                    result_json TEXT NOT NULL
                )
            """)
            
            # Patient treatments
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_treatments (
                    id SERIAL PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    treatment_type TEXT NOT NULL,
                    protocol_summary TEXT,
                    result_json TEXT NOT NULL
                )
            """)
            
            # Patient clinical reasoning
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_clinical_reasoning (
                    id SERIAL PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    assessment_summary TEXT,
                    result_json TEXT NOT NULL
                )
            """)
            
            # Patient data audit
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_data_audit (
                    id SERIAL PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    patient_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_role TEXT NOT NULL,
                    details TEXT
                )
            """)
            
            # Data exchange requests
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS data_exchange_requests (
                    exchange_id TEXT PRIMARY KEY,
                    patient_id TEXT NOT NULL,
                    requesting_institution TEXT NOT NULL,
                    sending_institution TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    categories TEXT NOT NULL,
                    status TEXT NOT NULL,
                    requested_by TEXT NOT NULL,
                    requested_at TEXT NOT NULL,
                    patient_consent_status TEXT,
                    patient_consent_at TEXT,
                    approved_by TEXT,
                    approved_at TEXT,
                    sent_at TEXT,
                    received_at TEXT,
                    expires_at TEXT,
                    denial_reason TEXT
                )
            """)
            
            # Demo accounts are seeded by main.py init_database() with proper password hashing
            
            conn.commit()
            print("✓ PostgreSQL tables initialized")


def init_sqlite_tables():
    """Initialize SQLite tables"""
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    # Access logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS access_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_role TEXT NOT NULL,
            purpose TEXT NOT NULL,
            data_type TEXT,
            patient_id TEXT,
            granted INTEGER NOT NULL,
            reason TEXT,
            ip_address TEXT
        )
    """)
    
    # Predictions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            patient_id TEXT,
            input_data TEXT,
            risk_score REAL,
            risk_category TEXT,
            used_genetics INTEGER DEFAULT 0,
            consent_id TEXT,
            model_version TEXT
        )
    """)
    
    # Staff accounts
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS staff_accounts (
            user_id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            full_name TEXT,
            employee_id TEXT,
            department TEXT,
            created_at TEXT NOT NULL,
            created_by TEXT,
            activated INTEGER DEFAULT 0,
            activation_token TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_secret TEXT,
            backup_codes TEXT,
            last_login TEXT,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT
        )
    """)
    
    # Admin accounts
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin_accounts (
            admin_id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            created_at TEXT NOT NULL,
            super_admin INTEGER DEFAULT 0,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_secret TEXT,
            backup_codes TEXT,
            last_login TEXT,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT
        )
    """)
    
    # Patient prediction results (with visibility control)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_prediction_results (
            patient_id TEXT PRIMARY KEY,
            updated_at TEXT NOT NULL,
            created_by TEXT,
            visibility TEXT DEFAULT 'patient_visible',
            prediction_json TEXT NOT NULL,
            patient_summary_json TEXT
        )
    """)
    
    # Patient variant results
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_variant_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            variant TEXT NOT NULL,
            gene TEXT,
            classification TEXT NOT NULL,
            confidence REAL,
            result_json TEXT NOT NULL
        )
    """)
    
    # Patient imaging results
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_imaging_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            image_type TEXT NOT NULL,
            finding_summary TEXT,
            result_json TEXT NOT NULL
        )
    """)
    
    # Patient treatments
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            treatment_type TEXT NOT NULL,
            protocol_summary TEXT,
            result_json TEXT NOT NULL
        )
    """)
    
    # Patient clinical reasoning
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patient_clinical_reasoning (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            assessment_summary TEXT,
            result_json TEXT NOT NULL
        )
    """)
    
    # Data exchange requests
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS data_exchange_requests (
            exchange_id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            requesting_institution TEXT NOT NULL,
            sending_institution TEXT NOT NULL,
            purpose TEXT NOT NULL,
            categories TEXT NOT NULL,
            status TEXT NOT NULL,
            requested_by TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            patient_consent_status TEXT,
            patient_consent_at TEXT,
            approved_by TEXT,
            approved_at TEXT,
            sent_at TEXT,
            received_at TEXT,
            expires_at TEXT,
            denial_reason TEXT
        )
    """)
    
    # Demo accounts are seeded by main.py init_database() with proper password hashing
    
    conn.commit()
    conn.close()
    print("✓ SQLite tables initialized")


# Initialize tables on import
if USE_POSTGRES:
    try:
        init_postgres_tables()
    except Exception as e:
        print(f"❌ FATAL: Failed to initialize PostgreSQL tables: {e}")
        sys.exit(1)
elif LOCAL_DEV_MODE:
    init_sqlite_tables()


def ensure_tables_exist():
    """Ensure all required tables exist - call this before first database operation"""
    if USE_POSTGRES:
        init_postgres_tables()
    elif LOCAL_DEV_MODE:
        init_sqlite_tables()


def get_db_info() -> dict:
    """Get database connection info for admin verification"""
    return {
        "database_type": "postgresql" if USE_POSTGRES else "sqlite_local_dev",
        "connection_status": "connected",
        "local_dev_mode": LOCAL_DEV_MODE,
        "database_url_set": bool(DATABASE_URL),
    }
