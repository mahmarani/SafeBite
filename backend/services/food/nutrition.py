"""Deterministic nutrition-panel parser and unit converter.

Clearly distinguishes ``per_100g``, ``per_100ml``, ``per_serving``, and
``unknown`` measurement bases. Never guesses missing, malformed, or conflicting
values—surfaces them as ``unknown`` or ``ambiguous``.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Dict, List, Literal, Optional, Sequence, Tuple

from backend.api.contracts import ExtractedEntity

NutrientBasis = Literal["per_100g", "per_100ml", "per_serving", "unknown"]
NutrientStatus = Literal["known", "unknown", "ambiguous"]

SUPPORTED_NUTRIENTS = (
    "total_fat_g",
    "saturated_fat_g",
    "sugars_g",
    "sodium_mg",
)

# Map label phrases (longest first) to canonical nutrient keys
NUTRIENT_SYNONYMS: Tuple[Tuple[str, str], ...] = (
    ("saturated fat", "saturated_fat_g"),
    ("saturates", "saturated_fat_g"),
    ("total fat", "total_fat_g"),
    ("fat", "total_fat_g"),
    ("total sugars", "sugars_g"),
    ("sugars", "sugars_g"),
    ("sugar", "sugars_g"),
    ("sodium", "sodium_mg"),
    ("salt", "salt_to_sodium_mg"),
    ("calories", "energy_kcal"),
    ("energy", "energy_kcal"),
)

_SERVING_SIZE_RE = re.compile(
    r"\b(?:serving\s+size|per\s+serving|portion)\s*:?(?:[^\n,;]{0,24}?\()?\s*(\d+(?:\.\d+)?)\s*(g|mg|ml)\b",
    re.IGNORECASE,
)
_PER_100G_RE = re.compile(r"\b(?:per\s+100\s*g|/100\s*g)\b", re.IGNORECASE)
_PER_100ML_RE = re.compile(r"\b(?:per\s+100\s*ml|/100\s*ml)\b", re.IGNORECASE)
_PER_SERVING_RE = re.compile(r"\b(?:per\s+serving|per\s+portion|serving\s+size)\b", re.IGNORECASE)

# Dataset-backed plausible bounds per 100g (derived from clean Open Food Facts
# `data/text_set.parquet` distributions + physical 100g mass/energy limits).
DATASET_NUTRIENT_BOUNDS_PER_100G: Dict[str, Tuple[float, float]] = {
    "energy_kcal": (0.0, 950.0),      # dataset p99=907, pure fat ~900 kcal/100g
    "calories": (0.0, 950.0),
    "total_fat_g": (0.0, 100.0),      # dataset p99=93.8g, physical max 100g
    "saturated_fat_g": (0.0, 100.0),  # dataset p99=79.4g, physical max 100g
    "carbohydrates_g": (0.0, 100.0),  # dataset p99=100.0g, physical max 100g
    "carbohydratesG": (0.0, 100.0),
    "sugars_g": (0.0, 100.0),         # dataset p99=95.4g, physical max 100g
    "added_sugars_g": (0.0, 100.0),   # dataset p99=77.8g, physical max 100g
    "addedSugarG": (0.0, 100.0),
    "fiber_g": (0.0, 100.0),          # dataset p99=46.1g, physical max 100g
    "fiberG": (0.0, 100.0),
    "protein_g": (0.0, 100.0),        # dataset p99=88.2g, physical max 100g
    "proteinG": (0.0, 100.0),
    "sodium_mg": (0.0, 40000.0),      # dataset max=39790mg (pure NaCl ~39340mg/100g)
}

# Fallback upper bounds when basis is per_serving (without gram size) or unknown
# (dataset serving_quantity p99 = 355g).
SINGLE_SERVING_UPPER_BOUNDS: Dict[str, Tuple[float, float]] = {
    "energy_kcal": (0.0, 2000.0),
    "calories": (0.0, 2000.0),
    "total_fat_g": (0.0, 200.0),
    "saturated_fat_g": (0.0, 150.0),
    "carbohydrates_g": (0.0, 300.0),
    "carbohydratesG": (0.0, 300.0),
    "sugars_g": (0.0, 250.0),
    "added_sugars_g": (0.0, 200.0),
    "addedSugarG": (0.0, 200.0),
    "fiber_g": (0.0, 100.0),
    "fiberG": (0.0, 100.0),
    "protein_g": (0.0, 200.0),
    "proteinG": (0.0, 200.0),
    "sodium_mg": (0.0, 10000.0),
}

EXPECTED_CANONICAL_UNIT: Dict[str, str] = {
    "energy_kcal": "kcal",
    "calories": "kcal",
    "total_fat_g": "g",
    "saturated_fat_g": "g",
    "carbohydrates_g": "g",
    "carbohydratesG": "g",
    "sugars_g": "g",
    "added_sugars_g": "g",
    "addedSugarG": "g",
    "fiber_g": "g",
    "fiberG": "g",
    "protein_g": "g",
    "proteinG": "g",
    "sodium_mg": "mg",
}

_UNIT_TO_GRAMS = {
    "g": 1.0,
    "mg": 0.001,
    "mcg": 1e-6,
    "ug": 1e-6,
    "kg": 1000.0,
}

_UNIT_TO_MG = {
    "mg": 1.0,
    "g": 1000.0,
    "mcg": 0.001,
    "ug": 0.001,
}


@dataclass(frozen=True)
class NutrientValidationResult:
    """Result of validating a nutrient's value, unit, and range."""

    is_valid: bool
    reason: Optional[str] = None


