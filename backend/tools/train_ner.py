"""Run reproducible SafeBite NER training and write checkpoint metadata."""

from pathlib import Path
import sys


from backend.services.language.train_ner import train_ner_model


if __name__ == "__main__":
    import json
    meta = train_ner_model()
    print(json.dumps({
        "best_epoch": meta["hyperparameters"]["best_epoch"],
        "val_f1": meta["val_metrics"]["f1"],
        "test_precision": meta["test_metrics"]["precision"],
        "test_recall": meta["test_metrics"]["recall"],
        "test_f1": meta["test_metrics"]["f1"],
        "allergen_false_negatives": meta["test_metrics"]["allergen_false_negative_count"],
    }, indent=2))
