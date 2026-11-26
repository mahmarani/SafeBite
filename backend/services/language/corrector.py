"""
SafeBite - BERT Masked Language Model (MLM) Error Corrector
Corrects OCR typos in food ingredient strings:
1. Builds canonical ingredient vocabulary from the backend dataset.
2. Flags suspect words not present in the vocabulary.
3. Masks suspect words, queries BERT for top-20 candidates, filters to edit distance <= 2,
   and ranks by BERT probability + character similarity.
4. Evaluates correction accuracy and false correction rate (how often correct words get broken).
"""

import os
from pathlib import Path
import re
import difflib
from collections import Counter
from typing import Set, List, Tuple, Dict, Any, Optional
import pandas as pd
import torch
from transformers import BertTokenizer, BertForMaskedLM

from backend.services.language.noise import inject_ocr_noise

DEFAULT_MLM_DIR = str(Path(__file__).resolve().parents[2] / "models" / "nlp" / "safebite_bert")
FALLBACK_MLM_NAME = "prajjwal1/bert-tiny"

_E_NUMBER_RE = re.compile(r"^e\d{3,4}[a-z]?$", re.IGNORECASE)
_MEASUREMENT_RE = re.compile(r"^\d+(?:\.\d+)?(?:g|mg|mcg|ug|ml|l|kg|%|kcal|kj)?$", re.IGNORECASE)
_VITAMIN_RE = re.compile(r"^(?:[abdekp]\d{1,2}|omega\d)$", re.IGNORECASE)
_OCR_HOMOGLYPHS = {
    "0": "o",
    "1": "il",
    "5": "s",
    "8": "b",
    "3": "e",
    "4": "a",
    "6": "g",
}

PROTECTED_LABEL_TERMS = {
    "nutrition", "nutritional", "facts", "information", "calories", "energy",
    "kcal", "kj", "serving", "servings", "size", "amount", "daily", "value",
    "percent", "per", "total", "fat", "fats", "saturated", "trans", "unsaturated",
    "cholesterol", "sodium", "salt", "carbohydrate", "carbohydrates", "dietary",
    "fiber", "fibre", "sugar", "sugars", "added", "protein", "proteins",
    "vitamin", "vitamins", "calcium", "iron", "potassium", "ingredients",
    "contains", "may", "contain", "traces", "allergen", "allergens",
}


def _is_ocr_homoglyph_match(suspect: str, candidate: str) -> bool:
    """Return True if suspect differs from candidate only by known OCR digit/letter confusions."""
    if len(suspect) != len(candidate) or suspect == candidate:
        return False
    for sc, cc in zip(suspect, candidate):
        if sc == cc:
            continue
        if cc not in _OCR_HOMOGLYPHS.get(sc, ""):
            return False
    return True


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev[j + 1] + 1
            deletions = curr[j] + 1
            substitutions = prev[j] + (c1 != c2)
            curr.append(min(insertions, deletions, substitutions))
        prev = curr
    return prev[-1]


def build_ingredient_vocabulary(
    parquet_path: str = str(Path(__file__).resolve().parents[2] / "data" / "assets" / "text_set.parquet"),
    min_freq: int = 2,
    cache_path: str = str(Path(__file__).resolve().parents[2] / "data" / "assets" / "ingredient_vocab.txt"),
) -> Set[str]:
    """
    Builds a canonical set of ingredient words from the train split of text_set.parquet.
    Caches the vocabulary to disk for rapid reloading.
    """
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            vocab = {line.strip().lower() for line in f if line.strip()}
        if len(vocab) > 50:
            return vocab

    if not os.path.exists(parquet_path):
        raise FileNotFoundError(f"Missing {parquet_path}. Run the dataset preparation tool first!")

    df = pd.read_parquet(parquet_path)
    # Use train split if available to avoid data leakage
    if "split" in df.columns:
        train_texts = df[df["split"] == "train"]["ingredients_text"].dropna()
    else:
        train_texts = df["ingredients_text"].dropna()

    word_counts = Counter()
    for text in train_texts:
        words = re.findall(r"\b[a-zA-Z]{2,}\b", text.lower())
        word_counts.update(words)

    # Core food terminology that should always be valid
    essential_words = {
        "organic", "water", "sugar", "salt", "oil", "flour", "wheat", "milk", "soy",
        "lecithin", "cocoa", "butter", "extract", "natural", "flavor", "flavour", "syrup",
        "acid", "citric", "powder", "corn", "rice", "yeast", "spices", "starch", "palm",
        "protein", "sodium", "calcium", "potassium", "vitamin", "preservative", "emulsifier",
        "contains", "ingredients", "and", "or", "traces", "may", "seeds", "nuts", "oats",
    }

    filtered_vocab = {w for w, count in word_counts.items() if count >= min_freq}
    filtered_vocab.update(essential_words)

    # Cache vocabulary
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        for w in sorted(filtered_vocab):
            f.write(f"{w}\n")

    return filtered_vocab


