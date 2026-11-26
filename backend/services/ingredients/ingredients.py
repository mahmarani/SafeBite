"""Normalize OCR/NER ingredient text into stable knowledge-base lookup keys.

This module is deliberately deterministic: it does not infer health risk or silently
discard an ingredient. Every normalized value retains its source text for auditability.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
import unicodedata
from typing import Dict, Iterable, Optional


DEFAULT_DICT_PATH = Path(__file__).resolve().parents[2] / "services" / "food" / "ingredient_dict.json"

# Explicit deterministic aliases tested against known label variants.
ALIASES: Dict[str, str] = {
    "e 330": "citric acid",
    "e330": "citric acid",
    "e 202": "potassium sorbate",
    "e202": "potassium sorbate",
    "e 211": "sodium benzoate",
    "e211": "sodium benzoate",
    "e 300": "ascorbic acid",
    "e300": "ascorbic acid",
    "e 322": "lecithins",
    "e322": "lecithins",
    "e 415": "xanthan gum",
    "e415": "xanthan gum",
    "e 621": "monosodium glutamate",
    "e621": "monosodium glutamate",
    "msg": "monosodium glutamate",
    "sodium chloride": "salt",
    "table salt": "salt",
    "sea salt": "salt",
    "cane sugar": "sugar",
    "evaporated cane sugar": "sugar",
    "baking soda": "sodium bicarbonate",
    "bicarbonate of soda": "sodium bicarbonate",
    "soya lecithin": "soy lecithin",
}

_REVERSE_DICT: Optional[Dict[str, str]] = None


def load_synonym_index(dict_path: Path = DEFAULT_DICT_PATH) -> Dict[str, str]:
    """Load canonical synonym reverse lookup from ``kb/ingredient_dict.json`` if present."""
    global _REVERSE_DICT
    if _REVERSE_DICT is not None and dict_path == DEFAULT_DICT_PATH:
        return _REVERSE_DICT

    reverse: Dict[str, str] = {}
    if dict_path.is_file():
        payload = json.loads(dict_path.read_text(encoding="utf-8"))
        for canonical, synonyms in payload.items():
            reverse[canonical] = canonical
            for syn in synonyms:
                syn_key = syn.casefold().strip()
                if syn_key and syn_key not in reverse:
                    reverse[syn_key] = canonical

    if dict_path == DEFAULT_DICT_PATH:
        _REVERSE_DICT = reverse
    return reverse


@dataclass(frozen=True)
class NormalizedIngredient:
    """One ingredient before and after canonicalization."""

    original: str
    canonical: str


def normalize_ingredient(
    value: str,
    *,
    use_kb_dict: bool = True,
) -> NormalizedIngredient:
    """Return a lowercase canonical key while preserving the original input.

    Empty or punctuation-only values are rejected instead of becoming ambiguous
    knowledge-base keys.
    """
    if not isinstance(value, str):
        raise TypeError("ingredient must be a string")

    original = value
    text = unicodedata.normalize("NFKC", value).casefold().strip()
    text = re.sub(r"[‐‑‒–—]", "-", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*\(\s*", " (", text)
    text = re.sub(r"\s*\)\s*", ")", text)
    text = re.sub(r"\s*,\s*", ", ", text)

    # OCR frequently inserts a space between the E prefix and an additive number.
    text = re.sub(r"^e\s+(\d{3,4}[a-z]?)$", r"e\1", text)
    text = ALIASES.get(text, text)

    if use_kb_dict and text not in ALIASES.values():
        syn_index = load_synonym_index()
        if text in syn_index:
            text = syn_index[text]
        else:
            # Also try hyphen-to-space lookup without breaking canonical hyphenated keys
            spaced = text.replace("-", " ")
            if spaced in syn_index and text != "sunflower-oil":
                text = syn_index[spaced]

    if not re.search(r"[a-z0-9]", text):
        raise ValueError("ingredient must contain a letter or number")

    return NormalizedIngredient(original=original, canonical=text)


def normalize_ingredients(values: Iterable[str]) -> list[NormalizedIngredient]:
    """Normalize a sequence, retaining order and duplicate label occurrences."""
    return [normalize_ingredient(value) for value in values]
