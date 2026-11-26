"""Server-side validation and preprocessing for uploaded food-label images."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from backend.services.image.preprocess import preprocess_image


MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
MAX_IMAGE_DIMENSION = 6_000
ALLOWED_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png"}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class ImageInputError(ValueError):
    """Validation error safe to map to a client-visible upload error."""

    def __init__(self, message: str, category: str = "invalid_image") -> None:
        super().__init__(message)
        self.category = category


@dataclass(frozen=True)
class PreparedImage:
    """Validated, normalized image data passed to server-side OCR only."""

    filename: str
    mime_type: str
    image_bytes: bytes
    width: int
    height: int


def prepare_uploaded_image(filename: str | None, image_bytes: bytes) -> PreparedImage:
    """Validate an image and return preprocessed JPEG bytes for OCR.

    MIME types supplied by a browser are intentionally not trusted. Pillow verifies
    the actual bytes, and the output is always a normalized JPEG generated on the
    server. No image contents or secrets are sent to the frontend.
    """
    if not image_bytes:
        raise ImageInputError("Uploaded image is empty.")
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ImageInputError(f"Uploaded image exceeds the {MAX_IMAGE_BYTES // 1024 // 1024} MB limit.")

    try:
        with Image.open(BytesIO(image_bytes)) as source:
            source.verify()
        with Image.open(BytesIO(image_bytes)) as source:
            image_format = source.format
            if image_format not in ALLOWED_FORMATS:
                raise ImageInputError("Only JPEG and PNG image files are supported.", "unsupported_image")
            _validate_dimensions(*source.size)
            processed = preprocess_image(source)
    except ImageInputError:
        raise
    except UnidentifiedImageError as error:
        if not image_bytes.startswith(PNG_SIGNATURE):
            raise ImageInputError("Uploaded file is not a valid image.") from error
        decoded = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if decoded is None:
            raise ImageInputError("Uploaded file is not a valid image.") from error
        height, width = decoded.shape[:2]
        _validate_dimensions(width, height)
        processed = preprocess_image(Image.fromarray(cv2.cvtColor(decoded, cv2.COLOR_BGR2RGB)))
    except (OSError, Image.DecompressionBombError) as error:
        raise ImageInputError("Uploaded file is not a valid image.") from error

    output = BytesIO()
    processed.save(output, format="JPEG", quality=95)
    safe_filename = filename or "food-label.jpg"
    return PreparedImage(
        filename=safe_filename,
        mime_type="image/jpeg",
        image_bytes=output.getvalue(),
        width=processed.width,
        height=processed.height,
    )


def _validate_dimensions(width: int, height: int) -> None:
    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise ImageInputError(
            f"Uploaded image exceeds the {MAX_IMAGE_DIMENSION}px dimension limit."
        )
    if width * height > MAX_IMAGE_PIXELS:
        raise ImageInputError(
            f"Uploaded image exceeds the {MAX_IMAGE_PIXELS:,}-pixel limit."
        )
