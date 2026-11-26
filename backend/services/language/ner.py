"""SafeBite NER/KIE inference module.

Loads the trained ``safebite_ner`` token-classification checkpoint, runs
sliding-window inference on corrected food-label sections, reconstructs entities
from BERT wordpieces with character offsets and confidence scores, and validates
BIO tag sequences before emitting ``ExtractedEntity`` records.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Literal, Optional, Sequence, Tuple

import torch
from transformers import BertForTokenClassification, BertTokenizerFast

from backend.api.contracts import ExtractedEntity
from backend.services.language.ner_labels import ID_TO_LABEL, LABEL_TO_ID, validate_bio_sequence

DEFAULT_NER_DIR = str(Path(__file__).resolve().parents[2] / "models" / "nlp" / "safebite_ner")
FALLBACK_NER_BASE = "prajjwal1/bert-tiny"
NER_TARGET_SECTIONS: Tuple[Literal["ingredients", "allergens", "nutrition"], ...] = (
    "ingredients",
    "allergens",
    "nutrition",
)

_PREDICTOR: Optional["NerPredictor"] = None


def reconstruct_entities_from_bio(
    text: str,
    word_spans: Sequence[Tuple[int, int]],
    bio_labels: Sequence[str],
    confidences: Sequence[float],
    *,
    section: Optional[Literal["ingredients", "allergens", "nutrition", "other"]] = None,
    strict_bio: bool = True,
) -> List[ExtractedEntity]:
    """Reconstruct contiguous entity spans from word-level offsets and BIO tags.

    When ``strict_bio`` is True, any invalid BIO transition raises ``ValueError``
    via ``validate_bio_sequence``.
    """
    if len(word_spans) != len(bio_labels) or len(word_spans) != len(confidences):
        raise ValueError("word_spans, bio_labels, and confidences must have identical lengths.")

    labels_list = list(bio_labels)
    if strict_bio:
        validate_bio_sequence(labels_list)

    entities: List[ExtractedEntity] = []
    cur_type: Optional[str] = None
    cur_start: Optional[int] = None
    cur_end: Optional[int] = None
    cur_scores: List[float] = []

    def _flush() -> None:
        nonlocal cur_type, cur_start, cur_end, cur_scores
        if cur_type is not None and cur_start is not None and cur_end is not None and cur_end > cur_start:
            span_text = text[cur_start:cur_end]
            if span_text.strip():
                mean_conf = sum(cur_scores) / len(cur_scores)
                entities.append(
                    ExtractedEntity(
                        text=span_text,
                        entity_type=cur_type,  # type: ignore[arg-type]
                        confidence=round(min(1.0, max(0.0, mean_conf)), 4),
                        start=cur_start,
                        end=cur_end,
                        section=section,
                    )
                )
        cur_type = None
        cur_start = None
        cur_end = None
        cur_scores = []

    for (start, end), label, score in zip(word_spans, labels_list, confidences):
        if end <= start or label == "O":
            _flush()
            continue

        prefix, entity_type = label.split("-", maxsplit=1)
        if prefix == "B" or cur_type != entity_type:
            _flush()
            cur_type = entity_type
            cur_start = start
            cur_end = end
            cur_scores = [float(score)]
        else:
            cur_end = end
            cur_scores.append(float(score))

    _flush()
    return entities


def _repair_bio_labels(labels: List[str]) -> List[str]:
    """Repair orphan I-<TYPE> model outputs to B-<TYPE> before validation."""
    repaired: List[str] = []
    prev_entity: Optional[str] = None
    for label in labels:
        if label == "O" or label not in LABEL_TO_ID:
            repaired.append("O")
            prev_entity = None
            continue
        prefix, entity = label.split("-", maxsplit=1)
        if prefix == "I" and prev_entity != entity:
            repaired.append(f"B-{entity}")
        else:
            repaired.append(label)
        prev_entity = entity
    validate_bio_sequence(repaired)
    return repaired


class NerPredictor:
    """Loads SafeBite's BERT token-classification checkpoint and extracts entities."""

    def __init__(
        self,
        model_dir: Optional[str] = None,
        device: Optional[str] = None,
        allow_dev_fallback: Optional[bool] = None,
    ) -> None:
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.is_dev_fallback = False

        if model_dir is not None:
            resolved = model_dir
            if not Path(resolved).exists():
                raise FileNotFoundError(f"NER model path does not exist: {resolved}")
        elif os.path.exists(DEFAULT_NER_DIR):
            resolved = DEFAULT_NER_DIR
        else:
            dev_mode = (
                allow_dev_fallback
                if allow_dev_fallback is not None
                else os.getenv("SAFEBITE_ENV", "development").lower() != "production"
            )
            if not dev_mode:
                raise FileNotFoundError(
                    f"SafeBite NER checkpoint not found at {DEFAULT_NER_DIR} and dev fallback is disabled."
                )
            resolved = FALLBACK_NER_BASE
            self.is_dev_fallback = True
            print(f"[WARNING] SafeBite NER checkpoint missing; using dev fallback '{FALLBACK_NER_BASE}'.")

        self.model_dir = resolved
        self.tokenizer = BertTokenizerFast.from_pretrained(resolved)
        self.model = BertForTokenClassification.from_pretrained(resolved)
        self.model.to(self.device)
        self.model.eval()

    def predict_section(
        self,
        text: str,
        *,
        section: Optional[Literal["ingredients", "allergens", "nutrition", "other"]] = None,
        max_length: int = 512,
        stride: int = 64,
        min_confidence: float = 0.0,
    ) -> List[ExtractedEntity]:
        """Extract BIO-validated entities with character offsets from one text section."""
        if not text or not text.strip():
            return []

        encoded = self.tokenizer(
            text,
            max_length=max_length,
            truncation=True,
            stride=stride,
            return_overflowing_tokens=True,
            return_offsets_mapping=True,
            padding=False,
        )

        # Aggregate word-level predictions across subwords and overflowing windows.
        # Each word is keyed by its first subword's character start offset in `text`.
        word_best: Dict[int, Tuple[int, int, str, float]] = {}

        num_chunks = len(encoded["input_ids"])
        for chunk_idx in range(num_chunks):
            input_ids = torch.tensor([encoded["input_ids"][chunk_idx]], device=self.device)
            attention_mask = torch.tensor([encoded["attention_mask"][chunk_idx]], device=self.device)
            offsets = encoded["offset_mapping"][chunk_idx]
            word_ids = encoded.word_ids(batch_index=chunk_idx)

            with torch.no_grad():
                logits = self.model(input_ids=input_ids, attention_mask=attention_mask).logits[0]
                probs = torch.softmax(logits, dim=-1).cpu()
                pred_ids = logits.argmax(dim=-1).cpu().tolist()

            # Group subwords belonging to the same word inside this chunk
            chunk_words: Dict[int, Dict[str, object]] = {}
            for tok_idx, (word_id, (char_s, char_e)) in enumerate(zip(word_ids, offsets)):
                if word_id is None or char_e <= char_s:
                    continue
                if word_id not in chunk_words:
                    pred_id = int(pred_ids[tok_idx])
                    chunk_words[word_id] = {
                        "start": int(char_s),
                        "end": int(char_e),
                        "label": ID_TO_LABEL[pred_id],
                        "conf": float(probs[tok_idx, pred_id].item()),
                    }
                else:
                    chunk_words[word_id]["end"] = max(int(chunk_words[word_id]["end"]), int(char_e))

            for info in chunk_words.values():
                w_start = int(info["start"])  # type: ignore[arg-type]
                w_end = int(info["end"])  # type: ignore[arg-type]
                w_label = str(info["label"])
                w_conf = float(info["conf"])  # type: ignore[arg-type]
                prev = word_best.get(w_start)
                if prev is None or w_conf > prev[3]:
                    word_best[w_start] = (w_start, w_end, w_label, w_conf)

        if not word_best:
            return []

        ordered_items = [word_best[k] for k in sorted(word_best)]
        spans = [(s, e) for s, e, _, _ in ordered_items]
        raw_labels = [lbl for _, _, lbl, _ in ordered_items]
        confs = [conf for _, _, _, conf in ordered_items]

        repaired_labels = _repair_bio_labels(raw_labels)
        entities = reconstruct_entities_from_bio(
            text,
            spans,
            repaired_labels,
            confs,
            section=section,
            strict_bio=True,
        )
        if min_confidence > 0.0:
            entities = [ent for ent in entities if ent.confidence >= min_confidence]
        return entities


def get_ner_predictor() -> NerPredictor:
    """Lazy-load and cache the default SafeBite NER predictor."""
    global _PREDICTOR
    if _PREDICTOR is None:
        _PREDICTOR = NerPredictor()
    return _PREDICTOR


def run_ner_on_sections(
    sections: Dict[str, str],
    predictor: Optional[NerPredictor] = None,
    min_confidence: float = 0.0,
) -> List[ExtractedEntity]:
    """Run NER inference on target food-label sections and return extracted entities."""
    ner = predictor or get_ner_predictor()
    all_entities: List[ExtractedEntity] = []
    for section_name in NER_TARGET_SECTIONS:
        text = (sections.get(section_name) or "").strip()
        if not text:
            continue
        all_entities.extend(
            ner.predict_section(text, section=section_name, min_confidence=min_confidence)
        )
    return all_entities
