"""
SafeBite - Preprocessing Pipeline Steps
Provides modular, toggleable image preprocessing functions for food-label OCR.
Every step takes a numpy array in and returns a numpy array out.
"""

from typing import Optional, Dict, Any
import numpy as np
import cv2


def resize(img: np.ndarray, max_dim: int = 1800) -> np.ndarray:
    """
    Downsamples image if width or height exceeds max_dim, preserving aspect ratio.
    """
    if img is None:
        raise ValueError("Input image is None")

    h, w = img.shape[:2]
    max_side = max(h, w)
    if max_side <= max_dim:
        return img

    scale = max_dim / float(max_side)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def grayscale(img: np.ndarray) -> np.ndarray:
    """
    Converts color (BGR/RGB) image to single-channel 8-bit grayscale.
    """
    if img is None:
        raise ValueError("Input image is None")

    if len(img.shape) == 2:
        return img
    elif len(img.shape) == 3 and img.shape[2] == 1:
        return img[:, :, 0]
    elif len(img.shape) == 3 and img.shape[2] in (3, 4):
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img


def clahe_contrast(
    img: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple = (8, 8),
) -> np.ndarray:
    """
    Contrast Limited Adaptive Histogram Equalization.
    Enhances local contrast across unevenly lit food packages.
    Works for both grayscale and color images.
    """
    if img is None:
        raise ValueError("Input image is None")

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    if len(img.shape) == 2 or (len(img.shape) == 3 and img.shape[2] == 1):
        gray = img[:, :, 0] if len(img.shape) == 3 else img
        return clahe.apply(gray)
    elif len(img.shape) == 3 and img.shape[2] >= 3:
        # Convert to LAB, apply CLAHE to Luminance (L), merge back
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l_clahe = clahe.apply(l)
        merged = cv2.merge([l_clahe, a, b])
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    return img


def denoise_sharpen(img: np.ndarray) -> np.ndarray:
    """
    Denoises slightly, then sharpens character edges using an unsharp mask.
    """
    if img is None:
        raise ValueError("Input image is None")

    # 1. Subtle Gaussian blur for high-frequency sensor noise
    blurred = cv2.GaussianBlur(img, (0, 0), sigmaX=1.5)

    # 2. Unsharp mask: original * 1.5 - blurred * 0.5
    sharpened = cv2.addWeighted(img, 1.5, blurred, -0.5, 0)
    return sharpened


def otsu_binarize(img: np.ndarray) -> np.ndarray:
    """
    Binarizes image into pure black/white using Otsu's adaptive thresholding.
    Automatically ensures input is grayscale first.
    """
    if img is None:
        raise ValueError("Input image is None")

    gray = grayscale(img)
    # Otsu thresholding
    _, binarized = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binarized


def deskew(img: np.ndarray) -> np.ndarray:
    """
    Estimates dominant text tilt angle and deskews image.
    Preserves dimensions and avoids extreme rotations (> 45 deg).
    """
    if img is None:
        raise ValueError("Input image is None")

    gray = grayscale(img)
    # Invert binary to find foreground coordinates
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    # Extract all foreground pixel coordinates
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 100:
        return img  # Not enough text pixels to compute reliable angle

    # Compute rotated rectangle containing text
    angle = cv2.minAreaRect(coords)[-1]

    # cv2.minAreaRect returns angle in [-90, 0)
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # Filter out negligible tilt or extreme rotations that are likely false orientations
    if abs(angle) < 0.5 or abs(angle) > 45:
        return img

    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    m = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        img,
        m,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return rotated


# Default configuration dictionary
DEFAULT_CONFIG: Dict[str, bool] = {
    "resize": True,
    "deskew": True,
    "grayscale": True,
    "clahe": True,
    "denoise_sharpen": True,
    "otsu": False,
}


def pipeline(
    img: np.ndarray,
    config: Optional[Dict[str, Any]] = None,
) -> np.ndarray:
    """
    Executes the preprocessing pipeline with each step switchable.

    Config options (True/False):
      - 'resize'          (downscales large images)
      - 'deskew'          (straightens tilted text)
      - 'grayscale'       (converts 3-channel to 1-channel)
      - 'clahe'           (enhances local contrast)
      - 'denoise_sharpen' (sharpens characters)
      - 'otsu'            (binary black/white threshold)
    """
    if img is None:
        raise ValueError("Cannot run pipeline on None image")

    cfg = dict(DEFAULT_CONFIG)
    if config:
        cfg.update(config)

    processed = img.copy()

    # Step 1: Resize
    if cfg.get("resize", False):
        max_dim = cfg.get("max_dim", 1800)
        processed = resize(processed, max_dim=max_dim)

    # Step 2: Deskew
    if cfg.get("deskew", False):
        processed = deskew(processed)

    # Step 3: Grayscale
    if cfg.get("grayscale", False):
        processed = grayscale(processed)

    # Step 4: CLAHE Contrast
    if cfg.get("clahe", False):
        clip_limit = cfg.get("clahe_clip_limit", 2.0)
        processed = clahe_contrast(processed, clip_limit=clip_limit)

    # Step 5: Denoise / Sharpen
    if cfg.get("denoise_sharpen", False):
        processed = denoise_sharpen(processed)

    # Step 6: Otsu Binarization
    if cfg.get("otsu", False):
        processed = otsu_binarize(processed)

    return processed
