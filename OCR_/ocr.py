import time
import json
import mimetypes
from google import genai
from google.genai import types
from google.genai.errors import ServerError

client = genai.Client()
MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"]

PROMPT = (
    "From this food label photo, extract ONLY the ingredients list. "
    "Put each ingredient as a separate item, lowercase. "
    "If an ingredient has sub-ingredients in brackets, list them as separate items too. "
    "Also extract allergen warnings (like 'contains milk') separately. "
    "Ignore the nutrition facts table. If something is not on the label, return an empty list."
)

SCHEMA = {
    "type": "object",
    "properties": {
        "ingredients": {"type": "array", "items": {"type": "string"}},
        "allergen_warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["ingredients", "allergen_warnings"],
}

def extract_ingredients(image_path):
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise ValueError("The system only supports JPEG, JPG and PNG images.")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    contents = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        PROMPT,
    ]
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=SCHEMA,
    )

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

    raise RuntimeError("All models are busy. Please try again later.")

if __name__ == "__main__":
    result = extract_ingredients("images/lays2.jpeg")
    print(result["ingredients"])
    print("-----------------------------------------------")
    print(result["allergen_warnings"])