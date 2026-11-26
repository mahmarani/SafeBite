"""Deterministic, evidence-linked food-label risk rules engine.

Evaluates normalized ingredients/allergens/additives and parsed per-100g
nutrients against versioned regulatory thresholds in ``kb/thresholds.json``.
Every warning carries its rule ID, source field, evidence, value/basis/cutoff,
and confidence. Missing or ambiguous values remain ``unknown``.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Any, Dict, List, Literal, Optional, Sequence

from backend.api.contracts import ExtractedEntity, NormalizationRecord, ParsedNutrient, RiskWarning
from backend.services.food.nutrition import ParsedNutrientRecord, parse_nutrition_section
from backend.services.ingredients.ingredients import normalize_ingredient

THRESHOLDS_PATH = Path(__file__).with_name("thresholds.json")

# Major allergens matched deterministically after non-allergen exclusions
CANONICAL_ALLERGENS: Dict[str, str] = {
    "milk": "milk",
    "whey": "milk",
    "whey powder": "milk",
    "skim milk": "milk",
    "skim milk powder": "milk",
    "nonfat dry milk": "milk",
    "whole milk powder": "milk",
    "butter": "milk",
    "cheese": "milk",
    "cream": "milk",
    "yogurt": "milk",
    "casein": "milk",
    "lactose": "milk",
    "wheat": "wheat",
    "wheat flour": "wheat",
    "enriched wheat flour": "wheat",
    "unbleached wheat flour": "wheat",
    "gluten": "gluten",
    "barley": "gluten",
    "rye": "gluten",
    "soy": "soy",
    "soya": "soy",
    "soybean": "soy",
    "soybeans": "soy",
    "soybean oil": "soy",
    "soy lecithin": "soy",
    "peanut": "peanut",
    "peanuts": "peanut",
    "peanut butter": "peanut",
    "dry roasted peanuts": "peanut",
    "hazelnut": "tree nuts",
    "hazelnuts": "tree nuts",
    "almond": "tree nuts",
    "almonds": "tree nuts",
    "walnut": "tree nuts",
    "walnuts": "tree nuts",
    "cashew": "tree nuts",
    "cashews": "tree nuts",
    "pecan": "tree nuts",
    "pecans": "tree nuts",
    "pistachio": "tree nuts",
    "tree nuts": "tree nuts",
    "egg": "egg",
    "eggs": "egg",
    "egg white": "egg",
    "fish": "fish",
    "salmon": "fish",
    "tuna": "fish",
    "shrimp": "crustaceans",
    "crustaceans": "crustaceans",
    "shellfish": "crustaceans",
    "sesame": "sesame",
    "sesame oil": "sesame",
    "sesame seeds": "sesame",
    "mustard": "mustard",
    "celery": "celery",
    "lupin": "lupin",
    "sulfites": "sulfites",
    "sulphites": "sulfites",
}

NON_ALLERGEN_EXCLUSIONS = {
    "cocoa butter",
    "shea butter",
    "coconut",
    "coconut oil",
    "coconut milk",
    "nutmeg",
    "butternut squash",
}


@dataclass(frozen=True)
class RiskEvaluationResult:
    """Complete risk evaluation output ready for PipelineResult."""

    normalizations: List[NormalizationRecord]
    parsed_nutrients: Dict[str, ParsedNutrient]
    nutrient_levels: Dict[str, Literal["low", "moderate", "high", "unknown"]]
    risk_warnings: List[RiskWarning]
    detected_allergens: List[str]
    detected_additives: List[str]


def load_thresholds(path: Path = THRESHOLDS_PATH) -> Dict[str, Dict[str, Any]]:
    """Load enabled production rules from ``kb/thresholds.json``."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    rules: Dict[str, Dict[str, Any]] = {}
    for item in payload.get("thresholds", []):
        if not item.get("enabled", True):
            continue
        cutoffs = item.get("cutoffs", {})
        if any(cutoffs.get(k) is None for k in ("low_max", "medium_max", "high_min")):
            raise ValueError(f"Enabled rule {item.get('rule_id')} contains null cutoff.")
        rules[item["nutrient"]] = item
    return rules


