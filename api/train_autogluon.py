"""
AutoGluon Training Script for BioTeK Disease Prediction
Trains AutoGluon models on all 12 disease datasets
"""

import os
import pandas as pd
import time
from pathlib import Path

# Disease configurations with data paths and target columns
DISEASE_CONFIGS = {
    'type2_diabetes': {
        'name': 'Type 2 Diabetes',
        'data_path': 'data/kaggle_diabetes/diabetes_prediction_dataset.csv',
        'target': 'diabetes',
        'problem_type': 'binary'
    },
    'hypertension': {
        'name': 'Hypertension',
        'data_path': 'data/kaggle_health/hypertension_data.csv',
        'target': 'target',
        'problem_type': 'binary'
    },
    'stroke': {
        'name': 'Stroke',
        'data_path': 'data/kaggle_stroke/healthcare-dataset-stroke-data.csv',
        'target': 'stroke',
        'problem_type': 'binary'
    },
    'heart_failure': {
        'name': 'Heart Failure',
        'data_path': 'data/kaggle_heartfailure/heart_failure_clinical_records_dataset.csv',
        'target': 'DEATH_EVENT',
        'problem_type': 'binary'
    },
    'coronary_heart_disease': {
        'name': 'Coronary Heart Disease',
        'data_path': 'data/kaggle_heart/heart.csv',
        'target': 'target',
        'problem_type': 'binary'
    },
    'chronic_kidney_disease': {
        'name': 'Chronic Kidney Disease',
        'data_path': 'data/kaggle_kidney/kidney_disease.csv',
        'target': 'classification',
        'problem_type': 'binary'
    },
    'nafld': {
        'name': 'Non-Alcoholic Fatty Liver Disease',
        'data_path': 'data/kaggle_liver/indian_liver_patient.csv',
        'target': 'Dataset',
        'problem_type': 'binary'
    },
    'copd': {
        'name': 'COPD',
        'data_path': 'data/copd_kaggle_real.csv',
        'target': 'COPD',
        'problem_type': 'binary'
    },
    'alzheimers_disease': {
        'name': "Alzheimer's Disease",
        'data_path': 'data/kaggle_alzheimer/alzheimers_disease_data.csv',
        'target': 'Diagnosis',
        'problem_type': 'binary'
    },
    'breast_cancer': {
        'name': 'Breast Cancer',
        'data_path': 'data/breast_cancer_wisconsin.csv',
        'target': 'target',
        'problem_type': 'binary'
    },
    'atrial_fibrillation': {
        'name': 'Atrial Fibrillation',
        'data_path': 'data/atrial_fibrillation_risk.csv',
        'target': 'target',
        'problem_type': 'binary'
    },
    'colorectal_cancer': {
        'name': 'Colorectal Cancer',
        'data_path': 'data/colorectal_cancer_risk.csv',
        'target': 'target',
        'problem_type': 'binary'
    }
}


def train_autogluon_model(disease_id: str, config: dict, output_dir: str = "models/autogluon"):
    """Train an AutoGluon model for a specific disease"""
    from autogluon.tabular import TabularPredictor
    
    data_path = config['data_path']
    target = config['target']
    
    if not os.path.exists(data_path):
        print(f"  ⚠ Data not found: {data_path}")
        return None
    
    # Load data
    df = pd.read_csv(data_path)
    print(f"  Loaded {len(df)} samples, {len(df.columns)} features")
    
    # Clean target column if needed
    if target not in df.columns:
        print(f"  ⚠ Target column '{target}' not found")
        return None
    
    # Handle missing values in target
    df = df.dropna(subset=[target])
    
    # Convert target to binary if needed
    if df[target].dtype == 'object':
        unique_vals = df[target].unique()
        if len(unique_vals) == 2:
            # Map to 0/1
            mapping = {unique_vals[0]: 0, unique_vals[1]: 1}
            df[target] = df[target].map(mapping)
    
    # Create model directory
    model_path = os.path.join(output_dir, disease_id)
    os.makedirs(model_path, exist_ok=True)
    
    # Train AutoGluon
    print(f"  Training AutoGluon (this may take a few minutes)...")
    start_time = time.time()
    
    predictor = TabularPredictor(
        label=target,
        path=model_path,
        problem_type='binary',
        eval_metric='roc_auc'
    ).fit(
        train_data=df,
        presets='medium_quality',  # Balance between speed and accuracy
        time_limit=120,  # 2 minutes max per disease
        verbosity=1
    )
    
    elapsed = time.time() - start_time
    
    # Get leaderboard
    leaderboard = predictor.leaderboard(silent=True)
    best_model = leaderboard.iloc[0]['model']
    best_score = leaderboard.iloc[0]['score_val']
    
    print(f"  ✓ Trained in {elapsed:.1f}s")
    print(f"  Best model: {best_model}")
    print(f"  ROC-AUC: {best_score:.4f}")
    
    return predictor


def train_all_diseases():
    """Train AutoGluon models for all diseases"""
    print("=" * 60)
    print("AutoGluon Training for BioTeK")
    print("=" * 60)
    
    output_dir = "models/autogluon"
    os.makedirs(output_dir, exist_ok=True)
    
    results = {}
    
    for disease_id, config in DISEASE_CONFIGS.items():
        print(f"\n🔬 {config['name']} ({disease_id})")
        print("-" * 40)
        
        try:
            predictor = train_autogluon_model(disease_id, config, output_dir)
            if predictor:
                results[disease_id] = {
                    'status': 'success',
                    'path': os.path.join(output_dir, disease_id)
                }
        except Exception as e:
            print(f"  ✗ Error: {e}")
            results[disease_id] = {'status': 'failed', 'error': str(e)}
    
    # Summary
    print("\n" + "=" * 60)
    print("TRAINING SUMMARY")
    print("=" * 60)
    
    success = sum(1 for r in results.values() if r['status'] == 'success')
    print(f"Trained: {success}/{len(DISEASE_CONFIGS)} diseases")
    
    for disease_id, result in results.items():
        status = "✓" if result['status'] == 'success' else "✗"
        print(f"  {status} {disease_id}")
    
    return results


if __name__ == "__main__":
    train_all_diseases()
