"""
Polygenic Risk Score (PRS) Calculator
Precision medicine: Separates genetic vs lifestyle risk factors

Based on genome-wide association studies (GWAS) for chronic disease risk
"""

import numpy as np
from typing import Dict, List, Tuple, Any
import json

# Real SNPs associated with chronic disease risk (from GWAS studies)
# Format: (SNP ID, risk allele, effect size/weight)
DISEASE_RISK_SNPS = [
    # TCF7L2 - strongest known T2D risk locus
    {'snp': 'rs7903146', 'gene': 'TCF7L2', 'risk_allele': 'T', 'weight': 0.39, 'description': 'Transcription factor 7-like 2'},
    
    # Other validated T2D risk SNPs
    {'snp': 'rs10811661', 'gene': 'CDKN2A/B', 'risk_allele': 'T', 'weight': 0.20, 'description': 'Cell cycle regulation'},
    {'snp': 'rs8050136', 'gene': 'FTO', 'risk_allele': 'A', 'weight': 0.15, 'description': 'Fat mass and obesity'},
    {'snp': 'rs1801282', 'gene': 'PPARG', 'risk_allele': 'C', 'weight': 0.14, 'description': 'Insulin sensitivity'},
    {'snp': 'rs5219', 'gene': 'KCNJ11', 'risk_allele': 'T', 'weight': 0.13, 'description': 'Beta cell function'},
    {'snp': 'rs13266634', 'gene': 'SLC30A8', 'risk_allele': 'C', 'weight': 0.12, 'description': 'Zinc transport'},
    {'snp': 'rs4402960', 'gene': 'IGF2BP2', 'risk_allele': 'T', 'weight': 0.11, 'description': 'Insulin secretion'},
    {'snp': 'rs1470579', 'gene': 'IGF2BP2', 'risk_allele': 'C', 'weight': 0.10, 'description': 'Insulin secretion'},
    {'snp': 'rs10923931', 'gene': 'NOTCH2', 'risk_allele': 'T', 'weight': 0.09, 'description': 'Beta cell development'},
    {'snp': 'rs7754840', 'gene': 'CDKAL1', 'risk_allele': 'C', 'weight': 0.08, 'description': 'Insulin secretion'}
]


class GenomicRiskCalculator:
    """Calculate polygenic risk score from genetic variants"""
    
    def __init__(self):
        self.snps = DISEASE_RISK_SNPS
        self.max_possible_score = sum(snp['weight'] * 2 for snp in self.snps)  # 2 = homozygous
        
    def calculate_prs(self, genotypes: Dict[str, str]) -> Dict[str, Any]:
        """
        Calculate PRS from patient genotypes
        
        Args:
            genotypes: Dict of {snp_id: genotype}
                      genotype can be: 'AA', 'AT', 'TT', etc.
        
        Returns:
            PRS score and details
        """
        raw_score = 0
        snp_contributions = []
        
        for snp_info in self.snps:
            snp_id = snp_info['snp']
            risk_allele = snp_info['risk_allele']
            weight = snp_info['weight']
            
            if snp_id not in genotypes:
                # Missing genotype - use population average (1 risk allele)
                count = 1
                genotype = 'N/A'
            else:
                genotype = genotypes[snp_id]
                # Count risk alleles
                count = genotype.count(risk_allele)
            
            contribution = count * weight
            raw_score += contribution
            
            snp_contributions.append({
                'snp': snp_id,
                'gene': snp_info['gene'],
                'genotype': genotype,
                'risk_allele': risk_allele,
                'risk_allele_count': count,
                'weight': weight,
                'contribution': contribution,
                'description': snp_info['description']
            })
        
        # Normalize to 0-1 scale
        normalized_score = raw_score / self.max_possible_score
        
        # Convert to percentile (simulate population distribution)
        # Assume normal distribution with mean=0.5, std=0.15
        percentile = self._score_to_percentile(normalized_score)
        
        # Risk category
        if percentile < 33:
            category = "Low Genetic Risk"
            category_desc = "Below average genetic predisposition"
        elif percentile < 67:
            category = "Average Genetic Risk"
            category_desc = "Typical genetic predisposition"
        else:
            category = "High Genetic Risk"
            category_desc = "Above average genetic predisposition"
        
        return {
            'prs_raw': raw_score,
            'prs_normalized': normalized_score,
            'prs_percentile': percentile,
            'category': category,
            'category_description': category_desc,
            'snp_contributions': sorted(
                snp_contributions, 
                key=lambda x: x['contribution'], 
                reverse=True
            ),
            'top_risk_genes': [
                snp_contributions[i]['gene'] 
                for i in range(min(3, len(snp_contributions)))
            ]
        }
    
    def _score_to_percentile(self, score: float, mean: float = 0.5, std: float = 0.15) -> float:
        """Convert normalized score to population percentile"""
        from scipy import stats
        z = (score - mean) / std
        percentile = stats.norm.cdf(z) * 100
        return min(99, max(1, percentile))  # Bound between 1-99
    
    def generate_sample_genotypes(self, risk_level: str = 'average') -> Dict[str, str]:
        """
        Generate sample genotypes for demonstration
        
        Args:
            risk_level: 'low', 'average', or 'high'
        """
        genotypes = {}
        
        for snp_info in self.snps:
            snp_id = snp_info['snp']
            risk_allele = snp_info['risk_allele']
            
            # Infer other allele (simplified)
            other_allele = 'A' if risk_allele != 'A' else 'G'
            
            if risk_level == 'low':
                # Mostly protective alleles
                prob_risk = 0.2
            elif risk_level == 'average':
                # Mix of risk and protective
                prob_risk = 0.5
            else:  # high
                # Mostly risk alleles
                prob_risk = 0.8
            
            # Generate random genotype
            allele1 = risk_allele if np.random.random() < prob_risk else other_allele
            allele2 = risk_allele if np.random.random() < prob_risk else other_allele
            
            genotypes[snp_id] = f"{allele1}{allele2}"
        
        return genotypes