def normalize_extracted_entities(
    entities: Sequence[ExtractedEntity],
    min_confidence: float = 0.65,
) -> List[NormalizationRecord]:
    """Keep only confident known ingredient/additive/allergen entity names."""
    records: List[NormalizationRecord] = []
    for ent in entities:
        if ent.entity_type not in ("INGREDIENT", "ADDITIVE", "ALLERGEN"):
            continue
        if ent.confidence < min_confidence:
            continue
        try:
            norm = normalize_ingredient(ent.text)
            # Unknown names pass through the normalizer unchanged. Discard these
            # uncertain spans instead of treating arbitrary OCR/NER text as canonical.
            if norm.canonical == ent.text.strip().casefold():
                from backend.services.ingredients.ingredients import load_synonym_index
                known = set(load_synonym_index())
                if norm.canonical not in known:
                    continue
            records.append(NormalizationRecord(original=norm.original, canonical=norm.canonical))
        except ValueError:
            continue
    return records


def _classify_nutrient(
    parsed: ParsedNutrientRecord,
    rule: Dict[str, Any],
) -> tuple[Literal["low", "moderate", "high", "unknown"], Optional[RiskWarning]]:
    rule_id = str(rule["rule_id"])
    cutoffs = rule["cutoffs"]
    low_max = float(cutoffs["low_max"])
    medium_max = float(cutoffs["medium_max"])

    if parsed.status != "known" or parsed.value_per_100g is None:
        reason = parsed.reason or "missing_or_ambiguous_value"
        return "unknown", RiskWarning(
            rule_id=f"{rule_id}-UNKNOWN",
            category="missing_data",
            level="unknown",
            source_field=parsed.source_field,
            nutrient=parsed.nutrient,
            value=parsed.value,
            unit=parsed.unit,
            basis=parsed.basis,
            threshold=None,
            confidence=parsed.confidence,
            evidence=parsed.raw_text or None,
            message=f"{parsed.nutrient} could not be evaluated against per-100g thresholds ({reason}).",
        )

    val = parsed.value_per_100g
    unit = str(rule["unit"])
    if val <= low_max:
        return "low", None

    if val <= medium_max:
        return "moderate", RiskWarning(
            rule_id=f"{rule_id}-MODERATE",
            category="nutrient_threshold",
            level="moderate",
            source_field=parsed.source_field,
            nutrient=parsed.nutrient,
            value=val,
            unit=unit,
            basis="per_100g",
            threshold=low_max,
            confidence=parsed.confidence,
            evidence=parsed.raw_text,
            message=(
                f"{parsed.nutrient} is {val} {unit} per 100g "
                f"(moderate: > {low_max} and <= {medium_max} {unit}/100g per {rule_id})."
            ),
        )

    return "high", RiskWarning(
        rule_id=f"{rule_id}-HIGH",
        category="nutrient_threshold",
        level="high",
        source_field=parsed.source_field,
        nutrient=parsed.nutrient,
        value=val,
        unit=unit,
        basis="per_100g",
        threshold=medium_max,
        confidence=parsed.confidence,
        evidence=parsed.raw_text,
        message=(
            f"{parsed.nutrient} is {val} {unit} per 100g "
            f"(high: > {medium_max} {unit}/100g per {rule_id})."
        ),
    )


