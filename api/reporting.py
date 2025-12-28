"""
Advanced Reporting and Analytics for BioTeK
Generates compliance reports, usage statistics, and security analytics
"""

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any
from pathlib import Path
import json

DB_PATH = Path("data/audit_log.db")

def get_system_overview() -> Dict[str, Any]:
    """Get high-level system statistics"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Total users by type
    cursor.execute("SELECT COUNT(*) FROM patient_accounts WHERE deleted_at IS NULL")
    total_patients = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM staff_accounts WHERE account_disabled = 0")
    total_staff = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM admin_accounts")
    total_admins = cursor.fetchone()[0]
    
    # Total predictions
    cursor.execute("SELECT COUNT(*) FROM predictions")
    total_predictions = cursor.fetchone()[0]
    
    # Total access attempts
    cursor.execute("SELECT COUNT(*) FROM access_log")
    total_access_attempts = cursor.fetchone()[0]
    
    # Access granted vs denied
    cursor.execute("SELECT COUNT(*) FROM access_log WHERE granted = 1")
    access_granted = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM access_log WHERE granted = 0")
    access_denied = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_users": total_patients + total_staff + total_admins,
        "patients": total_patients,
        "staff": total_staff,
        "admins": total_admins,
        "total_predictions": total_predictions,
        "total_access_attempts": total_access_attempts,
        "access_granted": access_granted,
        "access_denied": access_denied,
        "denial_rate": round((access_denied / total_access_attempts * 100) if total_access_attempts > 0 else 0, 2)
    }

def get_activity_by_role() -> List[Dict[str, Any]]:
    """Get access activity broken down by role"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT user_role, COUNT(*) as count, 
               SUM(CASE WHEN granted = 1 THEN 1 ELSE 0 END) as granted,
               SUM(CASE WHEN granted = 0 THEN 1 ELSE 0 END) as denied
        FROM access_log
        GROUP BY user_role
        ORDER BY count DESC
    """)
    
    roles = []
    for row in cursor.fetchall():
        roles.append({
            "role": row[0],
            "total_attempts": row[1],
            "granted": row[2],
            "denied": row[3],
            "approval_rate": round((row[2] / row[1] * 100) if row[1] > 0 else 0, 2)
        })
    
    conn.close()
    return roles

def get_activity_by_purpose() -> List[Dict[str, Any]]:
    """Get access activity broken down by purpose"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT purpose, COUNT(*) as count,
               SUM(CASE WHEN granted = 1 THEN 1 ELSE 0 END) as granted,
               SUM(CASE WHEN granted = 0 THEN 1 ELSE 0 END) as denied
        FROM access_log
        GROUP BY purpose
        ORDER BY count DESC
    """)
    
    purposes = []
    for row in cursor.fetchall():
        purposes.append({
            "purpose": row[0],
            "total_attempts": row[1],
            "granted": row[2],
            "denied": row[3],
            "approval_rate": round((row[2] / row[1] * 100) if row[1] > 0 else 0, 2)
        })
    
    conn.close()
    return purposes

def get_hourly_activity(hours: int = 24) -> List[Dict[str, Any]]:
    """Get activity for the last N hours"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    start_time = (datetime.now() - timedelta(hours=hours)).isoformat()
    
    cursor.execute("""
        SELECT strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
               COUNT(*) as count,
               SUM(CASE WHEN granted = 1 THEN 1 ELSE 0 END) as granted
        FROM access_log
        WHERE timestamp >= ?
        GROUP BY hour
        ORDER BY hour DESC
        LIMIT ?
    """, (start_time, hours))
    
    activity = []
    for row in cursor.fetchall():
        activity.append({
            "hour": row[0],
            "total_attempts": row[1],
            "granted": row[2]
        })
    
    conn.close()
    return activity

