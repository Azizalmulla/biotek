"""
Email service for BioTeK
Handles sending emails for password resets, account activation, etc.
"""

import os
from typing import Optional
from datetime import datetime

# In production, use environment variables
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@biotek.local")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def send_email(to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> bool:
    """
    Send an email
    In production, integrate with SendGrid, AWS SES, or SMTP
    """
    
    if not EMAIL_ENABLED:
        # Log to console for development
        print(f"\n{'='*60}")
        print(f"📧 EMAIL (Development Mode)")
        print(f"{'='*60}")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"{'='*60}")
        print(body)
        print(f"{'='*60}\n")
        return True
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        
        # Attach plain text
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach HTML if provided
        if html_body:
            msg.attach(MIMEText(html_body, 'html'))
        
        # Send via SMTP
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False


def send_password_reset_email(to_email: str, reset_token: str, user_type: str) -> bool:
    """Send password reset email"""
    
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}&type={user_type}"
    
    subject = "BioTeK - Password Reset Request"
    
    body = f"""
Dear User,

You have requested to reset your password for your BioTeK account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.
Your password will remain unchanged.

For security reasons, never share this link with anyone.

Best regards,
BioTeK Security Team

---
This is an automated email. Please do not reply.
    """.strip()
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #667eea; color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                      margin: 20px 0; font-weight: bold; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; 
                       padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>You have requested to reset your password for your BioTeK account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p style="color: #666; font-size: 12px;">
                    Or copy this link: <br>
                    <code>{reset_url}</code>
                </p>
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul>
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                    </ul>
                </div>
            </div>
            <div class="footer">
                <p>BioTeK - Privacy-First Genomic Medicine</p>
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, body, html_body)


def send_account_activation_email(to_email: str, user_id: str, temporary_password: str, role: str) -> bool:
    """Send account activation email to new staff member"""
    
    login_url = f"{FRONTEND_URL}/login"
    
    subject = "Welcome to BioTeK - Your Account Has Been Created"
    
    body = f"""
Dear Healthcare Professional,

Welcome to BioTeK! Your account has been created by the system administrator.

Your Login Credentials:
- User ID: {user_id}
- Temporary Password: {temporary_password}
- Role: {role.capitalize()}

Login at: {login_url}

IMPORTANT: Please change your password after your first login.

For security:
1. Never share your credentials
2. Use a strong, unique password
3. Log out when finished
4. Report any suspicious activity

If you have any questions, please contact the system administrator.

Best regards,
BioTeK Administration Team

---
This is an automated email. Please do not reply.
    """.strip()
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
                       color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .credentials {{ background: white; border: 2px solid #11998e; padding: 20px; 
                           border-radius: 5px; margin: 20px 0; }}
            .button {{ display: inline-block; background: #11998e; color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                      margin: 20px 0; font-weight: bold; }}
            .security {{ background: #e7f5ff; border-left: 4px solid #0066cc; 
                        padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>👋 Welcome to BioTeK!</h1>
            </div>
            <div class="content">
                <p>Dear Healthcare Professional,</p>
                <p>Your BioTeK account has been successfully created. You can now access the 
                   privacy-first genomic medicine platform.</p>
                
                <div class="credentials">
                    <h3>🔐 Your Login Credentials</h3>
                    <p><strong>User ID:</strong> <code>{user_id}</code></p>
                    <p><strong>Temporary Password:</strong> <code>{temporary_password}</code></p>
                    <p><strong>Role:</strong> {role.capitalize()}</p>
                </div>
                
                <p style="text-align: center;">
                    <a href="{login_url}" class="button">Login to BioTeK</a>
                </p>
                
                <div class="security">
                    <h4>🔒 Security Best Practices</h4>
                    <ol>
                        <li><strong>Change your password immediately</strong> after first login</li>
                        <li>Never share your credentials with anyone</li>
                        <li>Always log out when finished</li>
                        <li>Report suspicious activity to IT security</li>
                    </ol>
                </div>
                
                <p>If you have any questions, please contact the system administrator.</p>
            </div>
            <div class="footer">
                <p>BioTeK - Privacy-First Genomic Medicine</p>
                <p>HIPAA & GDPR Compliant | Differential Privacy (ε=3.0)</p>
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, body, html_body)


def send_security_alert_email(to_email: str, alert_type: str, details: str) -> bool:
    """Send security alert email"""
    
    subject = f"BioTeK Security Alert - {alert_type}"
    
    body = f"""
SECURITY ALERT

Alert Type: {alert_type}
Time: {datetime.now().isoformat()}

Details:
{details}

If this was not you, please contact the system administrator immediately
and change your password.

Best regards,
BioTeK Security Team

---
This is an automated security alert. Please do not reply.
    """.strip()
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                       color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .alert {{ background: #fee; border-left: 4px solid #d00; padding: 20px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ Security Alert</h1>
            </div>
            <div class="content">
                <div class="alert">
                    <h3>Alert Type: {alert_type}</h3>
                    <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <p><strong>Details:</strong></p>
                    <p>{details}</p>
                </div>
                <p><strong style="color: #d00;">If this was not you, take action immediately:</strong></p>
                <ol>
                    <li>Change your password</li>
                    <li>Contact the system administrator</li>
                    <li>Review your recent account activity</li>
                </ol>
            </div>
            <div class="footer">
                <p>BioTeK Security Team</p>
                <p>This is an automated security alert. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, body, html_body)
