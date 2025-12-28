# BioTeK Multi-Disease Prediction System
## Complete Rebuild Plan

---

## 1. Disease Categories & Required Biomarkers

### Category A: Metabolic Diseases
| Disease | Required Biomarkers |
|---------|---------------------|
| Type 2 Diabetes | HbA1c, Fasting Glucose, Insulin, C-peptide |
| Metabolic Syndrome | Waist circumference, Triglycerides, HDL, BP |
| NAFLD (Fatty Liver) | ALT, AST, GGT, Liver ultrasound score |

### Category B: Cardiovascular Diseases
| Disease | Required Biomarkers |
|---------|---------------------|
| Coronary Heart Disease | LDL, HDL, Triglycerides, CRP, Lipoprotein(a) |
| Stroke | BP systolic/diastolic, Atrial fibrillation, Carotid IMT |
| Heart Failure | BNP/NT-proBNP, Ejection fraction |
| Hypertension | BP systolic, BP diastolic, Sodium, Potassium |

### Category C: Cancers
| Disease | Required Biomarkers |
|---------|---------------------|
| Breast Cancer | BRCA1/2 status, Mammogram density, Family history score |
| Colorectal Cancer | CEA, Colonoscopy findings, Lynch syndrome genes |
| Lung Cancer | Pack-years smoking, CT scan nodules, EGFR/ALK status |
| Prostate Cancer | PSA, Free PSA ratio, Family history |

### Category D: Neurological
| Disease | Required Biomarkers |
|---------|---------------------|
| Alzheimer's Disease | APOE4 alleles, Tau protein, Amyloid-beta, MMSE score |
| Parkinson's Disease | Alpha-synuclein, LRRK2/GBA genes, Motor assessment |
| Multiple Sclerosis | Oligoclonal bands, MRI lesion count, Vitamin D |

### Category E: Autoimmune
| Disease | Required Biomarkers |
|---------|---------------------|
| Rheumatoid Arthritis | RF, Anti-CCP, CRP, ESR, HLA-DR4 |
| Lupus (SLE) | ANA, Anti-dsDNA, Complement C3/C4 |
| Type 1 Diabetes | GAD65 antibodies, IA-2 antibodies, HLA-DR3/DR4 |

### Category F: Respiratory
| Disease | Required Biomarkers |
|---------|---------------------|
| COPD | FEV1, FEV1/FVC ratio, Pack-years |
| Asthma | IgE, Eosinophils, FeNO, Peak flow variability |

### Category G: Kidney/Liver
| Disease | Required Biomarkers |
|---------|---------------------|
| Chronic Kidney Disease | eGFR, Creatinine, BUN, Albumin/Creatinine ratio |
| Liver Cirrhosis | ALT, AST, Bilirubin, Albumin, INR, Platelets |

---

## 2. Complete Feature List (New System)

### Core Demographics (5 features)
- age
- sex (0=female, 1=male)
- ethnicity (categorical: 0-5)
- family_history_score (0-10 composite)
- bmi

### Metabolic Panel (8 features)
- hba1c
- fasting_glucose
- insulin
- triglycerides
- hdl
- ldl
- waist_circumference
- blood_pressure_systolic
- blood_pressure_diastolic

### Liver Panel (5 features)
- alt
- ast
- ggt
- bilirubin
- albumin

### Kidney Panel (4 features)
- creatinine
- egfr
- bun
- urine_albumin_creatinine_ratio

### Inflammatory Markers (4 features)
- crp (C-reactive protein)
- esr (Erythrocyte sedimentation rate)
- wbc (White blood cells)
- eosinophils

### Cardiac Markers (3 features)
- bnp (B-type natriuretic peptide)
- troponin
- lipoprotein_a

### Cancer Markers (4 features)
- psa (males only)
- cea
- ca125 (females only)
- afp

### Lifestyle Factors (4 features)
- smoking_pack_years
- alcohol_units_weekly
- exercise_hours_weekly
- diet_quality_score (0-10)

### Genetic Risk Scores (per disease category)
- prs_metabolic
- prs_cardiovascular
- prs_cancer
- prs_neurological
- prs_autoimmune

**TOTAL: ~45 features**

---

## 3. Disease-Specific Genetic Panels

### Metabolic Disease SNPs
| SNP | Gene | Disease | Effect |
|-----|------|---------|--------|
| rs7903146 | TCF7L2 | T2D | +39% risk per allele |
| rs8050136 | FTO | Obesity/T2D | +15% risk |
| rs1801282 | PPARG | T2D | Protective |

