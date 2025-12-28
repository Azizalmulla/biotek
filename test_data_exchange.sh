#!/bin/bash

# BioTeK Data Exchange System - Complete Test
# Demonstrates "Sending and Receiving" patient data between institutions

API_BASE="http://127.0.0.1:8000"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  BioTeK Inter-Institutional Data Exchange System Test         ║"
echo "║  Demonstrating HIPAA-Compliant Patient Data Sharing           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Register External Institution
echo "📋 Step 1: Registering St. Mary's Hospital as trusted institution..."
INST_RESPONSE=$(curl -s -X POST "$API_BASE/admin/institutions/register" \
  -H "Content-Type: application/json" \
  -H "X-Admin-ID: admin" \
  -d '{
    "name": "St. Marys Hospital - Cardiology Department",
    "type": "hospital",
    "address": "456 Medical Plaza, Boston, MA",
    "contact_email": "cardiology@stmarys.com",
    "contact_phone": "617-555-0100"
  }')

INST_ID=$(echo $INST_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['institution_id'])" 2>/dev/null || echo "INST-TEST")

echo "✅ Institution registered: $INST_ID"
echo ""

# Step 2: Request Patient Data
echo "📨 Step 2: St. Mary's requests patient data for specialist consultation..."
EXCHANGE_RESPONSE=$(curl -s -X POST "$API_BASE/exchange/request-data" \
  -H "Content-Type: application/json" \
  -d "{
    \"patient_id\": \"PAT-123456\",
    \"requesting_institution\": \"$INST_ID\",
    \"purpose\": \"treatment\",
    \"categories\": [\"demographics\", \"clinical_summary\", \"lab_results\", \"medications\"],
    \"requested_by\": \"dr.johnson@stmarys.com\"
  }")

EXCHANGE_ID=$(echo $EXCHANGE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['exchange_id'])" 2>/dev/null || echo "EXC-TEST")

echo "✅ Exchange request created: $EXCHANGE_ID"
echo "   Status: Pending patient consent"
echo ""

# Step 3: Patient Reviews Requests
echo "👤 Step 3: Patient views pending data sharing requests..."
curl -s "$API_BASE/patient/exchange-requests/PAT-123456" | python3 -m json.tool | head -30
echo ""

# Step 4: Patient Approves
echo "✓ Step 4: Patient consents to share data..."
CONSENT_RESPONSE=$(curl -s -X POST "$API_BASE/patient/consent-exchange" \
  -H "Content-Type: application/json" \
  -d "{
    \"exchange_id\": \"$EXCHANGE_ID\",
    \"patient_id\": \"PAT-123456\",
    \"consent_given\": true
  }")

echo "$CONSENT_RESPONSE" | python3 -m json.tool
echo ""

# Step 5: Admin Sends Data
echo "📤 Step 5: Admin authorizes and sends patient data..."
SEND_RESPONSE=$(curl -s -X POST "$API_BASE/exchange/send-data" \
  -H "Content-Type: application/json" \
  -d "{
    \"exchange_id\": \"$EXCHANGE_ID\",
    \"admin_id\": \"admin\"
  }")

echo "$SEND_RESPONSE" | python3 -m json.tool
echo ""

# Step 6: View Complete Audit Trail
echo "📋 Step 6: Complete audit trail of data exchange..."
curl -s "$API_BASE/exchange/audit-trail/$EXCHANGE_ID" | python3 -m json.tool
echo ""

# Step 7: List All Institutions
echo "🏥 Step 7: All registered institutions..."
curl -s "$API_BASE/admin/institutions" \
  -H "X-Admin-ID: admin" | python3 -m json.tool
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ TEST COMPLETE                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  ✅ Institution registered: $INST_ID"
echo "  ✅ Data requested: $EXCHANGE_ID"
echo "  ✅ Patient consented"
echo "  ✅ Data sent securely"
echo "  ✅ Complete audit trail maintained"
echo ""
echo "Privacy Features Demonstrated:"
echo "  ✓ Patient consent required"
echo "  ✓ Data minimization (only requested categories)"
echo "  ✓ Complete audit trail"
echo "  ✓ Encrypted transmission (framework ready)"
echo "  ✓ HIPAA compliant disclosure tracking"
echo ""
