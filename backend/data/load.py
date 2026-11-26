"""
SafeBite - Data Pipeline: Open Food Facts Loader & Pre-splitter
Reads the Open Food Facts TSV file in memory-efficient chunks with header=None.
Filters, assigns 80/10/10 brand splits (leakage-free), and saves to Parquet.
"""

import os
from pathlib import Path
import sys
import hashlib
import argparse
from typing import List, Optional, Tuple
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# 211 Open Food Facts official column headers
DEFAULT_HEADERS = [
    "code", "url", "creator", "created_t", "created_datetime", "last_modified_t",
    "last_modified_datetime", "last_modified_by", "last_updated_t", "last_updated_datetime",
    "product_name", "abbreviated_product_name", "generic_name", "quantity", "packaging",
    "packaging_tags", "packaging_en", "packaging_text", "brands", "brands_tags",
    "brands_en", "categories", "categories_tags", "categories_en", "origins",
    "origins_tags", "origins_en", "manufacturing_places", "manufacturing_places_tags",
    "labels", "labels_tags", "labels_en", "emb_codes", "emb_codes_tags",
    "first_packaging_code_geo", "cities", "cities_tags", "purchase_places", "stores",
    "countries", "countries_tags", "countries_en", "ingredients_text", "ingredients_tags",
    "ingredients_analysis_tags", "allergens", "allergens_en", "traces", "traces_tags",
    "traces_en", "serving_size", "serving_quantity", "no_nutrition_data", "additives_n",
    "additives", "additives_tags", "additives_en", "nutriscore_score", "nutriscore_grade",
    "nova_group", "pnns_groups_1", "pnns_groups_2", "food_groups", "food_groups_tags",
    "food_groups_en", "states", "states_tags", "states_en", "brand_owner",
    "environmental_score_score", "environmental_score_grade", "nutrient_levels_tags",
    "product_quantity", "owner", "data_quality_errors_tags", "unique_scans_n",
    "popularity_tags", "completeness", "last_image_t", "last_image_datetime",
    "main_category", "main_category_en", "image_url", "image_small_url",
    "image_ingredients_url", "image_ingredients_small_url", "image_nutrition_url",
    "image_nutrition_small_url", "energy-kj_100g", "energy-kcal_100g", "energy_100g",
    "energy-from-fat_100g", "fat_100g", "saturated-fat_100g", "butyric-acid_100g",
    "caproic-acid_100g", "caprylic-acid_100g", "capric-acid_100g", "lauric-acid_100g",
    "myristic-acid_100g", "palmitic-acid_100g", "stearic-acid_100g", "arachidic-acid_100g",
    "behenic-acid_100g", "lignoceric-acid_100g", "cerotic-acid_100g", "montanic-acid_100g",
    "melissic-acid_100g", "unsaturated-fat_100g", "monounsaturated-fat_100g",
    "omega-9-fat_100g", "polyunsaturated-fat_100g", "omega-3-fat_100g", "omega-6-fat_100g",
    "alpha-linolenic-acid_100g", "eicosapentaenoic-acid_100g", "docosahexaenoic-acid_100g",
    "linoleic-acid_100g", "arachidonic-acid_100g", "gamma-linolenic-acid_100g",
    "dihomo-gamma-linolenic-acid_100g", "oleic-acid_100g", "elaidic-acid_100g",
    "gondoic-acid_100g", "mead-acid_100g", "erucic-acid_100g", "nervonic-acid_100g",
    "trans-fat_100g", "cholesterol_100g", "carbohydrates_100g", "sugars_100g",
    "added-sugars_100g", "sucrose_100g", "glucose_100g", "fructose_100g", "galactose_100g",
    "lactose_100g", "maltose_100g", "maltodextrins_100g", "psicose_100g", "starch_100g",
    "polyols_100g", "erythritol_100g", "isomalt_100g", "maltitol_100g", "sorbitol_100g",
    "fiber_100g", "soluble-fiber_100g", "polydextrose_100g", "insoluble-fiber_100g",
    "proteins_100g", "casein_100g", "serum-proteins_100g", "nucleotides_100g",
    "salt_100g", "added-salt_100g", "sodium_100g", "alcohol_100g", "vitamin-a_100g",
    "beta-carotene_100g", "vitamin-d_100g", "vitamin-e_100g", "vitamin-k_100g",
    "vitamin-c_100g", "vitamin-b1_100g", "vitamin-b2_100g", "vitamin-pp_100g",
    "vitamin-b6_100g", "vitamin-b9_100g", "folates_100g", "vitamin-b12_100g",
    "biotin_100g", "pantothenic-acid_100g", "silica_100g", "bicarbonate_100g",
    "potassium_100g", "chloride_100g", "calcium_100g", "phosphorus_100g", "iron_100g",
    "magnesium_100g", "zinc_100g", "copper_100g", "manganese_100g", "fluoride_100g",
    "selenium_100g", "chromium_100g", "molybdenum_100g", "iodine_100g", "caffeine_100g",
    "taurine_100g", "methylsulfonylmethane_100g", "hydroxymethylbutyrate_100g",
    "ph_100g", "fruits-vegetables-legumes_100g", "collagen-meat-protein-ratio_100g",
    "cocoa_100g", "chlorophyl_100g", "carbon-footprint_100g", "glycemic-index_100g",
    "water-hardness_100g", "choline_100g", "phylloquinone_100g", "beta-glucan_100g",
    "inositol_100g", "carnitine_100g", "sulphate_100g", "nitrate_100g", "acidity_100g",
    "carbohydrates-total_100g", "water_100g"
]


