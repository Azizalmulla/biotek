"""
Train ALL 13 disease models using ONLY common features available from patient input.

This solves the feature mismatch problem - all models will use the same 9 features
that we always have from the patient intake form.

Common Features:
- age, sex, bmi
- bp_systolic, bp_diastolic
- hba1c, ldl
- smoking_pack_years, family_history_score
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, roc_auc_score

# OPTIMAL clinical features based on Framingham/QRISK2/SCORE2 research
COMMON_FEATURES = [
    'age', 'sex', 'bmi',
    'bp_systolic', 'bp_diastolic', 'on_bp_meds',  # BP + treatment status
    'total_cholesterol', 'hdl', 'ldl',  # Full lipid panel
    'hba1c', 'has_diabetes',  # Glycemic status
    'smoking', 'family_history',  # Lifestyle/genetic
]


class UnifiedDiseaseModel:
    """Model trained on common features only"""
    
    def __init__(self, name):
        self.name = name
        self.xgb_model = None
        self.lgb_model = None
        self.feature_names = COMMON_FEATURES
        self.accuracy = None
        self.auc = None
    
    def train(self, X, y):
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        # XGBoost
        self.xgb_model = XGBClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            random_state=42, use_label_encoder=False, eval_metric='logloss'
        )
        self.xgb_model.fit(X_train, y_train)
        
        # LightGBM
        self.lgb_model = LGBMClassifier(
            n_estimators=100, max_depth=5, learning_rate=0.1,
            random_state=42, verbose=-1
        )
        self.lgb_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.xgb_model.predict(X_test)
        y_prob = self.xgb_model.predict_proba(X_test)[:, 1]
        
        self.accuracy = accuracy_score(y_test, y_pred)
        try:
            self.auc = roc_auc_score(y_test, y_prob)
        except:
            self.auc = 0.5
        
        print(f"  {self.name}: Accuracy={self.accuracy*100:.1f}%, AUC={self.auc:.3f}")
    
    def predict_proba(self, X):
        return self.xgb_model.predict_proba(X)


def create_common_features(df, target_col, disease_type):
    """
    Extract/create OPTIMAL clinical features from any dataset.
    Maps various column names to our standard 13 features.
    """
    result = pd.DataFrame()
    n = len(df)
    
    # Age
    for col in ['age', 'Age', 'AGE']:
        if col in df.columns:
            result['age'] = pd.to_numeric(df[col], errors='coerce')
            break
    if 'age' not in result.columns:
        result['age'] = 50
    
    # Sex
    for col in ['sex', 'Sex', 'gender', 'Gender', 'male', 'Male']:
        if col in df.columns:
            vals = df[col]
            if vals.dtype == 'object':
                result['sex'] = vals.apply(lambda x: 1 if str(x).lower() in ['male', 'm', '1'] else 0)
            else:
                result['sex'] = vals.fillna(0).astype(int)
            break
    if 'sex' not in result.columns:
        result['sex'] = 0
    
    # BMI
    for col in ['bmi', 'BMI', 'Bmi']:
        if col in df.columns:
            result['bmi'] = pd.to_numeric(df[col], errors='coerce').fillna(25)
            break
    if 'bmi' not in result.columns:
        result['bmi'] = 25
    
    # Blood pressure systolic
    for col in ['bp_systolic', 'sysBP', 'SystolicBP', 'trestbps', 'ap_hi']:
        if col in df.columns:
            result['bp_systolic'] = pd.to_numeric(df[col], errors='coerce').fillna(120)
            break
    if 'bp_systolic' not in result.columns:
        result['bp_systolic'] = 120
    
    # Blood pressure diastolic
    for col in ['bp_diastolic', 'diaBP', 'DiastolicBP', 'ap_lo']:
        if col in df.columns:
            result['bp_diastolic'] = pd.to_numeric(df[col], errors='coerce').fillna(80)
            break
    if 'bp_diastolic' not in result.columns:
        result['bp_diastolic'] = 80
    
    # On BP medication (Framingham uses this)
    for col in ['on_bp_meds', 'BPMeds', 'bp_treatment', 'antihypertensive']:
        if col in df.columns:
            result['on_bp_meds'] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
            break
    if 'on_bp_meds' not in result.columns:
        # Estimate: if BP > 140, ~30% chance on meds
        result['on_bp_meds'] = ((result['bp_systolic'] > 140) & (np.random.random(n) < 0.3)).astype(int)
    
    # Total cholesterol
    for col in ['total_cholesterol', 'totChol', 'TotalCholesterol', 'chol', 'CholesterolTotal']:
        if col in df.columns:
            result['total_cholesterol'] = pd.to_numeric(df[col], errors='coerce').fillna(200)
            break
    if 'total_cholesterol' not in result.columns:
        result['total_cholesterol'] = 200
    
    # HDL cholesterol (protective - very important!)
    for col in ['hdl', 'HDL', 'CholesterolHDL', 'hdl_cholesterol']:
        if col in df.columns:
            result['hdl'] = pd.to_numeric(df[col], errors='coerce').fillna(50)
            break
    if 'hdl' not in result.columns:
        result['hdl'] = 50
    
    # LDL cholesterol
    for col in ['ldl', 'LDL', 'CholesterolLDL']:
        if col in df.columns:
            result['ldl'] = pd.to_numeric(df[col], errors='coerce').fillna(100)
            break
    if 'ldl' not in result.columns:
        # Estimate from total - HDL if available
        result['ldl'] = (result['total_cholesterol'] - result['hdl']) * 0.8
    
    # HbA1c
    for col in ['hba1c', 'HbA1c', 'HbA1c_level']:
        if col in df.columns:
            result['hba1c'] = pd.to_numeric(df[col], errors='coerce').fillna(5.5)
            break
    if 'hba1c' not in result.columns:
        # Check for glucose and convert
        for col in ['glucose', 'avg_glucose_level', 'blood_glucose_level']:
            if col in df.columns:
                glucose = pd.to_numeric(df[col], errors='coerce').fillna(100)
                result['hba1c'] = (glucose + 46.7) / 28.7  # ADAG formula
                break
    if 'hba1c' not in result.columns:
        result['hba1c'] = 5.5
    
    # Has diabetes (major CVD risk factor)
    for col in ['has_diabetes', 'diabetes', 'Diabetes', 'diabetic']:
        if col in df.columns:
            vals = df[col]
            if vals.dtype == 'object':
                result['has_diabetes'] = vals.apply(lambda x: 1 if str(x).lower() in ['yes', '1', 'true'] else 0)
            else:
                result['has_diabetes'] = (pd.to_numeric(vals, errors='coerce').fillna(0) > 0).astype(int)
            break
    if 'has_diabetes' not in result.columns:
        # Estimate from HbA1c: >= 6.5 = diabetes
        result['has_diabetes'] = (result['hba1c'] >= 6.5).astype(int)
    
    # Smoking
    for col in ['smoking', 'Smoking', 'currentSmoker', 'smoking_status', 'ever_smoked']:
        if col in df.columns:
            vals = df[col]
            if vals.dtype == 'object':
                result['smoking'] = vals.apply(lambda x: 1 if str(x).lower() in ['yes', 'current', 'formerly smoked', 'smokes', '1', '2'] else 0)
            else:
                result['smoking'] = (pd.to_numeric(vals, errors='coerce').fillna(0) > 0).astype(int)
            break
    if 'smoking' not in result.columns:
        result['smoking'] = 0
    
    # Family history
    for col in ['family_history', 'FamilyHistory', 'famhist', 'FamilyHistoryAlzheimers']:
        if col in df.columns:
            vals = df[col]
            if vals.dtype == 'object':
                result['family_history'] = vals.apply(lambda x: 1 if str(x).lower() in ['yes', '1', 'true'] else 0)
            else:
                result['family_history'] = (pd.to_numeric(vals, errors='coerce').fillna(0) > 0).astype(int)
            break
    if 'family_history' not in result.columns:
        result['family_history'] = 0
    
    # Target
    if target_col in df.columns:
        vals = pd.to_numeric(df[target_col], errors='coerce').fillna(0)
        # Ensure binary 0/1
        if vals.min() > 0:
            vals = vals - vals.min()
        result['target'] = (vals > 0).astype(int)
    else:
        # Try to find target
        for col in ['target', 'Target', 'outcome', 'Outcome', 'class', 'label', 'diagnosis', 'Diagnosis']:
            if col in df.columns:
                vals = pd.to_numeric(df[col], errors='coerce').fillna(0)
                if vals.min() > 0:
                    vals = vals - vals.min()
                result['target'] = (vals > 0).astype(int)
                break
    
    # Clean up
    result = result.dropna()
    result = result[result['age'] > 0]
    result = result[result['age'] < 120]
    
    return result


def load_and_prepare_dataset(name, path, target_col):
    """Load dataset and prepare common features"""
    try:
        df = pd.read_csv(path)
        prepared = create_common_features(df, target_col, name)
        if len(prepared) > 10:
            print(f"  ✓ {name}: {len(prepared)} samples")
            return prepared
    except Exception as e:
        print(f"  ✗ {name}: {str(e)[:40]}")
    return None


def train_all_unified_models():
    """Train all 13 disease models using common features"""
    
    print("="*60)
    print("TRAINING ALL MODELS WITH COMMON FEATURES")
    print("Features: age, sex, bmi, bp_sys, bp_dia, hba1c, ldl, smoking, family_hx")
    print("="*60)
    
    models = {}
    
    # Dataset configurations: (name, path, target_column)
    datasets = [
        ("type2_diabetes", "data/kaggle_diabetes/diabetes_prediction_dataset.csv", "diabetes"),
        ("hypertension", "data/kaggle_health/hypertension_data.csv", "target"),
        ("stroke", "data/kaggle_stroke/healthcare-dataset-stroke-data.csv", "stroke"),
        ("heart_failure", "data/kaggle_heartfailure/heart_failure_clinical_records_dataset.csv", "DEATH_EVENT"),
        ("coronary_heart_disease", "data/kaggle_heart/heart.csv", "target"),
        ("chronic_kidney_disease", "data/kaggle_kidney/kidney_disease.csv", "classification"),
        ("nafld", "data/kaggle_liver/indian_liver_patient.csv", "Dataset"),
        ("copd", "data/copd_kaggle_real.csv", "copd"),
        ("alzheimers_disease", "data/kaggle_alzheimer/alzheimers_disease_data.csv", "Diagnosis"),
        ("breast_cancer", "data/breast_cancer_wisconsin.csv", "target"),
        ("atrial_fibrillation", "data/atrial_fibrillation_risk.csv", "target"),
        ("colorectal_cancer", "data/colorectal_cancer_risk.csv", "target"),
    ]
    
    for name, path, target_col in datasets:
        print(f"\n[{len(models)+1}/13] {name}")
        
        if path and os.path.exists(path):
            df = load_and_prepare_dataset(name, path, target_col)
            if df is not None and len(df) > 50:
                X = df[COMMON_FEATURES]
                y = df['target'].values
                
                model = UnifiedDiseaseModel(name)
                model.train(X, y)
                models[name] = model
                continue
        
        # Fallback: generate synthetic data with realistic distributions
        print(f"  Generating synthetic data for {name}...")
        df = generate_synthetic_data(name, 1000)
        X = df[COMMON_FEATURES]
        y = df['target'].values
        
        model = UnifiedDiseaseModel(name)
        model.train(X, y)
        models[name] = model
    
    # Save models
    print("\n" + "="*60)
    print("SAVING UNIFIED MODELS")
    print("="*60)
    
    os.makedirs("models", exist_ok=True)
    for name, model in models.items():
        filepath = f"models/unified_{name}_model.pkl"
        with open(filepath, 'wb') as f:
            pickle.dump(model, f)
        print(f"✓ Saved: {filepath}")
    
    # Summary
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    for name, model in models.items():
        print(f"{name:30}: AUC={model.auc:.3f}, Acc={model.accuracy*100:.1f}%")
    
    return models


def generate_synthetic_data(disease_name, n=1000):
    """Generate realistic synthetic data with all 13 optimal features"""
    np.random.seed(hash(disease_name) % 2**32)
    
    # Demographics
    age = np.random.normal(55, 15, n).clip(20, 90)
    sex = np.random.binomial(1, 0.5, n)
    bmi = np.random.normal(27, 5, n).clip(18, 45)
    
    # Blood pressure
    bp_sys = np.random.normal(125, 20, n).clip(90, 200)
    bp_dia = np.random.normal(80, 12, n).clip(60, 120)
    on_bp_meds = ((bp_sys > 140) & (np.random.random(n) < 0.4)).astype(int)
    
    # Lipid panel
    total_chol = np.random.normal(200, 40, n).clip(100, 350)
    hdl = np.random.normal(50, 15, n).clip(20, 100)
    ldl = (total_chol - hdl) * 0.8 + np.random.normal(0, 10, n)
    ldl = ldl.clip(50, 250)
    
    # Glycemic
    hba1c = np.random.normal(5.8, 1.2, n).clip(4, 14)
    has_diabetes = (hba1c >= 6.5).astype(int)
    
    # Lifestyle/genetic
    smoking = np.random.binomial(1, 0.25, n)
    family_hx = np.random.binomial(1, 0.3, n)
    
    # Disease-specific risk calculation using all features
    if disease_name == "breast_cancer":
        risk = -4 + 0.03 * age + 0.8 * (1-sex) + 0.4 * family_hx + 0.02 * bmi
    elif disease_name == "colorectal_cancer":
        risk = -5 + 0.04 * age + 0.3 * smoking + 0.4 * family_hx + 0.02 * bmi
    elif disease_name == "atrial_fibrillation":
        risk = -6 + 0.07 * age + 0.015 * bp_sys + 0.04 * bmi + 0.3 * has_diabetes
    else:
        risk = -4 + 0.03 * age + 0.03 * bmi + 0.015 * bp_sys - 0.02 * hdl + 0.01 * ldl
    
    prob = 1 / (1 + np.exp(-risk))
    target = (np.random.random(n) < prob).astype(int)
    
    return pd.DataFrame({
        'age': age, 'sex': sex, 'bmi': bmi,
        'bp_systolic': bp_sys, 'bp_diastolic': bp_dia, 'on_bp_meds': on_bp_meds,
        'total_cholesterol': total_chol, 'hdl': hdl, 'ldl': ldl,
        'hba1c': hba1c, 'has_diabetes': has_diabetes,
        'smoking': smoking, 'family_history': family_hx,
        'target': target
    })


if __name__ == "__main__":
    train_all_unified_models()
