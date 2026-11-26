"""Held-out evaluation input contract and runner entry point.

The manifest is JSON Lines. Each row must contain an ``id``, an ``image_path``
relative to the repository, and human-verified ``reference_text``. Optional
Open Food Facts fields are retained for the later nutrient-level comparison.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class EvaluationCase:
    case_id: str
    image_path: Path
    reference_text: str
    product_code: str | None = None
    off_nutrient_levels: dict[str, str] | None = None


def load_held_out_cases(manifest_path: Path, project_root: Path) -> list[EvaluationCase]:
    """Load and validate a JSONL held-out manifest without loading model code."""
    if not manifest_path.is_file():
        raise FileNotFoundError(
            f"Held-out manifest not found: {manifest_path}. "
            "Create it from independently held-out labelled examples."
        )

    cases: list[EvaluationCase] = []
    ids: set[str] = set()
    for line_number, line in enumerate(manifest_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row: dict[str, Any] = json.loads(line)
            case_id = str(row["id"])
            relative_image_path = row["image_path"]
            reference_text = row["reference_text"].strip()
        except (json.JSONDecodeError, KeyError, AttributeError) as error:
            raise ValueError(f"Invalid manifest row {line_number}.") from error

        if not case_id or case_id in ids:
            raise ValueError(f"Manifest row {line_number} has a missing or duplicate id: {case_id!r}")
        if not isinstance(relative_image_path, str) or Path(relative_image_path).is_absolute():
            raise ValueError(f"Manifest row {line_number} must use a relative image_path.")
        if not reference_text:
            raise ValueError(f"Manifest row {line_number} has no reference_text.")

        image_path = (project_root / relative_image_path).resolve()
        if project_root.resolve() not in image_path.parents or not image_path.is_file():
            raise ValueError(f"Manifest row {line_number} image does not exist: {relative_image_path}")

        nutrient_levels = row.get("off_nutrient_levels")
        if nutrient_levels is not None and not isinstance(nutrient_levels, dict):
            raise ValueError(f"Manifest row {line_number} off_nutrient_levels must be an object.")

        ids.add(case_id)
        cases.append(
            EvaluationCase(
                case_id=case_id,
                image_path=image_path,
                reference_text=reference_text,
                product_code=row.get("product_code"),
                off_nutrient_levels=nutrient_levels,
            )
        )
    if not cases:
        raise ValueError("Held-out manifest contains no cases.")
    return cases


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate SafeBite held-out evaluation input.")
    parser.add_argument("--manifest", type=Path, required=True, help="JSONL held-out manifest")
    parser.add_argument("--project-root", type=Path, default=Path("."))
    args = parser.parse_args()

    cases = load_held_out_cases(args.manifest, args.project_root)
    with_off_levels = sum(case.off_nutrient_levels is not None for case in cases)
    print(f"Evaluation input ready: {len(cases)} held-out images; {with_off_levels} with OFF nutrient levels.")


if __name__ == "__main__":
    main()
