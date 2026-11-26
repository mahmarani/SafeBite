"""SafeBite text correction and tokenization service.

Applies BERT MLM error correction selectively to ingredient, allergen, and nutrition
sections while preserving traceable character offsets and audit records, then
produces model-ready BERT subword tokens with offset mappings and overflow chunks.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, TYPE_CHECKING

from backend.api.contracts import CorrectionRecord, TokenizedSection
from backend.services.language.bert_tokenizer import get_tokenizer, tokenize_ingredient_text
from backend.services.language.corrector import BertMLMCorrector

if TYPE_CHECKING:
    from backend.api.contracts import ExtractedEntity
    from backend.services.language.ner import NerPredictor

CORRECTABLE_SECTIONS = ("ingredients", "allergens", "nutrition")

_CORRECTOR: Optional[BertMLMCorrector] = None


def get_corrector() -> BertMLMCorrector:
    """Lazy-load and cache the default SafeBite MLM corrector."""
    global _CORRECTOR
    if _CORRECTOR is None:
        _CORRECTOR = BertMLMCorrector()
    return _CORRECTOR


@dataclass(frozen=True)
class NlpCorrectionResult:
    """Output of the text correction and tokenization stage."""

    corrected_sections: Dict[str, str]
    corrections: List[CorrectionRecord]
    tokenized_sections: Dict[str, TokenizedSection]


def run_ner_after_correction(
    correction_result: NlpCorrectionResult,
    predictor: Optional["NerPredictor"] = None,
    min_confidence: float = 0.0,
) -> List["ExtractedEntity"]:
    """Send corrected text to NER while leaving each model's tokenizer independent.

    The MLM tokenizer is used only for the existing tokenization audit record.
    NER receives plain corrected text and performs its own tokenization with the
    tokenizer stored beside its own token-classification checkpoint. Entity
    offsets therefore always refer to ``corrected_sections``.
    """
    from backend.services.language.ner import run_ner_on_sections

    return run_ner_on_sections(
        correction_result.corrected_sections,
        predictor=predictor,
        min_confidence=min_confidence,
    )


def run_correction_and_tokenization(
    sections: Dict[str, str],
    corrector: Optional[BertMLMCorrector] = None,
    min_confidence: float = 0.65,
    max_length: int = 512,
    stride: int = 64,
) -> NlpCorrectionResult:
    """Correct OCR mistakes in food-label sections and tokenize them for BERT."""
    mlm = corrector or get_corrector()
    tokenizer = get_tokenizer()

    corrected_sections: Dict[str, str] = {}
    all_corrections: List[CorrectionRecord] = []
    tokenized_sections: Dict[str, TokenizedSection] = {}

    for section_name, raw_text in sections.items():
        text = (raw_text or "").strip()
        if not text:
            corrected_sections[section_name] = ""
            continue

        if section_name in CORRECTABLE_SECTIONS:
            corrected_text, recs = mlm.correct_text(
                text,
                min_confidence=min_confidence,
            )
            for rec in recs:
                all_corrections.append(
                    CorrectionRecord(
                        original=rec["original"],
                        corrected=rec["corrected"],
                        score=rec["score"],
                        section=section_name,  # type: ignore[arg-type]
                        start=rec["start"],
                        end=rec["end"],
                    )
                )
        else:
            # Leave 'other' / non-target sections untouched
            corrected_text = text

        corrected_sections[section_name] = corrected_text

        if section_name in CORRECTABLE_SECTIONS and corrected_text:
            encoded = tokenize_ingredient_text(
                corrected_text,
                tokenizer=tokenizer,
                max_length=max_length,
                stride=stride,
            )
            input_ids_chunks = [list(map(int, chunk)) for chunk in encoded["input_ids"]]
            tokens_chunks = [
                tokenizer.convert_ids_to_tokens(chunk) for chunk in input_ids_chunks
            ]
            offsets_chunks = [
                [(int(s), int(e)) for s, e in chunk]
                for chunk in encoded["offset_mapping"]
            ]
            tokenized_sections[section_name] = TokenizedSection(
                text=corrected_text,
                tokens=tokens_chunks,
                input_ids=input_ids_chunks,
                offset_mapping=offsets_chunks,
                num_chunks=len(input_ids_chunks),
            )

    return NlpCorrectionResult(
        corrected_sections=corrected_sections,
        corrections=all_corrections,
        tokenized_sections=tokenized_sections,
    )
