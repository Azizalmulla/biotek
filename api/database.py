"""
Database abstraction layer for BioTeK
Supports both PostgreSQL (production) and SQLite (local development)
Falls back to SQLite if PostgreSQL connection fails
"""

import os
import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Tuple, Any

# Check if PostgreSQL is available and working
DATABASE_URL = os.getenv('DATABASE_URL')
USE_POSTGRES = False

if DATABASE_URL:
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        # Test the connection
        test_conn = psycopg2.connect(DATABASE_URL)
        test_conn.close()
        USE_POSTGRES = True
        print(f"✓ Using PostgreSQL database (connection successful)")
    except Exception as e:
        print(f"⚠ PostgreSQL connection failed: {e}")
        print("✓ Falling back to SQLite database")
        USE_POSTGRES = False
else:
    print("✓ Using SQLite database (no DATABASE_URL set)")

# SQLite database path for local development
SQLITE_DB_PATH = "biotek_audit.db"


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
            
            # Patient prediction results
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patient_prediction_results (
                    patient_id TEXT PRIMARY KEY,
                    updated_at TEXT NOT NULL,
                    prediction_json TEXT NOT NULL
                )
            """)
            
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
            
            conn.commit()
            print("✓ PostgreSQL tables initialized")


# Initialize PostgreSQL tables on import if using Postgres
if USE_POSTGRES:
    try:
        init_postgres_tables()
    except Exception as e:
        print(f"Warning: Failed to initialize PostgreSQL tables: {e}")
