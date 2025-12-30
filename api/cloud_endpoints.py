"""
BioTeK Cloud Model API Endpoints
FastAPI routes for Evo 2 (DNA) and GLM-4.5V (Vision)
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List
import tempfile
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file before importing cloud models
load_dotenv()

try:
    from cloud_models import BioTekCloudClient, CloudModelConfig
except ImportError:
    from api.cloud_models import BioTekCloudClient, CloudModelConfig

# Initialize router
router = APIRouter(prefix="/cloud", tags=["Cloud Models"])

# Initialize client
cloud_client = BioTekCloudClient()


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

# NOTE: Raw DNA sequence analysis (Evo-style ACGT input) has been REMOVED.
# Use the /ai/analyze-variant endpoint in main.py for clinical variant interpretation.
# That endpoint accepts HGVS notation, rsID, or gene+variant (e.g., BRCA1 c.5266dupC).

class ImageAnalysisInput(BaseModel):
    image_type: str = Field("xray", description="Type: xray, ct, mri, ultrasound, pathology")
    clinical_question: Optional[str] = Field(None, description="Specific question about image")
    use_reasoning: bool = Field(True, description="Enable deep reasoning mode")


class VisualQAInput(BaseModel):
    question: str = Field(..., description="Question about the image")


# =============================================================================
# STATUS ENDPOINTS
# =============================================================================

@router.get("/status")
async def get_cloud_status():
    """Check status of cloud model APIs"""
    status = cloud_client.check_api_status()
    
    return {
        "status": "operational",
        "apis": status,
        "setup_needed": not (status["nvidia_nim"]["configured"] and status["openrouter"]["configured"])
    }


@router.get("/setup")
async def get_setup_instructions():
    """Get setup instructions for cloud APIs"""
    return {
        "instructions": cloud_client.get_setup_instructions(),
        "env_file": ".env.example available in project root"
    }


# =============================================================================
# DNA ANALYSIS ENDPOINTS - REMOVED
# =============================================================================
# Raw DNA sequence analysis (Evo-style ACGT input) has been intentionally removed.
# 
# REASON: Raw sequence analysis is research tooling, not clinical-grade.
# 
# REPLACEMENT: Use /ai/analyze-variant endpoint for clinical genetics.
# It accepts:
#   - HGVS notation (e.g., "BRCA1 c.5266dupC")
#   - rsID (e.g., "rs334")
#   - Gene + variant (e.g., "APOE ε4/ε4")
#   - CYP nomenclature (e.g., "CYP2D6 *4/*4")
#
# The variant analyzer provides hospital-grade output:
#   - ACMG/AMP classification (Pathogenic → Benign)
#   - Clinical significance summary
#   - Actionable recommendations
#   - Pharmacogenomics implications
# =============================================================================


# =============================================================================
# GLM-4.5V ENDPOINTS (Medical Vision)
# =============================================================================

@router.post("/vision/analyze")
async def analyze_medical_image(
    file: UploadFile = File(...),
    image_type: str = Form("xray"),
    clinical_question: Optional[str] = Form(None),
    use_reasoning: bool = Form(True),
    user_role: str = Form("patient")
):
    """
    Analyze medical image using GLM-4.5V
    
    Supports X-ray, CT, MRI, ultrasound, and pathology images
    
    GUARDRAILS:
    - Requires user_role = doctor (medical imaging interpretation)
    """
    # GUARDRAIL: Check user role - imaging analysis restricted to doctors
    if user_role != "doctor":
        raise HTTPException(
            status_code=403,
            detail=f"Medical imaging analysis restricted to doctors only. Current role: {user_role}"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_types}")
    
    # Save temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = cloud_client.vision.analyze_medical_image(
            image_path=tmp_path,
            image_type=image_type,
            clinical_question=clinical_question,
            use_reasoning=use_reasoning
        )
        
        # Transform to frontend expected format
        analysis_text = result.get("analysis", "")
        
        return {
            "success": True,
            "data": {
                "status": "complete",
                "analysis": analysis_text,  # Top-level for frontend
                "model": result.get("model", "GLM-4.5V"),
                "feature": "standard",
                "images_analyzed": 1,
                "findings": [{
                    "image": file.filename,
                    "type": image_type,
                    "body_region": "chest",
                    "status": "analyzed",
                    "analysis": analysis_text,
                    "reasoning_used": result.get("reasoning_used", False)
                }],
                "abnormalities_detected": [],
                "recommendations": [],
                "summary": {
                    "total_images": 1,
                    "successfully_analyzed": 1,
                    "abnormalities_found": 0,
                    "model": result.get("model", "GLM-4.5V"),
                    "disclaimer": result.get("disclaimer", "AI-assisted analysis for clinical decision support only")
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GLM-4.5V API error: {str(e)}")
    finally:
        # Clean up temp file
        os.unlink(tmp_path)


@router.post("/vision/document")
async def analyze_clinical_document(
    file: UploadFile = File(...),
    extraction_focus: str = Form("all")
):
    """
    Extract information from clinical documents using GLM-4.5V
    
    Focus options: all, medications, lab_values, diagnoses
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = cloud_client.vision.analyze_clinical_document(
            document_path=tmp_path,
            extraction_focus=extraction_focus
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GLM-4.5V API error: {str(e)}")
    finally:
        os.unlink(tmp_path)


@router.post("/vision/qa")
async def visual_clinical_qa(
    file: UploadFile = File(...),
    question: str = Form(...)
):
    """
    Answer clinical questions about a medical image
    
    Uses GLM-4.5V with reasoning mode for detailed analysis
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = cloud_client.vision.visual_clinical_qa(
            image_path=tmp_path,
            question=question
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GLM-4.5V API error: {str(e)}")
    finally:
        os.unlink(tmp_path)


# =============================================================================
# GLM-4.5V ADVANCED FEATURES
# =============================================================================

# FEATURE 1: Grounding/Localization
@router.post("/vision/localize")
async def localize_abnormalities(
    file: UploadFile = File(...),
    image_type: str = Form("xray"),
    target_findings: Optional[str] = Form(None)
):
    """
    Locate abnormalities with bounding boxes
    
    Returns coordinates for each finding that can be drawn on the image
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = cloud_client.vision.localize_abnormalities(
            image_path=tmp_path,
            image_type=image_type,
            target_findings=target_findings
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Localization error: {str(e)}")
    finally:
        os.unlink(tmp_path)


# FEATURE 2: Deep Diagnosis (Thinking Mode)
@router.post("/vision/deep-diagnosis")
async def deep_diagnosis(
    file: UploadFile = File(...),
    image_type: str = Form("xray"),
    patient_context: Optional[str] = Form(None),
    differential_focus: Optional[str] = Form(None)
):
    """
    Deep diagnostic reasoning with chain-of-thought analysis
    
    Provides step-by-step reasoning for complex cases
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        focus_list = differential_focus.split(",") if differential_focus else None
        result = cloud_client.vision.deep_diagnosis(
            image_path=tmp_path,
            image_type=image_type,
            patient_context=patient_context,
            differential_focus=focus_list
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deep diagnosis error: {str(e)}")
    finally:
        os.unlink(tmp_path)


# FEATURE 3: Text Generation (Clinical Reports)
class ReportGenerationInput(BaseModel):
    prediction_data: dict
    patient_info: Optional[dict] = None
    report_style: str = "clinical"

@router.post("/generate-report")
async def generate_clinical_report(input_data: ReportGenerationInput):
    """
    Generate clinical reports using GLM-4.5V
    
    Replaces local Qwen - no Ollama needed
    """
    try:
        result = cloud_client.vision.generate_clinical_report(
            prediction_data=input_data.prediction_data,
            patient_info=input_data.patient_info,
            report_style=input_data.report_style
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


# FEATURE 4: Multi-Image Comparison
@router.post("/vision/compare")
async def compare_images(
    files: List[UploadFile] = File(...),
    comparison_type: str = Form("progression"),
    clinical_context: Optional[str] = Form(None)
):
    """
    Compare multiple medical images (before/after, progression)
    
    Supports 2-4 images for comparison
    """
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 images required")
    
    tmp_paths = []
    try:
        for file in files[:4]:
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_paths.append(tmp.name)
        
        result = cloud_client.vision.compare_images(
            image_paths=tmp_paths,
            comparison_type=comparison_type,
            clinical_context=clinical_context
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image comparison error: {str(e)}")
    finally:
        for path in tmp_paths:
            try:
                os.unlink(path)
            except:
                pass


# FEATURE 5: Video Analysis (Ultrasound/Echo)
@router.post("/vision/video")
async def analyze_video_frames(
    files: List[UploadFile] = File(...),
    video_type: str = Form("ultrasound"),
    clinical_focus: Optional[str] = Form(None)
):
    """
    Analyze video by processing key frames
    
    Supports ultrasound, echocardiogram, fluoroscopy
    """
    tmp_paths = []
    try:
        for file in files[:8]:
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_paths.append(tmp.name)
        
        result = cloud_client.vision.analyze_video_frames(
            frame_paths=tmp_paths,
            video_type=video_type,
            clinical_focus=clinical_focus
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video analysis error: {str(e)}")
    finally:
        for path in tmp_paths:
            try:
                os.unlink(path)
            except:
                pass


# FEATURE 6: Document Parsing
@router.post("/vision/parse-document")
async def parse_medical_document(
    file: UploadFile = File(...),
    document_type: str = Form("lab_report"),
    extract_structured: bool = Form(True)
):
    """
    Parse medical documents and extract structured data
    
    Supports: lab_report, prescription, ehr, pathology, radiology_report
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        result = cloud_client.vision.parse_medical_document(
            document_path=tmp_path,
            document_type=document_type,
            extract_structured=extract_structured
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document parsing error: {str(e)}")
    finally:
        os.unlink(tmp_path)


# =============================================================================
# COMBINED ANALYSIS ENDPOINT
# =============================================================================

@router.post("/comprehensive-analysis")
async def comprehensive_patient_analysis(
    dna_sequence: Optional[str] = Form(None),
    medical_image: Optional[UploadFile] = File(None),
    image_type: str = Form("xray"),
    clinical_notes: Optional[str] = Form(None)
):
    """
    Comprehensive patient analysis using both Evo 2 and GLM-4.5V
    
    Combines DNA analysis with medical imaging for holistic assessment
    """
    results = {
        "dna_analysis": None,
        "image_analysis": None,
        "combined_insights": None
    }
    
    # DNA Analysis with Evo 2
    if dna_sequence:
        try:
            results["dna_analysis"] = cloud_client.evo2.analyze_sequence(dna_sequence)
        except Exception as e:
            results["dna_analysis"] = {"error": str(e)}
    
    # Image Analysis with GLM-4.5V
    if medical_image:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(medical_image.filename).suffix) as tmp:
            content = await medical_image.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            results["image_analysis"] = cloud_client.vision.analyze_medical_image(
                image_path=tmp_path,
                image_type=image_type,
                clinical_question=clinical_notes
            )
        except Exception as e:
            results["image_analysis"] = {"error": str(e)}
        finally:
            os.unlink(tmp_path)
    
    # Generate combined insights if both analyses available
    if results["dna_analysis"] and results["image_analysis"]:
        results["combined_insights"] = {
            "note": "DNA and imaging data analyzed - correlate genetic risk with imaging findings",
            "recommendation": "Review both genetic predisposition and current imaging status for comprehensive risk assessment"
        }
    
    return {
        "success": True,
        "data": results
    }
