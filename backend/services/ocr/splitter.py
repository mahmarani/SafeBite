"""Classify OCR text blocks into food-label sections.

Section assignment uses the text, neighboring text, and OCR bounding boxes. It does
not assume that a section appears in a fixed part of the package and does not run
OCR again.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence, Tuple


SECTION_NAMES = ("ingredients", "allergens", "nutrition", "other")

NUTRIENT_ROW_RE = re.compile(
    r"(?P<name>calories?|energy|total\s+fat|saturated\s+fat|trans\s+fat|"
    r"cholesterol|sodium|salt|total\s+carbohydrate|carbohydrates?|dietary\s+fiber|"
    r"fibre|total\s+sugars?|added\s+sugars?|sugars?|protein|calcium|iron|potassium|"
    r"vitamin\s+[a-z0-9]+)\b(?P<tail>.*)", re.IGNORECASE)
VALUE_RE = re.compile(r"(?P<value>less\s+than\s+\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(?P<unit>kcal|kj|mcg|ug|mg|g)?(?!\s*%)\b", re.I)
PERCENT_RE = re.compile(r"(?P<value>\d+(?:[.,]\d+)?)\s*%")


def parse_nutrition_rows(blocks: Sequence[Dict[str, Any]], confidence_threshold: float = 0.65) -> List[Dict[str, Any]]:
    """Parse already-grouped OCR lines into cautious nutrient/value rows."""
    lines, _, _ = _make_visual_lines(blocks)
    rows = []
    for line in lines:
        text = line["text"]
        # The package's explanatory daily-value footnote is not a nutrient row.
        if re.search(r"daily\s+values?\s+(?:are|based)|based\s+on\s+\d[,.]?\d*\s*calorie", text, re.I):
            continue
        match = NUTRIENT_ROW_RE.search(text)
        if not match:
            continue
        tail = match.group("tail")
        # Separate amount and %DV columns. A percent-only row has no amount.
        tail_without_percent = PERCENT_RE.sub(" ", tail)
        value_match = VALUE_RE.search(tail_without_percent)
        percent_match = PERCENT_RE.search(tail)
        confidence = min((float(blocks[i].get("confidence", 0)) for i in line["indices"]), default=0.0)
        value = value_match.group("value") if value_match else None
        unit = value_match.group("unit") if value_match else None
        malformed_unit = bool(re.search(r"\d\s*(?:m9|m[gq]|g[69]|kca1)\b", tail, re.I))
        # Do not accept an unlabelled number as an amount: it may be %DV.
        has_percent_only = bool(percent_match and not re.search(r"\d\s*(?:kcal|kj|g|mg|mcg|ug)\b", tail, re.I))
        if has_percent_only:
            value, unit = None, None
        # Amounts without an explicit unit are meaningful for calories only.
        if unit is None and match.group("name").casefold() not in ("calorie", "calories", "energy"):
            value = None
        rows.append({"nutrient": match.group("name").lower(),
                     "amount": (value + unit) if value and unit else value,
                     "daily_value_percent": percent_match.group("value") if percent_match else None,
                     "confidence": round(confidence, 4),
                     "needs_review": value is None or confidence < confidence_threshold or malformed_unit,
                     "raw_text": text})
    return rows

NUTRIENT_PATTERN = re.compile(
    r"\b(?:calories?|energy|total\s+fat|saturated\s+fat|trans\s+fat|"
    r"cholesterol|sodium|salt|carbohydrates?|dietary\s+fiber|fibre|"
    r"(?:total\s+)?sugars?|added\s+sugars?|proteins?|calcium|iron|potassium|"
    r"vitamins?(?:\s+[a-z0-9]+)?|serving\s+size|servings?\s+per\s+container|"
    r"per\s+serving|per\s+100\s*(?:g|ml)|daily\s+value|%\s*dv)\b",
    re.IGNORECASE,
)
NUTRITION_VALUE_PATTERN = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:kcal|kj|g|mg|mcg|ug|ml|%|dv)\b",
    re.IGNORECASE,
)
INGREDIENT_HEADER_PATTERN = re.compile(
    r"^\s*(?:ingredients?|ingrédients?|zutaten|ingredientes?|ingredient\s+list)\b\s*:?\s*",
    re.IGNORECASE,
)
ALLERGEN_HEADER_PATTERN = re.compile(
    r"^\s*(?:contains?|may\s+contain|allergens?(?:\s+(?:info|information|advice))?|"
    r"traces\s+of)\b\s*:?\s*",
    re.IGNORECASE,
)
NUTRITION_HEADER_PATTERN = re.compile(
    r"\b(?:nutrition\s+facts|nutrition(?:al)?\s+information|"
    r"valeur\s+nutritive|nährwerte)\b",
    re.IGNORECASE,
)
NUTRITION_FOOTNOTE_PATTERN = re.compile(
    r"(?:%\s*daily\s+value|daily\s+value\s*\(?\s*dv|daily\s+diet|"
    r"in\s+a\s+serving\s+of\s+food\s+contributes|calories?\s+a\s+day|"
    r"general\s+nutrition\s+advice)",
    re.IGNORECASE,
)
OTHER_HEADER_PATTERN = re.compile(
    r"^\s*(?:distributed\s+by|manufactured\s+(?:for|by)|net\s+(?:wt|weight)|"
    r"best\s+before|expiry\s+date|keep\s+refrigerated|store\s+in\s+a\s+cool|"
    r"batch\s*(?:no|number)?|www\.[a-z0-9.-]+\.[a-z]{2,}|questions?\s+or\s+comments?)\b",
    re.IGNORECASE,
)


def _header_section(text: str) -> Optional[str]:
    """Return a section only when text looks like a section heading or disclosure."""
    cleaned = text.strip()
    if not cleaned:
        return None
    if ALLERGEN_HEADER_PATTERN.search(cleaned):
        return "allergens"
    if INGREDIENT_HEADER_PATTERN.search(cleaned):
        return "ingredients"
    if NUTRITION_HEADER_PATTERN.search(cleaned):
        return "nutrition"
    if OTHER_HEADER_PATTERN.search(cleaned):
        return "other"
    return None


def _content_section(text: str) -> Optional[str]:
    """Classify clear content from its wording without relying on page location."""
    cleaned = text.strip()
    if not cleaned:
        return None

    header = _header_section(cleaned)
    if header:
        return header

    # FDA-style %DV explanatory text often contains commas and semicolons.
    # Do not let the generic comma-separated ingredient heuristic classify it
    # as an ingredients list.
    if NUTRITION_FOOTNOTE_PATTERN.search(cleaned):
        return "nutrition"

    has_nutrient = bool(NUTRIENT_PATTERN.search(cleaned))
    has_value = bool(NUTRITION_VALUE_PATTERN.search(cleaned))
    if has_nutrient and (has_value or "calories" in cleaned.casefold()):
        return "nutrition"

    separators = cleaned.count(",") + cleaned.count(";")
    if separators >= 2 and not has_nutrient:
        return "ingredients"

    return None


def classify_line(line: str) -> str:
    """Classify one line using explicit wording and content clues."""
    return _content_section(line) or "other"


def _box_geometry(box: Any) -> Optional[Tuple[float, float, float, float, float, float, float]]:
    """Return the box edges, center, and height, or None for missing geometry."""
    try:
        xs = [float(point[0]) for point in box]
        ys = [float(point[1]) for point in box]
    except (TypeError, ValueError, IndexError):
        return None
    if not xs or not ys:
        return None
    left, right = min(xs), max(xs)
    top, bottom = min(ys), max(ys)
    if right <= left or bottom <= top:
        return None
    return left, top, right, bottom, (left + right) / 2, (top + bottom) / 2, bottom - top


def _make_visual_lines(blocks: Sequence[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float, float]:
    """Group nearby OCR boxes into short visual lines while retaining their boxes."""
    geometries = [_box_geometry(block.get("box")) for block in blocks]
    valid = [g for g in geometries if g is not None]
    if not valid:
        return (
            [{"indices": [i], "text": str(b.get("text", "")), "geometry": None} for i, b in enumerate(blocks)],
            1.0,
            1.0,
        )

    page_left = min(g[0] for g in valid)
    page_top = min(g[1] for g in valid)
    page_width = max(1.0, max(g[2] for g in valid) - page_left)
    page_height = max(1.0, max(g[3] for g in valid) - page_top)

    # First group boxes whose vertical centers overlap, then split distant columns
    # on the same row. This also lets a heading OCR'd as separate boxes act as one.
    rows: List[List[int]] = []
    for index in sorted(
        (i for i, g in enumerate(geometries) if g is not None),
        key=lambda i: (geometries[i][5], geometries[i][0]),  # type: ignore[index]
    ):
        geometry = geometries[index]
        assert geometry is not None
        placed = False
        for row in rows:
            row_geometries = [geometries[i] for i in row]
            row_geometries = [g for g in row_geometries if g is not None]
            row_center = sum(g[5] for g in row_geometries) / len(row_geometries)
            row_height = sum(g[6] for g in row_geometries) / len(row_geometries)
            if abs(geometry[5] - row_center) <= 0.55 * max(row_height, geometry[6]):
                row.append(index)
                placed = True
                break
        if not placed:
            rows.append([index])

    lines: List[Dict[str, Any]] = []
    for row in rows:
        row.sort(key=lambda i: geometries[i][0])  # type: ignore[index]
        groups: List[List[int]] = []
        for index in row:
            geometry = geometries[index]
            assert geometry is not None
            if not groups:
                groups.append([index])
                continue
            previous = geometries[groups[-1][-1]]
            assert previous is not None
            gap = geometry[0] - previous[2]
            max_gap = max(2.5 * max(geometry[6], previous[6]), 0.025 * page_width)
            if gap <= max_gap:
                groups[-1].append(index)
            else:
                groups.append([index])

        for indices in groups:
            group_geometries = [geometries[i] for i in indices]
            group_geometries = [g for g in group_geometries if g is not None]
            lines.append({
                "indices": indices,
                "text": " ".join(str(blocks[i].get("text", "")).strip() for i in indices).strip(),
                "geometry": (
                    min(g[0] for g in group_geometries),
                    min(g[1] for g in group_geometries),
                    max(g[2] for g in group_geometries),
                    max(g[3] for g in group_geometries),
                    sum(g[4] for g in group_geometries) / len(group_geometries),
                    sum(g[5] for g in group_geometries) / len(group_geometries),
                    max(g[6] for g in group_geometries),
                ),
            })

    # Geometry-less blocks remain available to the text-only fallback.
    for index, geometry in enumerate(geometries):
        if geometry is None:
            lines.append({"indices": [index], "text": str(blocks[index].get("text", "")), "geometry": None})
    lines.sort(key=lambda line: (
        line["geometry"][5] if line["geometry"] is not None else float("inf"),
        line["geometry"][0] if line["geometry"] is not None else float("inf"),
    ))
    return lines, page_width, page_height


def _same_visual_region(anchor: Tuple[float, ...], target: Tuple[float, ...], page_width: float) -> bool:
    """Use overlap and relative horizontal distance to avoid crossing columns."""
    overlap = max(0.0, min(anchor[2], target[2]) - max(anchor[0], target[0]))
    smaller_width = max(1.0, min(anchor[2] - anchor[0], target[2] - target[0]))
    broad_heading = (anchor[2] - anchor[0]) >= 0.35 * page_width
    return overlap / smaller_width >= 0.15 or abs(anchor[4] - target[4]) <= 0.16 * page_width or broad_heading


def _nearest_preceding_section(
    target_index: int,
    lines: Sequence[Dict[str, Any]],
    page_width: float,
    page_height: float,
) -> Optional[str]:
    """Inherit the closest preceding heading in the same visual region."""
    target = lines[target_index]["geometry"]
    if target is None:
        return None

    candidates: List[Tuple[float, str]] = []
    for index, line in enumerate(lines):
        if index == target_index:
            continue
        section = line.get("anchor_section")
        anchor = line.get("geometry")
        if section is None or anchor is None or not _same_visual_region(anchor, target, page_width):
            continue

        vertical_gap = target[1] - anchor[3]
        same_row_before = (
            abs(target[5] - anchor[5]) <= 0.5 * max(target[6], anchor[6])
            and anchor[2] <= target[0]
        )
        if vertical_gap < 0 and not same_row_before:
            continue

        distance = max(0.0, vertical_gap) / page_height + 0.35 * abs(target[4] - anchor[4]) / page_width
        candidates.append((distance, section))

    if not candidates:
        return None
    return min(candidates, key=lambda item: item[0])[1]


def split_text(text: str) -> Dict[str, str]:
    """Split plain OCR text by headings and text clues when boxes are unavailable."""
    sections = {name: [] for name in SECTION_NAMES}
    current = "other"
    for line in (part.strip() for part in (text or "").splitlines()):
        if not line:
            continue
        section = _content_section(line)
        if section:
            current = section
            sections[section].append(line)
        elif current != "other" and not OTHER_HEADER_PATTERN.search(line):
            sections[current].append(line)
        else:
            current = "other"
            sections["other"].append(line)
    return {
        "ingredients_text": " ".join(sections["ingredients"]).strip(),
        "allergens_text": " ".join(sections["allergens"]).strip(),
        "nutrition_text": "\n".join(sections["nutrition"]).strip(),
        "other_text": "\n".join(sections["other"]).strip(),
    }


def split_ocr_blocks(blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Assign each OCR block to a section using text plus relative box position.

    Explicit section wording and clear content cues take priority. Blocks without
    those clues inherit from the nearest preceding section heading in the same
    visual region. Original text, geometry, confidence, and block order are kept.
    """
    lines, page_width, page_height = _make_visual_lines(blocks)
    sections = {name: [] for name in SECTION_NAMES}

    for line in lines:
        line["anchor_section"] = _header_section(line["text"])
        line["section"] = _content_section(line["text"])
        line["section_source"] = (
            "header" if line["anchor_section"] is not None
            else "text" if line["section"] is not None
            else None
        )

    for index, line in enumerate(lines):
        section = line["section"]
        if section is None:
            section = _nearest_preceding_section(index, lines, page_width, page_height)
            if section is not None:
                line["section_source"] = "position"
        section = section or "other"
        if line["section_source"] is None:
            line["section_source"] = "fallback"
        line["section"] = section
        for block_index in line["indices"]:
            block = blocks[block_index]
            block["section"] = section
            block["section_source"] = line["section_source"]
            sections[section].append(block)

    # Visual lines were ordered top-to-bottom and left-to-right above, so each
    # section list retains the same natural reading order as the OCR input.
    return {
        "ingredients_text": " ".join(block["text"].strip() for block in sections["ingredients"]).strip(),
        "allergens_text": " ".join(block["text"].strip() for block in sections["allergens"]).strip(),
        "nutrition_text": " ".join(block["text"].strip() for block in sections["nutrition"]).strip(),
        "other_text": " ".join(block["text"].strip() for block in sections["other"]).strip(),
        "ingredients_blocks": sections["ingredients"],
        "allergens_blocks": sections["allergens"],
        "nutrition_blocks": sections["nutrition"],
        "nutrition_rows": parse_nutrition_rows(sections["nutrition"]),
        "other_blocks": sections["other"],
    }