def validate_nutrient_value(
    nutrient: str,
    value: float,
    unit: Optional[str],
    basis: NutrientBasis = "unknown",
    serving_size_g: Optional[float] = None,
) -> NutrientValidationResult:
    """Validate an extracted nutrient value and unit against dataset-backed bounds."""
    if value < 0:
        return NutrientValidationResult(False, "negative_value")

    expected_unit = EXPECTED_CANONICAL_UNIT.get(nutrient)
    if expected_unit and unit and unit.lower() != expected_unit:
        return NutrientValidationResult(False, "incompatible_unit")

    # Determine effective value and range based on measurement basis & serving size
    if basis == "per_100g":
        bounds = DATASET_NUTRIENT_BOUNDS_PER_100G.get(nutrient)
        check_val = value
    elif basis == "per_serving" and serving_size_g is not None and serving_size_g > 0:
        bounds = DATASET_NUTRIENT_BOUNDS_PER_100G.get(nutrient)
        check_val = value * (100.0 / serving_size_g)
    else:
        bounds = SINGLE_SERVING_UPPER_BOUNDS.get(nutrient)
        check_val = value

    if bounds is not None:
        lo, hi = bounds
        if check_val < lo or check_val > hi:
            return NutrientValidationResult(False, "suspicious_out_of_range")

    return NutrientValidationResult(True, None)


@dataclass(frozen=True)
class ParsedNutrientRecord:
    """Structured parse output for one nutrient with full unit/basis provenance."""

    nutrient: str
    status: NutrientStatus
    value: Optional[float]
    unit: Optional[str]
    basis: NutrientBasis
    value_per_100g: Optional[float]
    source_field: str
    raw_text: str
    confidence: float
    reason: Optional[str] = None


def detect_nutrition_basis(text: str) -> Tuple[NutrientBasis, Optional[float]]:
    """Detect declared basis (per_100g, per_100ml, per_serving, unknown) and serving_size_g."""
    if not text or not text.strip():
        return "unknown", None

    has_100g = bool(_PER_100G_RE.search(text))
    has_100ml = bool(_PER_100ML_RE.search(text))
    has_serving = bool(_PER_SERVING_RE.search(text))

    serving_g: Optional[float] = None
    m_srv = _SERVING_SIZE_RE.search(text)
    if m_srv:
        srv_val = float(m_srv.group(1))
        srv_unit = m_srv.group(2).lower()
        if srv_unit == "g" and srv_val > 0:
            serving_g = srv_val
        elif srv_unit == "mg" and srv_val > 0:
            serving_g = srv_val * 0.001

    if has_100g and not has_serving and not has_100ml:
        return "per_100g", serving_g
    if has_100ml and not has_100g and not has_serving:
        return "per_100ml", serving_g
    if has_serving and not has_100g and not has_100ml:
        return "per_serving", serving_g
    if has_100g and has_serving:
        # Both declared simultaneously without column disambiguation -> ambiguous basis
        return "unknown", serving_g
    return "unknown", serving_g


