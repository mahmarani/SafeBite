"""SafeBite NLP package.

Heavy training dependencies are imported only when their public helpers are
requested. This keeps lightweight modules such as ``nlp.ner_labels`` usable in
data-preparation and annotation tooling.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any


_EXPORTS = {
    "inject_ocr_noise": (".noise", "inject_ocr_noise"),
    "build_ingredient_vocabulary": (".corrector", "build_ingredient_vocabulary"),
    "flag_suspect_words": (".corrector", "flag_suspect_words"),
    "BertMLMCorrector": (".corrector", "BertMLMCorrector"),
    "evaluate_corrector": (".corrector", "evaluate_corrector"),
    "get_tokenizer": (".bert_tokenizer", "get_tokenizer"),
    "tokenize_ingredient_text": (".bert_tokenizer", "tokenize_ingredient_text"),
    "align_labels_with_tokens": (".bert_tokenizer", "align_labels_with_tokens"),
    "tokenize_and_align_ner": (".bert_tokenizer", "tokenize_and_align_ner"),
    "inspect_word_tokens": (".bert_tokenizer", "inspect_word_tokens"),
}

__all__ = list(_EXPORTS)


def __getattr__(name: str) -> Any:
    """Lazily load existing public helpers without eager optional imports."""
    try:
        module_name, attribute = _EXPORTS[name]
    except KeyError as error:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from error
    value = getattr(import_module(module_name, __name__), attribute)
    globals()[name] = value
    return value
