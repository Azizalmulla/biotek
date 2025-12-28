"""
Script to create the first admin account
Run this once to bootstrap the system
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from api.auth import hash_password

# Database path - must match API
DB_PATH = Path("data/audit_log.db")

def create_admin(admin_id: str, email: str, password: str, full_name: str, super_admin: bool = True):
    """Create an admin account"""
    
    # Ensure database exists
    DB_PATH.parent.mkdir(exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create admin_accounts table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin_accounts (
            admin_id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_login TEXT,
            super_admin INTEGER DEFAULT 0
        )
    """)
    
    # Check if admin already exists
    cursor.execute("SELECT admin_id FROM admin_accounts WHERE admin_id = ?", (admin_id,))
    if cursor.fetchone():
        print(f"❌ Admin '{admin_id}' already exists!")
        conn.close()
        return False
    
    # Hash password
    password_hash = hash_password(password)
    
    # Create admin account
    cursor.execute("""
        INSERT INTO admin_accounts
        (admin_id, email, password_hash, full_name, created_at, super_admin)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        admin_id,
        email,
        password_hash,
        full_name,
        datetime.now().isoformat(),
        1 if super_admin else 0
    ))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Admin account created successfully!")
    print(f"   Admin ID: {admin_id}")
    print(f"   Email: {email}")
    print(f"   Super Admin: {super_admin}")
    print(f"\n🔐 Save these credentials securely!")
    
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("BioTeK Admin Account Creator")
    print("=" * 60)
    print()
    
    # Create first admin
    create_admin(
        admin_id="admin",
        email="admin@biotek.local",
        password="Admin123!",
        full_name="System Administrator",
        super_admin=True
    )
    
    print()
    print("=" * 60)
    print("You can now login at: http://localhost:3000/admin/login")
    print("Admin ID: admin")
    print("Password: Admin123!")
    print("=" * 60)