def select_target_columns(all_columns: List[str]) -> List[str]:
    """
    Selects only the requested SafeBite columns:
    - product name, brand
    - ingredients text and tags
    - allergens
    - serving size
    - per-100g nutrients
    - additives
    - image URLs
    """
    exact_targets = {
        "code",
        "product_name",
        "brands",
        "brands_tags",
        "ingredients_text",
        "ingredients_tags",
        "ingredients_analysis_tags",
        "allergens",
        "allergens_en",
        "traces",
        "traces_tags",
        "traces_en",
        "serving_size",
        "serving_quantity",
        "additives_n",
        "additives",
        "additives_tags",
        "additives_en",
        "image_url",
        "image_small_url",
        "image_ingredients_url",
        "image_ingredients_small_url",
        "image_nutrition_url",
        "image_nutrition_small_url",
    }
    return [c for c in all_columns if c in exact_targets or c.endswith("_100g")]


def assign_brand_split(brand: object, code: object) -> str:
    """
    Deterministically assigns a brand to 80% train, 10% val, or 10% test.
    Prevents brand-level data leakage across splits.
    Unbranded products fall back to code hash to distribute uniformly.
    """
    brand_str = str(brand).strip().lower() if pd.notna(brand) else ""
    if brand_str and brand_str != "nan":
        key = f"brand:{brand_str}"
    else:
        code_str = str(code).strip() if pd.notna(code) else "unknown"
        key = f"code:{code_str}"

    h = int(hashlib.md5(key.encode("utf-8")).hexdigest(), 16) % 100
    if h < 80:
        return "train"
    elif h < 90:
        return "val"
    else:
        return "test"


