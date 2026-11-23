import time
import mimetypes
from google import genai
from google.genai import types
from google.genai.errors import ServerError

client = genai.Client()

# pehla model pehle try hoga, fail hua to agla
MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"]

def extract_text(image_path):
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise ValueError("The system only supports JPEG, JPG and PNG images.")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    contents = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        "Extract only the ingredients list and any allergen warnings from this food label. Return plain text.",
    ]

    for model in MODELS:
        for attempt in range(2):
            try:
                response = client.models.generate_content(model=model, contents=contents)
                return response.text
            except ServerError:
                print(f"{model} busy (try {attempt + 1}), Trying next model...")
                time.sleep(3)

    raise RuntimeError("All models are busy. Please try again later.")

if __name__ == "__main__":
    print(extract_text("images/lays2.jpeg"))