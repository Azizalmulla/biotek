"""
Authentication utilities for BioTeK
Handles password hashing, JWT tokens, and email verification
"""

from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
import secrets

# JWT settings
SECRET_KEY = secrets.token_urlsafe(32)  # In production: load from env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    # Convert password to bytes and hash
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to check against
        
    Returns:
        True if password matches, False otherwise
    """
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Dictionary of data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT access token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token data if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def generate_verification_token() -> str:
    """
    Generate a random verification token for email verification
    
    Returns:
        Random URL-safe token string
    """
    return secrets.token_urlsafe(32)

def validate_password_strength(password: str) -> tuple:
    """
    Validate password meets security requirements
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return (False, "Password must be at least 8 characters long")
    
    if len(password) > 72:
        return (False, "Password must be less than 72 characters long")
    
    # Basic validation - at least one letter and one number
    has_letter = any(c.isalpha() for c in password)
    has_number = any(c.isdigit() for c in password)
    
    if not has_letter:
        return (False, "Password must contain at least one letter")
    
    if not has_number:
        return (False, "Password must contain at least one number")
    
    return (True, "")

def encrypt_sensitive_data(data: str, key: Optional[str] = None) -> str:
    """
    Encrypt sensitive data like MRN
    In production, use proper encryption library (Fernet, AES)
    
    Args:
        data: Data to encrypt
        key: Optional encryption key
        
    Returns:
        Encrypted data (for demo, just returns base64)
    """
    import base64
    return base64.b64encode(data.encode()).decode()

def decrypt_sensitive_data(encrypted_data: str, key: Optional[str] = None) -> str:
    """
    Decrypt sensitive data
    
    Args:
        encrypted_data: Encrypted data string
        key: Optional decryption key
        
    Returns:
        Decrypted data
    """
    import base64
    return base64.b64decode(encrypted_data.encode()).decode()
