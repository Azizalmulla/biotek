# 📊 Clinical Data Sources

## How Doctors Acquire Patient Data

This document explains how clinical data is acquired in real-world healthcare settings for use in BioTeK's risk prediction system.

---

## 🏥 **Production Data Sources**

In a production deployment, patient clinical data comes from:

### **1. Electronic Health Records (EHR)**
```
Epic, Cerner, Allscripts, etc.
    ↓
HL7 FHIR API Integration
    ↓
Patient demographics, history, medications
    ↓
BioTeK imports via standard APIs
```

**Data Available:**
- Patient demographics (age, gender, ethnicity)
- Medical history (diagnoses, procedures)
- Current medications
- Allergies
- Family history

---

### **2. Laboratory Information Systems (LIS)**
```
Quest Diagnostics, LabCorp, Hospital Labs
    ↓
HL7 v2 Messages or FHIR Observations
    ↓
Lab results: HbA1c, cholesterol, glucose, etc.
    ↓
Auto-populated in patient record
```

**Data Available:**
- Blood work results (HbA1c, LDL, HDL, glucose)
- Genetic test results
- Pathology reports
- Imaging results

---

### **3. Medical Devices & Vital Signs**
```
Blood pressure monitors, scales, etc.
    ↓
Direct device integration or manual entry
    ↓
Height, weight, BMI, blood pressure
    ↓
Stored in patient vitals
```

**Data Available:**
- Height, weight (auto-calculates BMI)
- Blood pressure
- Heart rate
- Temperature
- Oxygen saturation

---

### **4. Patient Portals (Self-Reporting)**
```
Patient logs into health portal
    ↓
Completes health questionnaires
    ↓
Reports symptoms, lifestyle, family history
    ↓
Available to clinical team
```

**Data Available:**
- Lifestyle factors (smoking, exercise, diet)
- Family history (genetic predisposition)
- Self-reported symptoms
- Medication adherence

---

### **5. Inter-Institutional Data Exchange**
```
Patient transfers from another facility
    ↓
Hospital requests medical records
    ↓
Patient consents to share
    ↓
Data transferred via HL7 FHIR
    ↓
Imported into BioTeK
```

**Data Available:**
- Complete medical history from other institutions
- Previous test results
- Treatment history
- Clinical notes

**Note:** BioTeK already implements this! (See DATA_EXCHANGE_GUIDE.md)

---

## 🔄 **Typical Clinical Workflow**

### **Real-World Scenario: Diabetes Risk Assessment**

```
Day 1: Patient Appointment Scheduled
├── Receptionist registers patient in system
├── Demographics entered (name, DOB, etc.)
└── Insurance verified

Day 2: Patient Arrives at Clinic
├── Check-in at front desk
├── Nurse calls patient to exam room
└── Nurse takes vitals:
    ├── Height: 175 cm
    ├── Weight: 85 kg
    └── System auto-calculates BMI: 27.8

Day 3: Lab Work Ordered
├── Doctor orders blood tests
├── Patient goes to lab
├── Lab runs tests:
    ├── HbA1c: 6.8%
    ├── LDL: 145 mg/dL
    └── Glucose: 115 mg/dL
└── Results auto-sent to EHR within hours

Day 4: Doctor Review
├── Doctor opens patient chart
├── All data pre-populated:
    ✓ Age: 45 (from registration)
    ✓ Gender: M (from registration)
    ✓ BMI: 27.8 (from vitals)
    ✓ HbA1c: 6.8% (from lab)
    ✓ LDL: 145 (from lab)
    ✓ Smoking: Yes (from patient questionnaire)
├── Doctor clicks "Generate Risk Prediction"
├── BioTeK calculates risk with differential privacy
└── Doctor discusses results with patient
```

---

## 💻 **BioTeK Implementation**

### **Current System:**

For this academic demonstration, BioTeK:

1. **Accepts clinical data via API** (`POST /predict`)
2. **Assumes data is already collected** from sources above
3. **Focuses on privacy-preserving prediction** (core innovation)
4. **Demonstrates data exchange capabilities** (hospital-to-hospital)

