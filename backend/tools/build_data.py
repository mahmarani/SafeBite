"""Regenerate Open Food Facts Parquet datasets from the source TSV."""

from backend.data.load import load_and_process_dataset


if __name__ == "__main__":
    load_and_process_dataset()
