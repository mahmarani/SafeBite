"""Evaluate MLM correction quality and OCR-vs-corrected WER.

Evaluates:
1. Correction precision, recall, F1, and false-correction rate on a held-out test split
   (data/text_set.parquet split == "test") with synthetic OCR noise and clean text.
2. Automatic correction audit flagging food names, allergens, E-numbers, and quantities.
3. OCR-only vs OCR-plus-correction WER/CER across synthetic label fixtures and held-out noisy text.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
import time
from typing import Any, Dict, List

import jiwer
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "assets"

from backend.services.language.corrector import BertMLMCorrector, evaluate_corrector
from backend.services.language.noise import inject_ocr_noise
from backend.services.language.service import run_correction_and_tokenization
from backend.services.ocr.service import UnreadableLabelError, run_ocr_pipeline

ALLERGEN_TERMS = {
    "milk", "dairy", "wheat", "gluten", "soy", "soya", "peanut", "peanuts",
    "almond", "almonds", "hazelnut", "hazelnuts", "walnut", "cashew", "pecan",
    "egg", "eggs", "fish", "shellfish", "crustacean", "sesame", "mustard",
    "celery", "lupin", "sulfite", "sulfites", "sulphite", "sulphites",
}
E_NUMBER_RE = re.compile(r"^e\d{3,4}[a-z]?$", re.IGNORECASE)
QUANTITY_RE = re.compile(r"\d+(?:\.\d+)?\s*(?:g|mg|mcg|ug|ml|l|kg|%|kcal|kj)?$", re.IGNORECASE)


def _flag_attention_category(original: str, corrected: str) -> str:
    low_orig = original.lower()
    low_corr = corrected.lower()
    if low_orig in ALLERGEN_TERMS or low_corr in ALLERGEN_TERMS:
        return "allergen"
    if E_NUMBER_RE.match(low_orig) or E_NUMBER_RE.match(low_corr):
        return "e_number"
    if QUANTITY_RE.match(low_orig) or QUANTITY_RE.match(low_corr):
        return "quantity"
    return "food_or_label_term"


def _normalize_for_wer(text: str) -> str:
    tokens = re.sub(r"[,;:.()]+", " ", text.lower()).split()
    return " ".join(tokens)


def run_held_out_eval(
    corrector: BertMLMCorrector,
    parquet_path: Path,
    sample_limit: int = 100,
    noise_rate: float = 0.15,
) -> Dict[str, Any]:
    df = pd.read_parquet(parquet_path)
    test_df = df[df["split"] == "test"] if "split" in df.columns else df
    # Filter to ASCII-dominant ingredient declarations matching the English MLM scope
    candidates = [
        str(t).strip()
        for t in test_df["ingredients_text"].dropna()
        if len(str(t).strip()) > 15 and str(t).strip().isascii()
    ]
    held_out_texts = candidates[:sample_limit]

    noisy_metrics = evaluate_corrector(corrector, held_out_texts, noise_rate=noise_rate)

    # Clean-text false-correction rate
    clean_words_total = 0
    clean_false_edits: List[Dict[str, Any]] = []
    for idx, text in enumerate(held_out_texts):
        clean_words_total += len(re.findall(r"\b[a-zA-Z]{3,}\b", text))
        _, recs = corrector.correct_text(text)
        for rec in recs:
            clean_false_edits.append({
                "sample_index": idx,
                "original": rec["original"],
                "corrected": rec["corrected"],
                "score": rec["score"],
                "category": _flag_attention_category(rec["original"], rec["corrected"]),
            })

    # Held-out noisy-text WER before vs after correction + correction audit log
    wer_before_list: List[float] = []
    wer_after_list: List[float] = []
    cer_before_list: List[float] = []
    cer_after_list: List[float] = []
    sample_audit: List[Dict[str, Any]] = []

    for idx, clean_text in enumerate(held_out_texts):
        noisy_text, mutations = inject_ocr_noise(clean_text, error_rate=noise_rate, seed=idx + 100)
        corrected_text, recs = corrector.correct_text(noisy_text)

        ref_norm = _normalize_for_wer(clean_text)
        noisy_norm = _normalize_for_wer(noisy_text)
        corr_norm = _normalize_for_wer(corrected_text)
        if ref_norm:
            wer_before_list.append(jiwer.wer(ref_norm, noisy_norm))
            wer_after_list.append(jiwer.wer(ref_norm, corr_norm))
            cer_before_list.append(jiwer.cer(ref_norm, noisy_norm))
            cer_after_list.append(jiwer.cer(ref_norm, corr_norm))

        mut_map = {m["corrupted"].lower(): m["original"].lower() for m in mutations}
        if idx < 15:
            for rec in recs:
                orig_l = rec["original"].lower()
                corr_l = rec["corrected"].lower()
                if orig_l in mut_map:
                    outcome = "true_fix" if corr_l == mut_map[orig_l] else "wrong_fix"
                else:
                    outcome = "false_edit"
                sample_audit.append({
                    "sample_index": idx,
                    "original": rec["original"],
                    "corrected": rec["corrected"],
                    "expected": mut_map.get(orig_l, rec["original"]),
                    "score": rec["score"],
                    "outcome": outcome,
                    "flag_category": _flag_attention_category(rec["original"], rec["corrected"]),
                })

    clean_false_rate = (
        len(clean_false_edits) / clean_words_total * 100 if clean_words_total > 0 else 0.0
    )

    return {
        "samples_evaluated": len(held_out_texts),
        "noise_rate": noise_rate,
        "noisy_metrics": noisy_metrics,
        "clean_words_total": clean_words_total,
        "clean_false_corrections": len(clean_false_edits),
        "clean_false_correction_rate_pct": round(clean_false_rate, 2),
        "clean_false_edits": clean_false_edits,
        "held_out_wer_before": round(sum(wer_before_list) / len(wer_before_list), 4) if wer_before_list else 0.0,
        "held_out_wer_after": round(sum(wer_after_list) / len(wer_after_list), 4) if wer_after_list else 0.0,
        "held_out_cer_before": round(sum(cer_before_list) / len(cer_before_list), 4) if cer_before_list else 0.0,
        "held_out_cer_after": round(sum(cer_after_list) / len(cer_after_list), 4) if cer_after_list else 0.0,
        "sample_release_audit": sample_audit,
    }


def run_fixture_wer_comparison(
    corrector: BertMLMCorrector,
    manifest_path: Path,
) -> Dict[str, Any]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    fixtures_dir = manifest_path.parent
    rows: List[Dict[str, Any]] = []

    for f in manifest["fixtures"]:
        fid = f["id"]
        image_path = fixtures_dir / f["image"]
        ref_parts = []
        if f.get("expected_ingredients"):
            ref_parts.append("ingredients: " + ", ".join(f["expected_ingredients"]))
        if f.get("expected_allergens"):
            ref_parts.append("contains: " + ", ".join(f["expected_allergens"]))
        ref = " ".join(ref_parts).strip().lower()
        if not ref:
            continue

        try:
            ocr_res = run_ocr_pipeline(str(image_path))
        except UnreadableLabelError:
            rows.append({"id": fid, "status": "unreadable", "wer_ocr": None, "wer_corrected": None, "corrections": []})
            continue

        nlp_res = run_correction_and_tokenization(ocr_res.sections, corrector=corrector)
        ocr_pred = f"{ocr_res.sections.get('ingredients', '')} {ocr_res.sections.get('allergens', '')}".strip().lower()
        corr_pred = f"{nlp_res.corrected_sections.get('ingredients', '')} {nlp_res.corrected_sections.get('allergens', '')}".strip().lower()

        wer_ocr = round(jiwer.wer(ref, ocr_pred), 4) if ocr_pred else 1.0
        wer_corr = round(jiwer.wer(ref, corr_pred), 4) if corr_pred else 1.0
        cer_ocr = round(jiwer.cer(ref, ocr_pred), 4) if ocr_pred else 1.0
        cer_corr = round(jiwer.cer(ref, corr_pred), 4) if corr_pred else 1.0

        rows.append({
            "id": fid,
            "status": "success",
            "wer_ocr": wer_ocr,
            "wer_corrected": wer_corr,
            "cer_ocr": cer_ocr,
            "cer_corrected": cer_corr,
            "corrections": [
                {
                    "section": c.section,
                    "original": c.original,
                    "corrected": c.corrected,
                    "score": c.score,
                    "flag_category": _flag_attention_category(c.original, c.corrected),
                }
                for c in nlp_res.corrections
            ],
        })

    readable = [r for r in rows if r["status"] == "success"]
    clean_ids = {"clear_label", "allergen_statement", "glare_label", "small_print_label"}
    clean_rows = [r for r in readable if r["id"] in clean_ids]

    return {
        "fixtures": rows,
        "mean_wer_ocr_all": round(sum(r["wer_ocr"] for r in readable) / len(readable), 4) if readable else 0.0,
        "mean_wer_corrected_all": round(sum(r["wer_corrected"] for r in readable) / len(readable), 4) if readable else 0.0,
        "mean_wer_ocr_clean": round(sum(r["wer_ocr"] for r in clean_rows) / len(clean_rows), 4) if clean_rows else 0.0,
        "mean_wer_corrected_clean": round(sum(r["wer_corrected"] for r in clean_rows) / len(clean_rows), 4) if clean_rows else 0.0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate text correction quality.")
    parser.add_argument("--parquet", type=Path, default=DATA_DIR / "text_set.parquet")
    parser.add_argument("--manifest", type=Path, default=DATA_DIR / "label_fixtures" / "manifest.json")
    parser.add_argument("--output", type=Path, default=DATA_DIR / "label_fixtures" / "mlm_qa_metrics.json")
    parser.add_argument("--samples", type=int, default=100)
    args = parser.parse_args()

    corrector = BertMLMCorrector()
    held_out = run_held_out_eval(corrector, args.parquet, sample_limit=args.samples)
    fixtures = run_fixture_wer_comparison(corrector, args.manifest)

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "model_name": corrector.model_name,
        "is_dev_fallback": corrector.is_dev_fallback,
        "held_out": held_out,
        "fixtures": fixtures,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    nm = held_out["noisy_metrics"]
    print("\n=== Text Correction Evaluation Summary ===")
    print(f"Checkpoint      : {corrector.model_name} (dev_fallback={corrector.is_dev_fallback})")
    print(f"Held-out N      : {held_out['samples_evaluated']} (split=='test')")
    print(
        f"Noisy Correction: Precision={nm['precision_pct']}% | Recall={nm['recall_pct']}% | "
        f"F1={nm['f1_pct']}% | Broken clean words={nm['broken_words_rate_pct']}%"
    )
    print(f"Clean False-Edit: {held_out['clean_false_corrections']}/{held_out['clean_words_total']} ({held_out['clean_false_correction_rate_pct']}%)")
    print(f"Held-out WER    : {held_out['held_out_wer_before']:.4f} (noisy) -> {held_out['held_out_wer_after']:.4f} (corrected)")
    print(f"Held-out CER    : {held_out['held_out_cer_before']:.4f} (noisy) -> {held_out['held_out_cer_after']:.4f} (corrected)")
    print(f"Fixture Mean WER: {fixtures['mean_wer_ocr_all']:.4f} (OCR) -> {fixtures['mean_wer_corrected_all']:.4f} (OCR+MLM)")
    print(f"Saved report    : {args.output}\n")


if __name__ == "__main__":
    main()