def convert_nutrient_value(
    value: float,
    unit: str,
    target_nutrient: str,
) -> Optional[Tuple[float, str]]:
    """Convert raw numeric value + unit into canonical target unit (g, mg, or kcal).

    Returns ``(converted_value, canonical_unit)`` or ``None`` if incompatible/invalid.
    """
    if value < 0:
        return None
    u = (unit or "").strip().lower()
    if not u:
        return None

    if target_nutrient in ("total_fat_g", "saturated_fat_g", "sugars_g"):
        factor = _UNIT_TO_GRAMS.get(u)
        if factor is None:
            return None
        return round(value * factor, 4), "g"

    if target_nutrient == "sodium_mg":
        factor = _UNIT_TO_MG.get(u)
        if factor is None:
            return None
        return round(value * factor, 4), "mg"

    if target_nutrient == "salt_to_sodium_mg":
        # Official UK DHSC/FSA factor: Salt (g) = Sodium (g) * 2.5 => Sodium (mg) = Salt (g) * 400
        factor_g = _UNIT_TO_GRAMS.get(u)
        if factor_g is None:
            return None
        salt_g = value * factor_g
        return round(salt_g * 400.0, 4), "mg"

    if target_nutrient == "energy_kcal":
        if u in ("kcal", "cal"):
            return round(value, 4), "kcal"
        if u == "kj":
            return round(value / 4.184, 4), "kcal"
        return None

    return None


def _extract_candidates_from_text(
    text: str,
) -> Tuple[Dict[str, List[Tuple[float, str, str]]], Dict[str, str]]:
    """Find nutrient mentions followed by numeric values/units or malformed tokens."""
    candidates: Dict[str, List[Tuple[float, str, str]]] = {}
    malformed: Dict[str, str] = {}

    if not text or not text.strip():
        return candidates, malformed

    # Build pattern matching longest nutrient names first
    names_alt = "|".join(re.escape(name) for name, _ in NUTRIENT_SYNONYMS)
    syn_map = dict(NUTRIENT_SYNONYMS)

    pattern = re.compile(
        rf"\b(?P<name>{names_alt})\b\s*:?\s*(?P<qty>[^\n,;]+?)(?=\s+(?:{names_alt})\b|[,\n;]|$)",
        re.IGNORECASE,
    )
    qty_re = re.compile(
        r"^(?P<num>-?\d+(?:\.\d+)?)\s*(?P<unit>kcal|kj|mcg|mg|ug|kg|g|cal|%)\b",
        re.IGNORECASE,
    )

    for match in pattern.finditer(text):
        raw_name = re.sub(r"\s+", " ", match.group("name").lower().strip())
        canonical_key = syn_map.get(raw_name)
        if not canonical_key:
            continue

        qty_str = match.group("qty").strip()
        # Strip trailing %DV annotations like "(5% DV)" or "5%"
        qty_head = qty_str.split()[0:2]
        qty_probe = " ".join(qty_head)
        m_qty = qty_re.match(qty_str) or qty_re.match(qty_probe)
        raw_snippet = match.group(0).strip()

        if not m_qty:
            malformed[canonical_key] = raw_snippet
            continue

        num = float(m_qty.group("num"))
        unit = m_qty.group("unit").lower()
        target_for_conv = "sodium_mg" if canonical_key == "salt_to_sodium_mg" else canonical_key
        converted = convert_nutrient_value(num, unit, canonical_key)
        if converted is None:
            malformed[canonical_key] = raw_snippet
            continue

        conv_val, conv_unit = converted
        store_key = target_for_conv
        candidates.setdefault(store_key, []).append((conv_val, conv_unit, raw_snippet))

    return candidates, malformed


def _ner_confidence_lookup(
    entities: Optional[Sequence[ExtractedEntity]],
) -> Dict[str, float]:
    """Map nutrient canonical keys to NER confidence when NER entities are available."""
    if not entities:
        return {}
    syn_map = dict(NUTRIENT_SYNONYMS)
    confs: Dict[str, float] = {}
    for ent in entities:
        if ent.entity_type != "NUTRIENT":
            continue
        key = syn_map.get(re.sub(r"\s+", " ", ent.text.lower().strip()))
        if key == "salt_to_sodium_mg":
            key = "sodium_mg"
        if key:
            confs[key] = max(confs.get(key, 0.0), ent.confidence)
    return confs


