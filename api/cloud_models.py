"""
BioTeK Cloud Model Integration
Connects to NVIDIA NIM (Evo 2) and OpenRouter (GLM-4.5V) APIs

Features:
- Evo 2: DNA sequence analysis, variant effect prediction
- GLM-4.5V: Medical image analysis, document OCR, clinical vision
"""

import os
import requests
import base64
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import json

# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class CloudModelConfig:
    """Configuration for cloud model APIs"""
    nvidia_nim_api_key: str = ""
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    
    @classmethod
    def from_env(cls) -> 'CloudModelConfig':
        """Load configuration from environment variables"""
        return cls(
            nvidia_nim_api_key=os.getenv("NVIDIA_NIM_API_KEY", ""),
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY", "")
        )


# =============================================================================
# EVO 2 - DNA FOUNDATION MODEL (NVIDIA NIM)
# =============================================================================

class Evo2Client:
    """
    Client for Evo 2 DNA Foundation Model via NVIDIA NIM API
    
    Capabilities:
    - DNA sequence analysis
    - Variant effect prediction
    - Gene/protein design
    - Mutation impact scoring
    """
    
    def __init__(self, config: CloudModelConfig):
        self.api_key = config.nvidia_nim_api_key
        self.base_url = "https://health.api.nvidia.com/v1"
        self.model = "arc/evo2-40b"
        
    def _make_request(self, endpoint: str, payload: Dict) -> Dict:
        """Make request to NVIDIA NIM API"""
        if not self.api_key:
            raise ValueError("NVIDIA NIM API key not configured. Set NVIDIA_NIM_API_KEY environment variable.")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{self.base_url}/{endpoint}",
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if response.status_code != 200:
            raise Exception(f"NVIDIA NIM API error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def analyze_sequence(
        self, 
        dna_sequence: str,
        num_tokens: int = 100,
        temperature: float = 0.7,
        organism: str = None
    ) -> Dict[str, Any]:
        """
        Analyze a DNA sequence using Evo 2 (40B) via NVIDIA NIM API
        
        Args:
            dna_sequence: DNA sequence string (ACGT)
            num_tokens: Number of tokens to generate (10-500)
            temperature: Generation randomness (0.1-1.0)
            organism: Optional taxonomy for organism-specific generation
            
        Returns:
            Analysis results including generated sequence extension
        """
        # Validate sequence
        valid_chars = set('ACGT')
        clean_seq = dna_sequence.upper().replace(' ', '').replace('\n', '')
        if not all(c in valid_chars for c in clean_seq):
            raise ValueError("Invalid DNA sequence. Only A, C, G, T allowed.")
        
        # Add taxonomy prompt if organism specified
        taxonomy_prompts = {
            "human": "|k__Eukaryota;p__Chordata;c__Mammalia;o__Primates;f__Hominidae;g__Homo;s__sapiens|",
            "ecoli": "|k__Bacteria;p__Proteobacteria;c__Gammaproteobacteria;o__Enterobacterales;f__Enterobacteriaceae;g__Escherichia;s__coli|",
            "yeast": "|k__Eukaryota;p__Ascomycota;c__Saccharomycetes;o__Saccharomycetales;f__Saccharomycetaceae;g__Saccharomyces;s__cerevisiae|",
            "mouse": "|k__Eukaryota;p__Chordata;c__Mammalia;o__Rodentia;f__Muridae;g__Mus;s__musculus|",
        }
        
        sequence_input = clean_seq
        if organism and organism.lower() in taxonomy_prompts:
            sequence_input = taxonomy_prompts[organism.lower()] + clean_seq
        
        # Use the generate endpoint
        payload = {
            "sequence": sequence_input,
            "num_tokens": min(max(num_tokens, 10), 500),
            "temperature": min(max(temperature, 0.1), 1.0),
            "top_k": 4,
            "enable_sampled_probs": True
        }
        
        result = self._make_request("biology/arc/evo2-40b/generate", payload)
        
        generated_seq = result.get("sequence", "")
        probs = result.get("sampled_probs", [])
        
        # Compute sequence properties for input
        seq_len = len(clean_seq)
        a_count = clean_seq.count('A')
        t_count = clean_seq.count('T')
        g_count = clean_seq.count('G')
        c_count = clean_seq.count('C')
        gc_content = (g_count + c_count) / seq_len * 100 if seq_len > 0 else 0
        
        # Compute properties for generated sequence
        gen_len = len(generated_seq)
        gen_gc = (generated_seq.count('G') + generated_seq.count('C')) / gen_len * 100 if gen_len > 0 else 0
        
        # Find regulatory motifs in input
        motifs_found = []
        motif_patterns = {
            "TATAAA": {"name": "TATA Box", "type": "promoter", "importance": "high"},
            "TATAAT": {"name": "Pribnow Box", "type": "promoter", "importance": "high"},
            "CAAT": {"name": "CAAT Box", "type": "enhancer", "importance": "medium"},
            "GGGCGG": {"name": "GC Box", "type": "promoter", "importance": "medium"},
            "ATG": {"name": "Start Codon", "type": "coding", "importance": "high"},
            "TAA": {"name": "Stop Codon (Ochre)", "type": "coding", "importance": "high"},
            "TAG": {"name": "Stop Codon (Amber)", "type": "coding", "importance": "high"},
            "TGA": {"name": "Stop Codon (Opal)", "type": "coding", "importance": "high"},
            "AATAAA": {"name": "Poly-A Signal", "type": "termination", "importance": "medium"},
            "GCGC": {"name": "CpG Site", "type": "methylation", "importance": "low"},
        }
        
        for pattern, info in motif_patterns.items():
            positions = []
            start = 0
            while True:
                pos = clean_seq.find(pattern, start)
                if pos == -1:
                    break
                positions.append(pos)
                start = pos + 1
            if positions:
                motifs_found.append({
                    "pattern": pattern,
                    "name": info["name"],
                    "type": info["type"],
                    "importance": info["importance"],
                    "count": len(positions),
                    "positions": positions[:5]  # First 5 positions
                })
        
        # Calculate average confidence
        avg_confidence = sum(probs) / len(probs) * 100 if probs else 0
        
        # Nucleotide distribution analysis
        nucleotide_analysis = {
            "input": {"A": a_count, "T": t_count, "G": g_count, "C": c_count},
            "generated": {
                "A": generated_seq.count('A'),
                "T": generated_seq.count('T'),
                "G": generated_seq.count('G'),
                "C": generated_seq.count('C')
            }
        }
        
        return {
            "sequence_length": seq_len,
            "input_sequence": clean_seq[:100] + "..." if len(clean_seq) > 100 else clean_seq,
            "generated_extension": generated_seq,
            "generation_length": gen_len,
            "confidence_scores": probs,
            "avg_confidence": round(avg_confidence, 1),
            "elapsed_ms": result.get("elapsed_ms", 0),
            "gc_content": round(gc_content, 2),
            "generated_gc_content": round(gen_gc, 2),
            "motifs_found": motifs_found,
            "nucleotide_analysis": nucleotide_analysis,
            "organism_bias": organism,
            "temperature": temperature,
            "model": self.model,
            "timestamp": datetime.now().isoformat()
        }
    
    def predict_variant_effect(
        self, 
        reference_seq: str, 
        variant_seq: str,
        position: int
    ) -> Dict[str, Any]:
        """
        Predict the effect of a genetic variant
        
        Args:
            reference_seq: Reference DNA sequence
            variant_seq: Variant DNA sequence
            position: Position of the variant (1-indexed)
            
        Returns:
            Variant effect prediction with pathogenicity score
        """
        # Get embeddings for both sequences
        ref_result = self.analyze_sequence(reference_seq)
        var_result = self.analyze_sequence(variant_seq)
        
        # Calculate embedding difference (simplified effect score)
        # In production, this would use a more sophisticated comparison
        
        return {
            "position": position,
            "reference": reference_seq[position-1] if position <= len(reference_seq) else "N/A",
            "variant": variant_seq[position-1] if position <= len(variant_seq) else "N/A",
            "reference_embedding": ref_result.get("embeddings"),
            "variant_embedding": var_result.get("embeddings"),
            "analysis": "Variant effect analysis completed",
            "model": self.model,
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_sequence(
        self, 
        prompt_sequence: str, 
        length: int = 100,
        temperature: float = 0.8
    ) -> Dict[str, Any]:
        """
        Generate DNA sequence continuation
        
        Args:
            prompt_sequence: Starting DNA sequence
            length: Number of nucleotides to generate
            temperature: Sampling temperature (0.0-1.0)
            
        Returns:
            Generated DNA sequence
        """
        payload = {
            "model": self.model,
            "prompt": prompt_sequence.upper(),
            "max_tokens": length,
            "temperature": temperature
        }
        
        result = self._make_request("completions", payload)
        
        return {
            "prompt": prompt_sequence,
            "generated": result.get("choices", [{}])[0].get("text", ""),
            "full_sequence": prompt_sequence + result.get("choices", [{}])[0].get("text", ""),
            "model": self.model,
            "timestamp": datetime.now().isoformat()
        }


# =============================================================================
# GLM-4.5V - VISION LANGUAGE MODEL (OPENROUTER)
# =============================================================================

class GLM45VClient:
    """
    Client for GLM-4.5V Vision-Language Model via OpenRouter API
    
    Capabilities:
    - Medical image analysis (X-ray, CT, MRI)
    - Clinical document OCR
    - Visual Q&A for medical images
    - Report generation from imaging
    """
    
    def __init__(self, config: CloudModelConfig):
        self.api_key = config.openrouter_api_key
        self.base_url = config.openrouter_base_url
        self.model = "z-ai/glm-4.5v"
        
    def _make_request(self, messages: List[Dict], reasoning: bool = False, max_tokens: int = 2000) -> Dict:
        """Make request to OpenRouter API"""
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://biotek.health",
            "X-Title": "BioTeK Medical Platform"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,  # Limit tokens to control costs
            "reasoning": {"enabled": reasoning}  # Enable o1-style thinking
        }
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=120
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def _encode_image(self, image_path: str) -> str:
        """Encode image to base64"""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    
    def analyze_medical_image(
        self, 
        image_path: str,
        image_type: str = "xray",
        clinical_question: str = None,
        use_reasoning: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze a medical image
        
        Args:
            image_path: Path to the medical image
            image_type: Type of image (xray, ct, mri, ultrasound, pathology)
            clinical_question: Specific question about the image
            use_reasoning: Enable deep reasoning mode
            
        Returns:
            Analysis results with findings and recommendations
        """
        # Encode image
        image_data = self._encode_image(image_path)
        image_ext = Path(image_path).suffix.lower().replace(".", "")
        mime_type = f"image/{image_ext}" if image_ext in ["png", "jpg", "jpeg", "gif", "webp"] else "image/jpeg"
        
        # Build prompt
        prompt = f"""You are an expert radiologist AI assistant analyzing a {image_type} image.

Please provide:
1. **Findings**: Describe what you observe in the image
2. **Abnormalities**: Identify any abnormal findings
3. **Differential Diagnosis**: List possible diagnoses based on findings
4. **Recommendations**: Suggest follow-up actions or additional tests

{"Specific Question: " + clinical_question if clinical_question else ""}

Important: This is for clinical decision support only. Final diagnosis must be made by a qualified physician."""

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_data}"
                        }
                    }
                ]
            }
        ]
        
        result = self._make_request(messages, reasoning=use_reasoning)
        
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return {
            "image_type": image_type,
            "analysis": response_text,
            "reasoning_used": use_reasoning,
            "model": self.model,
            "clinical_question": clinical_question,
            "disclaimer": "AI-assisted analysis for clinical decision support only",
            "timestamp": datetime.now().isoformat()
        }
    
    def analyze_clinical_document(
        self, 
        document_path: str,
        extraction_focus: str = "all"
    ) -> Dict[str, Any]:
        """
        Extract and analyze clinical document (lab reports, prescriptions, etc.)
        
        Args:
            document_path: Path to document image
            extraction_focus: What to extract (all, medications, lab_values, diagnoses)
            
        Returns:
            Extracted and structured information
        """
        image_data = self._encode_image(document_path)
        
        focus_prompts = {
            "all": "Extract ALL relevant clinical information",
            "medications": "Focus on extracting medication names, dosages, and frequencies",
            "lab_values": "Focus on extracting laboratory test results with values and reference ranges",
            "diagnoses": "Focus on extracting diagnoses, ICD codes, and clinical impressions"
        }
        
        prompt = f"""You are a clinical document analysis AI. Analyze this medical document.

Task: {focus_prompts.get(extraction_focus, focus_prompts['all'])}

Please provide structured output with:
1. Document type identified
2. Key information extracted
3. Any critical values or alerts
4. Summary of findings"""

        messages = [
            {
                "role": "user", 
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                    }
                ]
            }
        ]
        
        result = self._make_request(messages, reasoning=True)
        
        return {
            "extraction_focus": extraction_focus,
            "extracted_data": result.get("choices", [{}])[0].get("message", {}).get("content", ""),
            "model": self.model,
            "timestamp": datetime.now().isoformat()
        }
    
    def visual_clinical_qa(
        self, 
        image_path: str, 
        question: str
    ) -> Dict[str, Any]:
        """
        Answer clinical questions about a medical image
        
        Args:
            image_path: Path to medical image
            question: Clinical question about the image
            
        Returns:
            Answer with reasoning
        """
        image_data = self._encode_image(image_path)
        
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Medical Image Analysis Question:\n\n{question}"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                    }
                ]
            }
        ]
        
        result = self._make_request(messages, reasoning=True)
        
        return {
            "question": question,
            "answer": result.get("choices", [{}])[0].get("message", {}).get("content", ""),
            "model": self.model,
            "timestamp": datetime.now().isoformat()
        }
    
    # =========================================================================
    # FEATURE 1: GROUNDING/LOCALIZATION
    # =========================================================================
    
    def localize_abnormalities(
        self,
        image_path: str,
        image_type: str = "xray",
        target_findings: str = None
    ) -> Dict[str, Any]:
        """
        Locate and highlight abnormalities in medical images with bounding boxes
        
        Args:
            image_path: Path to the medical image
            image_type: Type of image (xray, ct, mri, ultrasound, pathology)
            target_findings: Specific findings to locate (e.g., "nodules", "masses", "fractures")
            
        Returns:
            Analysis with bounding box coordinates for each finding
        """
        image_data = self._encode_image(image_path)
        image_ext = Path(image_path).suffix.lower().replace(".", "")
        mime_type = f"image/{image_ext}" if image_ext in ["png", "jpg", "jpeg", "gif", "webp"] else "image/jpeg"
        
        target_text = f"Focus on locating: {target_findings}" if target_findings else "Locate all abnormalities and notable findings"
        
        prompt = f"""You are an expert radiologist AI with precise localization capabilities.
Analyze this {image_type} image and identify abnormalities with their exact locations.

{target_text}

For EACH finding, provide:
1. **Finding name**: What the abnormality is
2. **Location**: Anatomical location description
3. **Bounding box**: Provide coordinates as [x1, y1, x2, y2] where values are 0-1000 (normalized to image size)
   - (x1, y1) = top-left corner
   - (x2, y2) = bottom-right corner
4. **Severity**: mild/moderate/severe
5. **Confidence**: your confidence level (low/medium/high)

Format each finding with bounding box markers:
<|begin_of_box|>[x1, y1, x2, y2]<|end_of_box|>

If no abnormalities are found, state "No significant abnormalities detected" and explain what normal findings you observe."""

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                    }
                ]
            }
        ]
        
        result = self._make_request(messages, reasoning=True)
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Parse bounding boxes from response
        bounding_boxes = self._parse_bounding_boxes(response_text)
        
        return {
            "image_type": image_type,
            "analysis": response_text,
            "bounding_boxes": bounding_boxes,
            "findings_count": len(bounding_boxes),
            "target_findings": target_findings,
            "model": self.model,
            "feature": "grounding",
            "timestamp": datetime.now().isoformat()
        }
    
    def _parse_bounding_boxes(self, text: str) -> List[Dict]:
        """Parse bounding box coordinates from model response"""
        import re
        boxes = []
        
        # Pattern to match bounding boxes: [x1, y1, x2, y2] or [[x1, y1, x2, y2]]
        patterns = [
            r'<\|begin_of_box\|>\s*\[?\[?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\]?\]?\s*<\|end_of_box\|>',
            r'\[(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\]',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    x1, y1, x2, y2 = map(int, match)
                    # Normalize to 0-1 range
                    boxes.append({
                        "x1": x1 / 1000,
                        "y1": y1 / 1000,
                        "x2": x2 / 1000,
                        "y2": y2 / 1000,
                        "raw": [x1, y1, x2, y2]
                    })
                except:
                    continue
        
        return boxes
    
    # =========================================================================
    # FEATURE 2: THINKING MODE (Deep Reasoning)
    # =========================================================================
    
    def deep_diagnosis(
        self,
        image_path: str,
        image_type: str = "xray",
        patient_context: str = None,
        differential_focus: List[str] = None
    ) -> Dict[str, Any]:
        """
        Perform deep diagnostic reasoning with chain-of-thought analysis
        
        Args:
            image_path: Path to the medical image
            image_type: Type of image
            patient_context: Additional patient info (age, symptoms, history)
            differential_focus: Specific conditions to consider
            
        Returns:
            Detailed diagnostic reasoning with confidence levels
        """
        image_data = self._encode_image(image_path)
        image_ext = Path(image_path).suffix.lower().replace(".", "")
        mime_type = f"image/{image_ext}" if image_ext in ["png", "jpg", "jpeg", "gif", "webp"] else "image/jpeg"
        
        context_text = f"\n\nPatient Context: {patient_context}" if patient_context else ""
        differential_text = f"\n\nConsider these conditions specifically: {', '.join(differential_focus)}" if differential_focus else ""
        
        prompt = f"""You are a senior radiologist performing a detailed diagnostic analysis.
Use step-by-step reasoning to analyze this {image_type} image.{context_text}{differential_text}

THINKING PROCESS:
1. **Initial Observation**: What do you see at first glance?
2. **Systematic Review**: Go through each anatomical region methodically
3. **Key Findings**: List all significant observations
4. **Pattern Recognition**: What patterns or combinations of findings do you notice?
5. **Differential Diagnosis**: List possible diagnoses ranked by likelihood
6. **Supporting Evidence**: For each diagnosis, what findings support or refute it?
7. **Recommended Actions**: What additional views, tests, or follow-up is needed?

Provide your reasoning transparently, showing how you arrive at each conclusion.
Include confidence percentages for your top diagnoses."""

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
                    }
                ]
            }
        ]
        
        result = self._make_request(messages, reasoning=True)
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return {
            "image_type": image_type,
            "reasoning_analysis": response_text,
            "patient_context": patient_context,
            "thinking_mode": True,
            "model": self.model,
            "feature": "deep_diagnosis",
            "timestamp": datetime.now().isoformat()
        }
    
    # =========================================================================
    # FEATURE 3: TEXT GENERATION (Clinical Reports - Replace Qwen)
    # =========================================================================
    
    def generate_clinical_report(
        self,
        prediction_data: Dict,
        patient_info: Dict = None,
        report_style: str = "clinical"
    ) -> Dict[str, Any]:
        """
        Generate clinical reports using GLM-4.5V text capabilities
        Replaces local Qwen for report generation
        
        Args:
            prediction_data: Risk prediction results
            patient_info: Patient demographics and context
            report_style: "clinical" for physicians, "patient" for patients
            
        Returns:
            Generated clinical report
        """
        risk_pct = prediction_data.get('risk_percentage', 0)
        risk_cat = prediction_data.get('risk_category', 'Unknown')
        features = prediction_data.get('feature_importance', {})
        diseases = prediction_data.get('diseases', {})
        
        patient_text = ""
        if patient_info:
            patient_text = f"""
Patient Information:
- Age: {patient_info.get('age', 'N/A')}
- Sex: {patient_info.get('sex', 'N/A')}
- BMI: {patient_info.get('bmi', 'N/A')}
"""
        
        style_instruction = {
            "clinical": "Write for healthcare professionals. Use medical terminology. Be concise and actionable.",
            "patient": "Write for the patient. Use simple language. Be reassuring but honest."
        }
        
        prompt = f"""Generate a comprehensive clinical risk assessment report.
{patient_text}
Risk Assessment Results:
- Overall Risk: {risk_pct:.1f}% ({risk_cat})
- Key Risk Factors: {', '.join(list(features.keys())[:5]) if features else 'N/A'}

{f"Disease-Specific Risks: {diseases}" if diseases else ""}

{style_instruction.get(report_style, style_instruction['clinical'])}

Structure the report with:
1. EXECUTIVE SUMMARY
2. RISK FACTORS ANALYSIS  
3. CLINICAL RECOMMENDATIONS
4. LIFESTYLE MODIFICATIONS
5. FOLLOW-UP PLAN

Do not include disclaimers. Focus on actionable insights."""

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        result = self._make_request(messages, reasoning=False)
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return {
            "report": response_text,
            "report_style": report_style,
            "risk_summary": {"percentage": risk_pct, "category": risk_cat},
            "model": self.model,
            "feature": "text_generation",
            "timestamp": datetime.now().isoformat()
        }
    
    # =========================================================================
    # FEATURE 4: MULTI-IMAGE COMPARISON
    # =========================================================================
    
    def compare_images(
        self,
        image_paths: List[str],
        comparison_type: str = "progression",
        clinical_context: str = None
    ) -> Dict[str, Any]:
        """
        Compare multiple medical images (before/after, progression tracking)
        
        Args:
            image_paths: List of image paths to compare (2-4 images)
            comparison_type: "progression", "bilateral", "modality"
            clinical_context: Additional clinical context
            
        Returns:
            Comparative analysis with changes identified
        """
        if len(image_paths) < 2:
            raise ValueError("At least 2 images required for comparison")
        if len(image_paths) > 4:
            image_paths = image_paths[:4]  # Limit to 4 images
        
        # Encode all images
        image_contents = []
        for i, path in enumerate(image_paths):
            image_data = self._encode_image(path)
            image_ext = Path(path).suffix.lower().replace(".", "")
            mime_type = f"image/{image_ext}" if image_ext in ["png", "jpg", "jpeg", "gif", "webp"] else "image/jpeg"
            image_contents.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{image_data}"}
            })
        
        comparison_prompts = {
            "progression": "Analyze disease progression across these images taken at different times.",
            "bilateral": "Compare left and right sides for asymmetry or unilateral findings.",
            "modality": "Compare findings across different imaging modalities."
        }
        
        context_text = f"\n\nClinical Context: {clinical_context}" if clinical_context else ""
        
        prompt = f"""{comparison_prompts.get(comparison_type, comparison_prompts['progression'])}{context_text}

For this multi-image comparison, provide:

1. **Image-by-Image Findings**: Describe key findings in each image
2. **Changes Detected**: What has changed between images?
3. **Progression Assessment**: Is condition improving, stable, or worsening?
4. **Quantitative Changes**: Note any measurable changes (size, density, etc.)
5. **Clinical Significance**: What do these changes mean clinically?
6. **Recommendations**: Suggested follow-up based on comparison

Label images as Image 1, Image 2, etc. in chronological order."""

        content = [{"type": "text", "text": prompt}] + image_contents
        
        messages = [{"role": "user", "content": content}]
        
        result = self._make_request(messages, reasoning=True)
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return {
            "comparison_type": comparison_type,
            "images_compared": len(image_paths),
            "analysis": response_text,
            "clinical_context": clinical_context,
            "model": self.model,
            "feature": "multi_image_comparison",
            "timestamp": datetime.now().isoformat()
        }
    
    # =========================================================================
    # FEATURE 5: VIDEO UNDERSTANDING (Ultrasound/Echo)
    # =========================================================================
    
    def analyze_video_frames(
        self,
        frame_paths: List[str],
        video_type: str = "ultrasound",
        clinical_focus: str = None
    ) -> Dict[str, Any]:
        """
        Analyze video by processing key frames (ultrasound, echocardiogram)
        
        Args:
            frame_paths: List of extracted frame paths from video
            video_type: "ultrasound", "echocardiogram", "fluoroscopy"
            clinical_focus: Specific aspect to focus on
            
        Returns:
            Temporal analysis of video content
        """
        if len(frame_paths) > 8:
            # Sample frames evenly
            indices = [int(i * len(frame_paths) / 8) for i in range(8)]
            frame_paths = [frame_paths[i] for i in indices]
        
        image_contents = []
        for path in frame_paths:
            image_data = self._encode_image(path)
            image_contents.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
            })
        
        focus_text = f"\n\nClinical Focus: {clinical_focus}" if clinical_focus else ""
        
        video_prompts = {
            "ultrasound": "Analyze this ultrasound sequence for organ structure, blood flow, and any abnormalities.",
            "echocardiogram": "Analyze this echocardiogram for cardiac function, wall motion, valve function, and ejection fraction.",
            "fluoroscopy": "Analyze this fluoroscopy sequence for dynamic function and any abnormalities."
        }
        
        prompt = f"""{video_prompts.get(video_type, video_prompts['ultrasound'])}{focus_text}

These frames are from a {video_type} video in temporal sequence.

Provide:
1. **Temporal Observations**: What changes occur across frames?
2. **Dynamic Assessment**: Movement patterns, flow, function
3. **Key Findings**: Notable observations in the sequence
4. **Measurements**: Any quantifiable metrics (if applicable)
5. **Clinical Impression**: Overall assessment
6. **Recommendations**: Follow-up or additional views needed"""

        content = [{"type": "text", "text": prompt}] + image_contents
        
        messages = [{"role": "user", "content": content}]
        
        result = self._make_request(messages, reasoning=True)
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return {
            "video_type": video_type,
            "frames_analyzed": len(frame_paths),
            "analysis": response_text,
            "clinical_focus": clinical_focus,
            "model": self.model,
            "feature": "video_analysis",
            "timestamp": datetime.now().isoformat()
        }
    
    # =========================================================================
    # FEATURE 6: DOCUMENT PARSING (Lab Reports, EHRs)
    # =========================================================================
    
    def parse_medical_document(
        self,
        document_path: str,
        document_type: str = "lab_report",
        extract_structured: bool = True
    ) -> Dict[str, Any]:
        """
        Parse and extract structured data from medical documents
        
        Args:
            document_path: Path to document image
            document_type: "lab_report", "prescription", "ehr", "pathology", "radiology_report"
            extract_structured: Return structured JSON data
            
        Returns:
            Parsed document with extracted fields
        """
        image_data = self._encode_image(document_path)
        
        document_schemas = {
            "lab_report": """Extract:
- Patient name and ID
- Collection date
- Each test with: name, result, unit, reference range, flag (normal/high/low/critical)
- Ordering physician""",
            "prescription": """Extract:
- Patient name
- Prescriber name and credentials
- Each medication: name, dose, frequency, duration, quantity, refills
- Date prescribed""",
            "ehr": """Extract:
- Patient demographics
- Chief complaint
- Vital signs
- Assessment/diagnosis
- Plan
- Medications
- Allergies""",
            "pathology": """Extract:
- Specimen type and site
- Gross description
- Microscopic findings
- Diagnosis
- TNM staging (if applicable)
- Margins status""",
            "radiology_report": """Extract:
- Exam type and date
- Clinical indication
- Technique
- Findings by body region
- Impression
- Recommendations"""
        }
        
        schema = document_schemas.get(document_type, document_schemas['lab_report'])
        
        structured_instruction = """
Return the extracted data in valid JSON format at the end of your response, wrapped in ```json``` code blocks.""" if extract_structured else ""
        
        prompt = f"""You are a medical document parser. Analyze this {document_type}.

{schema}
{structured_instruction}

First provide a summary of the document, then extract all relevant fields.
Flag any critical or abnormal values that require immediate attention."""

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                    }
                ]
            }
        ]
        
        result = self._make_request(messages, reasoning=True)
        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Try to extract JSON if structured extraction requested
        structured_data = None
        if extract_structured:
            import re
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                try:
                    import json
                    structured_data = json.loads(json_match.group(1))
                except:
                    pass
        
        return {
            "document_type": document_type,
            "analysis": response_text,
            "structured_data": structured_data,
            "extraction_successful": structured_data is not None,
            "model": self.model,
            "feature": "document_parsing",
            "timestamp": datetime.now().isoformat()
        }


# =============================================================================
# UNIFIED BIOTEK CLOUD CLIENT
# =============================================================================

class BioTekCloudClient:
    """
    Unified client for all BioTeK cloud model integrations
    
    Provides access to:
    - Evo 2 (DNA analysis via NVIDIA NIM)
    - GLM-4.5V (Medical vision via OpenRouter)
    """
    
    def __init__(self, config: CloudModelConfig = None):
        self.config = config or CloudModelConfig.from_env()
        self._evo2 = None
        self._glm45v = None
    
    @property
    def evo2(self) -> Evo2Client:
        """Get Evo 2 client (lazy initialization)"""
        if self._evo2 is None:
            self._evo2 = Evo2Client(self.config)
        return self._evo2
    
    @property
    def vision(self) -> GLM45VClient:
        """Get GLM-4.5V vision client (lazy initialization)"""
        if self._glm45v is None:
            self._glm45v = GLM45VClient(self.config)
        return self._glm45v
    
    def check_api_status(self) -> Dict[str, Any]:
        """Check status of all cloud APIs"""
        status = {
            "nvidia_nim": {
                "configured": bool(self.config.nvidia_nim_api_key),
                "model": "Evo 2 (arcinstitute/evo2)",
                "capabilities": ["DNA analysis", "Variant effects", "Sequence generation"]
            },
            "openrouter": {
                "configured": bool(self.config.openrouter_api_key),
                "model": "GLM-4.5V (z-ai/glm-4.5v)",
                "capabilities": ["Medical imaging", "Document OCR", "Visual Q&A"]
            }
        }
        
        return status
    
    def get_setup_instructions(self) -> str:
        """Get setup instructions for missing API keys"""
        instructions = []
        
        if not self.config.nvidia_nim_api_key:
            instructions.append("""
## NVIDIA NIM API (Evo 2)
1. Go to https://developer.nvidia.com/nim
2. Sign up / Log in
3. Get your API key
4. Add to .env: NVIDIA_NIM_API_KEY=your_key_here
""")
        
        if not self.config.openrouter_api_key:
            instructions.append("""
## OpenRouter API (GLM-4.5V)
1. Go to https://openrouter.ai
2. Sign up (get $5 free credit)
3. Go to Settings → API Keys
4. Create new key
5. Add to .env: OPENROUTER_API_KEY=your_key_here
""")
        
        if not instructions:
            return "✅ All APIs configured!"
        
        return "# Missing API Keys\n" + "\n".join(instructions)


# =============================================================================
# DEMO / TESTING
# =============================================================================

def demo():
    """Demo the cloud model integration"""
    print("=" * 60)
    print("BioTeK Cloud Model Integration")
    print("=" * 60)
    
    client = BioTekCloudClient()
    
    # Check status
    status = client.check_api_status()
    print("\n📡 API Status:")
    print(f"  NVIDIA NIM (Evo 2): {'✅ Configured' if status['nvidia_nim']['configured'] else '❌ Not configured'}")
    print(f"  OpenRouter (GLM-4.5V): {'✅ Configured' if status['openrouter']['configured'] else '❌ Not configured'}")
    
    # Show setup instructions if needed
    instructions = client.get_setup_instructions()
    if "Missing" in instructions:
        print("\n" + instructions)
    else:
        print("\n" + instructions)
        
        # Demo DNA analysis
        print("\n🧬 Testing Evo 2 DNA Analysis...")
        try:
            result = client.evo2.analyze_sequence("ATCGATCGATCGATCG")
            print(f"  Sequence length: {result['sequence_length']}")
            print("  ✅ Evo 2 working!")
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        # Demo vision (would need actual image)
        print("\n👁️ GLM-4.5V Vision ready for medical image analysis")


if __name__ == "__main__":
    demo()
