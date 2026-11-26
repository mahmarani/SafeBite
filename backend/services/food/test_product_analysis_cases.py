"""Acceptance cases for product-analysis values consumed by the frontend."""

import pytest

from backend.api.orchestrator import _compute_health_score, _derive_product_name, _resolve_category, _score_to_grade, _build_ingredient_items
from backend.api.contracts import ExtractedEntity


@pytest.mark.parametrize("levels,additives,expected", [
    ({"sodium_mg": "low", "sugars_g": "low"}, [], (88.0, "Healthy")),
    ({"sodium_mg": "moderate", "sugars_g": "low"}, [], (81.0, "Healthy")),
    ({"sodium_mg": "high", "sugars_g": "low"}, [], (72.0, "Moderate")),
    ({"a": "high", "b": "high"}, [], (56.0, "Requires attention")),
    ({"a": "high", "b": "high", "c": "high"}, ["x"], (36.0, "Requires attention")),
    ({"a": "unknown", "b": "low"}, [], (None, "Unknown")),
    ({"a": "unknown"}, [], (None, "Unknown")),
    ({}, ["x", "y"], (None, "Unknown")),
])
def test_score_health_status_cases(levels, additives, expected):
    assert _compute_health_score(levels, additives) == expected


@pytest.mark.parametrize("score,grade", [(None, None), (100, "A"), (88, "A"), (87.9, "B"), (80, "B"), (79.9, "C"), (65, "C"), (64.9, "D"), (50, "D"), (49.9, "E")])
def test_grade_cutoff_cases(score, grade):
    assert _score_to_grade(score) == grade


@pytest.mark.parametrize("name,filename,expected", [
    ("Cola", None, "Cola"),
    (None, "original_coke.jpg", "Original Coke"),
    (None, None, "Scanned Food Label"),
])
def test_product_name_cases(name, filename, expected):
    assert _derive_product_name(name, filename) == expected


@pytest.mark.parametrize("category,expected", [
    ("Beverages", "Beverages"),
    ("invalid", "Pantry Staples"),
])
def test_category_cases(category, expected):
    assert _resolve_category(category) == expected


def test_ingredient_items_preserve_allergen_and_confidence_metadata():
    entities = [
        ExtractedEntity(text="milk", entity_type="ALLERGEN", confidence=0.9, start=0, end=4, section="allergens"),
        ExtractedEntity(text="sugar", entity_type="INGREDIENT", confidence=0.8, start=5, end=10, section="ingredients"),
    ]
    items = _build_ingredient_items(entities, ["milk"])
    assert len(items) == 2
    assert items[0].category == "Potential allergen"
    assert items[0].confidence == 0.9
    assert items[1].sourceSection == "ingredients"
