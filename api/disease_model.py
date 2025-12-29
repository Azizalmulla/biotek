"""
RealDiseaseModel class for XGBoost + LightGBM ensemble
Extracted for proper pickling/unpickling
"""

# Ensure module can be imported from anywhere
import sys
from pathlib import Path
_ml_dir = Path(__file__).parent
if str(_ml_dir) not in sys.path:
    sys.path.insert(0, str(_ml_dir))
if str(_ml_dir.parent) not in sys.path:
    sys.path.insert(0, str(_ml_dir.parent))

import numpy as np
from typing import Dict, List, Optional
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, roc_auc_score


class RealDiseaseModel:
    """XGBoost + LightGBM ensemble trained on real data"""
    
    def __init__(self, disease_name: str):
        self.disease_name = disease_name
        self.xgb_model = None
        self.lgb_model = None
        self.feature_names = []
        self.feature_importance = {}
        self.metrics = {}
    
    def train(self, X, y, test_size=0.2):
        """Train XGBoost and LightGBM models"""
        import pandas as pd
        
        if isinstance(X, pd.DataFrame):
            self.feature_names = list(X.columns)
            X = X.values
        else:
            self.feature_names = [f'feature_{i}' for i in range(X.shape[1])]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        
        # XGBoost
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            eval_metric='logloss',
            verbosity=0
        )
        self.xgb_model.fit(X_train, y_train)
        
        # LightGBM
        self.lgb_model = lgb.LGBMClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbose=-1
        )
        self.lgb_model.fit(X_train, y_train)
        
        # Ensemble predictions (average)
        xgb_proba = self.xgb_model.predict_proba(X_test)[:, 1]
        lgb_proba = self.lgb_model.predict_proba(X_test)[:, 1]
        ensemble_proba = (0.5 * xgb_proba + 0.5 * lgb_proba)
        ensemble_pred = (ensemble_proba >= 0.5).astype(int)
        
        # Metrics
        self.metrics = {
            'accuracy': accuracy_score(y_test, ensemble_pred),
            'auc': roc_auc_score(y_test, ensemble_proba) if len(np.unique(y_test)) > 1 else 0.5,
            'samples': len(y)
        }
        
        # Cross-validation
        try:
            cv_scores = cross_val_score(self.xgb_model, X, y, cv=5, scoring='roc_auc')
            self.metrics['cv_auc_mean'] = cv_scores.mean()
            self.metrics['cv_auc_std'] = cv_scores.std()
        except:
            self.metrics['cv_auc_mean'] = self.metrics['auc']
            self.metrics['cv_auc_std'] = 0.0
        
        # Feature importance (average of both models)
        xgb_imp = dict(zip(self.feature_names, self.xgb_model.feature_importances_))
        lgb_imp = dict(zip(self.feature_names, self.lgb_model.feature_importances_))
        self.feature_importance = {
            k: (xgb_imp.get(k, 0) + lgb_imp.get(k, 0)) / 2 
            for k in self.feature_names
        }
        
        print(f"  {self.disease_name}: Accuracy={self.metrics['accuracy']*100:.1f}%, AUC={self.metrics['auc']:.3f}")
    
    def predict_proba(self, X, from_raw=False):
        """Get ensemble probability predictions"""
        import pandas as pd
        
        if isinstance(X, pd.DataFrame):
            # Ensure columns are in right order
            X = X[self.feature_names].values if all(c in X.columns for c in self.feature_names) else X.values
        
        xgb_proba = self.xgb_model.predict_proba(X)[:, 1]
        lgb_proba = self.lgb_model.predict_proba(X)[:, 1]
        return 0.5 * xgb_proba + 0.5 * lgb_proba
    
    def predict(self, X):
        """Get ensemble class predictions"""
        proba = self.predict_proba(X)
        return (proba >= 0.5).astype(int)