def combine_genetic_and_clinical_risk(
    prs_percentile: float,
    clinical_risk: float,
    genetic_weight: float = 0.4
) -> Dict[str, Any]:
    """
    Combine genetic risk (PRS) with clinical risk factors
    
    Args:
        prs_percentile: Genetic risk percentile (0-100)
        clinical_risk: Clinical risk score (0-100)
        genetic_weight: How much weight to give genetics (0-1)
    
    Returns:
        Combined risk assessment
    """
    clinical_weight = 1 - genetic_weight
    
    # Weighted combination
    combined_risk = (
        (prs_percentile / 100) * genetic_weight +
        (clinical_risk / 100) * clinical_weight
    ) * 100
    
    # Calculate contributions
    genetic_contribution = (prs_percentile / 100) * genetic_weight * 100
    clinical_contribution = (clinical_risk / 100) * clinical_weight * 100
    
    # Modifiability assessment
    modifiable = clinical_contribution
    non_modifiable = genetic_contribution
    
    return {
        'combined_risk': combined_risk,
        'genetic_contribution': genetic_contribution,
        'clinical_contribution': clinical_contribution,
        'genetic_contribution_pct': (genetic_contribution / combined_risk * 100) if combined_risk > 0 else 0,
        'clinical_contribution_pct': (clinical_contribution / combined_risk * 100) if combined_risk > 0 else 0,
        'modifiable_risk': modifiable,
        'non_modifiable_risk': non_modifiable,
        'interpretation': {
            'genetic': _interpret_genetic_risk(prs_percentile),
            'clinical': _interpret_clinical_risk(clinical_risk),
            'combined': _interpret_combined_risk(combined_risk),
            'actionable': _get_actionable_recommendations(genetic_contribution, clinical_contribution)
        }
    }


def _interpret_genetic_risk(percentile: float) -> str:
    """Interpret genetic risk percentile"""
    if percentile < 25:
        return "Low genetic predisposition - below average inherited risk"
    elif percentile < 50:
        return "Below average genetic predisposition"
    elif percentile < 75:
        return "Above average genetic predisposition"
    else:
        return "High genetic predisposition - strong inherited risk factors"


def _interpret_clinical_risk(risk: float) -> str:
    """Interpret clinical risk factors"""
    if risk < 30:
        return "Low clinical risk - good metabolic health markers"
    elif risk < 50:
        return "Moderate clinical risk - some concerning markers"
    elif risk < 70:
        return "High clinical risk - multiple risk factors present"
    else:
        return "Very high clinical risk - urgent intervention needed"


def _interpret_combined_risk(risk: float) -> str:
    """Interpret overall combined risk"""
    if risk < 30:
        return "Low overall risk"
    elif risk < 50:
        return "Moderate overall risk"
    elif risk < 70:
        return "High overall risk"
    else:
        return "Very high overall risk"


def _get_actionable_recommendations(genetic: float, clinical: float) -> List[str]:
    """Get personalized recommendations based on risk breakdown"""
    recommendations = []
    
    if clinical > genetic * 1.5:
        recommendations.append(
            "💪 Good news: Most of your risk is modifiable through lifestyle changes!"
        )
        recommendations.append(
            "Focus on: Weight management, exercise, and diet modifications"
        )
    elif genetic > clinical * 1.5:
        recommendations.append(
            "🧬 Your risk is primarily genetic - early screening is crucial"
        )
        recommendations.append(
            "Consider: More frequent monitoring and preventive medications"
        )
    else:
        recommendations.append(
            "⚖️ Your risk is balanced between genetic and lifestyle factors"
        )
        recommendations.append(
            "Recommend: Combined approach of lifestyle changes and medical monitoring"
        )
    
    return recommendations


def parse_23andme_file(file_content: str) -> Dict[str, str]:
    """
    Parse 23andMe raw data file format
    
    Format:
    # rsid chromosome position genotype
    rs7903146 10 114758349 CT
    """
    genotypes = {}
    
    for line in file_content.split('\n'):
        line = line.strip()
        
        # Skip comments and empty lines
        if not line or line.startswith('#'):
            continue
        
        parts = line.split('\t')
        if len(parts) >= 4:
            rsid = parts[0]
            genotype = parts[3]
            
            # Only include SNPs we care about
            if rsid in [snp['snp'] for snp in DISEASE_RISK_SNPS]:
                genotypes[rsid] = genotype
    
    return genotypes
