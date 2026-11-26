"""
SafeBite - Gemini Multimodal OCR
Wraps Gemini vision API for extracting:
1. Ingredients list and allergen warnings (extract_ingredients)
2. Nutrition facts table items with nutrient, value, unit (extract_nutrition_table)
"""

import time
import json
import os
from pathlib import Path
import mimetypes
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError

# Global client and supported models
MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"]

# Prompt and Schema for Ingredients
INGREDIENTS_PROMPT = (
    "From this food label photo, extract ONLY the ingredients list. "
    "Put each ingredient as a separate item, lowercase. "
    "If an ingredient has sub-ingredients in brackets, list them as separate items too. "
    "Also extract allergen warnings (like 'contains milk') separately. "
    "Ignore the nutrition facts table. If something is not on the label, return an empty list."
)

INGREDIENTS_SCHEMA = {
    "type": "object",
    "properties": {
        "ingredients": {"type": "array", "items": {"type": "string"}},
        "allergen_warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["ingredients", "allergen_warnings"],
}

# Prompt and Schema for Nutrition Facts Table
NUTRITION_PROMPT = (
    "From this food label photo, extract the Nutrition Facts table. "
    "For each nutrient row, extract: "
    "- nutrient: the name of the nutrient in lowercase (e.g. 'calories', 'total fat', 'saturated fat', "
    "'trans fat', 'cholesterol', 'sodium', 'salt', 'total carbohydrate', 'dietary fiber', 'total sugars', "
    "'added sugars', 'protein', 'calcium', 'iron', 'potassium', 'vitamin d', etc.) "
    "- value: numeric quantity (or null if not specified) "
    "- unit: measurement unit (e.g., 'g', 'mg', 'mcg', 'kcal', 'kj', '%', or empty string) "
    "Also extract serving_size string if visible on label."
)

NUTRITION_SCHEMA = {
    "type": "object",
    "properties": {
        "serving_size": {"type": "string"},
        "nutrition": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "nutrient": {"type": "string"},
                    "value": {"type": ["number", "string", "null"]},
                    "unit": {"type": "string"},
                },
                "required": ["nutrient", "value", "unit"],
            },
        },
    },
    "required": ["nutrition"],
}


def _get_client() -> genai.Client:
    """Initializes and returns the GenAI client."""
    return genai.Client()


def extract_ingredients(image_path: str) -> Dict[str, Any]:
    """
    Extracts ingredients and allergen warnings from food label photo.
    Preserves exact original behavior and schema.
    """
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type not in ("image/jpeg", "image/png", "image/jpg", "image/webp"):
        raise ValueError(f"The system only supports JPEG, JPG, PNG and WEBP images. Got: {mime_type}")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    contents = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type or "image/jpeg"),
        INGREDIENTS_PROMPT,
    ]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=INGREDIENTS_SCHEMA,
    )

    client = _get_client()
    for model in MODELS:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model, contents=contents, config=config
                )
                return json.loads(response.text)
            except ServerError:
                print(f"{model} busy (try {attempt + 1}), Trying next model...")
                time.sleep(3)
            except ClientError as e:
                # Re-raise authentication or client errors directly
                raise e

    raise RuntimeError("All Gemini models are busy. Please try again later.")


def extract_nutrition_table(image_path: str) -> Dict[str, Any]:
    """
    Extracts the nutrition table from a food label photo using Gemini vision.
    Returns:
      {
        "serving_size": "28g (about 15 chips)",
        "nutrition": [
          {"nutrient": "calories", "value": 160, "unit": "kcal"},
          {"nutrient": "total fat", "value": 10, "unit": "g"},
          {"nutrient": "sodium", "value": 170, "unit": "mg"}, ...
        ]
      }
    """
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type not in ("image/jpeg", "image/png", "image/jpg", "image/webp"):
        raise ValueError(f"The system only supports JPEG, JPG, PNG and WEBP images. Got: {mime_type}")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    contents = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type or "image/jpeg"),
        NUTRITION_PROMPT,
    ]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=NUTRITION_SCHEMA,
    )

    client = _get_client()
    for model in MODELS:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model, contents=contents, config=config
                )
                return json.loads(response.text)
            except ServerError:
                print(f"{model} busy (try {attempt + 1}), Trying next model...")
                time.sleep(3)
            except ClientError as e:
                raise e

    raise RuntimeError("All Gemini models are busy. Please try again later.")


if __name__ == "__main__":
    sample_img = str(Path(__file__).resolve().parents[2] / "data" / "assets" / "ocr_samples" / "lays2.jpeg")
    print(f"Testing Gemini OCR on {sample_img}...")
    try:
        res = extract_ingredients(sample_img)
        print("Ingredients:", res.get("ingredients"))
        print("Allergens:", res.get("allergen_warnings"))
    except Exception as err:
        print("Error during test run:", err)
