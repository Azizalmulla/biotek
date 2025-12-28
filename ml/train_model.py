"""
Random Forest Model Training with Feature Importance
Trains disease risk prediction model on synthetic data
"""

import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

def load_data():
    """Load complete patient dataset"""
    data_path = Path('data/patients_complete.csv')
    
    if not data_path.exists():
        raise FileNotFoundError(
            "Data not found! Please run: python scripts/generate_data.py"
        )
    
    df = pd.read_csv(data_path)
    print(f"✓ Loaded {len(df)} patient records")
    return df


def prepare_features(df):
    """Prepare feature matrix and target variable"""
    
    # Feature columns
    feature_cols = ['age', 'bmi', 'hba1c', 'ldl', 'smoking', 'prs', 'sex']
    
    X = df[feature_cols].values
    y = df['label'].values
    
    print(f"\nFeatures: {feature_cols}")
    print(f"Target: disease risk (0=Low, 1=High)")
    
    return X, y, feature_cols


def train_random_forest(X_train, y_train):
    """Train Random Forest classifier"""
    
    print("\n" + "="*60)
    print("TRAINING RANDOM FOREST MODEL")
    print("="*60)
    
    # Random Forest parameters
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    # Train model
    print("\nTraining in progress...")
    model.fit(X_train, y_train)
    
    print(f"✓ Training complete ({model.n_estimators} trees)")
    
    return model


def evaluate_model(model, X_test, y_test, feature_names):
    """Evaluate model performance"""
    
    print("\n" + "="*60)
    print("MODEL EVALUATION")
    print("="*60)
    
    # Predictions
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    # Metrics
    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"\nAccuracy: {accuracy:.1%}")
    print(f"AUC-ROC: {auc:.3f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Low Risk', 'High Risk']))
    
    # Feature importance
    importance = model.feature_importances_
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': importance
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    print(feature_importance.to_string(index=False))
    
    return accuracy, auc


def save_model(model, feature_names, metrics):
    """Save trained model and metadata"""
    
    models_dir = Path('models')
    models_dir.mkdir(exist_ok=True)
    
    # Save model
    model_path = models_dir / 'lightgbm_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n✓ Model saved: {model_path}")
    
    # Save feature names
    features_path = models_dir / 'feature_names.pkl'
    with open(features_path, 'wb') as f:
        pickle.dump(feature_names, f)
    print(f"✓ Features saved: {features_path}")
    
    # Save metadata
    metadata = {
        'model_type': 'RandomForest',
        'version': '1.0.0',
        'features': feature_names,
        'accuracy': metrics[0],
        'auc': metrics[1],
        'num_trees': model.n_estimators,
    }
    
    metadata_path = models_dir / 'model_metadata.pkl'
    with open(metadata_path, 'wb') as f:
        pickle.dump(metadata, f)
    print(f"✓ Metadata saved: {metadata_path}")


def main():
    """Main training pipeline"""
    
    print("="*60)
    print("BioTeK ML Training Pipeline")
    print("="*60)
    
    # Load data
    df = load_data()
    
    # Prepare features
    X, y, feature_names = prepare_features(df)
    
    # Split data
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.2, random_state=42, stratify=y_temp
    )
    
    print(f"\nData split:")
    print(f"  - Training: {len(X_train)} samples")
    print(f"  - Validation: {len(X_val)} samples")
    print(f"  - Test: {len(X_test)} samples")
    
    # Train model
    model = train_random_forest(X_train, y_train)
    
    # Evaluate
    accuracy, auc = evaluate_model(model, X_test, y_test, feature_names)
    
    # Save
    save_model(model, feature_names, (accuracy, auc))
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE ✓")
    print("="*60)
    print(f"\nModel ready for predictions!")
    print(f"Accuracy: {accuracy:.1%} | AUC: {auc:.3f}")


if __name__ == "__main__":
    main()
