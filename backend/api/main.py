"""
SafeBite API - FastAPI Backend
Provides food-label analysis endpoints for the SafeBite pipeline and React frontend.
"""

from datetime import datetime, timezone
import time
import uuid
from typing import Annotated, Literal, Optional
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.api.contracts import (
    AnalysisError,
    IngredientItem,
    NutritionalInfo,
    PipelineResult,
    PreparedImageInfo,
    ProductAnalysis,
)
from backend.api.image_input import ImageInputError, MAX_IMAGE_BYTES, prepare_uploaded_image
from backend.api.observability import log_stage
from backend.api.orchestrator import build_product_analysis
from backend.services.food.risk_engine import evaluate_risk_rules, normalize_extracted_entities
from backend.services.language.service import run_correction_and_tokenization, run_ner_after_correction
from backend.services.ocr.service import OcrProviderUnavailableError, UnreadableLabelError, run_ocr_pipeline

app = FastAPI(
    title="SafeBite API",
    description="Food-label analysis pipeline backend connecting OCR, NLP, and knowledge base to frontend.",
    version="0.1.0",
)

# 3. Add CORS middleware for frontend (localhost:3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schema mirroring frontend/src/types/index.ts ---

UPLOAD_CHUNK_BYTES = 1024 * 1024


async def _read_upload_limited(upload: UploadFile) -> bytes:
    """Read form-data incrementally so over-limit uploads are rejected early."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await upload.read(UPLOAD_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_IMAGE_BYTES:
            raise ImageInputError(
                f"Uploaded image exceeds the {MAX_IMAGE_BYTES // 1024 // 1024} MB limit."
            )
        chunks.append(chunk)
    return b"".join(chunks)


@app.get("/")
def root():
    return {
        "service": "SafeBite API",
        "status": "online",
        "docs": "/docs",
    }


@app.post(
    "/analyze",
    response_model=PipelineResult,
    responses={
        400: {"model": AnalysisError, "description": "Invalid or unsupported image input."},
        422: {"model": AnalysisError, "description": "The label cannot be read."},
        503: {"model": AnalysisError, "description": "An optional OCR provider is unavailable."},
    },
)
async def analyze_food_label(
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    target_stage: Literal["upload", "ocr", "correction", "ner", "normalization", "risk"] = "risk",
    product_name: Annotated[Optional[str], Form()] = None,
    brand: Annotated[Optional[str], Form()] = None,
    category: Annotated[Optional[str], Form()] = None,
    include_health_profile: Annotated[bool, Form()] = False,
):
    """
    Validates, normalizes, extracts OCR text & sections, runs MLM correction,
    BERT tokenization, NER/KIE, ingredient normalization, and explainable risk rules.
    """
    scan_id = uuid.uuid4().hex
    started_at = time.perf_counter()
    upload = image or file
    if upload is None:
        log_stage(scan_id, "upload", started_at, error_category="invalid_image")
        return JSONResponse(
            status_code=400,
            content=AnalysisError(
                error="invalid_image",
                message="An image file is required in 'image' or 'file' form-data.",
                scan_id=scan_id,
            ).model_dump(),
        )

    try:
        contents = await _read_upload_limited(upload)
        prepared = prepare_uploaded_image(upload.filename, contents)
    except ImageInputError as error:
        err_category = error.category
        log_stage(scan_id, "upload", started_at, error_category=err_category)
        return JSONResponse(
            status_code=400,
            content=AnalysisError(error=err_category, message=str(error), scan_id=scan_id).model_dump(),
        )
    finally:
        await upload.close()

    log_stage(scan_id, "preprocess", started_at)

    if target_stage == "upload":
        return PipelineResult(
            scan_id=scan_id,
            status="partial",
            stage="upload",
            prepared_image=PreparedImageInfo(
                mime_type=prepared.mime_type,
                width=prepared.width,
                height=prepared.height,
            ),
            warnings=["Image preprocessing is complete. OCR has not run yet."],
        )

    # Read text and split it into label sections.
    ocr_started = time.perf_counter()
    try:
        ocr_res = run_ocr_pipeline(prepared.image_bytes)
    except UnreadableLabelError as error:
        log_stage(scan_id, "ocr", ocr_started, error_category="unreadable_label")
        return JSONResponse(
            status_code=422,
            content=AnalysisError(
                error="unreadable_label",
                message=str(error),
                scan_id=scan_id,
            ).model_dump(),
        )
    except OcrProviderUnavailableError as error:
        log_stage(scan_id, "ocr", ocr_started, error_category="ocr_provider_unavailable")
        return JSONResponse(
            status_code=503,
            content=AnalysisError(
                error="ocr_provider_unavailable",
                message=str(error),
                scan_id=scan_id,
            ).model_dump(),
        )

    log_stage(scan_id, "ocr", ocr_started)

    if target_stage == "ocr":
        return PipelineResult(
            scan_id=scan_id,
            status="partial",
            stage="ocr",
            prepared_image=PreparedImageInfo(
                mime_type=prepared.mime_type,
                width=prepared.width,
                height=prepared.height,
            ),
            ocr_blocks=ocr_res.ocr_blocks,
            extracted_sections=ocr_res.sections,
            warnings=["OCR text extraction and section splitting are complete. NLP correction has not run yet."],
        )

    # Correct OCR artifacts and prepare model tokens.
    corr_started = time.perf_counter()
    nlp_res = run_correction_and_tokenization(ocr_res.sections)
    log_stage(scan_id, "correction", corr_started)

    if target_stage == "correction":
        return PipelineResult(
            scan_id=scan_id,
            status="partial",
            stage="correction",
            prepared_image=PreparedImageInfo(
                mime_type=prepared.mime_type,
                width=prepared.width,
                height=prepared.height,
            ),
            ocr_blocks=ocr_res.ocr_blocks,
            extracted_sections=ocr_res.sections,
            corrected_sections=nlp_res.corrected_sections,
            corrections=nlp_res.corrections,
            tokenized_sections=nlp_res.tokenized_sections,
            warnings=["MLM correction and BERT tokenization are complete. NER/risk rules have not run yet."],
        )

    # Extract ingredients, allergens, and nutrient entities.
    ner_started = time.perf_counter()
    entities = run_ner_after_correction(nlp_res)
    log_stage(scan_id, "ner", ner_started)

    if target_stage == "ner":
        return PipelineResult(
            scan_id=scan_id,
            status="partial",
            stage="ner",
            prepared_image=PreparedImageInfo(
                mime_type=prepared.mime_type,
                width=prepared.width,
                height=prepared.height,
            ),
            ocr_blocks=ocr_res.ocr_blocks,
            extracted_sections=ocr_res.sections,
            corrected_sections=nlp_res.corrected_sections,
            corrections=nlp_res.corrections,
            tokenized_sections=nlp_res.tokenized_sections,
            entities=entities,
            warnings=["NER entity extraction is complete. Normalization and risk rules have not run yet."],
        )

    # Normalize extracted ingredient, additive, and allergen names.
    norm_started = time.perf_counter()
    normalizations = normalize_extracted_entities(entities)
    log_stage(scan_id, "normalization", norm_started)

    if target_stage == "normalization":
        return PipelineResult(
            scan_id=scan_id,
            status="partial",
            stage="normalization",
            prepared_image=PreparedImageInfo(
                mime_type=prepared.mime_type,
                width=prepared.width,
                height=prepared.height,
            ),
            ocr_blocks=ocr_res.ocr_blocks,
            extracted_sections=ocr_res.sections,
            corrected_sections=nlp_res.corrected_sections,
            corrections=nlp_res.corrections,
            tokenized_sections=nlp_res.tokenized_sections,
            entities=entities,
            normalizations=normalizations,
            warnings=["Ingredient normalization is complete. Regulatory risk rules have not run yet."],
        )

    # Evaluate food rules and assemble the product analysis response.
    risk_started = time.perf_counter()
    risk_res = evaluate_risk_rules(nlp_res.corrected_sections, entities)
    product_analysis = build_product_analysis(
        scan_id=scan_id,
        filename=prepared.filename,
        product_name=product_name,
        brand=brand,
        category=category,
        include_health_profile=include_health_profile,
        extraction_confidence=ocr_res.mean_confidence,
        ocr_blocks=ocr_res.ocr_blocks,
        corrected_sections=nlp_res.corrected_sections,
        corrections=nlp_res.corrections,
        entities=entities,
        risk_result=risk_res,
    )
    log_stage(scan_id, "risk", risk_started)

    return PipelineResult(
        scan_id=scan_id,
        status="complete",
        stage="risk",
        extraction_confidence=ocr_res.mean_confidence,
        prepared_image=PreparedImageInfo(
            mime_type=prepared.mime_type,
            width=prepared.width,
            height=prepared.height,
        ),
        ocr_blocks=ocr_res.ocr_blocks,
        extracted_sections=ocr_res.sections,
        corrected_sections=nlp_res.corrected_sections,
        corrections=nlp_res.corrections,
        tokenized_sections=nlp_res.tokenized_sections,
        entities=entities,
        normalizations=risk_res.normalizations,
        parsed_nutrients=risk_res.parsed_nutrients,
        nutrient_levels=risk_res.nutrient_levels,
        detected_allergens=risk_res.detected_allergens,
        detected_additives=risk_res.detected_additives,
        risk_warnings=risk_res.risk_warnings,
        product_analysis=product_analysis,
        warnings=[w.message for w in risk_res.risk_warnings],
    )
