# 🚀 BioTeK Quick Start Guide

## System Requirements

- Python 3.9+
- Node.js 16+
- Ollama (for LLM reports)

## Installation

```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Install Node dependencies  
npm install
```

## Start the System

```bash
# Terminal 1: Start API
python3 -m uvicorn api.main:app --reload --port 8000 --host 127.0.0.1

# Terminal 2: Start Frontend
npm run dev

# Terminal 3 (Optional): Start Ollama for LLM reports
ollama serve
```

## Access URLs

- **Landing Page:** http://localhost:3000
- **User Login:** http://localhost:3000/login
- **Admin Login:** http://localhost:3000/admin/login
- **Patient Registration:** http://localhost:3000/patient-registration
- **Admin Dashboard:** http://localhost:3000/admin
- **API Docs:** http://127.0.0.1:8000/docs

## Default Credentials

### Admin
```
Admin ID: admin
Password: Admin123!
```

### Test Doctor (created by admin)
```
User ID: doctor_DOC001
Password: TempPass123
```

### Test Patient
```
Patient ID: PAT-123456
Password: SecurePass123
```

## Quick Workflows

### 1. Admin Creates a Doctor Account

```bash
1. Visit http://localhost:3000/admin/login
2. Login as admin
3. Go to "Create Account" tab
4. Fill in:
   - Name: Dr. Jane Doe
   - Email: jane.doe@hospital.com
   - Role: Doctor
   - Employee ID: DOC002
   - Department: Cardiology
   - Temp Password: SecureDoc123
5. Click "Create Account"
6. Doctor receives email with credentials
```

### 2. Patient Self-Registration

```bash
1. Visit http://localhost:3000/patient-registration
2. Enter MRN: 789012
3. Enter DOB: 1985-05-15
4. Create password: MySecurePass456
5. Account created → Login
```

### 3. Enable 2FA for Admin

```bash
# Via API
curl -X POST http://127.0.0.1:8000/admin/enable-2fa \
  -H "X-Admin-ID: admin"

# Returns QR code - scan with Google Authenticator

# Verify
curl -X POST http://127.0.0.1:8000/admin/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin",
    "token": "123456"
  }'

# 2FA now required for admin login!
```

### 4. Password Reset

```bash
# Request reset
curl -X POST http://127.0.0.1:8000/auth/request-password-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "user_type": "patient"
  }'

# Check console for reset token
# Use token to reset password

curl -X POST http://127.0.0.1:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_HERE",
    "new_password": "NewPass123"
  }'
```

### 5. View Reports

```bash
# System overview
curl -H "X-Admin-ID: admin" \
  http://127.0.0.1:8000/admin/reports/overview

# Compliance report
curl -H "X-Admin-ID: admin" \
  http://127.0.0.1:8000/admin/reports/compliance

# Export audit log
curl -H "X-Admin-ID: admin" \
  http://127.0.0.1:8000/admin/reports/export-audit-log \
  > audit_log.csv
```

## Common Tasks

### Reset Database

```bash
rm -f data/audit_log.db
# Restart API - tables will be recreated
# Re-run: python3 create_admin.py
```

### Create Additional Admins

```bash
# Edit create_admin.py, add:
create_admin(
    admin_id="sarah.admin",
    email="sarah@biotek.com",
    password="SecureAdmin789!",
    full_name="Sarah Johnson",
    super_admin=True
)

# Run: python3 create_admin.py
```

### Check API Health

```bash
curl http://127.0.0.1:8000/
# Should return: {"status": "online", ...}
```

### Enable Email Sending

```bash
# Set environment variables:
export EMAIL_ENABLED=true
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your@gmail.com
export SMTP_PASSWORD=your_app_password
export FROM_EMAIL=noreply@biotek.com

# Restart API
```

## Troubleshooting

### API won't start
```bash
# Kill existing process
lsof -ti:8000 | xargs kill -9

# Check dependencies
pip3 install -r requirements.txt

# Start again
python3 -m uvicorn api.main:app --reload --port 8000
```

### Frontend won't start
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Start
npm run dev
```

### Database errors
```bash
# Reset database
rm -f data/audit_log.db

# Recreate admin
python3 create_admin.py

# Restart API
```

### 2FA not working
```bash
# Make sure pyotp is installed
pip3 install pyotp qrcode pillow

# Time sync is important - check system time
date

# Token valid for ±30 seconds
```

## Testing

### Run All Tests

```bash
# Test patient registration
curl -X POST http://127.0.0.1:8000/auth/register-patient \
  -H "Content-Type: application/json" \
  -d '{
    "medical_record_number": "TEST001",
    "date_of_birth": "1990-01-01",
    "email": "test@test.com",
    "password": "TestPass123"
  }'

# Test patient login
curl -X POST http://127.0.0.1:8000/auth/login-patient \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PAT-TEST001",
    "password": "TestPass123"
  }'

# Test admin login
curl -X POST http://127.0.0.1:8000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "admin_id": "admin",
    "password": "Admin123!"
  }'

# Test staff creation
curl -X POST http://127.0.0.1:8000/admin/create-staff \
  -H "Content-Type: application/json" \
  -H "X-Admin-ID: admin" \
  -d '{
    "email": "nurse@hospital.com",
    "role": "nurse",
    "full_name": "Test Nurse",
    "employee_id": "NUR001",
    "temporary_password": "TempNurse123"
  }'
```

## Feature Checklist

Use this to verify everything works:

- [ ] Landing page loads
- [ ] Patient registration works
- [ ] Patient login works
- [ ] Staff login works (with password)
- [ ] Admin login works
- [ ] Admin can create staff accounts
- [ ] Admin dashboard shows staff list
- [ ] Password reset flow works
- [ ] Emails send (check console in dev mode)
- [ ] 2FA can be enabled
- [ ] 2FA login works
- [ ] Reports generate correctly
- [ ] Audit log exports to CSV
- [ ] Predictions work
- [ ] Access control enforces rules
- [ ] Audit trail logs all actions

## Support

### Documentation
- `IMPLEMENTATION_SUMMARY.md` - Full feature documentation
- `/api/main.py` - All API endpoints (with docstrings)
- API Docs: http://127.0.0.1:8000/docs

### Common Questions

**Q: How do I add a new admin?**  
A: Edit `create_admin.py` and run it, or create via super admin API (future feature).

**Q: How do I reset a locked account?**  
A: Admin dashboard → Staff Accounts → Click "Enable" on locked account.

**Q: Where are passwords stored?**  
A: Hashed with bcrypt in SQLite (`data/audit_log.db`). Never plain text.

**Q: How do I backup data?**  
A: Copy `data/` directory. For production, use PostgreSQL with regular backups.

**Q: Can I use this in production?**  
A: Yes! But:
  1. Switch to PostgreSQL
  2. Enable HTTPS
  3. Set up proper email service (SendGrid/AWS SES)
  4. Configure environment variables
  5. Set up monitoring
  6. Enable rate limiting
  7. Review security checklist

**Q: How do I change the default admin password?**  
A: Edit `create_admin.py` before running, or use change password API.

---

**Need Help?**  
Check `IMPLEMENTATION_SUMMARY.md` for detailed documentation.

**Last Updated:** November 17, 2025  
**Version:** 2.0.0
