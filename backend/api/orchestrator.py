"""End-to-end SafeBite analysis orchestrator.

Converts intermediate Milestones 1-5 artifacts into the frontend-facing
``ProductAnalysis`` response with extraction confidence, full evidence links,
and explicit ``unknown``/``None`` handling when nutrition or metadata is absent.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Dict, List, Optional, Sequence

from backend.api.contracts import (
    AnalysisEvidence,
    CorrectionRecord,
    ExtractedEntity,
    HealthGrade,
    IngredientItem,
    NutritionalInfo,
    OcrBlock,
    ProductAnalysis,
    ProductCategory,
)
from backend.services.food.kmeans_scoring import (
    predict_nutriscore_kmeans,
    predict_processing_tier_kmeans,
)
from backend.services.food.nutrition import detect_nutrition_basis, extract_display_nutrition_fields
from backend.services.food.risk_engine import CANONICAL_ALLERGENS, RiskEvaluationResult
from backend.services.ingredients.ingredients import load_synonym_index, normalize_ingredient

VALID_CATEGORIES = {
    "Breakfast & Cereal",
    "Spreads & Condiments",
    "Snacks & Bars",
    "Beverages",
    "Dairy & Alternatives",
    "Pantry Staples",
}

# These are label headings, nutrition fields, or connective prose that can be
# misclassified as ingredients when OCR blocks from adjacent sections overlap.
NON_INGREDIENT_LABEL_RE = re.compile(
    r"^(?:daily\s+values?|percent(?:age)?|calories?|calorie\s+needs?|"
    r"sat(?:urated)?\s+fat|sodium|potassium|protein|carbohydrates?|"
    r"serving\s+size|per\s+gram)$",
    re.IGNORECASE,
)
NON_INGREDIENT_PROSE_RE = re.compile(
    r"\b(?:daily\s+values?|based\s+on|depending\s+on|your\s+calorie\s+needs)\b",
    re.IGNORECASE,
)
NON_INGREDIENT_SINGLE_WORDS = {
    "a", "an", "and", "are", "based", "by", "for", "from", "in", "of",
    "on", "or", "the", "to", "your", "percent", "calories", "sodium",
    "potassium", "protein", "fiber", "fibre", "sugar", "fat",
}
INGREDIENT_MIN_CONFIDENCE = 0.65


def _derive_product_name(product_name: Optional[str], filename: Optional[str]) -> str:
    if product_name and product_name.strip():
        return product_name.strip()[:200]
    if filename:
        stem = Path(filename).stem
        cleaned = re.sub(r"[_-]+", " ", stem).strip()
        if len(cleaned) > 2:
            return cleaned.title()[:200]
    return "Scanned Food Label"


def _resolve_category(category: Optional[str]) -> ProductCategory:
    if category and category in VALID_CATEGORIES:
        return category  # type: ignore[return-value]
    return "Pantry Staples"


def _build_ingredient_items(
    entities: Sequence[ExtractedEntity],
    detected_allergens: Sequence[str],
) -> List[IngredientItem]:
    """Convert extracted NER entities into structured IngredientItems without duplicates."""
    items: List[IngredientItem] = []
    seen_keys: set[str] = set()
    allergen_set = {a.lower() for a in detected_allergens}
    known_names = set(load_synonym_index())

    for ent in entities:
        if ent.entity_type not in ("INGREDIENT", "ADDITIVE", "ALLERGEN"):
            continue
        # Nutrition NER is useful to the risk engine, but its entities are not
        # ingredients. Only build this UI section from ingredient/allergen text.
        if ent.section not in ("ingredients", "allergens"):
            continue
        if ent.confidence < INGREDIENT_MIN_CONFIDENCE:
            continue
        try:
            canon = normalize_ingredient(ent.text).canonical
        except ValueError:
            continue

        raw_key = re.sub(r"\s+", " ", ent.text.casefold()).strip()
        if NON_INGREDIENT_LABEL_RE.fullmatch(raw_key) or NON_INGREDIENT_PROSE_RE.search(raw_key):
            continue
        if raw_key in NON_INGREDIENT_SINGLE_WORDS:
            continue

        # An unknown single food word can be a valid new ingredient (for
        # example, "potatoes"), but a confident sentence-like span is usually
        # OCR prose or label boilerplate. Keep unknown compounds out unless the
        # ingredient vocabulary recognizes them.
        if canon == raw_key and canon not in known_names:
            words = canon.split()
            if len(canon) < 3 or ent.confidence < 0.9 or len(words) > 3:
                continue

        if canon in seen_keys:
            continue
        seen_keys.add(canon)

        allergen_group = CANONICAL_ALLERGENS.get(canon)
        is_allergen = (
            (ent.entity_type == "ALLERGEN" and ent.section == "allergens")
            or (allergen_group is not None and allergen_group in allergen_set)
            or canon in allergen_set
        )
        is_additive = ent.entity_type == "ADDITIVE"

        if is_allergen:
            category = "Potential allergen"
            status = "Caution"
            origin = f"Allergen-associated ingredient · {ent.section or 'label'}"
            explanation = (
                f"Detected '{ent.text}' (normalized: '{canon}') with {round(ent.confidence * 100)}% "
                f"confidence in {ent.section or 'label'} text."
            )
            tags = [allergen_group.title() if allergen_group else canon.title()]
        elif is_additive:
            category = "Requires attention"
            status = "Caution"
            origin = f"Food additive / functional ingredient · {ent.section or 'label'}"
            explanation = (
                f"Identified additive '{ent.text}' (canonical: '{canon}') with "
                f"{round(ent.confidence * 100)}% confidence."
            )
            tags = []
        else:
            category = "Neutral"
            status = "Safe"
            origin = f"Label ingredient · {ent.section or 'ingredients'}"
            explanation = (
                f"Extracted from {ent.section or 'ingredients'} text "
                f"(normalized key: '{canon}', confidence {round(ent.confidence * 100)}%)."
            )
            tags = []

        items.append(
            IngredientItem(
                name=ent.text.strip(),
                category=category,
                status=status,
                originOrFunction=origin,
                explanation=explanation,
                allergenTags=tags,
                confidence=round(ent.confidence, 4),
                sourceSection=ent.section,
                canonicalName=canon,
            )
        )

    return items


def _compute_processing_level(
    ingredients: Sequence[IngredientItem],
    additives: Sequence[str],
) -> str:
    if not ingredients and not additives:
        return "Unknown"
    if len(additives) >= 2:
        return "Ultra-Processed"
    if len(additives) == 1 or len(ingredients) >= 5:
        return "Processed"
    return "Minimally Processed"


def _compute_health_score(
    nutrient_levels: Dict[str, str],
    additives: Sequence[str],
) -> tuple[Optional[float], str]:
    known_levels = [lvl for lvl in nutrient_levels.values() if lvl in ("low", "moderate", "high")]
    if len(known_levels) < 2:
        return None, "Unknown"

    score = 88.0
    for lvl in known_levels:
        if lvl == "high":
            score -= 16.0
        elif lvl == "moderate":
            score -= 7.0
    score -= min(15.0, len(additives) * 4.0)
    clamped = round(max(0.0, min(100.0, score)), 1)

    if clamped >= 80.0:
        return clamped, "Healthy"
    if clamped >= 60.0:
        return clamped, "Moderate"
    return clamped, "Requires attention"


def _score_to_grade(score: Optional[float]) -> Optional[HealthGrade]:
    if score is None:
        return None
    if score >= 88.0:
        return "A"
    if score >= 80.0:
        return "B"
    if score >= 65.0:
        return "C"
    if score >= 50.0:
        return "D"
    return "E"


def _level_to_tier(level: str) -> Optional[int]:
    if level == "Minimally Processed":
        return 1
    if level == "Processed":
        return 3
    if level == "Ultra-Processed":
        return 4
    return None


def _scale_optional_to_100g(
    value: Optional[float],
    basis: str,
    serving_size_g: Optional[float],
) -> Optional[float]:
    if value is None:
        return None
    if basis == "per_100g":
        return float(value)
    if basis == "per_serving" and serving_size_g is not None and serving_size_g > 0:
        return round(float(value) * (100.0 / serving_size_g), 4)
    return None


def build_product_analysis(
    *,
    scan_id: str,
    filename: Optional[str],
    product_name: Optional[str],
    brand: Optional[str],
    category: Optional[str],
    include_health_profile: bool,
    extraction_confidence: float,
    ocr_blocks: Sequence[OcrBlock],
    corrected_sections: Dict[str, str],
    corrections: Sequence[CorrectionRecord],
    entities: Sequence[ExtractedEntity],
    risk_result: RiskEvaluationResult,
) -> ProductAnalysis:
    """Assemble an evidence-preserving ProductAnalysis from Milestones 1-5 outputs."""
    nutrition_text = corrected_sections.get("nutrition") or ""
    basis, serving_size_g = detect_nutrition_basis(nutrition_text)
    extra_fields = extract_display_nutrition_fields(nutrition_text)

    parsed = risk_result.parsed_nutrients
    nutrition = NutritionalInfo(
        servingSize=str(extra_fields.get("servingSize") or "Unknown"),
        calories=extra_fields.get("calories"),  # type: ignore[arg-type]
        totalFatG=parsed["total_fat_g"].value if "total_fat_g" in parsed else None,
        saturatedFatG=parsed["saturated_fat_g"].value if "saturated_fat_g" in parsed else None,
        carbohydratesG=extra_fields.get("carbohydratesG"),  # type: ignore[arg-type]
        fiberG=extra_fields.get("fiberG"),  # type: ignore[arg-type]
        sugarG=parsed["sugars_g"].value if "sugars_g" in parsed else None,
        addedSugarG=extra_fields.get("addedSugarG"),  # type: ignore[arg-type]
        proteinG=extra_fields.get("proteinG"),  # type: ignore[arg-type]
        sodiumMg=parsed["sodium_mg"].value if "sodium_mg" in parsed else None,
    )

    ingredient_items = _build_ingredient_items(entities, risk_result.detected_allergens)
    formatted_allergens = [a.title() for a in risk_result.detected_allergens]

    # Per-100g features for K-Means Nutri-Score & Processing Tier prediction
    kcal_100g = _scale_optional_to_100g(nutrition.calories, basis, serving_size_g)
    fiber_100g = _scale_optional_to_100g(nutrition.fiberG, basis, serving_size_g) or 0.0
    protein_100g = _scale_optional_to_100g(nutrition.proteinG, basis, serving_size_g) or 0.0
    fat_100g = parsed["total_fat_g"].value_per_100g if "total_fat_g" in parsed else None
    sat_fat_100g = parsed["saturated_fat_g"].value_per_100g if "saturated_fat_g" in parsed else None
    sugars_100g = parsed["sugars_g"].value_per_100g if "sugars_g" in parsed else None
    sodium_100g = parsed["sodium_mg"].value_per_100g if "sodium_mg" in parsed else None

    kmeans_pt = predict_processing_tier_kmeans(
        additives_n=len(risk_result.detected_additives),
        sugars_g_100g=sugars_100g,
        fat_g_100g=fat_100g,
        sodium_mg_100g=sodium_100g,
        fiber_g_100g=fiber_100g,
    )
    if kmeans_pt.tier is not None:
        processing_level = kmeans_pt.processing_level
        processing_tier: Optional[int] = kmeans_pt.tier
    else:
        processing_level = _compute_processing_level(ingredient_items, risk_result.detected_additives)
        processing_tier = _level_to_tier(processing_level)

    kmeans_ns = predict_nutriscore_kmeans(
        energy_kcal_100g=kcal_100g,
        saturated_fat_g_100g=sat_fat_100g,
        sugars_g_100g=sugars_100g,
        sodium_mg_100g=sodium_100g,
        fiber_g_100g=fiber_100g,
        proteins_g_100g=protein_100g,
    )
    # Keep the displayed numeric score grounded in the risk engine's nutrient
    # levels and additive findings. K-Means supplies the categorical grade when
    # its required nutrition inputs are available; otherwise derive grade from
    # the rule-based score so missing model inputs remain supported.
    health_score, health_status = _compute_health_score(
        risk_result.nutrient_levels,
        risk_result.detected_additives,
    )
    health_grade: Optional[HealthGrade] = (
        kmeans_ns.grade if kmeans_ns.grade is not None else _score_to_grade(health_score)
    )

    unknown_nutrients = [k for k, v in risk_result.nutrient_levels.items() if v == "unknown"]
    pipeline_status = "partial" if unknown_nutrients or not ingredient_items else "complete"

    # Build informational, evidence-grounded summary and recommendations
    summary_parts = [
        f"Extracted {len(ingredient_items)} ingredient/additive item(s) "
        f"at {round(extraction_confidence * 100)}% mean OCR confidence."
    ]
    if formatted_allergens:
        summary_parts.append(f"Detected allergen disclosures: {', '.join(formatted_allergens)}.")
    if unknown_nutrients:
        summary_parts.append(
            f"Per-100g regulatory thresholds could not be evaluated for {len(unknown_nutrients)} "
            f"nutrient(s) ({', '.join(unknown_nutrients)}) because required per-100g or serving-size data was not found."
        )
    else:
        high_nutrients = [k for k, v in risk_result.nutrient_levels.items() if v == "high"]
        if high_nutrients:
            summary_parts.append(
                f"High per-100g levels flagged for: {', '.join(high_nutrients)}."
            )

    recommendations: List[str] = []
    for w in risk_result.risk_warnings:
        if w.category in ("nutrient_threshold", "allergen"):
            recommendations.append(w.message)
    if unknown_nutrients:
        recommendations.append(
            "Verify the physical package nutrition panel for missing or per-serving values before making dietary decisions."
        )
    if not recommendations:
        recommendations.append(
            "Informational label summary only; review the ingredient list and nutrition panel on the physical package."
        )

    ocr_text = " ".join(b.text for b in ocr_blocks if b.text).strip()
    evidence = AnalysisEvidence(
        ocrText=ocr_text,
        ocrBlockCount=len(ocr_blocks),
        correctedSections=dict(corrected_sections),
        corrections=list(corrections),
        normalizations=list(risk_result.normalizations),
        riskWarnings=list(risk_result.risk_warnings),
    )

    return ProductAnalysis(
        id=f"scan-{scan_id}",
        productName=_derive_product_name(product_name, filename),
        brand=brand.strip()[:120] if brand and brand.strip() else "Unknown brand",
        category=_resolve_category(category),
        visualType="uploaded",
        analysisDate=datetime.now(timezone.utc).isoformat(),
        healthScore=health_score,
        healthGrade=health_grade,
        healthStatus=health_status,  # type: ignore[arg-type]
        summary=" ".join(summary_parts),
        processingLevel=processing_level,  # type: ignore[arg-type]
        processingTier=processing_tier,  # type: ignore[arg-type]
        ingredients=ingredient_items,
        nutrition=nutrition,
        allergens=formatted_allergens,
        recommendations=recommendations[:5],
        personalizedProfileApplied=include_health_profile,
        isDemo=False,
        scanId=scan_id,
        pipelineStatus=pipeline_status,  # type: ignore[arg-type]
        extractionConfidence=round(extraction_confidence, 4),
        nutrientLevels=dict(risk_result.nutrient_levels),
        evidence=evidence,
    )