def load_and_process_dataset(
    file_path: str = str(Path(__file__).resolve().parent / "openfoodfacts_products.csv"),
    output_dir: str = str(Path(__file__).resolve().parent / "assets"),
    custom_headers: Optional[List[str]] = None,
    chunk_size: int = 50000,
    max_rows: Optional[int] = None,
) -> Tuple[str, str]:
    """
    Streams the dataset in chunks using sep='\\t' and header=None.
    Saves:
      - backend/data/assets/text_set.parquet (rows with ingredients text)
      - backend/data/assets/image_set.parquet (rows with ingredients text AND ingredients image URL)
    """
    headers = custom_headers or DEFAULT_HEADERS
    keep_cols = select_target_columns(headers)
    os.makedirs(output_dir, exist_ok=True)

    text_set_path = os.path.join(output_dir, "text_set.parquet")
    image_set_path = os.path.join(output_dir, "image_set.parquet")

    # Temporary storage for filtered chunks
    text_chunks = []
    image_chunks = []

    rows_read = 0
    print(f"Reading '{file_path}' in chunks of {chunk_size} rows...")
    print(f"Keeping {len(keep_cols)} columns matching specified targets.")

    # Read TSV with header=None
    reader = pd.read_csv(
        file_path,
        sep="\t",
        header=None,
        names=headers,
        chunksize=chunk_size,
        dtype=str,
        low_memory=False,
        on_bad_lines="skip",
    )

    for chunk_idx, chunk in enumerate(reader):
        # If line 0 is the raw header string, skip it
        if chunk_idx == 0:
            if chunk.iloc[0]["code"] == "code" or chunk.iloc[0]["product_name"] == "product_name":
                chunk = chunk.iloc[1:]

        # Filter to selected columns
        chunk = chunk[[c for c in keep_cols if c in chunk.columns]].copy()

        # Clean string columns
        has_ingredients = chunk["ingredients_text"].notna() & (chunk["ingredients_text"].str.strip() != "")
        
        # 3. Filter for text_set
        text_chunk = chunk[has_ingredients].copy()
        if not text_chunk.empty:
            text_chunk["split"] = [
                assign_brand_split(b, c)
                for b, c in zip(text_chunk["brands"], text_chunk["code"])
            ]
            text_chunks.append(text_chunk)

        # 4. Filter for image_set (has ingredient image URL AND ingredients text)
        has_image_url = (
            (chunk["image_ingredients_url"].notna() & (chunk["image_ingredients_url"].str.strip() != "")) |
            (chunk["image_ingredients_small_url"].notna() & (chunk["image_ingredients_small_url"].str.strip() != ""))
        )
        image_chunk = chunk[has_ingredients & has_image_url].copy()
        if not image_chunk.empty:
            image_chunk["split"] = [
                assign_brand_split(b, c)
                for b, c in zip(image_chunk["brands"], image_chunk["code"])
            ]
            image_chunks.append(image_chunk)

        rows_read += len(chunk)
        if chunk_idx % 5 == 0 or max_rows is not None:
            print(f"  Processed {rows_read:,} rows | text_set: {sum(len(c) for c in text_chunks):,} | image_set: {sum(len(c) for c in image_chunks):,}")

        if max_rows is not None and rows_read >= max_rows:
            print(f"Reached max_rows limit ({max_rows:,}). Stopping stream.")
            break

    # Concatenate and save to parquet
    print("\nSaving text_set.parquet...")
    if text_chunks:
        df_text = pd.concat(text_chunks, ignore_index=True)
        df_text.to_parquet(text_set_path, index=False, engine="pyarrow")
    else:
        df_text = pd.DataFrame(columns=keep_cols + ["split"])
        df_text.to_parquet(text_set_path, index=False, engine="pyarrow")

    print("Saving image_set.parquet...")
    if image_chunks:
        df_image = pd.concat(image_chunks, ignore_index=True)
        df_image.to_parquet(image_set_path, index=False, engine="pyarrow")
    else:
        df_image = pd.DataFrame(columns=keep_cols + ["split"])
        df_image.to_parquet(image_set_path, index=False, engine="pyarrow")

    # 5. Print counts per split
    print_split_summary("Text Set (backend/data/assets/text_set.parquet)", df_text)
    print_split_summary("Image Set (backend/data/assets/image_set.parquet)", df_image)

    return text_set_path, image_set_path


def print_split_summary(title: str, df: pd.DataFrame):
    """Prints 80/10/10 split statistics."""
    total = len(df)
    print("\n" + "=" * 55)
    print(f"📊 {title}")
    print(f"Total Rows: {total:,}")
    if total == 0:
        print("  (Empty dataset)")
        print("=" * 55)
        return

    counts = df["split"].value_counts()
    train_n = counts.get("train", 0)
    val_n = counts.get("val", 0)
    test_n = counts.get("test", 0)

    print(f"  Train : {train_n:8,d} ({train_n / total * 100:5.1f}%)")
    print(f"  Val   : {val_n:8,d} ({val_n / total * 100:5.1f}%)")
    print(f"  Test  : {test_n:8,d} ({test_n / total * 100:5.1f}%)")
    print("=" * 55)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Open Food Facts Dataset Loader & Splitter")
    parser.add_argument(
        "--file",
        default=str(Path(__file__).resolve().parent / "openfoodfacts_products.csv"),
        help="Path to Open Food Facts TSV",
    )
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent / "assets"),
        help="Output directory for generated datasets",
    )
    parser.add_argument("--sample-rows", type=int, default=None, help="Process first N rows for quick testing")
    parser.add_argument("--chunk-size", type=int, default=50000, help="Chunk size for streaming")
    args = parser.parse_args()

    load_and_process_dataset(
        file_path=args.file,
        output_dir=args.output_dir,
        chunk_size=args.chunk_size,
        max_rows=args.sample_rows,
    )