def parse_nutrition_section(
    nutrition_text: str,
    entities: Optional[Sequence[ExtractedEntity]] = None,
    *,
    source_field: str = "nutrition",
) -> Dict[str, ParsedNutrientRecord]:
    """Parse supported nutrients from a nutrition section with explicit basis & ambiguity handling."""
    basis, serving_size_g = detect_nutrition_basis(nutrition_text or "")
    candidates, malformed = _extract_candidates_from_text(nutrition_text or "")
    ner_confs = _ner_confidence_lookup(entities)

    results: Dict[str, ParsedNutrientRecord] = {}
    for nutrient in SUPPORTED_NUTRIENTS:
        conf = round(ner_confs.get(nutrient, 1.0), 4)
        vals = candidates.get(nutrient, [])

        if not vals:
            if nutrient in malformed:
                results[nutrient] = ParsedNutrientRecord(
                    nutrient=nutrient,
                    status="unknown",
                    value=None,
                    unit=None,
                    basis=basis,
                    value_per_100g=None,
                    source_field=source_field,
                    raw_text=malformed[nutrient],
                    confidence=conf,
                    reason="malformed_or_incompatible_unit",
                )
            else:
                results[nutrient] = ParsedNutrientRecord(
                    nutrient=nutrient,
                    status="unknown",
                    value=None,
                    unit=None,
                    basis=basis,
                    value_per_100g=None,
                    source_field=source_field,
                    raw_text="",
                    confidence=0.0,
                    reason="not_found_on_label",
                )
            continue

        # Check for conflicting duplicate observations (tolerance 20% for salt vs sodium rounding)
        # First filter/recheck candidates against dataset-backed range & unit validation
        valid_vals: List[Tuple[float, str, str]] = []
        suspicious_snippets: List[str] = []
        for cand_val, cand_unit, cand_raw in vals:
            check = validate_nutrient_value(
                nutrient,
                cand_val,
                cand_unit,
                basis=basis,
                serving_size_g=serving_size_g,
            )
            if check.is_valid:
                valid_vals.append((cand_val, cand_unit, cand_raw))
            else:
                suspicious_snippets.append(cand_raw)

        if not valid_vals:
            results[nutrient] = ParsedNutrientRecord(
                nutrient=nutrient,
                status="ambiguous",
                value=None,
                unit=vals[0][1],
                basis=basis,
                value_per_100g=None,
                source_field=source_field,
                raw_text=" | ".join(suspicious_snippets),
                confidence=conf,
                reason="suspicious_out_of_range",
            )
            continue

        distinct_vals = [v for v, _, _ in valid_vals]
        min_v, max_v = min(distinct_vals), max(distinct_vals)
        if len(distinct_vals) > 1 and (max_v - min_v) > max(1e-6, 0.20 * max_v):
            results[nutrient] = ParsedNutrientRecord(
                nutrient=nutrient,
                status="ambiguous",
                value=None,
                unit=valid_vals[0][1],
                basis=basis,
                value_per_100g=None,
                source_field=source_field,
                raw_text=" | ".join(r for _, _, r in valid_vals),
                confidence=conf,
                reason="conflicting_nutrient_values",
            )
            continue

        val, unit, raw_snippet = valid_vals[0]
        val_100g: Optional[float] = None
        reason: Optional[str] = None

        if basis == "per_100g":
            val_100g = round(val, 4)
        elif basis == "per_serving":
            if serving_size_g is not None and serving_size_g > 0:
                val_100g = round(val * (100.0 / serving_size_g), 4)
            else:
                reason = "per_serving_without_gram_serving_size"
        elif basis == "per_100ml":
            reason = "liquid_per_100ml_not_comparable_to_solid_per_100g"
        else:
            reason = "missing_or_ambiguous_basis"

        results[nutrient] = ParsedNutrientRecord(
            nutrient=nutrient,
            status="known",
            value=val,
            unit=unit,
            basis=basis,
            value_per_100g=val_100g,
            source_field=source_field,
            raw_text=raw_snippet,
            confidence=conf,
            reason=reason,
        )

    # Cross-nutrient consistency checks (e.g., saturated fat cannot exceed total fat)
    total_fat = results.get("total_fat_g")
    sat_fat = results.get("saturated_fat_g")
    if (
        total_fat is not None
        and sat_fat is not None
        and total_fat.status == "known"
        and sat_fat.status == "known"
        and total_fat.value is not None
        and sat_fat.value is not None
        and sat_fat.value > total_fat.value + 0.5
    ):
        results["saturated_fat_g"] = ParsedNutrientRecord(
            nutrient="saturated_fat_g",
            status="ambiguous",
            value=None,
            unit=sat_fat.unit,
            basis=sat_fat.basis,
            value_per_100g=None,
            source_field=sat_fat.source_field,
            raw_text=sat_fat.raw_text,
            confidence=sat_fat.confidence,
            reason="saturated_fat_exceeds_total_fat",
        )

    return results


