"""Regenerate the domain-adapted MLM checkpoint from text_set.parquet."""

from backend.services.language.train_mlm import run_mlm_training


if __name__ == "__main__":
    run_mlm_training()