### **Sample Data Flow:**

```python
# In production: Data comes from EHR
# For demo: Doctor enters known clinical values

POST /predict
{
  "patient_id": "PAT-123456",
  "age": 45,              # From patient registration
  "bmi": 27.8,            # Calculated from vitals
  "hba1c": 6.8,           # From lab results
  "ldl": 145,             # From lab results
  "smoking": 1,           # From patient questionnaire
  "prs": 0.5              # From genetic testing
}

# BioTeK applies differential privacy
# Returns risk prediction
# Logs access for HIPAA compliance
```

---

## 🔌 **Integration Points (Production)**

### **HL7 FHIR Integration Example:**

```javascript
// Fetch patient data from EHR
async function fetchPatientData(patientId) {
  // Query FHIR server
  const patient = await fhirClient.read('Patient', patientId);
  const observations = await fhirClient.search('Observation', {
    patient: patientId,
    code: 'http://loinc.org|4548-4' // HbA1c LOINC code
  });
  
  // Extract clinical data
  const age = calculateAge(patient.birthDate);
  const hba1c = observations[0].valueQuantity.value;
  
  // Send to BioTeK
  return {
    patient_id: patientId,
    age: age,
    hba1c: hba1c,
    // ... other values
  };
}
```

### **Device Integration Example:**

```python
# Blood pressure monitor integration
def collect_vitals(patient_id):
    # Read from connected device
    bp_reading = bp_monitor.read()
    weight = scale.read()
    height = height_rod.read()
    
    # Calculate BMI
    bmi = weight / (height/100)**2
    
    # Store in patient record
    store_vitals(patient_id, {
        'blood_pressure': bp_reading,
        'weight': weight,
        'height': height,
        'bmi': bmi
    })
```

---

## 📋 **Data Standards**

### **BioTeK Supports:**

- ✅ **HL7 FHIR** - Healthcare data exchange standard
- ✅ **HL7 v2** - Lab results messaging
- ✅ **LOINC** - Lab test codes
- ✅ **SNOMED CT** - Clinical terminology
- ✅ **ICD-10** - Diagnosis codes

### **Export Formats:**
- ✅ **JSON** - Machine-readable
- ✅ **FHIR Bundle** - Healthcare interoperability
- ✅ **PDF** - Human-readable reports

---

## 🎯 **For This Demonstration**

### **Assumption:**
Clinical data is **already available** from the sources described above.

### **Focus:**
Demonstrate BioTeK's **core innovations**:
1. Privacy-preserving ML (differential privacy)
2. Secure data exchange (hospital-to-hospital)
3. Patient data rights (HIPAA Right of Access)
4. Purpose-based access control
5. Complete audit trails

### **Realistic Scenario:**
```
"In production, a doctor would open the patient's chart
in the BioTeK system, where all clinical data has been
automatically imported from the EHR, lab systems, and
patient intake forms via HL7 FHIR APIs.

For this demonstration, we'll use representative clinical
values to show the privacy-preserving prediction engine
and secure data exchange capabilities."
```

---

## ✅ **Valid Approach**

This is the **standard approach** for academic projects focusing on:
- Machine learning algorithms
- Privacy-preserving techniques
- Data security and compliance
- System architecture

**Data collection pipelines are a separate concern** and would typically be:
- Built by integration teams
- Using standard healthcare APIs
- Customized for each healthcare organization's existing systems

---

## 🚀 **Future Enhancement**

If BioTeK were deployed in production, the roadmap would include:

### **Phase 1: Core Platform** ✅ (DONE)
- Privacy-preserving ML
- Data exchange
- Patient rights
- Access control

### **Phase 2: Integration** (Future)
- HL7 FHIR API server
- EHR connectors (Epic, Cerner)
- Lab system integration
- Device connectivity

### **Phase 3: Workflow** (Future)
- Nurse intake module
- Patient questionnaires
- Care coordination
- Clinical decision support

**Current focus: Phase 1 is complete and production-ready.**

---

**Last Updated:** November 17, 2025  
**For Questions:** See main documentation (IMPLEMENTATION_SUMMARY.md)