def _is_protected_token(tok: str) -> bool:
    """Protect numeric evidence and tokens the vocabulary corrector cannot safely edit."""
    # Any digit-bearing token may be a nutrition quantity, percentage, serving
    # size, E-number, or vitamin code. Never let the MLM rewrite that evidence.
    if not tok.isascii() or not tok.isalnum() or any(char.isdigit() for char in tok):
        return True
    if len(tok) < 3 or (tok.isalpha() and len(tok) < 4):
        return True
    if _MEASUREMENT_RE.match(tok) or _E_NUMBER_RE.match(tok) or _VITAMIN_RE.match(tok):
        return True
    return False


def flag_suspect_words(text: str, vocab: Set[str]) -> List[Tuple[str, int, int]]:
    """
    Identifies words in text that are not present in the canonical vocabulary.
    Returns: list of (suspect_word, start_char, end_char)
    """
    suspects = []
    # Match words including OCR digit substitutions (e.g., 5ugar, o1l, oat5, s0dium)
    for m in re.finditer(r"\b[a-zA-Z0-9]{2,}\b", text):
        word = m.group(0)
        if _is_protected_token(word):
            continue

        lower_w = word.lower()
        if lower_w not in vocab:
            suspects.append((word, m.start(), m.end()))
    return suspects


class BertMLMCorrector:
    """
    Corrects OCR errors using BERT Masked Language Modeling + Levenshtein distance filtering.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        vocab: Optional[Set[str]] = None,
        device: Optional[str] = None,
        allow_dev_fallback: Optional[bool] = None,
    ):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.is_dev_fallback = False

        if model_name is not None:
            resolved_model = model_name
        elif os.path.exists(DEFAULT_MLM_DIR):
            resolved_model = DEFAULT_MLM_DIR
        else:
            dev_mode = (
                allow_dev_fallback
                if allow_dev_fallback is not None
                else os.getenv("SAFEBITE_ENV", "development").lower() != "production"
            )
            if not dev_mode:
                raise FileNotFoundError(
                    f"SafeBite MLM checkpoint not found at {DEFAULT_MLM_DIR} and dev fallback is disabled."
                )
            resolved_model = FALLBACK_MLM_NAME
            self.is_dev_fallback = True
            print(f"[WARNING] SafeBite MLM checkpoint missing; using dev fallback '{FALLBACK_MLM_NAME}'.")

        self.model_name = resolved_model
        print(f"Loading BERT MLM model '{resolved_model}' onto {self.device}...")
        self.tokenizer = BertTokenizer.from_pretrained(resolved_model)
        self.model = BertForMaskedLM.from_pretrained(resolved_model)
        self.model.to(self.device)
        self.model.eval()

        self.vocab = set(vocab) if vocab is not None else build_ingredient_vocabulary()
        self.vocab.update(PROTECTED_LABEL_TERMS)
        self.mask_token = self.tokenizer.mask_token  # '[MASK]'
        self.mask_token_id = self.tokenizer.mask_token_id

    def get_candidates_for_suspect(
        self,
        suspect_word: str,
        context_with_mask: str,
        top_k: int = 50,
        max_edit_distance: int = 2,
        alpha: float = 0.35,
    ) -> Optional[Tuple[str, float]]:
        """
        Queries BERT for top-K candidates at the [MASK] position and checks
        vocabulary neighbors within edit distance <= max_edit_distance,
        ranking candidates using BERT probability + character similarity.

        Returns: (best_candidate, score) or None
        """
        inputs = self.tokenizer(context_with_mask, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        input_ids = inputs["input_ids"][0]
        mask_positions = (input_ids == self.mask_token_id).nonzero(as_tuple=True)[0]
        if len(mask_positions) == 0:
            return None
        mask_idx = mask_positions[0].item()

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits[0, mask_idx]
            probs = torch.softmax(logits, dim=-1)

        clean_suspect = suspect_word.lower()
        candidate_probs: Dict[str, float] = {}

        # 1. Top-K BERT MLM predictions
        top_probs, top_indices = torch.topk(probs, k=min(top_k, probs.shape[0]))
        for prob, idx in zip(top_probs, top_indices):
            cand_token = self.tokenizer.decode([idx.item()]).strip().lower()
            if cand_token.startswith("##") or not cand_token.isalpha() or len(cand_token) < 3:
                continue
            if levenshtein_distance(clean_suspect, cand_token) <= max_edit_distance:
                candidate_probs[cand_token] = max(candidate_probs.get(cand_token, 0.0), prob.item())

        # 2. Vocabulary neighbors within edit distance (catches domain words outside top-K)
        len_suspect = len(clean_suspect)
        unk_id = self.tokenizer.unk_token_id
        for w in self.vocab:
            if not w.isalpha() or len(w) < 3 or abs(len(w) - len_suspect) > max_edit_distance:
                continue
            if w in candidate_probs:
                continue
            if levenshtein_distance(clean_suspect, w) <= max_edit_distance:
                tok_id = self.tokenizer.convert_tokens_to_ids(w)
                if tok_id is not None and tok_id != unk_id and tok_id < probs.shape[0]:
                    candidate_probs[w] = probs[tok_id].item()
                else:
                    candidate_probs[w] = 0.0

        if not candidate_probs:
            return None

        candidates = []
        for cand_token, bert_prob_val in candidate_probs.items():
            dist = levenshtein_distance(clean_suspect, cand_token)
            is_homoglyph = _is_ocr_homoglyph_match(clean_suspect, cand_token)
            # Require contextual BERT support or homoglyph match for edit-distance-2 jumps
            # to avoid rewriting unusual product/foreign words into unrelated terms.
            if dist >= 2 and not is_homoglyph and bert_prob_val < 0.01:
                continue
            char_sim = difflib.SequenceMatcher(None, clean_suspect, cand_token).ratio()
            if is_homoglyph:
                char_sim = max(char_sim, 0.90)
            vocab_bonus = 0.15 if cand_token in self.vocab else 0.0
            raw_score = (alpha * bert_prob_val) + ((1.0 - alpha) * char_sim) + vocab_bonus
            score = min(1.0, max(0.0, raw_score))
            candidates.append((cand_token, score, dist))

        if not candidates:
            return None
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_cand, best_score, _ = candidates[0]
        return best_cand, best_score

    def correct_text(
        self,
        text: str,
        max_edit_distance: int = 2,
        min_confidence: float = 0.65,
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Finds suspect words, queries BERT MLM, and replaces confirmed OCR typos
        while preserving original character offsets for traceability.
        """
        suspects = flag_suspect_words(text, self.vocab)
        if not suspects:
            return text, []

        corrections = []
        matches = list(re.finditer(r"\w+|[^\w\s]|\s+", text))
        result_tokens = [m.group(0) for m in matches]

        for i, m in enumerate(matches):
            tok = m.group(0)
            if _is_protected_token(tok):
                continue

            if tok.lower() not in self.vocab:
                masked_tokens = list(result_tokens)
                masked_tokens[i] = self.mask_token
                masked_context = "".join(masked_tokens)

                cand_res = self.get_candidates_for_suspect(
                    suspect_word=tok,
                    context_with_mask=masked_context,
                    top_k=50,
                    max_edit_distance=max_edit_distance,
                )

                if cand_res:
                    best_word, score = cand_res
                    if score >= min_confidence and best_word.lower() != tok.lower():
                        replacement = best_word.capitalize() if tok.istitle() else best_word
                        result_tokens[i] = replacement
                        corrections.append({
                            "original": tok,
                            "corrected": replacement,
                            "score": round(score, 4),
                            "start": m.start(),
                            "end": m.end(),
                        })

        return "".join(result_tokens), corrections