def extract_display_nutrition_fields(nutrition_text: str) -> Dict[str, Optional[object]]:
    """Extract optional display fields (servingSize, calories, carbs, fiber, protein) with validation."""
    text = nutrition_text or ""
    basis, serving_size_g = detect_nutrition_basis(text)
    serving_match = re.search(
        r"\bserving\s+size\s*:?\s*([^\n;]{1,40})",
        text,
        re.IGNORECASE,
    )
    serving_size: str = serving_match.group(1).strip() if serving_match else (
        "Per 100g" if _PER_100G_RE.search(text) else "Unknown"
    )

    extra_patterns = {
        "calories": re.compile(
            r"\b(?P<kw>calories|energy)\s*:?\s*(?P<num>-?\d+(?:\.\d+)?)\s*(?P<unit>kcal|kj|cal|mg|g)?\b",
            re.I,
        ),
        "carbohydratesG": re.compile(
            r"\b(?:total\s+)?carbohydrates?\s*:?\s*(?P<num>-?\d+(?:\.\d+)?)\s*(?P<unit>mg|g)\b",
            re.I,
        ),
        "fiberG": re.compile(
            r"\b(?:dietary\s+)?fib(?:er|re)\s*:?\s*(?P<num>-?\d+(?:\.\d+)?)\s*(?P<unit>mg|g)\b",
            re.I,
        ),
        "addedSugarG": re.compile(
            r"\badded\s+sugars?\s*:?\s*(?P<num>-?\d+(?:\.\d+)?)\s*(?P<unit>mg|g)\b",
            re.I,
        ),
        "proteinG": re.compile(
            r"\bproteins?\s*:?\s*(?P<num>-?\d+(?:\.\d+)?)\s*(?P<unit>mg|g)\b",
            re.I,
        ),
    }

    extracted: Dict[str, Optional[object]] = {"servingSize": serving_size}
    for field, pat in extra_patterns.items():
        valid_value: Optional[float] = None
        for m in pat.finditer(text):
            val = float(m.group("num"))
            raw_unit = (m.group("unit") or "").lower()

            if field == "calories":
                kw = (m.group("kw") or "").lower()
                if raw_unit in ("mg", "g"):
                    # Incompatible mass unit for energy/calories
                    continue
                if not raw_unit:
                    # Only treat unitless number as kcal when explicitly labeled 'Calories'
                    if kw != "calories":
                        continue
                    unit = "kcal"
                elif raw_unit in ("kcal", "cal"):
                    unit = "kcal"
                elif raw_unit == "kj":
                    val = val / 4.184
                    unit = "kcal"
                else:
                    continue
                candidate = round(val, 1)
                check = validate_nutrient_value(
                    "calories",
                    candidate,
                    unit,
                    basis=basis,
                    serving_size_g=serving_size_g,
                )
            else:
                if raw_unit == "mg":
                    candidate = round(val * 0.001, 2)
                elif raw_unit == "g":
                    candidate = round(val, 2)
                else:
                    continue
                check = validate_nutrient_value(
                    field,
                    candidate,
                    "g",
                    basis=basis,
                    serving_size_g=serving_size_g,
                )

            if check.is_valid:
                valid_value = candidate
                break

        extracted[field] = valid_value

    return extracted
