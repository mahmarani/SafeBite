"""Shared BIO labels for SafeBite ingredient-label NER."""

from __future__ import annotations

from typing import Final


ENTITY_TYPES: Final[tuple[str, ...]] = (
    "INGREDIENT",
    "ADDITIVE",
    "ALLERGEN",
    "NUTRIENT",
    "QUANTITY",
)

# Keep O at index zero: it is the conventional default for token-classification
# models and makes unlabelled tokens inexpensive to create.
LABELS: Final[tuple[str, ...]] = (
    "O",
    *(f"{prefix}-{entity}" for entity in ENTITY_TYPES for prefix in ("B", "I")),
)
LABEL_TO_ID: Final[dict[str, int]] = {label: index for index, label in enumerate(LABELS)}
ID_TO_LABEL: Final[dict[int, str]] = {index: label for label, index in LABEL_TO_ID.items()}


def is_valid_label(label: str) -> bool:
    """Return whether *label* belongs to this model's complete label set."""
    return label in LABEL_TO_ID


def validate_bio_sequence(labels: list[str]) -> None:
    """Raise ValueError when an I- tag cannot continue the preceding entity."""
    previous_entity: str | None = None
    for index, label in enumerate(labels):
        if label == "O":
            previous_entity = None
            continue
        if label not in LABEL_TO_ID:
            raise ValueError(f"unknown NER label at index {index}: {label!r}")

        prefix, entity = label.split("-", maxsplit=1)
        if prefix == "I" and previous_entity != entity:
            raise ValueError(
                f"I-{entity} at index {index} must follow B-{entity} or I-{entity}"
            )
        previous_entity = entity
