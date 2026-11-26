"""
SafeBite - OCR Noise Synthesizer
Injects realistic OCR-style character and token degradation:
- Visual confusions: 0 <-> o, 1 <-> l, rn <-> m, cl <-> d, vv <-> w, 5 <-> s, c <-> e
- Dropped letters (deletions)
- Insertion / character transposition
Used to benchmark BERT MLM error correction and train robust NLP models.
"""

import random
import re
from typing import Tuple, List, Dict, Any, Optional

# OCR character-level confusion substitutions (bidirectional where relevant)
OCR_CHAR_CONFUSIONS = {
    "o": ["0", "c", "e", "q"],
    "0": ["o", "O"],
    "l": ["1", "i", "|", "t"],
    "1": ["l", "i", "I"],
    "i": ["1", "l", "j"],
    "m": ["rn", "nn", "n"],
    "rn": ["m"],
    "d": ["cl", "ol", "b"],
    "cl": ["d"],
    "w": ["vv", "uu"],
    "vv": ["w"],
    "s": ["5", "$", "z"],
    "5": ["s", "S"],
    "c": ["e", "o", "a"],
    "e": ["c", "o", "a"],
    "u": ["v", "n"],
    "v": ["u", "y"],
    "b": ["6", "d", "h"],
    "g": ["9", "q"],
    "f": ["t"],
    "t": ["f", "l"],
}


def inject_token_noise(word: str, rng: random.Random) -> Tuple[str, Optional[str]]:
    """
    Injects a single OCR error into a token.
    Returns: (corrupted_word, error_type) or (word, None) if untouched.
    """
    if len(word) < 2 or not word.isalpha():
        return word, None

    # Multi-character substitutions first (e.g. rn <-> m, cl <-> d, vv <-> w)
    lower_w = word.lower()
    for multi_char in ["rn", "cl", "vv"]:
        if multi_char in lower_w and rng.random() < 0.6:
            rep = OCR_CHAR_CONFUSIONS[multi_char][0]
            idx = lower_w.find(multi_char)
            corrupted = word[:idx] + rep + word[idx + len(multi_char):]
            return corrupted, f"sub_{multi_char}_to_{rep}"

    # Character confusion, deletion, or insertion
    action = rng.choices(["confusion", "drop", "insert"], weights=[0.70, 0.20, 0.10])[0]

    # 1. Confusion (e.g. 0 <-> o, 1 <-> l, m -> rn)
    if action == "confusion":
        eligible_indices = [
            i for i, ch in enumerate(word) if ch.lower() in OCR_CHAR_CONFUSIONS
        ]
        if eligible_indices:
            idx = rng.choice(eligible_indices)
            orig_char = word[idx]
            sub = rng.choice(OCR_CHAR_CONFUSIONS[orig_char.lower()])
            # Preserve uppercase if original was uppercase
            if orig_char.isupper() and sub.isalpha():
                sub = sub.upper()
            corrupted = word[:idx] + sub + word[idx + 1:]
            return corrupted, f"confusion_{orig_char}_to_{sub}"

    # 2. Dropped letter (deletion)
    elif action == "drop" and len(word) >= 3:
        idx = rng.randint(1, len(word) - 2)  # Avoid dropping first/last char
        dropped = word[idx]
        corrupted = word[:idx] + word[idx + 1:]
        return corrupted, f"drop_{dropped}"

    # 3. Random typo insertion
    elif action == "insert":
        idx = rng.randint(1, len(word) - 1)
        ins = rng.choice("abcdefghijklmnopqrstuvwxyz")
        corrupted = word[:idx] + ins + word[idx:]
        return corrupted, f"insert_{ins}"

    return word, None


def inject_ocr_noise(
    text: str,
    error_rate: float = 0.15,
    seed: Optional[int] = None,
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Injects OCR-style noise into a clean ingredients string.

    Args:
        text: Clean reference ingredients text.
        error_rate: Probability of corrupting each eligible word (0.0 to 1.0).
        seed: Optional RNG seed for deterministic benchmarking.

    Returns:
        (noisy_text, list_of_mutations)
        where each mutation is {'original': str, 'corrupted': str, 'type': str}
    """
    if not text:
        return "", []

    rng = random.Random(seed) if seed is not None else random.Random()

    # Split text into tokens preserving delimiters
    tokens = re.findall(r"\w+|[^\w\s]|\s+", text)
    noisy_tokens = []
    mutations = []

    for tok in tokens:
        # Only corrupt alphabetic words of length >= 3
        if tok.isalpha() and len(tok) >= 3 and rng.random() < error_rate:
            corrupted, error_type = inject_token_noise(tok, rng)
            if corrupted != tok:
                noisy_tokens.append(corrupted)
                mutations.append({
                    "original": tok,
                    "corrupted": corrupted,
                    "type": error_type,
                })
                continue
        noisy_tokens.append(tok)

    return "".join(noisy_tokens), mutations


if __name__ == "__main__":
    sample = "organic rolled oats, cane sugar, sunflower oil, sea salt, natural vanilla flavor."
    print("Clean text:\n ", sample)
    for s in [42, 101, 777]:
        noisy, muts = inject_ocr_noise(sample, error_rate=0.4, seed=s)
        print(f"\nNoisy text (seed {s}):\n ", noisy)
        print(f"  Mutations ({len(muts)}):", [f"{m['original']} -> {m['corrupted']}" for m in muts])
