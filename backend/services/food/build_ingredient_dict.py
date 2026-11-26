"""Build SafeBite's ingredient dictionary from Open Food Facts tag columns.

The generated JSON is intentionally simple: ``canonical ingredient -> [synonyms]``.
It is an input to normalization, not a medical-risk database.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Mapping


# Open Food Facts additive tags encode additives as E numbers. These aliases make
# those tags usable on labels that spell out the additive name instead.
E_NUMBER_NAMES: dict[str, str] = {
    "e100": "curcumin",
    "e102": "tartrazine",
    "e110": "sunset yellow fcf",
    "e122": "carmoisine",
    "e150a": "plain caramel",
    "e160a": "carotenes",
    "e200": "sorbic acid",
    "e202": "potassium sorbate",
    "e211": "sodium benzoate",
    "e250": "sodium nitrite",
    "e300": "ascorbic acid",
    "e322": "lecithins",
    "e330": "citric acid",
    "e407": "carrageenan",
    "e415": "xanthan gum",
    "e621": "monosodium glutamate",
}


def canonicalize_tag(value: str) -> str:
    """Turn ``en:citric-acid`` or ``E 330`` into a lookup-safe text key."""
    value = value.strip().casefold()
    value = re.sub(r"^[a-z]{2}:", "", value)
    value = value.replace("_", " ").replace("-", " ")
    value = re.sub(r"\be\s+(\d+[a-z]?)\b", r"e\1", value)
    return re.sub(r"\s+", " ", value).strip()


def split_tags(value: object) -> list[str]:
    """Read Open Food Facts' comma-separated tag strings safely."""
    if not isinstance(value, str):
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _add_entry(dictionary: defaultdict[str, set[str]], tag: str) -> None:
    key = canonicalize_tag(tag)
    if not key:
        return
    canonical = E_NUMBER_NAMES.get(key, key)
    dictionary[canonical].update({canonical, key, tag.strip().casefold()})


def build_ingredient_dictionary(
    records: Iterable[Mapping[str, object]],
) -> dict[str, list[str]]:
    """Build a deterministic dictionary from ingredient and additive tag records."""
    dictionary: defaultdict[str, set[str]] = defaultdict(set)
    for record in records:
        for column in ("ingredients_tags", "additives_tags"):
            for tag in split_tags(record.get(column)):
                _add_entry(dictionary, tag)

    # The dataset may not contain every common E number in a smaller sample.
    # Include the seed aliases consistently, so E330 always resolves to citric acid.
    for e_number, canonical in E_NUMBER_NAMES.items():
        dictionary[canonical].update({canonical, e_number, f"e {e_number[1:]}", f"en:{e_number}"})

    return {key: sorted(values) for key, values in sorted(dictionary.items())}


def build_from_parquet(input_path: Path, output_path: Path) -> int:
    """Read only the two tag columns and write the JSON knowledge-base artifact."""
    import pandas as pd  # Optional at import time; needed only for the CLI.

    frame = pd.read_parquet(input_path, columns=["ingredients_tags", "additives_tags"])
    dictionary = build_ingredient_dictionary(frame.to_dict(orient="records"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(dictionary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return len(dictionary)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the SafeBite ingredient dictionary.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data" / "assets" / "text_set.parquet",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "food" / "ingredient_dict.json",
    )
    args = parser.parse_args()
    count = build_from_parquet(args.input, args.output)
    print(f"Wrote {count:,} canonical ingredients to {args.output}")
