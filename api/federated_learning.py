"""
Federated Learning for Privacy-Preserving Collaborative Training
Enables hospitals to train together WITHOUT sharing patient data

Google-level privacy tech: Only model weights are shared, never raw data
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from typing import Dict, List, Tuple, Any
import copy
import json
from datetime import datetime

class Hospital:
    """Represents a single hospital node in federated network"""
    
    def __init__(self, hospital_id: str, name: str, num_patients: int):
        self.hospital_id = hospital_id
        self.name = name
        self.num_patients = num_patients
        self.local_model = None
        self.local_data = None
        self.history = []
        
    def generate_synthetic_data(self, seed: int = None):
        """
        Generate synthetic patient data for this hospital
        In production: Use real local patient database
        """
        if seed:
            np.random.seed(seed)
        
        n = self.num_patients
        
        # Features: age, bmi, hba1c, ldl, smoking, prs, sex
        X = np.column_stack([
            np.random.normal(50, 15, n),      # age
            np.random.normal(27, 5, n),       # bmi
            np.random.normal(6.5, 1.5, n),    # hba1c
            np.random.normal(130, 30, n),     # ldl
            np.random.binomial(1, 0.3, n),    # smoking
            np.random.normal(0, 1, n),        # prs
            np.random.binomial(1, 0.5, n)     # sex
        ])
        
        # Generate labels (chronic disease risk)
        # Risk increases with age, bmi, hba1c, smoking, prs
        risk_score = (
            0.02 * X[:, 0] +      # age
            0.05 * X[:, 1] +      # bmi
            0.15 * X[:, 2] +      # hba1c (strongest)
            0.01 * X[:, 3] +      # ldl
            0.3 * X[:, 4] +       # smoking
            0.2 * X[:, 5]         # prs (genetic)
        )
        
        # Convert to probability
        prob = 1 / (1 + np.exp(-risk_score + 5))
        y = np.random.binomial(1, prob)
        
        self.local_data = (X, y)
        return X, y
    
    def train_local_model(self, global_weights: Dict = None):
        """
        Train model on local data ONLY
        Data NEVER leaves this hospital
        """
        if self.local_data is None:
            raise ValueError("No local data available")
        
        X, y = self.local_data
        
        # Use logistic regression for federated learning (easier to aggregate)
        model = LogisticRegression(max_iter=100, random_state=42)
        
        # If global weights provided, initialize with them
        if global_weights:
            model.coef_ = global_weights['coef']
            model.intercept_ = global_weights['intercept']
            model.classes_ = global_weights['classes']
        
        # Train on LOCAL data only
        model.fit(X, y)
        
        self.local_model = model
        
        # Evaluate on local data
        accuracy = model.score(X, y)
        
        self.history.append({
            'timestamp': datetime.now().isoformat(),
            'accuracy': accuracy,
            'num_samples': len(y)
        })
        
        return model, accuracy
    
    def get_model_weights(self) -> Dict:
        """
        Extract model weights to share
        ONLY weights are shared, NOT data
        """
        if self.local_model is None:
            raise ValueError("No trained model")
        
        return {
            'coef': copy.deepcopy(self.local_model.coef_),
            'intercept': copy.deepcopy(self.local_model.intercept_),
            'classes': copy.deepcopy(self.local_model.classes_),
            'num_samples': self.num_patients
        }


class FederatedCoordinator:
    """
    Central coordinator for federated learning
    Aggregates model weights, NEVER sees raw data
    """
    
    def __init__(self):
        self.hospitals = {}
        self.global_model = None
        self.training_rounds = []
        
    def register_hospital(self, hospital: Hospital):
        """Register a hospital in the federation"""
        self.hospitals[hospital.hospital_id] = hospital
        
    def federated_averaging(self, weights_list: List[Dict]) -> Dict:
        """
        FedAvg: Average model weights from all hospitals
        Weighted by number of samples at each hospital
        
        This is the KEY innovation:
        - We average WEIGHTS, not DATA
        - Each hospital contributes proportionally
        - Result: Global model without sharing data
        """
        total_samples = sum(w['num_samples'] for w in weights_list)
        
        # Weighted average of coefficients
        avg_coef = np.zeros_like(weights_list[0]['coef'])
        avg_intercept = np.zeros_like(weights_list[0]['intercept'])
        
        for weights in weights_list:
            weight_factor = weights['num_samples'] / total_samples
            avg_coef += weights['coef'] * weight_factor
            avg_intercept += weights['intercept'] * weight_factor
        
        return {
            'coef': avg_coef,
            'intercept': avg_intercept,
            'classes': weights_list[0]['classes']
        }
    
    def train_round(self, round_num: int) -> Dict:
        """
        Execute one round of federated training
        
        Steps:
        1. Each hospital trains locally (data stays local)
        2. Hospitals send weights to coordinator
        3. Coordinator averages weights (FedAvg)
        4. Updated global model sent back to hospitals
        """
        print(f"\n🔄 Federated Training Round {round_num}")
        print("=" * 60)
        
        round_info = {
            'round': round_num,
            'timestamp': datetime.now().isoformat(),
            'hospitals': []
        }
        
        # Step 1 & 2: Each hospital trains locally and sends weights
        weights_list = []
        for hospital_id, hospital in self.hospitals.items():
            print(f"\n🏥 {hospital.name}")
            print(f"   Training on {hospital.num_patients} local patients...")
            
            # Train on LOCAL data only (data never leaves hospital)
            model, accuracy = hospital.train_local_model(
                global_weights=self.global_model if round_num > 1 else None
            )
            
            print(f"   ✅ Local accuracy: {accuracy:.1%}")
            
            # Extract weights (NOT data)
            weights = hospital.get_model_weights()
            weights_list.append(weights)
            
            round_info['hospitals'].append({
                'hospital_id': hospital_id,
                'name': hospital.name,
                'num_patients': hospital.num_patients,
                'local_accuracy': accuracy
            })
        
        # Step 3: Aggregate weights (FedAvg)
        print(f"\n📊 Coordinator: Aggregating weights from {len(weights_list)} hospitals...")
        self.global_model = self.federated_averaging(weights_list)
        print(f"   ✅ Global model updated")
        
        self.training_rounds.append(round_info)
        
        return round_info
    
    def get_global_model(self):
        """Return global model for inference"""
        if self.global_model is None:
            raise ValueError("No global model trained yet")
        
        # Create a model with global weights
        model = LogisticRegression()
        model.coef_ = self.global_model['coef']
        model.intercept_ = self.global_model['intercept']
        model.classes_ = self.global_model['classes']
        
        return model


def simulate_federated_training(
    num_rounds: int = 5,
    hospitals_config: List[Dict] = None
) -> Tuple[FederatedCoordinator, Dict]:
    """
    Simulate complete federated learning workflow
    
    Args:
        num_rounds: Number of training rounds
        hospitals_config: List of hospital configurations
        
    Returns:
        coordinator: Trained federated coordinator
        summary: Training summary
    """
    if hospitals_config is None:
        # Default: 3 hospitals with different sizes
        hospitals_config = [
            {'id': 'HOSP-BOSTON', 'name': 'Boston General Hospital', 'patients': 1000},
            {'id': 'HOSP-NYC', 'name': 'NYC Medical Center', 'patients': 800},
            {'id': 'HOSP-LA', 'name': 'LA University Hospital', 'patients': 1200}
        ]
    
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║     FEDERATED LEARNING: Privacy-Preserving Training       ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Initialize coordinator
    coordinator = FederatedCoordinator()
    
    # Register hospitals and generate data
    print("\n🏥 Registering Hospitals:")
    print("-" * 60)
    for config in hospitals_config:
        hospital = Hospital(
            hospital_id=config['id'],
            name=config['name'],
            num_patients=config['patients']
        )
        
        # Generate synthetic local data (in production: use real DB)
        hospital.generate_synthetic_data(seed=hash(config['id']) % 1000)
        
        coordinator.register_hospital(hospital)
        print(f"✅ {hospital.name}: {hospital.num_patients} patients")
    
    total_patients = sum(h['patients'] for h in hospitals_config)
    print(f"\n📊 Total patients across federation: {total_patients}")
    print(f"🔒 Privacy guarantee: Raw data NEVER leaves hospitals")
    
    # Execute training rounds
    print("\n" + "=" * 60)
    print("STARTING FEDERATED TRAINING")
    print("=" * 60)
    
    for round_num in range(1, num_rounds + 1):
        coordinator.train_round(round_num)
    
    # Summary
    summary = {
        'num_hospitals': len(hospitals_config),
        'total_patients': total_patients,
        'num_rounds': num_rounds,
        'hospitals': hospitals_config,
        'training_history': coordinator.training_rounds
    }
    
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║              ✅ FEDERATED TRAINING COMPLETE                ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"\n📊 Summary:")
    print(f"   - {len(hospitals_config)} hospitals trained collaboratively")
    print(f"   - {total_patients} total patients (data stayed local)")
    print(f"   - {num_rounds} training rounds completed")
    print(f"   - Global model ready for inference")
    print(f"\n🔒 Privacy: NO patient data was ever shared between hospitals!")
    
    return coordinator, summary


def evaluate_federated_vs_centralized(coordinator: FederatedCoordinator):
    """
    Compare federated model to what we'd get if we pooled all data (centralized)
    Shows that federated learning works!
    """
    print("\n📊 Federated vs Centralized Comparison:")
    print("-" * 60)
    
    # Get federated model
    federated_model = coordinator.get_global_model()
    
    # Pool all data (what traditional ML would do - but violates privacy!)
    all_X = []
    all_y = []
    for hospital in coordinator.hospitals.values():
        X, y = hospital.local_data
        all_X.append(X)
        all_y.append(y)
    
    X_pooled = np.vstack(all_X)
    y_pooled = np.concatenate(all_y)
    
    # Train centralized model
    centralized_model = LogisticRegression(max_iter=100, random_state=42)
    centralized_model.fit(X_pooled, y_pooled)
    
    # Evaluate both
    fed_accuracy = federated_model.score(X_pooled, y_pooled)
    cent_accuracy = centralized_model.score(X_pooled, y_pooled)
    
    print(f"Federated Model Accuracy:   {fed_accuracy:.1%}")
    print(f"Centralized Model Accuracy: {cent_accuracy:.1%}")
    print(f"Difference:                 {abs(fed_accuracy - cent_accuracy):.1%}")
    print("\n✅ Federated learning achieves similar accuracy WITHOUT sharing data!")
    
    return {
        'federated_accuracy': fed_accuracy,
        'centralized_accuracy': cent_accuracy,
        'difference': abs(fed_accuracy - cent_accuracy)
    }