def evaluate_corrector(
    corrector: BertMLMCorrector,
    val_texts: List[str],
    noise_rate: float = 0.15,
    min_confidence: float = 0.65,
) -> Dict[str, Any]:
    """
    Evaluates:
    1. Precision, recall, and F1 on injected OCR errors.
    2. False-correction rate on clean words (how often valid words are rewritten).
    """
    total_injected = 0
    correctly_fixed = 0
    wrong_fixes = 0
    total_clean_words = 0
    broken_clean_words = 0

    for idx, clean_text in enumerate(val_texts):
        # 1. Inject noise
        noisy_text, mutations = inject_ocr_noise(clean_text, error_rate=noise_rate, seed=idx + 100)
        total_injected += len(mutations)

        # Track clean words
        clean_words = re.findall(r"\b[a-zA-Z]{3,}\b", clean_text.lower())
        total_clean_words += len(clean_words)

        # 2. Run MLM corrector
        corrected_text, corrections = corrector.correct_text(noisy_text, min_confidence=min_confidence)

        # Count fixes
        mut_map = {m["corrupted"].lower(): m["original"].lower() for m in mutations}
        for corr in corrections:
            orig_noisy = corr["original"].lower()
            fixed_to = corr["corrected"].lower()

            if orig_noisy in mut_map:
                if fixed_to == mut_map[orig_noisy]:
                    correctly_fixed += 1
                else:
                    wrong_fixes += 1
            else:
                # A clean word was mistakenly modified
                broken_clean_words += 1

    total_applied = correctly_fixed + wrong_fixes + broken_clean_words
    precision = (correctly_fixed / total_applied * 100) if total_applied > 0 else 100.0
    correction_accuracy = (correctly_fixed / total_injected * 100) if total_injected > 0 else 0.0
    f1 = (
        (2 * precision * correction_accuracy / (precision + correction_accuracy))
        if (precision + correction_accuracy) > 0
        else 0.0
    )
    broken_rate = (broken_clean_words / total_clean_words * 100) if total_clean_words > 0 else 0.0

    return {
        "total_injected_errors": total_injected,
        "successfully_corrected": correctly_fixed,
        "wrong_corrections": wrong_fixes,
        "precision_pct": round(precision, 2),
        "recall_pct": round(correction_accuracy, 2),
        "f1_pct": round(f1, 2),
        "correction_accuracy_pct": round(correction_accuracy, 2),
        "total_clean_words": total_clean_words,
        "broken_clean_words": broken_clean_words,
        "broken_words_rate_pct": round(broken_rate, 2),
        "clean_word_retention_pct": round(100.0 - broken_rate, 2),
    }
