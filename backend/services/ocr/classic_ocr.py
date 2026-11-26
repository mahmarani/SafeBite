"""
SafeBite - Classic OCR Engine (EasyOCR)
Performs local OCR on food-label images.
Returns recognized words/phrases, bounding box coordinates, and detection confidences.
"""

import os
from pathlib import Path
from typing import List, Dict, Any, Union, Optional
import numpy as np
import cv2
import easyocr

_READER = None


def get_reader(
    languages: Optional[List[str]] = None,
    model_dir: Optional[str] = None,
) -> easyocr.Reader:
    """
    Lazy-initializes and caches the EasyOCR Reader instance.
    Uses local workspace models directory by default to avoid permission issues.
    """
    global _READER
    if _READER is None:
        langs = languages or ["en"]
        models_path = model_dir or str(Path(__file__).resolve().parents[2] / "models" / "ocr")
        os.makedirs(models_path, exist_ok=True)
        _READER = easyocr.Reader(
            langs,
            gpu=False,
            model_storage_directory=models_path,
            user_network_directory=models_path,
            download_enabled=False,
        )
    return _READER


def extract_text_classic(
    image_input: Union[str, np.ndarray],
    languages: Optional[List[str]] = None,
    min_confidence: float = 0.1,
) -> List[Dict[str, Any]]:
    """
    Extracts text from food-label image using EasyOCR.

    Args:
        image_input: File path (str) or loaded OpenCV numpy image array.
        languages: Language codes (default ['en']).
        min_confidence: Threshold below which detections are ignored.

    Returns:
        List of dictionaries with keys:
          - 'text': recognized string
          - 'box': list of 4 coordinate pairs [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
          - 'confidence': float score between 0.0 and 1.0
    """
    # 1. Validate / read image
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            raise FileNotFoundError(f"Image not found at path: {image_input}")
        img = cv2.imread(image_input)
        if img is None:
            raise ValueError(f"Could not decode image at: {image_input}")
    elif isinstance(image_input, np.ndarray):
        img = image_input
    else:
        raise TypeError(f"Expected file path or numpy array, got {type(image_input)}")

    reader = get_reader(languages)

    # Enlarge small package text and normalize local contrast before the single
    # OCR pass. Keep a scale factor so returned boxes remain in source pixels.
    height, width = img.shape[:2]
    scale = max(1.0, min(3.0, 1600.0 / max(height, width)))
    if scale > 1.0:
        ocr_img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    else:
        ocr_img = img
    lab = cv2.cvtColor(ocr_img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    l_channel = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l_channel)
    ocr_img = cv2.cvtColor(cv2.merge((l_channel, a_channel, b_channel)), cv2.COLOR_LAB2BGR)

    # 2. Run EasyOCR once on the enhanced full image.
    raw_results = reader.readtext(ocr_img)

    # 3. Format output
    structured_results = []
    for bbox, text, conf in raw_results:
        confidence = float(conf)
        if confidence < min_confidence:
            continue

        # Convert bounding box coordinates to standard Python lists
        clean_box = [[float(pt[0]) / scale, float(pt[1]) / scale] for pt in bbox]

        structured_results.append({
            "text": str(text).strip(),
            "box": clean_box,
            "confidence": round(confidence, 4),
        })

    return structured_results


def get_full_text(results: List[Dict[str, Any]]) -> str:
    """Concatenates all detected text strings separated by spaces."""
    return " ".join(item["text"] for item in results if item.get("text"))


if __name__ == "__main__":
    sample_img = str(Path(__file__).resolve().parents[2] / "data" / "assets" / "ocr_samples" / "lays2.jpeg")
    print(f"Running EasyOCR on: {sample_img}")
    items = extract_text_classic(sample_img)
    print(f"Total detections: {len(items)}")
    for it in items[:10]:
        print(f"  Confidence: {it['confidence']:.2f} | Text: '{it['text']}' | Box: {it['box']}")
