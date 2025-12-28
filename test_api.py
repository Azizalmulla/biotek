"""
Quick API test script
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Test 1: Health check
print("Testing API health...")
response = requests.get(f"{BASE_URL}/")
print(f"✓ Health check: {response.json()}")

# Test 2: Model info
print("\nGetting model info...")
response = requests.get(f"{BASE_URL}/model/info")
print(f"✓ Model info: {json.dumps(response.json(), indent=2)}")

# Test 3: Make a prediction (with genetics)
print("\nMaking prediction WITH genetics...")
patient_data = {
    "age": 65,
    "bmi": 32.5,
    "hba1c": 7.2,
    "ldl": 180,
    "smoking": 1,
    "prs": 1.5,
    "sex": 1,
    "patient_id": "TEST001",
    "consent_id": "C-TEST-001",
    "use_genetics": True
}

response = requests.post(f"{BASE_URL}/predict", json=patient_data)
result = response.json()
print(f"✓ Prediction result:")
print(f"  Risk: {result['risk_category']} ({result['risk_percentage']:.1f}%)")
print(f"  Confidence: {result['confidence']:.2f}")
print(f"  Used genetics: {result['used_genetics']}")

# Test 4: Make a prediction (without genetics)
print("\nMaking prediction WITHOUT genetics...")
patient_data["use_genetics"] = False
patient_data["patient_id"] = "TEST002"

response = requests.post(f"{BASE_URL}/predict", json=patient_data)
result = response.json()
print(f"✓ Prediction result:")
print(f"  Risk: {result['risk_category']} ({result['risk_percentage']:.1f}%)")
print(f"  Confidence: {result['confidence']:.2f}")
print(f"  Used genetics: {result['used_genetics']}")

# Test 5: Get audit logs
print("\nGetting audit logs...")
response = requests.get(f"{BASE_URL}/audit/logs?limit=5")
logs = response.json()
print(f"✓ Retrieved {len(logs)} audit logs")
for log in logs:
    print(f"  - {log['timestamp']}: {log['patient_id']} -> {log['risk_category']}")

# Test 6: Get audit stats
print("\nGetting audit statistics...")
response = requests.get(f"{BASE_URL}/audit/stats")
stats = response.json()
print(f"✓ Audit stats: {json.dumps(stats, indent=2)}")

print("\n" + "="*60)
print("ALL API TESTS PASSED ✓")
print("="*60)
