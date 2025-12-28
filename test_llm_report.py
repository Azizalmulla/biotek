"""
Test Qwen3 LLM Report Generation
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

print("="*60)
print("TESTING QWEN3 REPORT GENERATION")
print("="*60)

# Test 1: Check LLM status
print("\n1. Checking Qwen3 status...")
response = requests.get(f"{BASE_URL}/llm/status")
status = response.json()
print(f"   Status: {status['status']}")
print(f"   Model: {status['model']}")
if status['status'] == 'available':
    print(f"   ✓ {status['message']}")
else:
    print(f"   ❌ {status.get('message', 'Not available')}")
    print("\n   Please start Ollama if needed:")
    print("   $ ollama serve")
    exit(1)

# Test 2: Make a prediction first
print("\n2. Making a prediction...")
patient_data = {
    "age": 65,
    "bmi": 32.5,
    "hba1c": 7.2,
    "ldl": 180,
    "smoking": 1,
    "prs": 1.5,
    "sex": 1,
    "patient_id": "DEMO-001",
    "use_genetics": True
}

response = requests.post(f"{BASE_URL}/predict", json=patient_data)
prediction = response.json()
print(f"   ✓ Risk: {prediction['risk_percentage']:.1f}%")
print(f"   ✓ Category: {prediction['risk_category']}")

# Test 3: Generate natural language report
print("\n3. Generating natural language report with Qwen3...")
print("   (This may take 10-20 seconds...)")

report_request = {
    "prediction": prediction,
    "patient_info": {
        "id": "DEMO-001",
        "age": 65
    }
}

response = requests.post(f"{BASE_URL}/generate-report", json=report_request)
report = response.json()

print(f"\n   ✓ Report generated at: {report['generated_at']}")
print(f"   ✓ Model used: {report['model_used']}")
print(f"\n{'='*60}")
print("PATIENT RISK ASSESSMENT REPORT")
print("="*60)
print(report['report'])
print("="*60)

print("\n✓ LLM INTEGRATION COMPLETE!")
print("\nQwen3 successfully generated a patient-friendly report!")
print("This demonstrates:")
print("  - Local LLM integration (Qwen3:8b)")
print("  - Natural language generation")
print("  - Medical explanation synthesis")
print("  - Privacy-preserving (runs locally)")
