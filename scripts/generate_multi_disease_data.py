"""
BioTeK Multi-Disease Synthetic Data Generator
Generates realistic clinical + genetic data for 12 disease risk predictions
Based on UK Biobank validated biomarkers and GWAS literature

Features: 55 clinical biomarkers
Diseases: 12 (metabolic, cardiovascular, cancer, neurological)
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple

np.random.seed(42)

# =============================================================================
# FEATURE SCHEMA (55 Features)
# =============================================================================

FEATURE_SCHEMA = {
    # DEMOGRAPHICS (5)
    "demographics": {
        "age": {"mean": 55, "std": 15, "min": 18, "max": 85},
        "sex": {"type": "binary", "prob": 0.5},  # 0=female, 1=male
        "ethnicity": {"type": "categorical", "n_categories": 6},  # 0-5
        "bmi": {"mean": 27, "std": 5, "min": 16, "max": 50},
        "family_history_score": {"mean": 3, "std": 2, "min": 0, "max": 10},
    },
    
    # METABOLIC PANEL (8)
    "metabolic": {
        "hba1c": {"mean": 5.7, "std": 1.2, "min": 4.0, "max": 14.0},
        "fasting_glucose": {"mean": 100, "std": 25, "min": 50, "max": 300},
        "insulin": {"mean": 12, "std": 8, "min": 2, "max": 50},
        "triglycerides": {"mean": 150, "std": 80, "min": 30, "max": 500},
        "hdl": {"mean": 55, "std": 15, "min": 20, "max": 100},
        "ldl": {"mean": 120, "std": 35, "min": 40, "max": 250},
        "total_cholesterol": {"mean": 200, "std": 40, "min": 100, "max": 350},
        "waist_circumference": {"mean": 90, "std": 15, "min": 50, "max": 150},
    },
    
    # LIVER PANEL (6)
    "liver": {
        "alt": {"mean": 30, "std": 20, "min": 5, "max": 200},
        "ast": {"mean": 28, "std": 15, "min": 5, "max": 200},
        "ggt": {"mean": 40, "std": 35, "min": 5, "max": 300},
        "bilirubin": {"mean": 0.8, "std": 0.4, "min": 0.1, "max": 3.0},
        "albumin": {"mean": 4.2, "std": 0.5, "min": 2.5, "max": 5.5},
        "alkaline_phosphatase": {"mean": 70, "std": 25, "min": 30, "max": 150},
    },
    
    # KIDNEY PANEL (5)
    "kidney": {
        "creatinine": {"mean": 1.0, "std": 0.3, "min": 0.5, "max": 5.0},
        "egfr": {"mean": 90, "std": 20, "min": 15, "max": 120},
        "bun": {"mean": 15, "std": 5, "min": 5, "max": 50},
        "uric_acid": {"mean": 5.5, "std": 1.5, "min": 2, "max": 12},
        "urine_acr": {"mean": 30, "std": 50, "min": 0, "max": 500},  # albumin/creatinine ratio
    },
    
    # CARDIAC MARKERS (4)
    "cardiac": {
        "bnp": {"mean": 50, "std": 80, "min": 0, "max": 1000},
        "troponin": {"mean": 0.01, "std": 0.02, "min": 0, "max": 0.5},
        "lipoprotein_a": {"mean": 30, "std": 40, "min": 0, "max": 200},
        "homocysteine": {"mean": 10, "std": 4, "min": 5, "max": 30},
    },
    
    # INFLAMMATORY (5)
    "inflammatory": {
        "crp": {"mean": 3, "std": 5, "min": 0, "max": 20},
        "esr": {"mean": 15, "std": 12, "min": 0, "max": 100},
        "wbc": {"mean": 7, "std": 2, "min": 3, "max": 15},
        "neutrophils": {"mean": 4, "std": 1.5, "min": 1, "max": 10},
        "lymphocytes": {"mean": 2, "std": 0.8, "min": 0.5, "max": 5},
    },
    
    # BLOOD PANEL (6)
    "blood": {
        "hemoglobin": {"mean": 14, "std": 2, "min": 8, "max": 18},
        "hematocrit": {"mean": 42, "std": 5, "min": 25, "max": 55},
        "platelets": {"mean": 250, "std": 60, "min": 100, "max": 500},
        "rbc": {"mean": 4.8, "std": 0.6, "min": 3, "max": 7},
        "mcv": {"mean": 88, "std": 8, "min": 70, "max": 110},
        "rdw": {"mean": 13, "std": 1.5, "min": 10, "max": 20},
    },
    
    # VITAL SIGNS (4)
    "vitals": {
        "bp_systolic": {"mean": 125, "std": 18, "min": 80, "max": 200},
        "bp_diastolic": {"mean": 80, "std": 12, "min": 40, "max": 130},
        "heart_rate": {"mean": 72, "std": 12, "min": 40, "max": 150},
        "respiratory_rate": {"mean": 16, "std": 3, "min": 10, "max": 30},
    },
    
    # LIFESTYLE (4)
    "lifestyle": {
        "smoking_pack_years": {"mean": 5, "std": 10, "min": 0, "max": 100},
        "alcohol_units_weekly": {"mean": 5, "std": 8, "min": 0, "max": 50},
        "exercise_hours_weekly": {"mean": 3, "std": 3, "min": 0, "max": 20},
        "diet_quality_score": {"mean": 5, "std": 2, "min": 0, "max": 10},
    },
    
    # HORMONAL (3)
    "hormonal": {
        "tsh": {"mean": 2, "std": 1.5, "min": 0.1, "max": 10},
        "vitamin_d": {"mean": 30, "std": 15, "min": 5, "max": 100},
        "cortisol": {"mean": 15, "std": 5, "min": 5, "max": 30},
    },
    
    # POLYGENIC RISK SCORES (5) - Generated separately
    "prs": {
        "prs_metabolic": {"mean": 0, "std": 1, "min": -3, "max": 3},
        "prs_cardiovascular": {"mean": 0, "std": 1, "min": -3, "max": 3},
        "prs_cancer": {"mean": 0, "std": 1, "min": -3, "max": 3},
        "prs_neurological": {"mean": 0, "std": 1, "min": -3, "max": 3},
        "prs_autoimmune": {"mean": 0, "std": 1, "min": -3, "max": 3},
    },
}

# =============================================================================
# DISEASE DEFINITIONS (12 Diseases)
# =============================================================================

DISEASES = {
    # TIER 1: Metabolic/High Accuracy
    "type2_diabetes": {
        "name": "Type 2 Diabetes",
        "prevalence": 0.12,
        "weights": {
            "hba1c": 0.35, "fasting_glucose": 0.20, "bmi": 0.15, "age": 0.08,
            "prs_metabolic": 0.12, "waist_circumference": 0.05, "triglycerides": 0.03,
            "family_history_score": 0.02
        }
    },
    "coronary_heart_disease": {
        "name": "Coronary Heart Disease",
        "prevalence": 0.08,
        "weights": {
            "ldl": 0.20, "age": 0.18, "bp_systolic": 0.15, "smoking_pack_years": 0.15,
            "prs_cardiovascular": 0.12, "hdl": -0.08, "sex": 0.07, "crp": 0.05
        }
    },
    "hypertension": {
        "name": "Hypertension",
        "prevalence": 0.30,
        "weights": {
            "bp_systolic": 0.30, "bp_diastolic": 0.20, "age": 0.15, "bmi": 0.12,
            "prs_cardiovascular": 0.10, "smoking_pack_years": 0.05, "alcohol_units_weekly": 0.05,
            "family_history_score": 0.03
        }
    },
    "chronic_kidney_disease": {
        "name": "Chronic Kidney Disease",
        "prevalence": 0.10,
        "weights": {
            "egfr": -0.35, "creatinine": 0.25, "urine_acr": 0.15, "hba1c": 0.10,
            "age": 0.08, "bp_systolic": 0.05, "prs_metabolic": 0.02
        }
    },
    "nafld": {
        "name": "Non-Alcoholic Fatty Liver Disease",
        "prevalence": 0.25,
        "weights": {
            "alt": 0.25, "bmi": 0.20, "triglycerides": 0.15, "waist_circumference": 0.12,
            "ast": 0.10, "hba1c": 0.08, "ggt": 0.05, "prs_metabolic": 0.05
        }
    },
    
    # TIER 2: Cardiovascular
    "stroke": {
        "name": "Stroke",
        "prevalence": 0.03,
        "weights": {
            "age": 0.25, "bp_systolic": 0.20, "smoking_pack_years": 0.15,
            "prs_cardiovascular": 0.12, "ldl": 0.10, "hba1c": 0.08, "crp": 0.05,
            "heart_rate": 0.05
        }
    },
    "heart_failure": {
        "name": "Heart Failure",
        "prevalence": 0.05,
        "weights": {
            "bnp": 0.30, "age": 0.20, "bp_systolic": 0.12, "bmi": 0.10,
            "egfr": -0.08, "prs_cardiovascular": 0.10, "hemoglobin": -0.05,
            "heart_rate": 0.05
        }
    },
    "atrial_fibrillation": {
        "name": "Atrial Fibrillation",
        "prevalence": 0.04,
        "weights": {
            "age": 0.30, "bmi": 0.15, "bp_systolic": 0.12, "tsh": 0.10,
            "prs_cardiovascular": 0.12, "alcohol_units_weekly": 0.08, "heart_rate": 0.08,
            "sex": 0.05
        }
    },
    
    # TIER 3: Respiratory
    "copd": {
        "name": "Chronic Obstructive Pulmonary Disease",
        "prevalence": 0.06,
        "weights": {
            "smoking_pack_years": 0.45, "age": 0.25, "bmi": -0.10,
            "respiratory_rate": 0.10, "wbc": 0.05, "crp": 0.05
        }
    },
    
    # TIER 4: Cancer (Genetic-Heavy)
    "breast_cancer": {
        "name": "Breast Cancer",
        "prevalence": 0.04,  # females only effectively
        "weights": {
            "age": 0.20, "prs_cancer": 0.35, "family_history_score": 0.20,
            "bmi": 0.10, "alcohol_units_weekly": 0.05, "sex": -0.10  # female higher
        }
    },
    "colorectal_cancer": {
        "name": "Colorectal Cancer",
        "prevalence": 0.03,
        "weights": {
            "age": 0.25, "prs_cancer": 0.25, "family_history_score": 0.18,
            "bmi": 0.12, "smoking_pack_years": 0.08, "diet_quality_score": -0.07,
            "crp": 0.05
        }
    },
    
    # TIER 5: Neurological
    "alzheimers_disease": {
        "name": "Alzheimer's Disease",
        "prevalence": 0.05,
        "weights": {
            "age": 0.40, "prs_neurological": 0.30, "family_history_score": 0.12,
            "hba1c": 0.05, "bp_systolic": 0.05, "exercise_hours_weekly": -0.05,
            "diet_quality_score": -0.03
        }
    },
}


def generate_feature(spec: Dict, n: int) -> np.ndarray:
    """Generate a single feature based on its specification"""
    if spec.get("type") == "binary":
        return np.random.binomial(1, spec["prob"], n)
    elif spec.get("type") == "categorical":
        return np.random.randint(0, spec["n_categories"], n)
    else:
        values = np.random.normal(spec["mean"], spec["std"], n)
        return np.clip(values, spec["min"], spec["max"])


def generate_all_features(n_patients: int) -> pd.DataFrame:
    """Generate all 55 features for n patients"""
    data = {}
    
    for category, features in FEATURE_SCHEMA.items():
        for feature_name, spec in features.items():
            data[feature_name] = generate_feature(spec, n_patients)
    
    return pd.DataFrame(data)


def calculate_disease_risk(df: pd.DataFrame, disease_id: str) -> np.ndarray:
    """Calculate disease risk score based on weighted features"""
    disease = DISEASES[disease_id]
    weights = disease["weights"]
    prevalence = disease["prevalence"]
    
    # Normalize features to z-scores for consistent weighting
    risk_score = np.zeros(len(df))
    
    for feature, weight in weights.items():
        if feature in df.columns:
            # Z-score normalization
            feature_mean = df[feature].mean()
            feature_std = df[feature].std()
            if feature_std > 0:
                z_score = (df[feature] - feature_mean) / feature_std
            else:
                z_score = 0
            risk_score += weight * z_score
    
    # Add noise
    risk_score += np.random.normal(0, 0.3, len(df))
    
    # Convert to probability using sigmoid
    prob = 1 / (1 + np.exp(-risk_score))
    
    # Adjust threshold to match target prevalence
    threshold = np.percentile(prob, (1 - prevalence) * 100)
    labels = (prob > threshold).astype(int)
    
    return labels, prob


def generate_multi_disease_data(n_patients: int = 2000) -> pd.DataFrame:
    """Generate complete multi-disease dataset"""
    
    print(f"{'='*60}")
    print("BioTeK Multi-Disease Data Generator")
    print(f"{'='*60}")
    print(f"\nGenerating {n_patients} synthetic patient records...")
    print(f"Features: 55 clinical biomarkers")
    print(f"Diseases: {len(DISEASES)} conditions")
    
    # Generate base features
    df = generate_all_features(n_patients)
    
    # Add patient IDs
    df.insert(0, 'patient_id', [f'PAT-{i:06d}' for i in range(n_patients)])
    
    print(f"\n✓ Generated {len(df.columns)} features")
    
    # Generate disease labels
    print(f"\nGenerating disease labels:")
    for disease_id, disease_info in DISEASES.items():
        labels, probs = calculate_disease_risk(df, disease_id)
        df[f'label_{disease_id}'] = labels
        df[f'prob_{disease_id}'] = probs.round(4)
        
        n_positive = labels.sum()
        pct = n_positive / len(df) * 100
        print(f"  - {disease_info['name']}: {n_positive} cases ({pct:.1f}%)")
    
    return df


def split_federated_data(df: pd.DataFrame, n_hospitals: int = 3) -> List[pd.DataFrame]:
    """Split data across hospitals for federated learning simulation"""
    print(f"\n{'='*60}")
    print(f"Splitting data across {n_hospitals} hospital nodes")
    print(f"{'='*60}")
    
    hospital_names = [
        "Boston General Hospital",
        "NYC Medical Center", 
        "LA University Hospital",
        "Chicago Health System",
        "Seattle Regional Medical"
    ][:n_hospitals]
    
    # Shuffle and split
    df_shuffled = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    hospitals = []
    split_size = len(df) // n_hospitals
    
    for i in range(n_hospitals):
        start_idx = i * split_size
        end_idx = start_idx + split_size if i < n_hospitals - 1 else len(df)
        hospital_df = df_shuffled.iloc[start_idx:end_idx].copy()
        hospital_df['hospital_id'] = f'HOSP_{i+1:02d}'
        hospital_df['hospital_name'] = hospital_names[i]
        hospitals.append(hospital_df)
        print(f"  - {hospital_names[i]}: {len(hospital_df)} patients")
    
    return hospitals


def main():
    """Main data generation pipeline"""
    
    # Create directories
    data_dir = Path('data')
    data_dir.mkdir(exist_ok=True)
    
    multi_disease_dir = data_dir / 'multi_disease'
    multi_disease_dir.mkdir(exist_ok=True)
    
    federated_dir = multi_disease_dir / 'federated'
    federated_dir.mkdir(exist_ok=True)
    
    # Generate data
    df = generate_multi_disease_data(n_patients=3000)
    
    # Save complete dataset
    complete_path = multi_disease_dir / 'patients_complete.csv'
    df.to_csv(complete_path, index=False)
    print(f"\n✓ Saved complete dataset: {complete_path}")
    
    # Save feature-only dataset (for training)
    feature_cols = [col for col in df.columns if not col.startswith('label_') and not col.startswith('prob_')]
    label_cols = [col for col in df.columns if col.startswith('label_')]
    
    features_df = df[feature_cols]
    features_path = multi_disease_dir / 'features.csv'
    features_df.to_csv(features_path, index=False)
    print(f"✓ Saved features: {features_path}")
    
    labels_df = df[['patient_id'] + label_cols]
    labels_path = multi_disease_dir / 'labels.csv'
    labels_df.to_csv(labels_path, index=False)
    print(f"✓ Saved labels: {labels_path}")
    
    # Split for federated learning
    hospitals = split_federated_data(df, n_hospitals=3)
    
    for i, hospital_df in enumerate(hospitals):
        hospital_path = federated_dir / f'hospital_{i+1:02d}.csv'
        hospital_df.to_csv(hospital_path, index=False)
        print(f"  ✓ Saved: {hospital_path}")
    
    # Summary statistics
    print(f"\n{'='*60}")
    print("DATA GENERATION COMPLETE")
    print(f"{'='*60}")
    print(f"\nTotal patients: {len(df)}")
    print(f"Total features: {len(feature_cols) - 1}")  # -1 for patient_id
    print(f"Total diseases: {len(DISEASES)}")
    
    print(f"\nFeature categories:")
    for category in FEATURE_SCHEMA:
        n_features = len(FEATURE_SCHEMA[category])
        print(f"  - {category}: {n_features} features")
    
    print(f"\nDisease prevalence summary:")
    for disease_id, disease_info in DISEASES.items():
        col = f'label_{disease_id}'
        pct = df[col].mean() * 100
        print(f"  - {disease_info['name']}: {pct:.1f}%")
    
    print(f"\n✓ All data saved to {multi_disease_dir.absolute()}")


if __name__ == "__main__":
    main()
