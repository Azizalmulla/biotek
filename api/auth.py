"""
Authentication utilities for BioTeK
Handles password hashing, JWT tokens, and email verification
"""

from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
import secrets
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# JWT settings
SECRET_KEY = secrets.token_urlsafe(32)  # In production: load from env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

# AES-256 encryption key (32 bytes = 256 bits)
# In production: load from environment variable
AES_KEY = os.environ.get('AES_ENCRYPTION_KEY', secrets.token_bytes(32))
if isinstance(AES_KEY, str):
    AES_KEY = base64.b64decode(AES_KEY)

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

def encrypt_sensitive_data(data: str, key: Optional[bytes] = None) -> str:
    """
    Encrypt sensitive data using AES-256-GCM
    
    Args:
        data: Data to encrypt
        key: Optional 32-byte encryption key (uses default if not provided)
        
    Returns:
        Base64-encoded encrypted data (nonce + ciphertext + tag)
    """
    encryption_key = key if key else AES_KEY
    aesgcm = AESGCM(encryption_key)
    
    # Generate random 12-byte nonce (recommended for GCM)
    nonce = os.urandom(12)
    
    # Encrypt the data
    ciphertext = aesgcm.encrypt(nonce, data.encode('utf-8'), None)
    
    # Combine nonce + ciphertext and encode as base64
    encrypted = nonce + ciphertext
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_sensitive_data(encrypted_data: str, key: Optional[bytes] = None) -> str:
    """
    Decrypt AES-256-GCM encrypted data
    
    Args:
        encrypted_data: Base64-encoded encrypted data
        key: Optional 32-byte decryption key (uses default if not provided)
        
    Returns:
        Decrypted plaintext data
    """
    encryption_key = key if key else AES_KEY
    aesgcm = AESGCM(encryption_key)
    
    # Decode from base64
    encrypted = base64.b64decode(encrypted_data.encode('utf-8'))
    
    # Extract nonce (first 12 bytes) and ciphertext
    nonce = encrypted[:12]
    ciphertext = encrypted[12:]
    
    # Decrypt
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode('utf-8')
