"""SafeBite OCR Stage Service

Orchestrates local layout-aware OCR (EasyOCR), section extraction (ocr.splitter),
quality checks for unreadable labels, and optional Gemini OCR fallback.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any, Dict, List, Literal, Optional, Tuple, Union
import cv2
import numpy as np

from backend.api.contracts import OcrBlock
from backend.services.ocr.classic_ocr import extract_text_classic
from backend.services.ocr.layout import order_blocks_by_layout
from backend.services.ocr.splitter import split_ocr_blocks


class OcrError(Exception):
    """Base error for OCR operations."""


class UnreadableLabelError(OcrError):
    """Raised when label image has no readable text or insufficient quality."""


class OcrProviderUnavailableError(OcrError):
    """Raised when requested OCR model weights or provider credentials are missing."""


@dataclass(frozen=True)
class OcrStageResult:
    """Consolidated result of the OCR and section extraction stage."""

    ocr_blocks: List[OcrBlock]
    sections: Dict[str, str]
    provider: str
    total_characters: int
    mean_confidence: float
    nutrition_rows: List[Dict[str, Any]]


def run_ocr_pipeline(
    image_input: Union[str, np.ndarray, bytes],
    provider: Optional[str] = None,
    min_confidence: float = 0.1,
    min_readable_chars: int = 4,
    min_mean_confidence: float = 0.2,
) -> OcrStageResult:
    """Execute layout-ordered OCR and section classification on a label image."""
    selected_provider = (
        provider or os.getenv("SAFEBITE_OCR_PROVIDER", "local")
    ).strip().lower()

    # Decode bytes if raw buffer provided
    if isinstance(image_input, (bytes, bytearray)):
        nparr = np.frombuffer(image_input, np.uint8)
        decoded = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if decoded is None:
            raise UnreadableLabelError("Image bytes could not be decoded by OCR.")
        image = decoded
    else:
        image = image_input

    raw_blocks: List[Dict[str, Any]] = []

    if selected_provider == "gemini":
        raw_blocks = _run_gemini_ocr(image)
    elif selected_provider == "local":
        try:
            raw_blocks = extract_text_classic(image, min_confidence=min_confidence)
        except Exception as error:
            if os.getenv("SAFEBITE_ENABLE_GEMINI_FALLBACK", "false").lower() in ("true", "1", "yes"):
                try:
                    raw_blocks = _run_gemini_ocr(image)
                    selected_provider = "gemini_fallback"
                except OcrError:
                    raise
                except Exception as fallback_err:
                    raise OcrProviderUnavailableError(
                        f"Local OCR failed and Gemini fallback failed: {fallback_err}"
                    ) from fallback_err
            else:
                raise OcrProviderUnavailableError(f"Local OCR provider failed: {error}") from error
    else:
        raise OcrProviderUnavailableError(
            f"Unknown OCR provider '{selected_provider}'. Supported providers are: 'local', 'gemini'."
        )

    # 1. Order blocks by layout (top-to-bottom reading order with line clustering)
    ordered_blocks = order_blocks_by_layout(raw_blocks)

    # 2. Quality and readability assessment
    total_text = "".join(b.get("text", "") for b in ordered_blocks)
    alnum_count = sum(1 for c in total_text if c.isalnum())
    mean_conf = (
        sum(float(b.get("confidence", 0.0)) for b in ordered_blocks) / len(ordered_blocks)
        if ordered_blocks
        else 0.0
    )

    if not ordered_blocks or alnum_count < min_readable_chars or mean_conf < min_mean_confidence:
        raise UnreadableLabelError(
            f"Label image does not contain readable text (detected {alnum_count} alphanumeric chars, mean confidence {mean_conf:.2f})."
        )

    # 3. Classify blocks into sections and annotate each block with its section
    split_result = split_ocr_blocks(ordered_blocks)

    # 4. Construct typed OcrBlock models
    typed_blocks: List[OcrBlock] = []
    for b in ordered_blocks:
        typed_blocks.append(
            OcrBlock(
                text=b["text"],
                box=b["box"],
                confidence=b["confidence"],
                section=b.get("section", "other"),
                section_source=b.get("section_source"),
            )
        )

    sections = {
        "ingredients": split_result.get("ingredients_text", ""),
        "allergens": split_result.get("allergens_text", ""),
        "nutrition": split_result.get("nutrition_text", ""),
        "other": split_result.get("other_text", ""),
    }

    return OcrStageResult(
        ocr_blocks=typed_blocks,
        sections=sections,
        provider=selected_provider,
        total_characters=alnum_count,
        mean_confidence=round(mean_conf, 4),
        nutrition_rows=split_result.get("nutrition_rows", []),
    )


def _run_gemini_ocr(image: Union[str, np.ndarray]) -> List[Dict[str, Any]]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise OcrProviderUnavailableError(
            "Gemini OCR provider requires GOOGLE_API_KEY environment variable to be set."
        )

    try:
        from backend.services.ocr.gemini_ocr import extract_ingredients
        import tempfile

        if isinstance(image, np.ndarray):
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                tmp_path = tmp.name
            try:
                cv2.imwrite(tmp_path, image)
                gemini_res = extract_ingredients(tmp_path)
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        else:
            gemini_res = extract_ingredients(str(image))

        blocks: List[Dict[str, Any]] = []
        ingredients = gemini_res.get("ingredients", [])
        if ingredients:
            blocks.append({
                "text": "Ingredients: " + ", ".join(ingredients),
                "box": [[0.0, 0.0], [100.0, 0.0], [100.0, 50.0], [0.0, 50.0]],
                "confidence": 0.95,
            })
        allergens = gemini_res.get("allergen_warnings", [])
        for a in allergens:
            blocks.append({
                "text": "Contains: " + a,
                "box": [[0.0, 60.0], [100.0, 60.0], [100.0, 90.0], [0.0, 90.0]],
                "confidence": 0.95,
            })
        return blocks
    except OcrProviderUnavailableError:
        raise
    except Exception as exc:
        raise OcrProviderUnavailableError(f"Gemini OCR provider failed: {exc}") from exc