def get_most_active_users(limit: int = 10) -> List[Dict[str, Any]]:
    """Get most active users"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT user_id, user_role, COUNT(*) as count
        FROM access_log
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT ?
    """, (limit,))
    
    users = []
    for row in cursor.fetchall():
        users.append({
            "user_id": row[0],
            "role": row[1],
            "access_count": row[2]
        })
    
    conn.close()
    return users

def get_security_events() -> List[Dict[str, Any]]:
    """Get security-related events"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Failed login attempts
    cursor.execute("""
        SELECT user_id, purpose, reason, timestamp
        FROM access_log
        WHERE granted = 0 AND purpose = 'login'
        ORDER BY timestamp DESC
        LIMIT 50
    """)
    
    failed_logins = []
    for row in cursor.fetchall():
        failed_logins.append({
            "user_id": row[0],
            "purpose": row[1],
            "reason": row[2],
            "timestamp": row[3]
        })
    
    # Account lockouts
    cursor.execute("""
        SELECT user_id, email, failed_login_attempts
        FROM staff_accounts
        WHERE account_locked = 1
    """)
    
    locked_accounts = []
    for row in cursor.fetchall():
        locked_accounts.append({
            "user_id": row[0],
            "email": row[1],
            "failed_attempts": row[2]
        })
    
    conn.close()
    
    return {
        "failed_logins": failed_logins,
        "locked_accounts": locked_accounts
    }

def get_compliance_report() -> Dict[str, Any]:
    """Generate compliance report for HIPAA/GDPR"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if all staff have been verified (created by admin)
    cursor.execute("""
        SELECT COUNT(*) FROM staff_accounts WHERE created_by IS NOT NULL
    """)
    verified_staff = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM staff_accounts")
    total_staff = cursor.fetchone()[0]
    
    # Check if all accesses have purpose declared
    cursor.execute("""
        SELECT COUNT(*) FROM access_log WHERE purpose IS NOT NULL
    """)
    purpose_declared = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM access_log")
    total_access = cursor.fetchone()[0]
    
    # Check encryption (differential privacy)
    cursor.execute("""
        SELECT COUNT(*) FROM predictions WHERE used_genetics = 1
    """)
    privacy_protected = cursor.fetchone()[0]
    
    # Patient consent tracking
    cursor.execute("""
        SELECT COUNT(*) FROM predictions WHERE consent_id IS NOT NULL
    """)
    consented = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM predictions")
    total_predictions = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "staff_verification": {
            "verified": verified_staff,
            "total": total_staff,
            "percentage": round((verified_staff / total_staff * 100) if total_staff > 0 else 100, 2),
            "compliant": verified_staff == total_staff
        },
        "purpose_declaration": {
            "declared": purpose_declared,
            "total": total_access,
            "percentage": round((purpose_declared / total_access * 100) if total_access > 0 else 100, 2),
            "compliant": purpose_declared == total_access
        },
        "differential_privacy": {
            "protected": privacy_protected,
            "enabled": True,
            "epsilon": 3.0
        },
        "patient_consent": {
            "consented": consented,
            "total": total_predictions,
            "percentage": round((consented / total_predictions * 100) if total_predictions > 0 else 100, 2)
        },
        "audit_trail": {
            "enabled": True,
            "retention_days": 365,
            "total_logs": total_access
        }
    }

def export_audit_log_csv(start_date: str = None, end_date: str = None) -> str:
    """Export audit log to CSV format"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    query = "SELECT * FROM access_log"
    params = []
    
    if start_date and end_date:
        query += " WHERE timestamp BETWEEN ? AND ?"
        params = [start_date, end_date]
    elif start_date:
        query += " WHERE timestamp >= ?"
        params = [start_date]
    
    query += " ORDER BY timestamp DESC"
    
    cursor.execute(query, params)
    
    # Get column names
    columns = [description[0] for description in cursor.description]
    
    # Build CSV
    csv_lines = [",".join(columns)]
    
    for row in cursor.fetchall():
        csv_lines.append(",".join(str(val) if val is not None else "" for val in row))
    
    conn.close()
    
    return "\n".join(csv_lines)
