"""Reproducible BERT Token-Classification (NER/KIE) Training for SafeBite.

Trains ``BertForTokenClassification`` on the brand-separated BIO dataset
(``backend/data/assets/gold_ner_200.jsonl``) starting from SafeBite's domain-adapted MLM
checkpoint (``backend/models/nlp/safebite_bert``), selects the best checkpoint by
validation entity-level F1, evaluates on the held-out ``test`` split, and
writes versioned model weights plus ``metadata.json`` to
``backend/models/nlp/safebite_ner/``.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import random
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from seqeval.metrics import classification_report, f1_score, precision_score, recall_score
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import BertForTokenClassification, BertTokenizerFast

ROOT = Path(__file__).resolve().parents[2]

from backend.services.language.bert_tokenizer import align_labels_with_tokens
from backend.services.language.ner_labels import ENTITY_TYPES, ID_TO_LABEL, LABEL_TO_ID, LABELS, validate_bio_sequence

DEFAULT_BASE_MODEL = ROOT / "models" / "nlp" / "safebite_bert"
FALLBACK_BASE_MODEL = "prajjwal1/bert-tiny"
DEFAULT_OUTPUT_DIR = ROOT / "models" / "nlp" / "safebite_ner"
DEFAULT_DATASET_PATH = ROOT / "data" / "assets" / "gold_ner_200.jsonl"


def _set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


class NerTokenDataset(Dataset):
    """Tokenized NER samples padded to fixed max_length for batch training."""

    def __init__(
        self,
        records: List[Dict[str, Any]],
        tokenizer: BertTokenizerFast,
        max_length: int = 128,
    ) -> None:
        self.samples: List[Dict[str, torch.Tensor]] = []
        for rec in records:
            words = list(rec["tokens"])
            labels = list(rec["bio_labels"])
            validate_bio_sequence(labels)

            encoded = tokenizer(
                [words],
                is_split_into_words=True,
                truncation=True,
                padding="max_length",
                max_length=max_length,
                return_tensors="pt",
            )
            aligned = align_labels_with_tokens(encoded, [labels], LABEL_TO_ID)[0]
            self.samples.append({
                "input_ids": encoded["input_ids"][0],
                "attention_mask": encoded["attention_mask"][0],
                "labels": torch.tensor(aligned, dtype=torch.long),
            })

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return self.samples[idx]


def _repair_bio_sequence(labels: List[str]) -> List[str]:
    """Convert any orphan I-<TYPE> tag into B-<TYPE> so decoded sequences are valid BIO."""
    repaired: List[str] = []
    prev_entity: Optional[str] = None
    for lbl in labels:
        if lbl == "O" or lbl not in LABEL_TO_ID:
            repaired.append("O")
            prev_entity = None
            continue
        prefix, entity = lbl.split("-", maxsplit=1)
        if prefix == "I" and prev_entity != entity:
            repaired.append(f"B-{entity}")
        else:
            repaired.append(lbl)
        prev_entity = entity
    validate_bio_sequence(repaired)
    return repaired


def _evaluate_split(
    model: BertForTokenClassification,
    tokenizer: BertTokenizerFast,
    records: List[Dict[str, Any]],
    device: torch.device,
    max_length: int = 128,
) -> Dict[str, Any]:
    """Run word-aligned inference on a split and compute seqeval metrics, confusion matrix, and error audit."""
    model.eval()
    gold_sequences: List[List[str]] = []
    pred_sequences: List[List[str]] = []

    entity_classes = ["O", *ENTITY_TYPES]
    confusion: Dict[str, Dict[str, int]] = {
        g: {p: 0 for p in entity_classes} for g in entity_classes
    }
    allergen_false_negatives: List[Dict[str, Any]] = []
    low_confidence_or_errors: List[Dict[str, Any]] = []

    with torch.no_grad():
        for rec in records:
            words = list(rec["tokens"])
            gold_labels = list(rec["bio_labels"])
            encoded = tokenizer(
                [words],
                is_split_into_words=True,
                truncation=True,
                max_length=max_length,
                return_tensors="pt",
            )
            word_ids = encoded.word_ids(batch_index=0)
            inputs = {k: v.to(device) for k, v in encoded.items()}
            logits = model(**inputs).logits[0]
            probs = torch.softmax(logits, dim=-1).cpu()
            pred_ids = logits.argmax(dim=-1).cpu().tolist()

            word_preds: List[str] = ["O"] * len(words)
            word_confs: List[float] = [1.0] * len(words)
            seen_words: set[int] = set()
            for tok_idx, word_idx in enumerate(word_ids):
                if word_idx is None or word_idx in seen_words:
                    continue
                seen_words.add(word_idx)
                pred_id = int(pred_ids[tok_idx])
                word_preds[word_idx] = ID_TO_LABEL[pred_id]
                word_confs[word_idx] = float(probs[tok_idx, pred_id].item())

            repaired_preds = _repair_bio_sequence(word_preds)
            gold_sequences.append(gold_labels)
            pred_sequences.append(repaired_preds)

            for w_idx, (word, g_lbl, p_lbl, conf) in enumerate(
                zip(words, gold_labels, repaired_preds, word_confs)
            ):
                g_type = "O" if g_lbl == "O" else g_lbl.split("-", 1)[1]
                p_type = "O" if p_lbl == "O" else p_lbl.split("-", 1)[1]
                confusion[g_type][p_type] += 1

                if g_type == "ALLERGEN" and p_type != "ALLERGEN":
                    allergen_false_negatives.append({
                        "sample_id": rec.get("sample_id"),
                        "token": word,
                        "gold": g_lbl,
                        "predicted": p_lbl,
                        "confidence": round(conf, 4),
                        "context": rec["text"][:140],
                    })
                elif (g_lbl != p_lbl or conf < 0.65) and len(low_confidence_or_errors) < 40:
                    low_confidence_or_errors.append({
                        "sample_id": rec.get("sample_id"),
                        "token": word,
                        "gold": g_lbl,
                        "predicted": p_lbl,
                        "confidence": round(conf, 4),
                    })

    overall_p = float(precision_score(gold_sequences, pred_sequences, zero_division=0))
    overall_r = float(recall_score(gold_sequences, pred_sequences, zero_division=0))
    overall_f1 = float(f1_score(gold_sequences, pred_sequences, zero_division=0))
    per_class_raw = classification_report(
        gold_sequences, pred_sequences, output_dict=True, zero_division=0
    )

    per_class: Dict[str, Dict[str, Any]] = {}
    for cls in ENTITY_TYPES:
        stats = per_class_raw.get(cls, {})
        per_class[cls] = {
            "precision": round(float(stats.get("precision", 0.0)), 4),
            "recall": round(float(stats.get("recall", 0.0)), 4),
            "f1": round(float(stats.get("f1-score", 0.0)), 4),
            "support": int(stats.get("support", 0)),
        }

    return {
        "precision": round(overall_p, 4),
        "recall": round(overall_r, 4),
        "f1": round(overall_f1, 4),
        "per_class": per_class,
        "confusion_matrix": confusion,
        "allergen_false_negative_count": len(allergen_false_negatives),
        "allergen_false_negatives": allergen_false_negatives,
        "sample_review_items": low_confidence_or_errors,
    }


def train_ner_model(
    dataset_path: Path = DEFAULT_DATASET_PATH,
    base_model: Optional[str] = None,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    epochs: int = 25,
    batch_size: int = 16,
    learning_rate: float = 2e-4,
    max_length: int = 128,
    seed: int = 42,
) -> Dict[str, Any]:
    """Train BertForTokenClassification on curated BIO data and save versioned artifacts."""
    _set_seed(seed)
    assert dataset_path.is_file(), f"Missing dataset: {dataset_path}"

    resolved_base = base_model or (
        str(DEFAULT_BASE_MODEL) if DEFAULT_BASE_MODEL.exists() else FALLBACK_BASE_MODEL
    )
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    records = [
        json.loads(line)
        for line in dataset_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    train_records = [r for r in records if r.get("split") == "train"]
    val_records = [r for r in records if r.get("split") == "val"]
    test_records = [r for r in records if r.get("split") == "test"]
    if not train_records or not val_records or not test_records:
        raise ValueError("Dataset must contain non-empty train, val, and test splits.")

    tokenizer = BertTokenizerFast.from_pretrained(resolved_base)
    model = BertForTokenClassification.from_pretrained(
        resolved_base,
        num_labels=len(LABELS),
        id2label=ID_TO_LABEL,
        label2id=LABEL_TO_ID,
    )
    model.to(device)

    train_dataset = NerTokenDataset(train_records, tokenizer, max_length=max_length)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    # Mild inverse-frequency class weights capped to keep training stable
    lbl_counts = Counter(lbl for r in train_records for lbl in r["bio_labels"])
    total_lbls = sum(lbl_counts.values())
    weights = []
    for lbl in LABELS:
        cnt = max(1, lbl_counts.get(lbl, 1))
        w = (total_lbls / (len(LABELS) * cnt)) ** 0.5
        weights.append(min(3.5, max(0.5, w)))
    class_weights = torch.tensor(weights, dtype=torch.float32, device=device)
    loss_fn = torch.nn.CrossEntropyLoss(weight=class_weights, ignore_index=-100)

    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=0.01)
    total_steps = max(1, len(train_loader) * epochs)
    scheduler = torch.optim.lr_scheduler.LinearLR(
        optimizer, start_factor=1.0, end_factor=0.1, total_iters=total_steps
    )

    best_val_f1 = -1.0
    best_epoch = 0
    output_dir.mkdir(parents=True, exist_ok=True)
    history: List[Dict[str, Any]] = []

    print(
        f"Training NER from '{resolved_base}' on {device} "
        f"(train={len(train_records)}, val={len(val_records)}, test={len(test_records)})"
    )
    t0 = time.perf_counter()

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for batch in train_loader:
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            logits = model(input_ids=input_ids, attention_mask=attention_mask).logits
            loss = loss_fn(logits.view(-1, len(LABELS)), labels.view(-1))
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            running_loss += float(loss.item())

        avg_loss = running_loss / max(1, len(train_loader))
        val_metrics = _evaluate_split(model, tokenizer, val_records, device, max_length=max_length)
        history.append({
            "epoch": epoch,
            "train_loss": round(avg_loss, 4),
            "val_f1": val_metrics["f1"],
            "val_precision": val_metrics["precision"],
            "val_recall": val_metrics["recall"],
        })
        if val_metrics["f1"] >= best_val_f1:
            best_val_f1 = val_metrics["f1"]
            best_epoch = epoch
            model.save_pretrained(output_dir)
            tokenizer.save_pretrained(output_dir)

        if epoch % 5 == 0 or epoch == epochs:
            print(
                f"  Epoch {epoch:2d}/{epochs} | loss={avg_loss:.4f} | "
                f"val_P={val_metrics['precision']:.3f} val_R={val_metrics['recall']:.3f} val_F1={val_metrics['f1']:.3f}"
            )

    # Reload best checkpoint and evaluate on held-out val & test splits
    best_model = BertForTokenClassification.from_pretrained(output_dir).to(device)
    final_val = _evaluate_split(best_model, tokenizer, val_records, device, max_length=max_length)
    final_test = _evaluate_split(best_model, tokenizer, test_records, device, max_length=max_length)

    dataset_sha256 = hashlib.sha256(dataset_path.read_bytes()).hexdigest()
    metadata = {
        "model_version": "1.0.0",
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "duration_seconds": round(time.perf_counter() - t0, 2),
        "base_model": resolved_base,
        "dataset": {
            "path": str(dataset_path.relative_to(ROOT)),
            "sha256": dataset_sha256,
            "train_rows": len(train_records),
            "val_rows": len(val_records),
            "test_rows": len(test_records),
        },
        "labels": list(LABELS),
        "hyperparameters": {
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "max_length": max_length,
            "seed": seed,
            "best_epoch": best_epoch,
        },
        "val_metrics": final_val,
        "test_metrics": final_test,
        "history": history,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SafeBite NER/KIE model.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET_PATH)
    parser.add_argument("--base-model", type=str, default=None)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    meta = train_ner_model(
        dataset_path=args.dataset,
        base_model=args.base_model,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        seed=args.seed,
    )
    print("\nHeld-out Test Metrics:", json.dumps(meta["test_metrics"], indent=2))
