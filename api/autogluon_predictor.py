"""
AutoGluon Predictor for BioTeK
Loads pre-trained AutoGluon models for disease prediction
"""

import os
import numpy as np
import pandas as pd
from typing import Dict, Optional, Any

# Disease configurations
DISEASE_CONFIGS = {
    'type2_diabetes': {'name': 'Type 2 Diabetes', 'features': ['age', 'bmi', 'HbA1c_level', 'blood_glucose_level', 'hypertension', 'heart_disease', 'smoking_history', 'gender']},
    'hypertension': {'name': 'Hypertension', 'features': ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']},
    'stroke': {'name': 'Stroke', 'features': ['gender', 'age', 'hypertension', 'heart_disease', 'ever_married', 'work_type', 'Residence_type', 'avg_glucose_level', 'bmi', 'smoking_status']},
    'heart_failure': {'name': 'Heart Failure', 'features': ['age', 'anaemia', 'creatinine_phosphokinase', 'diabetes', 'ejection_fraction', 'high_blood_pressure', 'platelets', 'serum_creatinine', 'serum_sodium', 'sex', 'smoking', 'time']},
    'coronary_heart_disease': {'name': 'Coronary Heart Disease', 'features': ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']},
    'nafld': {'name': 'Non-Alcoholic Fatty Liver Disease', 'features': ['Age', 'Gender', 'Total_Bilirubin', 'Direct_Bilirubin', 'Alkaline_Phosphotase', 'Alamine_Aminotransferase', 'Aspartate_Aminotransferase', 'Total_Protiens', 'Albumin', 'Albumin_and_Globulin_Ratio']},
    'alzheimers_disease': {'name': "Alzheimer's Disease", 'features': ['Age', 'Gender', 'Ethnicity', 'EducationLevel', 'BMI', 'Smoking', 'AlcoholConsumption', 'PhysicalActivity', 'DietQuality', 'SleepQuality']},
    'breast_cancer': {'name': 'Breast Cancer', 'features': ['mean radius', 'mean texture', 'mean perimeter', 'mean area', 'mean smoothness']},
    'atrial_fibrillation': {'name': 'Atrial Fibrillation', 'features': ['age', 'sex', 'bmi', 'bp_systolic', 'bp_diastolic', 'smoking', 'diabetes', 'heart_disease']},
    'colorectal_cancer': {'name': 'Colorectal Cancer', 'features': ['age', 'sex', 'bmi', 'smoking', 'alcohol', 'family_history', 'physical_activity']},
    'copd': {'name': 'COPD', 'features': ['AGE', 'PackHistory', 'MWT1', 'MWT2', 'FEV1', 'FVC', 'CAT', 'HAD', 'SGRQ']},
    'chronic_kidney_disease': {'name': 'Chronic Kidney Disease', 'features': ['age', 'bp', 'sg', 'al', 'su', 'rbc', 'pc', 'pcc', 'ba', 'bgr', 'bu', 'sc', 'sod', 'pot', 'hemo', 'pcv', 'wc', 'rc', 'htn', 'dm', 'cad', 'appet', 'pe', 'ane']}
}


class AutoGluonPredictor:
    """
    AutoGluon-based disease predictor
    Uses pre-trained AutoGluon ensemble models
    """
    
    def __init__(self, models_dir: str = "models/autogluon"):
        self.models_dir = models_dir
        self.predictors: Dict[str, Any] = {}
        self._load_models()
    
    def _load_models(self):
        """Load all available AutoGluon models"""
        from autogluon.tabular import TabularPredictor
        
        print("Loading AutoGluon models...")
        
        for disease_id in DISEASE_CONFIGS.keys():
            model_path = os.path.join(self.models_dir, disease_id)
            if os.path.exists(model_path):
                try:
                    self.predictors[disease_id] = TabularPredictor.load(model_path, verbosity=0)
                    print(f"  ✓ {disease_id}")
                except Exception as e:
                    print(f"  ✗ {disease_id}: {e}")
        
        print(f"Loaded {len(self.predictors)}/{len(DISEASE_CONFIGS)} models")
    
    def _map_patient_features(self, disease_id: str, patient_data: Dict) -> Dict:
        """Map standard patient data to disease-specific features"""
        # Extract ALL 16 UI fields
        age = patient_data.get('age', 50)
        sex = patient_data.get('sex', 0)
        bmi = patient_data.get('bmi', 25)
        bp_sys = patient_data.get('bp_systolic', 120)
        bp_dia = patient_data.get('bp_diastolic', 80)
        total_chol = patient_data.get('total_cholesterol', 200)
        hdl = patient_data.get('hdl', 50)
        ldl = patient_data.get('ldl', 120)
        triglycerides = patient_data.get('triglycerides', 150)
        hba1c = patient_data.get('hba1c', 5.5)
        smoking = patient_data.get('smoking', 0)
        has_diabetes = patient_data.get('has_diabetes', 0)
        on_bp_meds = patient_data.get('on_bp_medication', 0)
        family_hx = patient_data.get('family_history_score', 0)
        exercise = patient_data.get('exercise_hours_weekly', 2.5)
        egfr = patient_data.get('egfr', 90)
        
        # Use actual diabetes input, fallback to HbA1c threshold
        is_diabetic = has_diabetes or (hba1c > 6.5)
        
        # Derive additional risk factors from lipids
        high_ldl = ldl > 130
        low_hdl = hdl < 40
        high_trig = triglycerides > 200
        
        # Use BOTH systolic and diastolic for hypertension detection
        has_high_bp = (bp_sys >= 140) or (bp_dia >= 90) or on_bp_meds
        
        # Kidney function
        low_egfr = egfr < 60
        
        # Sedentary lifestyle
        sedentary = exercise < 1.0
        
        if disease_id == 'type2_diabetes':
            return {
                'gender': 'Male' if sex == 1 else 'Female',
                'age': age,
                'hypertension': 1 if has_high_bp else 0,
                'heart_disease': 1 if family_hx >= 2 else 0,
                'smoking_history': 'current' if smoking else 'never',
                'bmi': bmi,
                'HbA1c_level': hba1c,
                'blood_glucose_level': int(hba1c * 20)
            }
        elif disease_id == 'stroke':
            return {
                'gender': 'Male' if sex == 1 else 'Female',
                'age': age,
                'hypertension': 1 if has_high_bp else 0,
                'heart_disease': 1 if family_hx >= 2 else 0,
                'ever_married': 'Yes',
                'work_type': 'Private',
                'Residence_type': 'Urban',
                'avg_glucose_level': hba1c * 20,
                'bmi': bmi,
                'smoking_status': 'smokes' if smoking else 'never smoked'
            }
        elif disease_id in ['hypertension', 'coronary_heart_disease']:
            return {
                'age': age,
                'sex': sex,
                'cp': 1 if (family_hx >= 2 or high_ldl) else 0,
                'trestbps': bp_sys,
                'chol': total_chol,
                'fbs': 1 if is_diabetic else 0,
                'restecg': 1 if low_hdl else 0,
                'thalach': max(150, 220 - age),
                'exang': 1 if (high_ldl and low_hdl) else 0,
                'oldpeak': 1.0 if bp_sys > 140 else 0,
                'slope': 1,
                'ca': 1 if family_hx >= 3 else 0,
                'thal': 2
            }
        elif disease_id == 'heart_failure':
            return {
                'age': age,
                'anaemia': 0,
                'creatinine_phosphokinase': 250,
                'diabetes': 1 if is_diabetic else 0,
                'ejection_fraction': 40,
                'high_blood_pressure': 1 if has_high_bp else 0,
                'platelets': 250000,
                'serum_creatinine': 1.0,
                'serum_sodium': 137,
                'sex': sex,
                'smoking': smoking,
                'time': 100
            }
        elif disease_id == 'nafld':
            # NAFLD risk increases with high triglycerides and sedentary lifestyle
            alt_boost = 20 if (bmi > 30 or high_trig or sedentary) else 0
            return {
                'Age': age,
                'Gender': 'Male' if sex == 1 else 'Female',
                'Total_Bilirubin': 1.0,
                'Direct_Bilirubin': 0.3,
                'Alkaline_Phosphotase': 200 + alt_boost,
                'Alamine_Aminotransferase': 25 + alt_boost,
                'Aspartate_Aminotransferase': 25 + int(alt_boost * 0.75),
                'Total_Protiens': 6.5,
                'Albumin': 3.5,
                'Albumin_and_Globulin_Ratio': 1.0
            }
        elif disease_id == 'chronic_kidney_disease':
            # Use eGFR directly for CKD prediction
            return {
                'age': age,
                'bp': bp_sys,
                'sg': 1.020,
                'al': 1 if low_egfr else 0,
                'su': 1 if is_diabetic else 0,
                'rbc': 'normal',
                'pc': 'normal',
                'pcc': 'notpresent',
                'ba': 'notpresent',
                'bgr': hba1c * 20,
                'bu': 40 if low_egfr else 20,
                'sc': 1.5 if low_egfr else 1.0,
                'sod': 137,
                'pot': 4.5,
                'hemo': 12.5,
                'pcv': 40,
                'wc': 8000,
                'rc': 5.0,
                'htn': 'yes' if has_high_bp else 'no',
                'dm': 'yes' if is_diabetic else 'no',
                'cad': 'no',
                'appet': 'good',
                'pe': 'no',
                'ane': 'no'
            }
        elif disease_id == 'alzheimers_disease':
            # Physical activity is protective against Alzheimer's
            physical_activity_score = min(10, exercise * 2)  # 0-10 scale
            return {
                'Age': age,
                'Gender': sex,
                'Ethnicity': 0,
                'EducationLevel': 2,
                'BMI': bmi,
                'Smoking': smoking,
                'AlcoholConsumption': 0,
                'PhysicalActivity': physical_activity_score,
                'DietQuality': 5,
                'SleepQuality': 7
            }
        else:
            return patient_data
    
    def predict(self, disease_id: str, patient_data: Dict) -> Dict:
        """
        Predict disease risk for a patient
        
        Args:
            disease_id: Disease identifier
            patient_data: Patient features dict
            
        Returns:
            Prediction result with risk score and category
        """
        if disease_id not in self.predictors:
            return {
                'disease_id': disease_id,
                'name': DISEASE_CONFIGS.get(disease_id, {}).get('name', disease_id),
                'risk_percentage': 0,
                'risk_category': 'UNKNOWN',
                'confidence': 0,
                'model_type': 'AutoGluon (not available)'
            }
        
        predictor = self.predictors[disease_id]
        
        # Map patient data to disease-specific features
        mapped_data = self._map_patient_features(disease_id, patient_data)
        df = pd.DataFrame([mapped_data])
        
        try:
            # Get probability prediction
            proba = predictor.predict_proba(df)
            
            # Get positive class probability
            if hasattr(proba, 'columns') and len(proba.columns) > 1:
                risk_score = float(proba.iloc[0, 1])
            else:
                risk_score = float(proba.iloc[0])
            
            risk_pct = risk_score * 100
            
            # Determine risk category
            if risk_pct >= 50:
                category = "VERY_HIGH"
            elif risk_pct >= 30:
                category = "HIGH"
            elif risk_pct >= 15:
                category = "MODERATE"
            elif risk_pct >= 5:
                category = "LOW"
            else:
                category = "MINIMAL"
            
            return {
                'disease_id': disease_id,
                'name': DISEASE_CONFIGS[disease_id]['name'],
                'risk_score': risk_score,
                'risk_percentage': round(risk_pct, 1),
                'risk_category': category,
                'confidence': 0.85,
                'model_type': 'AutoGluon Ensemble'
            }
            
        except Exception as e:
            return {
                'disease_id': disease_id,
                'name': DISEASE_CONFIGS[disease_id]['name'],
                'risk_percentage': 0,
                'risk_category': 'ERROR',
                'confidence': 0,
                'error': str(e),
                'model_type': 'AutoGluon'
            }
    
    def predict_all(self, patient_data: Dict) -> Dict[str, Dict]:
        """Predict all diseases for a patient"""
        results = {}
        for disease_id in DISEASE_CONFIGS.keys():
            results[disease_id] = self.predict(disease_id, patient_data)
        return results


# Global instance
_predictor: Optional[AutoGluonPredictor] = None


def get_autogluon_predictor() -> AutoGluonPredictor:
    """Get or create AutoGluon predictor"""
    global _predictor
    if _predictor is None:
        _predictor = AutoGluonPredictor()
    return _predictor


def predict_with_autogluon(patient_data: Dict) -> Dict:
    """Main entry point for AutoGluon predictions"""
    predictor = get_autogluon_predictor()
    return predictor.predict_all(patient_data)


if __name__ == "__main__":
    # Test
    print("Testing AutoGluon predictor...")
    
    test_patient = {
        'age': 55,
        'gender': 'Male',
        'bmi': 28.5,
        'HbA1c_level': 6.2,
        'blood_glucose_level': 140,
        'hypertension': 1,
        'heart_disease': 0,
        'smoking_history': 'current'
    }
    
    results = predict_with_autogluon(test_patient)
    
    print("\nResults:")
    for disease_id, pred in sorted(results.items(), key=lambda x: -x[1].get('risk_percentage', 0)):
        print(f"  {pred['name']:30} {pred.get('risk_percentage', 0):5.1f}% {pred.get('risk_category', 'N/A')}")
