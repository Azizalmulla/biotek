"""
Two-Factor Authentication (2FA) for BioTeK
Implements TOTP (Time-based One-Time Password) for enhanced security
"""

import pyotp
import qrcode
import io
import base64
from typing import Tuple, Optional

def generate_2fa_secret() -> str:
    """
    Generate a new 2FA secret key
    Returns a base32-encoded secret
    """
    return pyotp.random_base32()

def generate_qr_code(secret: str, account_name: str, issuer: str = "BioTeK") -> str:
    """
    Generate QR code for 2FA setup
    Returns base64-encoded PNG image
    """
    # Create provisioning URI
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=account_name, issuer_name=issuer)
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

def verify_2fa_token(secret: str, token: str) -> bool:
    """
    Verify a 2FA token
    
    Args:
        secret: Base32-encoded secret key
        token: 6-digit code from authenticator app
        
    Returns:
        True if token is valid, False otherwise
    """
    if not token or len(token) != 6:
        return False
    
    try:
        totp = pyotp.TOTP(secret)
        # Allow for time drift (±1 interval = 30 seconds)
        return totp.verify(token, valid_window=1)
    except Exception:
        return False

def get_current_token(secret: str) -> str:
    """
    Get the current valid token (for testing)
    
    Args:
        secret: Base32-encoded secret key
        
    Returns:
        Current 6-digit token
    """
    totp = pyotp.TOTP(secret)
    return totp.now()

def generate_backup_codes(count: int = 10) -> list:
    """
    Generate backup codes for 2FA recovery
    
    Args:
        count: Number of backup codes to generate
        
    Returns:
        List of backup codes
    """
    import secrets
    import string
    
    codes = []
    for _ in range(count):
        # Generate 8-character alphanumeric code
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        # Format as XXXX-XXXX
        formatted = f"{code[:4]}-{code[4:]}"
        codes.append(formatted)
    
    return codes

def hash_backup_code(code: str) -> str:
    """
    Hash a backup code for storage
    
    Args:
        code: Plain backup code
        
    Returns:
        Hashed code
    """
    import hashlib
    return hashlib.sha256(code.encode()).hexdigest()

def verify_backup_code(code: str, hashed_code: str) -> bool:
    """
    Verify a backup code against its hash
    
    Args:
        code: Plain backup code to verify
        hashed_code: Stored hash
        
    Returns:
        True if code matches, False otherwise
    """
    return hash_backup_code(code) == hashed_code
