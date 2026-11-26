"""Train K-Means clustering models for Nutri-Score (Grades A-E) and NutriLens Processing Tiers."""

from __future__ import annotations

from pathlib import Path
from backend.services.food.kmeans_scoring import DEFAULT_ARTIFACT_PATH, DEFAULT_DATASET_PATH, fit_kmeans_models


def main() -> None:
    artifact = fit_kmeans_models(DEFAULT_DATASET_PATH, DEFAULT_ARTIFACT_PATH)
    print(f"Trained K-Means models on {artifact['training_rows']} clean Open Food Facts products.")
    print(f"Saved artifact to: {DEFAULT_ARTIFACT_PATH}\n")

    ns = artifact["nutriscore_kmeans"]
    print("=== Nutri-Score K-Means (k=5, Grades A-E) ===")
    print("Features:", ", ".join(ns["features"]))
    for cid, grade in sorted(ns["cluster_to_grade"].items(), key=lambda kv: kv[1]):
        count = ns["cluster_counts"][cid]
        centroid = ns["centroids_raw"][int(cid)]
        print(f"  Grade {grade} (cluster {cid}, n={count}): {dict(zip(ns['features'], centroid))}")

    pt = artifact["processing_tier_kmeans"]
    print("\n=== NutriLens Processing Tier K-Means (k=3, Tiers 1/3/4) ===")
    print("Features:", ", ".join(pt["features"]))
    for cid, info in sorted(pt["cluster_to_tier"].items(), key=lambda kv: kv[1]["tier"]):
        count = pt["cluster_counts"][cid]
        centroid = pt["centroids_raw"][int(cid)]
        print(
            f"  Tier {info['tier']} - {info['label']} (cluster {cid}, n={count}): "
            f"{dict(zip(pt['features'], centroid))}"
        )


if __name__ == "__main__":
    main()
