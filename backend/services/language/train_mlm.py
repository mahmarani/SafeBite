"""
SafeBite - Continue MLM Training on Ingredients Dataset
Performs domain-adaptation Masked Language Modeling (MLM) on clean ingredient strings
from the backend dataset. Uses native PyTorch training loop (no accelerate dependency).
Saves the fine-tuned checkpoint under backend/models/nlp/safebite_bert/.
"""

import os
from pathlib import Path
import argparse
from typing import List
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    BertTokenizer,
    BertForMaskedLM,
    DataCollatorForLanguageModeling,
)

class IngredientDataset(Dataset):
    """PyTorch Dataset yielding tokenized ingredient strings for MLM."""

    def __init__(self, texts: List[str], tokenizer: BertTokenizer, max_length: int = 128):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=max_length,
            return_tensors="pt",
        )

    def __len__(self):
        return len(self.encodings["input_ids"])

    def __getitem__(self, idx):
        return {
            "input_ids": self.encodings["input_ids"][idx],
            "attention_mask": self.encodings["attention_mask"][idx],
        }


def run_mlm_training(
    parquet_path: str = str(Path(__file__).resolve().parents[2] / "data" / "assets" / "text_set.parquet"),
    base_model_name: str = "prajjwal1/bert-tiny",
    output_dir: str = str(Path(__file__).resolve().parents[2] / "models" / "nlp" / "safebite_bert"),
    epochs: int = 2,
    batch_size: int = 16,
    learning_rate: float = 5e-5,
    max_train_samples: int = 1000,
):
    """
    Continues MLM domain pretraining on ingredients text using a clean native PyTorch loop.
    """
    print(f"=== Starting SafeBite Domain-Adaptation MLM Training ===")
    assert os.path.exists(parquet_path), f"Missing dataset: {parquet_path}"

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # 1. Load dataset texts
    df = pd.read_parquet(parquet_path)
    train_df = df[df["split"] == "train"] if "split" in df.columns else df
    train_texts = [
        str(t).strip() for t in train_df["ingredients_text"].dropna() if len(str(t).strip()) > 5
    ][:max_train_samples]
    print(f"Loaded {len(train_texts)} train texts.")

    # 2. Tokenizer & Base Model
    print(f"Loading base model: {base_model_name}...")
    tokenizer = BertTokenizer.from_pretrained(base_model_name)
    model = BertForMaskedLM.from_pretrained(base_model_name)
    model.to(device)

    # 3. DataCollator for MLM (dynamic 15% masking)
    dataset = IngredientDataset(train_texts, tokenizer)
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=True,
        mlm_probability=0.15,
        return_tensors="pt",
    )
    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,
        collate_fn=data_collator,
    )

    # 4. Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=0.01)

    # 5. Training Loop
    model.train()
    total_steps = len(dataloader) * epochs
    print(f"Training for {epochs} epoch(s), {total_steps} total batches...")

    for epoch in range(1, epochs + 1):
        running_loss = 0.0
        for batch_idx, batch in enumerate(dataloader, start=1):
            batch = {k: v.to(device) for k, v in batch.items()}
            optimizer.zero_grad()

            outputs = model(**batch)
            loss = outputs.loss
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

            if batch_idx % max(1, len(dataloader) // 5) == 0 or batch_idx == len(dataloader):
                avg_loss = running_loss / batch_idx
                print(f"  Epoch [{epoch}/{epochs}] Batch [{batch_idx}/{len(dataloader)}] - MLM Loss: {avg_loss:.4f}")

    # 6. Save Fine-Tuned Checkpoint
    os.makedirs(output_dir, exist_ok=True)
    print(f"\nSaving fine-tuned MLM model and tokenizer to: {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print("✅ Domain-Adaptation MLM Training complete!\n")
    return output_dir


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Continue MLM training on food ingredients")
    parser.add_argument("--parquet", default=str(Path(__file__).resolve().parents[2] / "data" / "assets" / "text_set.parquet"), help="Path to text_set.parquet")
    parser.add_argument("--base-model", default="prajjwal1/bert-tiny", help="Base BERT model")
    parser.add_argument("--output-dir", default=str(Path(__file__).resolve().parents[2] / "models" / "nlp" / "safebite_bert"), help="Output directory")
    parser.add_argument("--epochs", type=int, default=1, help="Training epochs")
    parser.add_argument("--max-samples", type=int, default=100, help="Max train samples (default 100 for fast demo)")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size")
    args = parser.parse_args()

    run_mlm_training(
        parquet_path=args.parquet,
        base_model_name=args.base_model,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        max_train_samples=args.max_samples,
    )
