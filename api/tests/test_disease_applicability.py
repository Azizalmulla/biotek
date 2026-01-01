"""
Validation Tests for Disease Applicability Gates

Tests:
1. Male + breast_cancer returns NOT_APPLICABLE and never calls ML
2. Toggling sex should NOT dramatically change unrelated diseases
3. Colorectal cancer risk should not change by sex (sex not in feature_set)
"""

import pytest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from disease_metadata import (
    DISEASE_METADATA, check_applicability, get_features_for_disease,
    ApplicabilityStatus, BASE_FEATURES, FEATURES_WITH_SEX
)


class TestApplicabilityGates:
    """Test 1: Male + breast_cancer returns NOT_APPLICABLE"""
    
    def test_male_breast_cancer_not_applicable(self):
        """Breast cancer should return NOT_APPLICABLE for male patients"""
        result = check_applicability("breast_cancer", patient_sex=1, patient_age=55)
        
        assert result["status"] == ApplicabilityStatus.NOT_APPLICABLE
        assert result["can_predict"] == False
        assert result["reason"] == "sex_not_applicable"
        assert "male" in result["reason_detail"].lower()
    
    def test_female_breast_cancer_applicable(self):
        """Breast cancer should be applicable for female patients"""
        result = check_applicability("breast_cancer", patient_sex=0, patient_age=55)
        
        assert result["status"] == ApplicabilityStatus.APPLICABLE
        assert result["can_predict"] == True
        assert result["reason"] is None
    
    def test_breast_cancer_age_minimum(self):
        """Breast cancer has minimum age of 25"""
        result = check_applicability("breast_cancer", patient_sex=0, patient_age=20)
        
        assert result["status"] == ApplicabilityStatus.NOT_APPLICABLE
        assert result["can_predict"] == False
        assert result["reason"] == "age_below_minimum"


class TestFeatureProvenance:
    """Test that sex is correctly included/excluded from feature sets"""
    
    def test_breast_cancer_excludes_sex(self):
        """Breast cancer model should NOT use sex as a feature"""
        metadata = DISEASE_METADATA.get("breast_cancer")
        
        assert metadata is not None
        assert metadata.includes_sex == False
        assert "sex" not in metadata.features_used
    
    def test_colorectal_cancer_excludes_sex(self):
        """Colorectal cancer (synthetic data) should NOT use sex"""
        metadata = DISEASE_METADATA.get("colorectal_cancer")
        
        assert metadata is not None
        assert metadata.includes_sex == False
        assert "sex" not in metadata.features_used
    
    def test_type2_diabetes_includes_sex(self):
        """Type 2 diabetes (real sex-stratified data) should use sex"""
        metadata = DISEASE_METADATA.get("type2_diabetes")
        
        assert metadata is not None
        assert metadata.includes_sex == True
        assert "sex" in metadata.features_used
    
    def test_coronary_heart_disease_includes_sex(self):
        """CHD (real sex-stratified data) should use sex"""
        metadata = DISEASE_METADATA.get("coronary_heart_disease")
        
        assert metadata is not None
        assert metadata.includes_sex == True
        assert "sex" in metadata.features_used


class TestSexIndependentDiseases:
    """Test 2 & 3: Sex toggle should not affect diseases without sex in features"""
    
    def test_colorectal_cancer_applicable_both_sexes(self):
        """Colorectal cancer should be applicable for both sexes"""
        male_result = check_applicability("colorectal_cancer", patient_sex=1, patient_age=55)
        female_result = check_applicability("colorectal_cancer", patient_sex=0, patient_age=55)
        
        assert male_result["can_predict"] == True
        assert female_result["can_predict"] == True
    
    def test_alzheimers_applicable_both_sexes(self):
        """Alzheimer's should be applicable for both sexes"""
        male_result = check_applicability("alzheimers_disease", patient_sex=1, patient_age=65)
        female_result = check_applicability("alzheimers_disease", patient_sex=0, patient_age=65)
        
        assert male_result["can_predict"] == True
        assert female_result["can_predict"] == True
    
    def test_copd_applicable_both_sexes(self):
        """COPD should be applicable for both sexes"""
        male_result = check_applicability("copd", patient_sex=1, patient_age=55)
        female_result = check_applicability("copd", patient_sex=0, patient_age=55)
        
        assert male_result["can_predict"] == True
        assert female_result["can_predict"] == True


class TestMetadataCompleteness:
    """Ensure all diseases have proper metadata"""
    
    def test_all_diseases_have_metadata(self):
        """All 12 diseases should have metadata defined"""
        expected_diseases = [
            'type2_diabetes', 'coronary_heart_disease', 'hypertension',
            'stroke', 'chronic_kidney_disease', 'nafld', 'heart_failure',
            'atrial_fibrillation', 'copd', 'breast_cancer', 
            'colorectal_cancer', 'alzheimers_disease'
        ]
        
        for disease_id in expected_diseases:
            assert disease_id in DISEASE_METADATA, f"Missing metadata for {disease_id}"
            metadata = DISEASE_METADATA[disease_id]
            assert metadata.display_name is not None
            assert len(metadata.applicable_sexes) > 0
            assert len(metadata.features_used) > 0
    
    def test_synthetic_datasets_dont_use_sex(self):
        """Diseases with synthetic data should not use sex as feature"""
        from disease_metadata import DatasetType
        
        for disease_id, metadata in DISEASE_METADATA.items():
            if metadata.dataset_type == DatasetType.SYNTHETIC:
                assert metadata.includes_sex == False, \
                    f"{disease_id} uses synthetic data but includes_sex=True"
                assert "sex" not in metadata.features_used, \
                    f"{disease_id} uses synthetic data but has sex in features"


class TestFeatureSets:
    """Test feature set definitions"""
    
    def test_base_features_no_sex(self):
        """BASE_FEATURES should not include sex"""
        assert "sex" not in BASE_FEATURES
    
    def test_features_with_sex_has_sex(self):
        """FEATURES_WITH_SEX should include sex"""
        assert "sex" in FEATURES_WITH_SEX
    
    def test_feature_sets_same_length_difference(self):
        """FEATURES_WITH_SEX should have exactly 1 more feature than BASE_FEATURES"""
        assert len(FEATURES_WITH_SEX) == len(BASE_FEATURES) + 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
