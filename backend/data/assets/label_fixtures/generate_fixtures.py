"""Generate deterministic, synthetic label images from the fixture manifest."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent
MANIFEST = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))


def render(
    text: str,
    path: Path,
    *,
    rotate: int = 0,
    blur: float = 0,
    font_scale: float = 0.65,
    font_thickness: int = 1,
    line_spacing: int = 42,
    glare: bool = False,
) -> None:
    image = np.full((500, 900, 3), 255, dtype=np.uint8)
    if text.strip():
        title_scale = 0.55 if font_scale < 0.5 else 0.8
        cv2.putText(image, "Nutrition Facts", (28, 52), cv2.FONT_HERSHEY_SIMPLEX, title_scale, (0, 0, 0), 2)
        for i, line in enumerate(text.split("\n")):
            y_pos = int(85 + i * line_spacing) if font_scale < 0.5 else int(105 + i * line_spacing)
            cv2.putText(image, line, (28, y_pos), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), font_thickness)
    if glare:
        glare_overlay = image.copy()
        cv2.ellipse(glare_overlay, (600, 200), (200, 90), 25, 0, 360, (255, 255, 255), -1)
        image = cv2.addWeighted(glare_overlay, 0.7, image, 0.3, 0)
    if blur:
        image = cv2.GaussianBlur(image, (0, 0), blur)
    if rotate:
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    if not cv2.imwrite(str(path), image):
        raise RuntimeError(f"Could not write fixture: {path}")


def main() -> None:
    cases = {
        "clear_label": ("Ingredients: oats, sugar, salt\nCalories 120 kcal\nTotal sugars 5 g\nSodium 150 mg", 0, 0, 0.65, 1, 42, False),
        "blurry_label": ("Ingredients: wheat flour, sugar, salt\nContains wheat\nCalories 130 kcal\nTotal sugars 6 g\nSodium 180 mg", 0, 1.8, 0.65, 1, 42, False),
        "rotated_label": ("Ingredients: corn, sunflower oil, salt\nCalories 140 kcal\nTotal sugars 1 g\nSodium 220 mg", 90, 0, 0.65, 1, 42, False),
        "allergen_statement": ("Ingredients: milk, cocoa, sugar\nContains: milk\nCalories 210 kcal\nTotal sugars 18 g\nSodium 60 mg", 0, 0, 0.65, 1, 42, False),
        "unreadable": ("", 0, 0, 0.65, 1, 42, False),
        "glare_label": ("Ingredients: rice, sugar, salt\nCalories 110 kcal\nTotal sugars 3 g\nSodium 100 mg", 0, 0, 0.65, 1, 42, True),
        "small_print_label": ("Ingredients: barley, sesame oil, sea salt\nContains: sesame\nCalories 150 kcal\nTotal sugars 2 g\nSodium 190 mg", 0, 0, 0.42, 1, 26, False),
    }
    for fixture_id, (text, rotation, blur, f_scale, f_thick, spacing, is_glare) in cases.items():
        render(
            text,
            ROOT / f"{fixture_id}.png",
            rotate=rotation,
            blur=blur,
            font_scale=f_scale,
            font_thickness=f_thick,
            line_spacing=spacing,
            glare=is_glare,
        )

    exif_image = Image.new("RGB", (48, 96), "white")
    exif = Image.Exif()
    exif[274] = 6  # Rotate 90° clockwise when the image is displayed.
    exif_image.save(ROOT / "exif_rotated.jpg", format="JPEG", exif=exif)


if __name__ == "__main__":
    main()
