"""Build and validate the SafeBite BIO-tagged NER dataset."""

from pathlib import Path
import sys


from backend.services.language.build_ner_dataset import build_curated_dataset


if __name__ == "__main__":
    import json
    print(json.dumps(build_curated_dataset(), indent=2))