def evaluate_risk_rules(
    sections: Dict[str, str],
    entities: Sequence[ExtractedEntity],
    *,
    thresholds_path: Path = THRESHOLDS_PATH,
) -> RiskEvaluationResult:
    """Run deterministic normalization, nutrient conversion, and explainable risk rules."""
    rules = load_thresholds(thresholds_path)
    normalizations = normalize_extracted_entities(entities)

    nutrition_text = sections.get("nutrition") or ""
    nutrition_entities = [e for e in entities if e.section == "nutrition"]
    parsed_map = parse_nutrition_section(nutrition_text, nutrition_entities)

    api_parsed: Dict[str, ParsedNutrient] = {}
    nutrient_levels: Dict[str, Literal["low", "moderate", "high", "unknown"]] = {}
    warnings: List[RiskWarning] = []

    for nutrient_key, rec in parsed_map.items():
        api_parsed[nutrient_key] = ParsedNutrient(
            nutrient=rec.nutrient,
            status=rec.status,
            value=rec.value,
            unit=rec.unit,
            basis=rec.basis,
            value_per_100g=rec.value_per_100g,
            source_field=rec.source_field,
            raw_text=rec.raw_text,
            confidence=rec.confidence,
            reason=rec.reason,
        )
        if nutrient_key in rules:
            level, warn = _classify_nutrient(rec, rules[nutrient_key])
            nutrient_levels[nutrient_key] = level
            if warn is not None:
                warnings.append(warn)

    # Deterministic allergen checks: NER ALLERGEN entities + dictionary fallback on ingredients/allergens
    seen_allergens: Dict[str, tuple[str, float, str]] = {}

    for ent in entities:
        if ent.entity_type != "ALLERGEN":
            continue
        try:
            canon = normalize_ingredient(ent.text).canonical
        except ValueError:
            continue
        if canon in NON_ALLERGEN_EXCLUSIONS:
            continue
        group = CANONICAL_ALLERGENS.get(canon)
        if group is None:
            for term, mapped in CANONICAL_ALLERGENS.items():
                if re.search(rf"\b{re.escape(term)}\b", canon):
                    group = mapped
                    break
        if group is None:
            if ent.section == "allergens":
                group = canon
            else:
                continue
        src = ent.section or "ingredients"
        prev = seen_allergens.get(group)
        if prev is None or ent.confidence > prev[1]:
            seen_allergens[group] = (src, ent.confidence, ent.text)

    # Fallback lexical scan for major allergens (e.g. peanuts/milk/soy) inside ingredients & allergens sections
    for sec_name in ("allergens", "ingredients"):
        sec_text = (sections.get(sec_name) or "").lower()
        if not sec_text:
            continue
        masked_text = sec_text
        for excl in NON_ALLERGEN_EXCLUSIONS:
            masked_text = masked_text.replace(excl, " ")
        for term, group in CANONICAL_ALLERGENS.items():
            if re.search(rf"\b{re.escape(term)}\b", masked_text):
                if group not in seen_allergens:
                    seen_allergens[group] = (sec_name, 1.0, term)

    detected_allergens = sorted(seen_allergens)
    for allergen in detected_allergens:
        src, conf, evidence = seen_allergens[allergen]
        warnings.append(
            RiskWarning(
                rule_id=f"ALLERGEN-{allergen.upper().replace(' ', '_')}",
                category="allergen",
                level="high",
                source_field=src,
                nutrient=None,
                value=None,
                unit=None,
                basis=None,
                threshold=None,
                confidence=round(conf, 4),
                evidence=evidence,
                message=f"Potential allergen detected ({allergen}) from {src} text ('{evidence}').",
            )
        )

    # Additives summary from NER ADDITIVE entities
    seen_additives: Dict[str, tuple[str, float, str]] = {}
    for ent in entities:
        if ent.entity_type != "ADDITIVE":
            continue
        try:
            canon = normalize_ingredient(ent.text).canonical
        except ValueError:
            continue
        src = ent.section or "ingredients"
        prev = seen_additives.get(canon)
        if prev is None or ent.confidence > prev[1]:
            seen_additives[canon] = (src, ent.confidence, ent.text)

    detected_additives = sorted(seen_additives)
    for additive in detected_additives:
        src, conf, evidence = seen_additives[additive]
        warnings.append(
            RiskWarning(
                rule_id="ADDITIVE-DETECTED",
                category="additive",
                level="info",
                source_field=src,
                nutrient=None,
                value=None,
                unit=None,
                basis=None,
                threshold=None,
                confidence=round(conf, 4),
                evidence=evidence,
                message=f"Food additive detected ({additive}) in {src} text ('{evidence}').",
            )
        )

    return RiskEvaluationResult(
        normalizations=normalizations,
        parsed_nutrients=api_parsed,
        nutrient_levels=nutrient_levels,
        risk_warnings=warnings,
        detected_allergens=detected_allergens,
        detected_additives=detected_additives,
    )
