"""Run OCR and section extraction across synthetic label fixtures.

Evaluates Character Error Rate (CER), Word Error Rate (WER), and section detection,
and produces the versioned OCR fixture artifacts.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import time

import cv2
import jiwer

# Ensure repository root is on sys.path
ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "data" / "assets" / "label_fixtures"

from backend.services.ocr.service import UnreadableLabelError, run_ocr_pipeline
from backend.services.image.preprocess import preprocess_image


def evaluate_fixtures(manifest_path: Path, output_artifact_path: Path | None = None) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    fixtures_dir = manifest_path.parent

    results = []
    total_cer_raw = []
    total_wer_raw = []
    total_cer_prep = []
    total_wer_prep = []

    print(f"\nRunning OCR evaluation across {len(manifest['fixtures'])} fixtures...\n")

    for f in manifest["fixtures"]:
        fixture_id = f["id"]
        image_name = f["image"]
        image_path = fixtures_dir / image_name

        expected_ingr = f.get("expected_ingredients", [])
        expected_aller = f.get("expected_allergens", [])

        # Construct reference text from manifest expectations
        ref_parts = []
        if expected_ingr:
            ref_parts.append("ingredients: " + ", ".join(expected_ingr))
        if expected_aller:
            ref_parts.append("contains: " + ", ".join(expected_aller))
        reference_text = " ".join(ref_parts).strip().lower()

        t0 = time.perf_counter()

        # 1. OCR with preprocessing
        prep_error = None
        prep_result = None
        try:
            # First preprocess the raw image
            preprocessed_cv2 = cv2.imread(str(image_path))
            if preprocessed_cv2 is not None:
                # Run through pipeline
                prep_result = run_ocr_pipeline(str(image_path))
        except UnreadableLabelError as exc:
            prep_error = "unreadable_label"

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        # 2. Compute error rates for readable reference cases
        case_cer = None
        case_wer = None
        detected_ingr = ""
        detected_aller = ""

        if prep_result is not None:
            detected_ingr = prep_result.sections.get("ingredients", "")
            detected_aller = prep_result.sections.get("allergens", "")
            pred_text = f"{detected_ingr} {detected_aller}".strip().lower()

            if reference_text and pred_text:
                case_cer = round(jiwer.cer(reference_text, pred_text), 4)
                case_wer = round(jiwer.wer(reference_text, pred_text), 4)
                total_cer_prep.append(case_cer)
                total_wer_prep.append(case_wer)

        artifact = {
            "id": fixture_id,
            "image": image_name,
            "status": "unreadable" if prep_error else "success",
            "error": prep_error,
            "latency_ms": latency_ms,
            "cer": case_cer,
            "wer": case_wer,
            "blocks": [
                {
                    "text": b.text,
                    "box": b.box,
                    "confidence": b.confidence,
                    "section": b.section,
                }
                for b in (prep_result.ocr_blocks if prep_result else [])
            ],
            "sections": prep_result.sections if prep_result else {},
        }
        results.append(artifact)

        print(
            f"  • {fixture_id:<20} | Status: {artifact['status']:<10} | "
            f"Blocks: {len(artifact['blocks']):<2} | Latency: {latency_ms:>6.1f}ms | "
            f"CER: {f'{case_cer*100:.1f}%' if case_cer is not None else 'N/A'}"
        )

    summary = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_fixtures": len(manifest["fixtures"]),
        "readable_count": sum(1 for r in results if r["status"] == "success"),
        "unreadable_count": sum(1 for r in results if r["status"] == "unreadable"),
        "mean_cer": round(sum(total_cer_prep) / len(total_cer_prep), 4) if total_cer_prep else 0.0,
        "mean_wer": round(sum(total_wer_prep) / len(total_wer_prep), 4) if total_wer_prep else 0.0,
        "artifacts": results,
    }

    if output_artifact_path:
        output_artifact_path.parent.mkdir(parents=True, exist_ok=True)
        output_artifact_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"\n✅ OCR artifacts written to: {output_artifact_path}")

    print(f"\n📊 Summary: Mean CER: {summary['mean_cer']*100:.2f}%, Mean WER: {summary['mean_wer']*100:.2f}%\n")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate OCR on SafeBite fixtures.")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=FIXTURE_DIR / "manifest.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=FIXTURE_DIR / "ocr_artifacts.json",
    )
    args = parser.parse_args()
    evaluate_fixtures(args.manifest, args.output)
