"""Versioned request and intermediate-result contracts for label analysis."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Metadata accepted with an uploaded product label."""

    product_name: str | None = Field(default=None, max_length=200)
    brand: str | None = Field(default=None, max_length=120)


class OcrBlock(BaseModel):
    text: str
    box: list[list[float]]
    confidence: float = Field(ge=0, le=1)
    section: Literal["ingredients", "allergens", "nutrition", "other"] | None = None
    section_source: Literal["header", "text", "position", "fallback"] | None = None


class ExtractedEntity(BaseModel):
    text: str
    entity_type: Literal["INGREDIENT", "ADDITIVE", "ALLERGEN", "NUTRIENT", "QUANTITY"]
    confidence: float = Field(ge=0, le=1)
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    section: Literal["ingredients", "allergens", "nutrition", "other"] | None = None


class CorrectionRecord(BaseModel):
    original: str
    corrected: str
    score: float = Field(ge=0, le=1)
    section: Literal["ingredients", "allergens", "nutrition", "other"] | None = None
    start: int = Field(default=0, ge=0)
    end: int = Field(default=0, ge=0)


class TokenizedSection(BaseModel):
    """BERT tokenizer output with character offsets and overflow chunks."""

    text: str
    tokens: list[list[str]] = Field(default_factory=list)
    input_ids: list[list[int]] = Field(default_factory=list)
    offset_mapping: list[list[tuple[int, int]]] = Field(default_factory=list)
    num_chunks: int = Field(default=0, ge=0)


class NormalizationRecord(BaseModel):
    original: str
    canonical: str


class ParsedNutrient(BaseModel):
    nutrient: str
    status: Literal["known", "unknown", "ambiguous"]
    value: float | None = None
    unit: str | None = None
    basis: Literal["per_100g", "per_100ml", "per_serving", "unknown"]
    value_per_100g: float | None = None
    source_field: str
    raw_text: str = ""
    confidence: float = Field(ge=0, le=1)
    reason: str | None = None


class RiskWarning(BaseModel):
    rule_id: str
    category: Literal["nutrient_threshold", "allergen", "additive", "missing_data"]
    level: Literal["high", "moderate", "info", "unknown"]
    source_field: str
    nutrient: str | None = None
    value: float | None = None
    unit: str | None = None
    basis: str | None = None
    threshold: float | None = None
    confidence: float = Field(ge=0, le=1)
    evidence: str | None = None
    message: str


class PreparedImageInfo(BaseModel):
    """Safe metadata describing the server-normalized image passed to OCR."""

    mime_type: Literal["image/jpeg"]
    width: int = Field(gt=0)
    height: int = Field(gt=0)


HealthStatus = Literal["Healthy", "Moderate", "Requires attention", "Unknown"]
HealthGrade = Literal["A", "B", "C", "D", "E"]
IngredientCategory = Literal["Beneficial", "Neutral", "Requires attention", "Potential allergen"]
ProductCategory = Literal[
    "Breakfast & Cereal",
    "Spreads & Condiments",
    "Snacks & Bars",
    "Beverages",
    "Dairy & Alternatives",
    "Pantry Staples",
]
ProcessingLevel = Literal["Minimally Processed", "Processed", "Ultra-Processed", "Unknown"]
IngredientStatus = Literal["Safe", "Caution", "Flagged"]
ProductVisualType = Literal[
    "cereal",
    "chocolate-spread",
    "protein-bar",
    "orange-juice",
    "greek-yogurt",
    "potato-chips",
    "peanut-butter",
    "energy-drink",
    "uploaded",
    "generic",
]


class IngredientItem(BaseModel):
    name: str
    scientificName: Optional[str] = None
    category: IngredientCategory
    status: IngredientStatus
    originOrFunction: str
    explanation: str
    processedLevel: Optional[ProcessingLevel] = None
    allergenTags: list[str] = Field(default_factory=list)
    dietaryConflictTags: list[str] = Field(default_factory=list)
    conditionTags: list[str] = Field(default_factory=list)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    sourceSection: Optional[str] = None
    canonicalName: Optional[str] = None


class NutritionalInfo(BaseModel):
    servingSize: str = "Unknown"
    calories: Optional[float] = None
    totalFatG: Optional[float] = None
    saturatedFatG: Optional[float] = None
    carbohydratesG: Optional[float] = None
    fiberG: Optional[float] = None
    sugarG: Optional[float] = None
    addedSugarG: Optional[float] = None
    proteinG: Optional[float] = None
    sodiumMg: Optional[float] = None


class AnalysisEvidence(BaseModel):
    ocrText: str = ""
    ocrBlockCount: int = 0
    correctedSections: dict[str, str] = Field(default_factory=dict)
    corrections: list[CorrectionRecord] = Field(default_factory=list)
    normalizations: list[NormalizationRecord] = Field(default_factory=list)
    riskWarnings: list[RiskWarning] = Field(default_factory=list)


class ProductAnalysis(BaseModel):
    id: str
    productName: str
    brand: str
    category: ProductCategory
    imageUrl: Optional[str] = None
    visualType: ProductVisualType = "uploaded"
    analysisDate: str
    healthScore: Optional[float] = None
    healthGrade: Optional[HealthGrade] = None
    healthStatus: HealthStatus
    summary: str
    processingLevel: ProcessingLevel
    processingTier: Optional[Literal[1, 3, 4]] = None
    ingredients: list[IngredientItem]
    nutrition: NutritionalInfo
    allergens: list[str]
    recommendations: list[str]
    personalizedProfileApplied: bool = False
    isDemo: bool = False
    scanId: Optional[str] = None
    pipelineStatus: Optional[Literal["complete", "partial"]] = None
    extractionConfidence: Optional[float] = Field(default=None, ge=0, le=1)
    nutrientLevels: dict[str, Literal["low", "moderate", "high", "unknown"]] = Field(default_factory=dict)
    evidence: Optional[AnalysisEvidence] = None


class PipelineResult(BaseModel):
    """Internal, evidence-preserving result shared by pipeline stages."""

    schema_version: Literal["1.0"] = "1.0"
    scan_id: str
    status: Literal["complete", "partial", "unreadable"]
    stage: Literal["upload", "ocr", "correction", "ner", "normalization", "risk"]
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)
    prepared_image: PreparedImageInfo | None = None
    ocr_blocks: list[OcrBlock] = Field(default_factory=list)
    extracted_sections: dict[str, str] = Field(default_factory=dict)
    corrected_sections: dict[str, str] = Field(default_factory=dict)
    corrections: list[CorrectionRecord] = Field(default_factory=list)
    tokenized_sections: dict[str, TokenizedSection] = Field(default_factory=dict)
    entities: list[ExtractedEntity] = Field(default_factory=list)
    normalizations: list[NormalizationRecord] = Field(default_factory=list)
    parsed_nutrients: dict[str, ParsedNutrient] = Field(default_factory=dict)
    nutrient_levels: dict[str, Literal["low", "moderate", "high", "unknown"]] = Field(default_factory=dict)
    detected_allergens: list[str] = Field(default_factory=list)
    detected_additives: list[str] = Field(default_factory=list)
    risk_warnings: list[RiskWarning] = Field(default_factory=list)
    product_analysis: ProductAnalysis | None = None
    warnings: list[str] = Field(default_factory=list)


class AnalysisError(BaseModel):
    """Safe, stable API error format."""

    error: Literal[
        "invalid_image",
        "unsupported_image",
        "unreadable_label",
        "ocr_provider_unavailable",
        "analysis_failed",
    ]
    message: str
    scan_id: str | None = None
