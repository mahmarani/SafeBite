"""Curate, clean, and expand the SafeBite BIO-tagged NER dataset.

Upgrades the seed rows in ``data/gold_ner_200.jsonl`` (fixing multi-word ``I-``
continuations, non-dairy ``cocoa butter``, boilerplate exclusions, and allergen
boundaries) and expands with brand-split examples from ``data/text_set.parquet``
covering INGREDIENT, ADDITIVE, ALLERGEN, NUTRIENT, and QUANTITY.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Tuple

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]

from backend.data.load import assign_brand_split
from backend.services.language.ner_labels import LABELS, validate_bio_sequence

DATASET_VERSION = "1.0.0"

# Longest-match phrase dictionaries (lowercased, whitespace-tokenized)
ADDITIVE_PHRASES = {
    "mono and diglycerides", "mono- and diglycerides", "sodium acid pyrophosphate",
    "monosodium glutamate", "monocalcium phosphate", "disodium guanylate",
    "disodium inosinate", "dipotassium phosphate", "potassium sorbate",
    "sodium benzoate", "sodium nitrite", "sodium nitrate", "sodium bicarbonate",
    "sodium carbonate", "sodium citrate", "sodium alginate", "calcium carbonate",
    "calcium chloride", "calcium phosphate", "citric acid", "ascorbic acid",
    "sorbic acid", "malic acid", "lactic acid", "phosphoric acid", "acetic acid",
    "tartaric acid", "soy lecithin", "soya lecithin", "sunflower lecithin",
    "lecithin", "lecithins", "xanthan gum", "guar gum", "arabic gum",
    "gum arabic", "locust bean gum", "gellan gum", "carrageenan", "pectin",
    "maltodextrin", "dextrose", "modified corn starch", "modified starch",
    "baking powder", "baking soda", "tocopherols", "mixed tocopherols",
    "natural flavor", "natural flavors", "natural flavour", "natural flavouring",
    "artificial flavor", "artificial flavors", "beta carotene", "carotenes",
    "annatto", "turmeric extract", "paprika extract", "plain caramel",
    "caramel color", "caramel colour", "titanium dioxide", "silicon dioxide",
    "cellulose", "carboxymethylcellulose", "polysorbate 80", "polysorbate 60",
    "potassium chloride", "magnesium stearate", "niacinamide", "riboflavin",
    "thiamine mononitrate", "folic acid", "reduced iron", "ferrous sulfate",
    "tartrazine", "sunset yellow fcf", "carmoisine", "curcumin", "msg",
}

ALLERGEN_PHRASES = {
    "skim milk powder", "skimmed milk powder", "whole milk powder",
    "nonfat dry milk", "buttermilk powder", "whey powder", "sweet whey powder",
    "whey protein concentrate", "whey protein isolate", "milk protein",
    "milk solids", "milk fat", "butter oil", "clarified butter", "milk",
    "whey", "cream", "butter", "cheese", "yogurt", "casein", "caseinates",
    "lactose", "dairy",
    "enriched wheat flour", "unbleached wheat flour", "whole wheat flour",
    "malted barley flour", "wheat flour", "wheat starch", "wheat gluten",
    "wheat germ", "wheat bran", "durum wheat", "wheat", "barley", "rye",
    "spelt", "kamut", "gluten",
    "soybean oil", "soy protein", "soy flour", "soybeans", "soybean", "soy",
    "soya", "tofu", "edamame",
    "peanut butter", "peanut oil", "peanut flour", "peanuts", "peanut",
    "tree nuts", "brazil nuts", "pine nuts", "macadamia nuts", "hazelnuts",
    "hazelnut", "almonds", "almond", "walnuts", "walnut", "cashews", "cashew",
    "pecans", "pecan", "pistachios", "pistachio", "nuts",
    "egg whites", "egg white", "egg yolk", "egg yolks", "whole eggs",
    "dried egg", "eggs", "egg",
    "sesame seeds", "sesame oil", "sesame paste", "tahini", "sesame",
    "mustard seeds", "mustard seed", "mustard flour", "mustard",
    "fish", "anchovies", "cod", "salmon", "tuna", "shellfish", "shrimp",
    "crab", "lobster", "crustaceans", "molluscs", "mollusks",
    "celery", "lupin", "sulfites", "sulphites", "sulfur dioxide",
}

# Explicit non-allergen compound ingredients that contain allergen-like words
NON_ALLERGEN_INGREDIENTS = {
    "cocoa butter", "shea butter", "coconut oil", "coconut milk", "coconut cream",
    "coconut flour", "coconut", "butternut squash", "nutmeg", "water chestnut",
    "eggplant",
}

NUTRIENT_PHRASES = {
    "total fat", "saturated fat", "trans fat", "monounsaturated fat",
    "polyunsaturated fat", "unsaturated fat", "total carbohydrate",
    "total carbohydrates", "carbohydrates", "carbohydrate", "dietary fiber",
    "dietary fibre", "soluble fiber", "fiber", "fibre", "total sugars",
    "added sugars", "sugars", "sugar", "calories", "energy", "cholesterol",
    "sodium", "salt", "protein", "proteins", "calcium", "iron", "potassium",
    "vitamin a", "vitamin c", "vitamin d", "vitamin d2", "vitamin d3",
    "vitamin e", "vitamin b6", "vitamin b12",
}

BOILERPLATE_PHRASES = [
    ["may", "contain", "traces", "of"],
    ["contains", "traces", "of"],
    ["may", "contain"],
    ["traces", "of"],
    ["nutrition", "facts"],
    ["nutritional", "information"],
    ["serving", "size"],
    ["per", "serving"],
    ["daily", "value"],
    ["allergen", "advice"],
    ["allergen", "info"],
    ["ingredient", "list"],
    ["ingredients"],
    ["contains"],
    ["allergens"],
    ["allergen"],
    ["distributed", "by"],
    ["manufactured", "by"],
    ["manufactured", "for"],
    ["made", "from"],
    ["other"],
]

STOP_TOKENS = {
    ",", ";", ".", ":", "(", ")", "[", "]", "&", "/", "-", "–", "—",
    "and", "or", "of", "with", "from", "in", "as", "to", "for", "by",
    "less", "than", "contains", "contain", "may", "traces", "percent",
}

_UNIT_TOKENS = {"%", "g", "mg", "mcg", "ug", "ml", "l", "kg", "kcal", "kj", "oz"}
_ATTACHED_QTY_RE = re.compile(r"^\d+(?:[.,]\d+)?(?:%|g|mg|mcg|ug|ml|l|kg|kcal|kj|oz)?$", re.IGNORECASE)
_E_NUMBER_RE = re.compile(r"^e\d{3,4}[a-z]?$", re.IGNORECASE)
_NUM_RE = re.compile(r"^\d+(?:[.,]\d+)?$")


def tokenize_label_text(text: str) -> List[str]:
    """Whitespace-and-punctuation tokenizer preserving units and E-numbers."""
    return re.findall(r"\d+(?:\.\d+)?(?:%|g|mg|mcg|ug|ml|l|kg|kcal|kj|oz)?|[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?|[^\w\s]", text)


def annotate_tokens(tokens: List[str], section: str = "ingredients") -> List[str]:
    """Deterministically assign valid BIO tags aligned with annotation guidelines."""
    n = len(tokens)
    labels = ["O"] * n
    lower = [t.lower() for t in tokens]
    i = 0

    def _mark_span(start: int, length: int, entity: str) -> None:
        labels[start] = f"B-{entity}"
        for k in range(start + 1, start + length):
            labels[k] = f"I-{entity}"

    while i < n:
        tok = tokens[i]
        low = lower[i]

        # 1. Punctuation / stop tokens
        if not any(c.isalnum() for c in tok) and tok != "%":
            i += 1
            continue

        # 2. Boilerplate multi-word prefixes (always O)
        matched_boiler = False
        for bp in BOILERPLATE_PHRASES:
            blen = len(bp)
            if i + blen <= n and lower[i : i + blen] == bp:
                i += blen
                matched_boiler = True
                break
        if matched_boiler:
            continue

        # 3. Quantities (number + optional unit token, or attached '150mg' / '73%')
        if _NUM_RE.match(tok):
            if i + 1 < n and lower[i + 1] in _UNIT_TOKENS:
                _mark_span(i, 2, "QUANTITY")
                i += 2
                continue
            _mark_span(i, 1, "QUANTITY")
            i += 1
            continue
        if _ATTACHED_QTY_RE.match(tok) and any(c.isdigit() for c in tok):
            _mark_span(i, 1, "QUANTITY")
            i += 1
            continue

        # 4. E-numbers (e330, e 330, e150a)
        if _E_NUMBER_RE.match(tok):
            _mark_span(i, 1, "ADDITIVE")
            i += 1
            continue
        if low == "e" and i + 1 < n and re.match(r"^\d{3,4}[a-z]?$", lower[i + 1]):
            _mark_span(i, 2, "ADDITIVE")
            i += 2
            continue

        # 5. Nutrition-panel nutrients (longest match first)
        if section == "nutrition":
            matched_nutr = False
            for length in (3, 2, 1):
                if i + length <= n:
                    phrase = " ".join(lower[i : i + length])
                    if phrase in NUTRIENT_PHRASES:
                        _mark_span(i, length, "NUTRIENT")
                        i += length
                        matched_nutr = True
                        break
            if matched_nutr:
                continue

        # 6. Non-allergen compound ingredients (e.g. cocoa butter, coconut oil)
        matched_non_allergen = False
        for length in (3, 2):
            if i + length <= n:
                phrase = " ".join(lower[i : i + length])
                if phrase in NON_ALLERGEN_INGREDIENTS:
                    _mark_span(i, length, "INGREDIENT")
                    i += length
                    matched_non_allergen = True
                    break
        if matched_non_allergen:
            continue

        # 7. Additives (longest match first)
        matched_add = False
        for length in (4, 3, 2, 1):
            if i + length <= n:
                phrase = " ".join(lower[i : i + length])
                if phrase in ADDITIVE_PHRASES:
                    _mark_span(i, length, "ADDITIVE")
                    i += length
                    matched_add = True
                    break
        if matched_add:
            continue

        # 8. Allergens (longest match first)
        matched_allergen = False
        for length in (3, 2, 1):
            if i + length <= n:
                phrase = " ".join(lower[i : i + length])
                if phrase in ALLERGEN_PHRASES:
                    _mark_span(i, length, "ALLERGEN")
                    i += length
                    matched_allergen = True
                    break
        if matched_allergen:
            continue

        # 9. Stop words
        if low in STOP_TOKENS:
            i += 1
            continue

        # 10. Remaining ingredient tokens grouped into contiguous B-INGREDIENT I-INGREDIENT* spans
        if section in ("ingredients", "allergens") and any(c.isalpha() for c in tok):
            span_end = i + 1
            while span_end < n:
                nxt_tok = tokens[span_end]
                nxt_low = lower[span_end]
                if not any(c.isalpha() for c in nxt_tok):
                    break
                if nxt_low in STOP_TOKENS or _NUM_RE.match(nxt_tok) or _ATTACHED_QTY_RE.match(nxt_tok):
                    break
                # Stop if next token starts a known boilerplate, additive, or allergen phrase
                if any(lower[span_end : span_end + len(bp)] == bp for bp in BOILERPLATE_PHRASES if span_end + len(bp) <= n):
                    break
                if any(" ".join(lower[span_end : span_end + l]) in ADDITIVE_PHRASES for l in (3, 2, 1) if span_end + l <= n):
                    break
                if any(" ".join(lower[span_end : span_end + l]) in ALLERGEN_PHRASES for l in (3, 2, 1) if span_end + l <= n):
                    break
                span_end += 1
            _mark_span(i, span_end - i, "INGREDIENT")
            i = span_end
            continue

        i += 1

    validate_bio_sequence(labels)
    return labels


def _norm_key(text: str) -> str:
    return re.sub(r"\s+", "", text.lower())


def _format_nutrition_snippet(row: pd.Series) -> str | None:
    """Create a realistic multi-nutrient label snippet from Open Food Facts 100g columns."""
    parts = ["Nutrition Facts"]
    field_map = [
        ("energy-kcal_100g", "Calories", "kcal"),
        ("fat_100g", "Total Fat", "g"),
        ("saturated-fat_100g", "Saturated Fat", "g"),
        ("carbohydrates_100g", "Total Carbohydrates", "g"),
        ("fiber_100g", "Dietary Fiber", "g"),
        ("sugars_100g", "Total Sugars", "g"),
        ("proteins_100g", "Protein", "g"),
        ("sodium_100g", "Sodium", "mg"),
    ]
    added = 0
    for col, label, unit in field_map:
        val = row.get(col)
        if pd.isna(val) or str(val).strip() == "":
            continue
        try:
            num = float(val)
        except ValueError:
            continue
        if col == "sodium_100g":
            num = round(num * 1000.0, 1)
        else:
            num = round(num, 1)
        num_str = str(int(num)) if num == int(num) else str(num)
        parts.append(f"{label} {num_str} {unit}")
        added += 1
    if added < 2:
        return None
    return " ".join(parts)


def build_curated_dataset(
    seed_jsonl: Path = ROOT / "data" / "assets" / "gold_ner_200.jsonl",
    parquet_path: Path = ROOT / "data" / "assets" / "text_set.parquet",
    output_jsonl: Path = ROOT / "data" / "assets" / "gold_ner_200.jsonl",
    output_csv: Path = ROOT / "data" / "assets" / "gold_ner_200.csv",
    metadata_path: Path = ROOT / "data" / "assets" / "gold_ner_metadata.json",
) -> Dict[str, Any]:
    df = pd.read_parquet(parquet_path)

    # Map normalized ingredient text to brand & split from text_set.parquet
    norm_lookup: Dict[str, Tuple[str, str, str]] = {}
    for _, row in df.iterrows():
        txt = str(row.get("ingredients_text", "")).strip()
        if not txt:
            continue
        k = _norm_key(txt)
        if k not in norm_lookup:
            brand = str(row.get("brands", "")).strip() if pd.notna(row.get("brands")) else ""
            code = str(row.get("code", "")).strip()
            split = str(row.get("split", "train"))
            norm_lookup[k] = (brand, code, split)

    records: List[Dict[str, Any]] = []
    seen_texts: set[str] = set()

    # 1. Clean and preserve seed rows
    if seed_jsonl.exists():
        seed_rows = [
            json.loads(line)
            for line in seed_jsonl.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        for row in seed_rows:
            src = row.get("source", "ingredients_text")
            tokens = list(row.get("tokens") or tokenize_label_text(row["text"]))
            text = row.get("text", " ".join(tokens))
            if "nutrition" in src:
                section = "nutrition"
            elif "allergen" in src:
                section = "allergens"
            else:
                section = row.get("section") or "ingredients"
            bio_labels = annotate_tokens(tokens, section=section)

            k = _norm_key(text)
            if k in norm_lookup:
                brand, code, split = norm_lookup[k]
            else:
                brand = row.get("brand", "")
                code = f"seed_{row.get('sample_id', len(records))}"
                split = row.get("split") or assign_brand_split(brand, code)

            if k in seen_texts:
                continue
            seen_texts.add(k)
            records.append({
                "sample_id": len(records) + 1,
                "source": src,
                "section": section,
                "split": split,
                "brand": brand,
                "product_code": code,
                "text": text,
                "tokens": tokens,
                "bio_labels": bio_labels,
            })

    # 2. Expand with brand-separated ingredient/additive/allergen rows from text_set.parquet
    ascii_df = df[df["ingredients_text"].fillna("").apply(lambda x: x.isascii() and 25 <= len(x) <= 350)]
    target_per_split = {"train": 220, "val": 30, "test": 30}
    for split_name, quota in target_per_split.items():
        subset = ascii_df[ascii_df["split"] == split_name]
        # Prioritize rows containing additives or allergens for balanced entity coverage
        rich = subset[
            (subset["additives_en"].fillna("").str.len() > 0)
            | (subset["allergens_en"].fillna("").str.len() > 0)
        ]
        pool = pd.concat([rich, subset]).drop_duplicates(subset=["code"])
        added = 0
        for _, row in pool.iterrows():
            if added >= quota:
                break
            raw_text = str(row["ingredients_text"]).strip()
            k = _norm_key(raw_text)
            if k in seen_texts:
                continue
            tokens = tokenize_label_text(raw_text)
            if len(tokens) < 4 or len(tokens) > 96:
                continue
            bio_labels = annotate_tokens(tokens, section="ingredients")
            seen_texts.add(k)
            brand = str(row.get("brands", "")).strip() if pd.notna(row.get("brands")) else ""
            code = str(row.get("code", ""))
            records.append({
                "sample_id": len(records) + 1,
                "source": "ingredients_text_curated",
                "section": "ingredients",
                "split": split_name,
                "brand": brand,
                "product_code": code,
                "text": " ".join(tokens),
                "tokens": tokens,
                "bio_labels": bio_labels,
            })
            added += 1

    # 3. Expand with multi-nutrient Nutrition Facts panels from OFF 100g columns (brand-separated)
    nutr_quotas = {"train": 80, "val": 15, "test": 15}
    for split_name, quota in nutr_quotas.items():
        subset = ascii_df[ascii_df["split"] == split_name]
        added = 0
        for _, row in subset.iterrows():
            if added >= quota:
                break
            snippet = _format_nutrition_snippet(row)
            if not snippet:
                continue
            k = _norm_key(snippet)
            if k in seen_texts:
                continue
            tokens = tokenize_label_text(snippet)
            bio_labels = annotate_tokens(tokens, section="nutrition")
            seen_texts.add(k)
            brand = str(row.get("brands", "")).strip() if pd.notna(row.get("brands")) else ""
            code = str(row.get("code", ""))
            records.append({
                "sample_id": len(records) + 1,
                "source": "nutrition_panel_curated",
                "section": "nutrition",
                "split": split_name,
                "brand": brand,
                "product_code": code,
                "text": " ".join(tokens),
                "tokens": tokens,
                "bio_labels": bio_labels,
            })
            added += 1

    # 4. Add representative explicit allergen statements across splits (brand-hashed by statement key)
    allergen_templates = [
        ("Contains: milk, wheat.", "train"),
        ("Contains: soy, peanuts, tree nuts.", "train"),
        ("May contain traces of hazelnuts, almonds, milk, and soy.", "train"),
        ("Contains: wheat, eggs, milk.", "train"),
        ("May contain traces of sesame seeds and mustard.", "train"),
        ("Allergens: fish, crustaceans, celery.", "train"),
        ("Contains: barley, sesame oil.", "val"),
        ("May contain traces of walnuts and pecans.", "val"),
        ("Contains: milk, soy lecithin.", "test"),
        ("May contain traces of peanuts, wheat, and eggs.", "test"),
    ]
    for stmt, split_name in allergen_templates:
        k = _norm_key(stmt)
        if k in seen_texts:
            continue
        seen_texts.add(k)
        tokens = tokenize_label_text(stmt)
        bio_labels = annotate_tokens(tokens, section="allergens")
        records.append({
            "sample_id": len(records) + 1,
            "source": "allergen_statement_curated",
            "section": "allergens",
            "split": split_name,
            "brand": "",
            "product_code": f"allergen_{len(records) + 1}",
            "text": " ".join(tokens),
            "tokens": tokens,
            "bio_labels": bio_labels,
        })

    # Write JSONL
    output_jsonl.parent.mkdir(parents=True, exist_ok=True)
    with output_jsonl.open("w", encoding="utf-8") as fh:
        for r in records:
            validate_bio_sequence(r["bio_labels"])
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    # Write CSV mirror
    with output_csv.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["sample_id", "source", "section", "split", "brand", "text", "tokens", "bio_labels"])
        for r in records:
            writer.writerow([
                r["sample_id"],
                r["source"],
                r["section"],
                r["split"],
                r["brand"],
                r["text"],
                " ".join(r["tokens"]),
                " ".join(r["bio_labels"]),
            ])

    split_counts = Counter(r["split"] for r in records)
    label_counts = Counter(lbl for r in records for lbl in r["bio_labels"])
    sha256 = hashlib.sha256(output_jsonl.read_bytes()).hexdigest()

    metadata = {
        "dataset_version": DATASET_VERSION,
        "jsonl_path": str(output_jsonl.relative_to(ROOT)),
        "sha256": sha256,
        "total_rows": len(records),
        "splits": dict(split_counts),
        "labels": list(LABELS),
        "label_counts": {lbl: label_counts.get(lbl, 0) for lbl in LABELS},
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build curated BIO-tagged NER dataset.")
    parser.add_argument("--seed", type=Path, default=ROOT / "data" / "assets" / "gold_ner_200.jsonl")
    parser.add_argument("--parquet", type=Path, default=ROOT / "data" / "assets" / "text_set.parquet")
    parser.add_argument("--output-jsonl", type=Path, default=ROOT / "data" / "assets" / "gold_ner_200.jsonl")
    parser.add_argument("--output-csv", type=Path, default=ROOT / "data" / "assets" / "gold_ner_200.csv")
    parser.add_argument("--metadata", type=Path, default=ROOT / "data" / "assets" / "gold_ner_metadata.json")
    args = parser.parse_args()

    meta = build_curated_dataset(
        seed_jsonl=args.seed,
        parquet_path=args.parquet,
        output_jsonl=args.output_jsonl,
        output_csv=args.output_csv,
        metadata_path=args.metadata,
    )
    print(json.dumps(meta, indent=2))
