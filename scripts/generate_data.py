"""
Synthetic Patient Data Generator for BioTeK
Generates realistic clinical + genetic data for disease risk prediction
"""

import numpy as np
import pandas as pd
from pathlib import Path

# Set random seed for reproducibility
np.random.seed(42)

def generate_patient_data(n_patients=1000):
    """
    Generate synthetic patient data with clinical and genetic features
    
    Features:
    - age: 18-85 years
    - bmi: 18-40 kg/m²
    - hba1c: 4.0-10.0% (glycated hemoglobin)
    - ldl: 50-250 mg/dL (cholesterol)
    - smoking: 0 (no) or 1 (yes)
    - prs: -2 to +2 (polygenic risk score, standardized)
    - sex: 0 (female) or 1 (male)
    - label: 0 (low risk) or 1 (high risk)
    """
    
    print(f"Generating {n_patients} synthetic patient records...")
    
    # Generate features with realistic distributions
    age = np.random.normal(55, 15, n_patients).clip(18, 85)
    bmi = np.random.normal(27, 5, n_patients).clip(18, 40)
    hba1c = np.random.normal(5.7, 1.2, n_patients).clip(4.0, 10.0)
    ldl = np.random.normal(120, 35, n_patients).clip(50, 250)
    smoking = np.random.binomial(1, 0.25, n_patients)
    prs = np.random.normal(0, 0.8, n_patients).clip(-2, 2)
    sex = np.random.binomial(1, 0.5, n_patients)
    
    # Generate disease risk based on features with realistic relationships
    # Risk increases with: age, bmi, hba1c, ldl, smoking, positive prs
    risk_score = (
        0.02 * age +                    # age effect
        0.05 * bmi +                    # BMI effect
        0.30 * hba1c +                  # diabetes marker
        0.01 * ldl +                    # cholesterol
        0.50 * smoking +                # smoking effect
        0.40 * prs +                    # genetic risk
        0.20 * sex +                    # sex effect
        np.random.normal(0, 0.5, n_patients)  # random noise
    )
    
    # Convert to binary classification with threshold
    threshold = np.percentile(risk_score, 60)  # 40% high risk
    label = (risk_score > threshold).astype(int)
    
    # Create DataFrame
    df = pd.DataFrame({
        'patient_id': [f'P{i:04d}' for i in range(n_patients)],
        'age': age.round(1),
        'bmi': bmi.round(1),
        'hba1c': hba1c.round(2),
        'ldl': ldl.round(1),
        'smoking': smoking,
        'prs': prs.round(3),
        'sex': sex,
        'label': label
    })
    
    # Add risk category for visualization
    df['risk_category'] = df['label'].map({0: 'Low Risk', 1: 'High Risk'})
    
    print(f"✓ Generated {n_patients} patients")
    print(f"  - Low Risk: {(df['label'] == 0).sum()} ({(df['label'] == 0).mean()*100:.1f}%)")
    print(f"  - High Risk: {(df['label'] == 1).sum()} ({(df['label'] == 1).mean()*100:.1f}%)")
    
    return df


def split_federated_data(df, n_hospitals=3):
    """
    Split data into federated datasets (simulating different hospitals)
    Each hospital gets a random subset
    """
    print(f"\nSplitting data across {n_hospitals} hospitals...")
    
    # Shuffle and split
    df_shuffled = df.sample(frac=1, random_state=42).reset_index(drop=True)
    split_size = len(df) // n_hospitals
    
    hospitals = []
    for i in range(n_hospitals):
        start_idx = i * split_size
        end_idx = start_idx + split_size if i < n_hospitals - 1 else len(df)
        hospital_df = df_shuffled.iloc[start_idx:end_idx].copy()
        hospital_df['hospital_id'] = f'Hospital_{chr(65+i)}'  # A, B, C
        hospitals.append(hospital_df)
        print(f"  - Hospital {chr(65+i)}: {len(hospital_df)} patients")
    
    return hospitals


def main():
    """Generate and save synthetic data"""
    
    # Create directories
    data_dir = Path('data')
    data_dir.mkdir(exist_ok=True)
    
    federated_dir = data_dir / 'federated'
    federated_dir.mkdir(exist_ok=True)
    
    # Generate data
    df = generate_patient_data(n_patients=1000)
    
    # Save complete dataset
    complete_path = data_dir / 'patients_complete.csv'
    df.to_csv(complete_path, index=False)
    print(f"\n✓ Saved complete dataset: {complete_path}")
    
    # Split into federated datasets
    hospitals = split_federated_data(df, n_hospitals=3)
    
    for i, hospital_df in enumerate(hospitals):
        hospital_path = federated_dir / f'hospital_{chr(65+i)}.csv'
        hospital_df.to_csv(hospital_path, index=False)
        print(f"  ✓ Saved: {hospital_path}")
    
    # Display statistics
    print("\n" + "="*60)
    print("DATA GENERATION COMPLETE")
    print("="*60)
    print(f"Total patients: {len(df)}")
    print(f"\nFeature statistics:")
    print(df.describe().round(2))
    print(f"\nSample records:")
    print(df.head())
    
    print(f"\n✓ All data saved to {data_dir.absolute()}")


if __name__ == "__main__":
    main()
