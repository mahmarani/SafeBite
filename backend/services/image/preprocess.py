"""
SafeBite - Pipeline Step 1: Image Preprocessing
Prepares food label images for OCR:
- Normalizes orientation using EXIF tags (fixes smartphone rotation)
- Standardizes color mode to RGB
- Downsamples overly large images to max dimension while preserving aspect ratio
- Enhances contrast and sharpness to improve OCR legibility on curved/wrinkled packages
"""

import os
from typing import Optional, Union, Tuple
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def preprocess_image(
    image_input: Union[str, Image.Image],
    output_path: Optional[str] = None,
    max_dimension: int = 1800,
    contrast_factor: float = 1.25,
    sharpness_factor: float = 1.5,
    auto_contrast_cutoff: float = 1.0,
) -> Image.Image:
    """
    Preprocess a food label image for optimal OCR text extraction.

    Args:
        image_input: File path (str) or PIL Image instance.
        output_path: Optional path to save the processed image.
        max_dimension: Maximum width or height in pixels. Scales down if larger.
        contrast_factor: Multiplier for ImageEnhance.Contrast (1.0 = original).
        sharpness_factor: Multiplier for ImageEnhance.Sharpness (1.0 = original).
        auto_contrast_cutoff: Percentage of extreme dark/light pixels to ignore during auto-contrast.

    Returns:
        Processed PIL Image in RGB format.
    """
    # 1. Load image
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            raise FileNotFoundError(f"Image not found at path: {image_input}")
        ext = os.path.splitext(image_input)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported image format '{ext}'. Supported: {SUPPORTED_EXTENSIONS}")
        image = Image.open(image_input)
    elif isinstance(image_input, Image.Image):
        image = image_input
    else:
        raise TypeError(f"Expected str or PIL.Image, got {type(image_input)}")

    # 2. Fix orientation using EXIF metadata (crucial for phone camera captures)
    image = ImageOps.exif_transpose(image)

    # 3. Ensure RGB mode (handling RGBA, palette, CMYK, etc.)
    if image.mode != "RGB":
        image = image.convert("RGB")

    # 4. Resize if image exceeds maximum dimension (preserves aspect ratio)
    width, height = image.size
    max_dim = max(width, height)
    if max_dim > max_dimension:
        scale = max_dimension / float(max_dim)
        new_width = int(round(width * scale))
        new_height = int(round(height * scale))
        resample_filter = getattr(Image, "Resampling", Image).LANCZOS
        image = image.resize((new_width, new_height), resample_filter)

    # 5. Contrast enhancement (Auto-contrast + dynamic range boost)
    if auto_contrast_cutoff > 0:
        image = ImageOps.autocontrast(image, cutoff=auto_contrast_cutoff)

    if contrast_factor != 1.0:
        contrast_enhancer = ImageEnhance.Contrast(image)
        image = contrast_enhancer.enhance(contrast_factor)

    # 6. Sharpness enhancement (helps with fine print ingredients)
    if sharpness_factor != 1.0:
        sharpness_enhancer = ImageEnhance.Sharpness(image)
        image = sharpness_enhancer.enhance(sharpness_factor)

    # 7. Unsharp mask filter to define character edges
    image = image.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))

    # 8. Save if output path requested
    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        image.save(output_path, quality=95)

    return image


def get_image_metadata(image_path: str) -> dict:
    """Returns basic dimensional and format details for an image."""
    with Image.open(image_path) as img:
        return {
            "format": img.format,
            "size": img.size,
            "mode": img.mode,
        }