### Cardiovascular SNPs
| SNP | Gene | Disease | Effect |
|-----|------|---------|--------|
| rs10757274 | 9p21 | CAD | +25% risk |
| rs4977574 | CDKN2A | MI | +29% risk |
| rs1333049 | 9p21.3 | CVD | +20% risk |

### Cancer SNPs
| SNP | Gene | Disease | Effect |
|-----|------|---------|--------|
| rs1799966 | BRCA1 | Breast | High penetrance |
| rs80357906 | BRCA2 | Breast/Ovarian | High penetrance |
| rs121913529 | APC | Colorectal | Lynch syndrome |

### Neurological SNPs
| SNP | Gene | Disease | Effect |
|-----|------|---------|--------|
| rs429358 | APOE | Alzheimer's | 3-12x risk (ε4) |
| rs7412 | APOE | Alzheimer's | Part of ε2/ε3/ε4 |
| rs34637584 | LRRK2 | Parkinson's | 2-5x risk |

### Autoimmune SNPs
| SNP | Gene | Disease | Effect |
|-----|------|---------|--------|
| rs2476601 | PTPN22 | RA/T1D/Lupus | +50% risk |
| rs3087243 | CTLA4 | Autoimmune | +20% risk |

---

## 4. Model Architecture

### Option A: Single Multi-Label Model
```
Input (45 features) → Neural Network → 15 disease probabilities
```
- Pros: Learns correlations between diseases
- Cons: May not capture disease-specific patterns well

### Option B: Disease-Specific Models (RECOMMENDED)
```
Input (45 features) → Feature Selector → Disease-Specific RF → Risk Score

Example:
- Diabetes Model uses: hba1c, glucose, insulin, bmi, prs_metabolic
- Alzheimer's Model uses: age, apoe_status, tau, mmse, prs_neurological
```
- Pros: Each model optimized for its disease
- Cons: More models to maintain

### Option C: Hierarchical Model
```
Input → Category Classifier → Disease-Specific Model
         ↓
    [Metabolic, CVD, Cancer, Neuro, Autoimmune]
         ↓
    Disease-specific prediction
```

---

## 5. Implementation Phases

### Phase 1: Data Layer (Est: 4-6 hours)
- [ ] Create new feature schema (45 features)
- [ ] Update data generation script
- [ ] Create disease-specific genetic panels
- [ ] Generate new training data

### Phase 2: Model Layer (Est: 4-6 hours)
- [ ] Train disease-specific models (15 models)
- [ ] Implement model ensemble/selector
- [ ] Create SHAP explainers for each model
- [ ] Validate cross-disease predictions

### Phase 3: API Layer (Est: 3-4 hours)
- [ ] Update prediction endpoint for multi-disease
- [ ] Add disease-specific PRS calculation
- [ ] Update privacy/consent for genetic data types
- [ ] Update federated learning for new features

### Phase 4: Frontend Layer (Est: 4-6 hours)
- [ ] Redesign prediction input form (45 fields)
- [ ] Create multi-disease risk dashboard
- [ ] Add disease category tabs/views
- [ ] Update visualization components

### Phase 5: Documentation (Est: 2 hours)
- [ ] Update /docs page
- [ ] Update medical knowledge base
- [ ] Update README

**TOTAL ESTIMATED TIME: 17-24 hours**

---

## 6. Questions for You

Before I start building, please confirm:

1. **Disease scope**: All 15+ diseases listed, or a subset?

2. **Feature input**: Should users enter all 45 features, or should we have "quick" vs "comprehensive" modes?

3. **Genetic data**: Real SNP panels or simplified PRS scores per category?

4. **Model architecture**: Option A, B, or C?

5. **Priority**: Which disease categories matter most for your ethics course?

---

## 7. Ethical Considerations (For Your Course)

This expanded system raises MORE ethical questions:

- **Informed consent**: How do you consent for 15 different disease predictions?
- **Right to not know**: What if someone doesn't want to know their Alzheimer's risk?
- **Genetic discrimination**: Cancer/Alzheimer's predictions could affect insurance
- **Data minimization**: Do we need all 45 features for every patient?
- **Accuracy vs harm**: Is a 60% accurate cancer prediction helpful or harmful?

These are GREAT discussion points for PHIL 245!
