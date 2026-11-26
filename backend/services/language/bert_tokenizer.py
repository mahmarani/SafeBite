"""BERT Fast Tokenizer and NER label alignment for SafeBite."""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from transformers import BertTokenizerFast


DEFAULT_MODEL_DIR = str(Path(__file__).resolve().parents[2] / "models" / "nlp" / "safebite_bert")
FALLBACK_MODEL_NAME = "prajjwal1/bert-tiny"

_TOKENIZER: Optional[BertTokenizerFast] = None


def get_tokenizer(
    model_path_or_name: Optional[str] = None,
    allow_dev_fallback: Optional[bool] = None,
) -> BertTokenizerFast:
    """Lazy-load the SafeBite tokenizer, or fall back to the base model in development."""
    global _TOKENIZER
    if _TOKENIZER is None:
        if model_path_or_name is not None:
            target = model_path_or_name
        elif os.path.exists(DEFAULT_MODEL_DIR):
            target = DEFAULT_MODEL_DIR
        else:
            dev_mode = (
                allow_dev_fallback
                if allow_dev_fallback is not None
                else os.getenv("SAFEBITE_ENV", "development").lower() != "production"
            )
            if not dev_mode:
                raise FileNotFoundError(
                    f"SafeBite tokenizer checkpoint not found at {DEFAULT_MODEL_DIR} and dev fallback is disabled."
                )
            target = FALLBACK_MODEL_NAME
        _TOKENIZER = BertTokenizerFast.from_pretrained(target)
    return _TOKENIZER


def tokenize_ingredient_text(
    text: str,
    tokenizer: Optional[BertTokenizerFast] = None,
    max_length: int = 512,
    stride: int = 64,
) -> Dict[str, Any]:
    """Tokenize text with offsets and sliding-window overflow chunks."""
    tok = tokenizer or get_tokenizer()
    return tok(
        text,
        max_length=max_length,
        truncation=True,
        stride=stride,
        return_overflowing_tokens=True,
        return_offsets_mapping=True,
        padding=False,
    )


def align_labels_with_tokens(
    tokenized_inputs: Any,
    word_labels: List[List[Union[int, str]]],
    label_to_id: Optional[Dict[str, int]] = None,
) -> List[List[int]]:
    """Label only first subwords; mask continuations and special tokens with -100."""
    aligned_labels = []
    for index in range(len(tokenized_inputs["input_ids"])):
        word_ids = tokenized_inputs.word_ids(batch_index=index)
        sample_index = (
            tokenized_inputs["overflow_to_sample_mapping"][index]
            if "overflow_to_sample_mapping" in tokenized_inputs
            else index
        )
        previous_word_index = None
        label_ids = []
        for word_index in word_ids:
            if word_index is None:
                label_ids.append(-100)
            elif word_index != previous_word_index:
                label = word_labels[sample_index][word_index]
                label_ids.append(label_to_id[label] if label_to_id and isinstance(label, str) else int(label))
            else:
                label_ids.append(-100)
            previous_word_index = word_index
        aligned_labels.append(label_ids)
    return aligned_labels


def tokenize_and_align_ner(
    words: List[str],
    labels: List[Union[int, str]],
    tokenizer: Optional[BertTokenizerFast] = None,
    label_to_id: Optional[Dict[str, int]] = None,
    max_length: int = 512,
    stride: int = 64,
) -> Dict[str, Any]:
    """Tokenize pre-split words and align their NER labels to BERT subwords."""
    tok = tokenizer or get_tokenizer()
    tokenized = tok(
        [words],
        is_split_into_words=True,
        max_length=max_length,
        truncation=True,
        stride=stride,
        return_overflowing_tokens=True,
        return_offsets_mapping=True,
    )
    tokenized["labels"] = align_labels_with_tokens(tokenized, [labels], label_to_id)
    return tokenized


def inspect_word_tokens(
    word: str,
    tokenizer: Optional[BertTokenizerFast] = None,
) -> Dict[str, Any]:
    """Return BERT subword tokens, ids, and character offsets for one word."""
    tok = tokenizer or get_tokenizer()
    encoded = tok(word, add_special_tokens=False, return_offsets_mapping=True)
    token_ids = encoded["input_ids"]
    return {
        "word": word,
        "tokens": tok.convert_ids_to_tokens(token_ids),
        "token_ids": token_ids,
        "offsets": encoded["offset_mapping"],
        "subword_count": len(token_ids),
    }
