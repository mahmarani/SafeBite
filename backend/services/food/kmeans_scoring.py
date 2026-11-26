"""K-Means clustering for Nutri-Score (Grades A-E) and NutriLens Processing Tier (Tiers 1, 3, 4).

Trains two StandardScaler + KMeans models on clean Open Food Facts product rows
from the backend text dataset and persists their centroids/scalers to
``backend/services/kb/kmeans_clusters.json`` for fast, deterministic, dependency-light inference.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Sequence, Tuple

import numpy as np

DEFAULT_DATASET_PATH = Path(__file__).resolve().parents[2] / "data" / "assets" / "text_set.parquet"
DEFAULT_ARTIFACT_PATH = Path(__file__).with_name("kmeans_clusters.json")

NUTRI_FEATURES: Tuple[str, ...] = (
    "energy-kcal_100g",
    "saturated-fat_100g",
    "sugars_100g",
    "sodium_100g",
    "fiber_100g",
    "proteins_100g",
)

PROC_FEATURES: Tuple[str, ...] = (
    "additives_n",
    "sugars_100g",
    "fat_100g",
    "sodium_100g",
    "fiber_100g",
)

GRADE_TO_SCORE: Dict[str, float] = {
    "A": 92.0,
    "B": 83.0,
    "C": 72.0,
    "D": 57.0,
    "E": 35.0,
}

GRADE_TO_STATUS: Dict[str, Literal["Healthy", "Moderate", "Requires attention"]] = {
    "A": "Healthy",
    "B": "Healthy",
    "C": "Moderate",
    "D": "Requires attention",
    "E": "Requires attention",
}

TIER_RANK_MAP: Tuple[Tuple[int, Literal["Minimally Processed", "Processed", "Ultra-Processed"]], ...] = (
    (1, "Minimally Processed"),
    (3, "Processed"),
    (4, "Ultra-Processed"),
)


@dataclass(frozen=True)
class KMeansNutriScoreResult:
    grade: Optional[Literal["A", "B", "C", "D", "E"]]
    score: Optional[float]
    health_status: Literal["Healthy", "Moderate", "Requires attention", "Unknown"]
    cluster_id: Optional[int]
    distance_to_centroid: Optional[float]


@dataclass(frozen=True)
class KMeansProcessingTierResult:
    tier: Optional[Literal[1, 3, 4]]
    processing_level: Literal["Minimally Processed", "Processed", "Ultra-Processed", "Unknown"]
    cluster_id: Optional[int]
    distance_to_centroid: Optional[float]


def fit_kmeans_models(
    dataset_path: Path = DEFAULT_DATASET_PATH,
    output_path: Path = DEFAULT_ARTIFACT_PATH,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Fit K-Means models on Open Food Facts data and save JSON centroids/scalers."""
    import pandas as pd
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    df = pd.read_parquet(dataset_path)
    all_cols = sorted(set(NUTRI_FEATURES) | set(PROC_FEATURES))
    sub = df[all_cols].apply(pd.to_numeric, errors="coerce").dropna()

    mask = (
        sub["energy-kcal_100g"].between(0, 900)
        & sub["fat_100g"].between(0, 100)
        & sub["saturated-fat_100g"].between(0, 85)
        & sub["sugars_100g"].between(0, 100)
        & sub["fiber_100g"].between(0, 50)
        & sub["proteins_100g"].between(0, 90)
        & sub["sodium_100g"].between(0, 5)
        & sub["additives_n"].between(0, 50)
    )
    clean = sub[mask].copy()

    # 1. Nutri-Score Grade K-Means (k=5)
    X_nutri = clean[list(NUTRI_FEATURES)].to_numpy(dtype=float)
    scaler_n = StandardScaler().fit(X_nutri)
    X_nutri_scaled = scaler_n.transform(X_nutri)
    km_n = KMeans(n_clusters=5, random_state=random_state, n_init=10).fit(X_nutri_scaled)

    # Rank clusters from healthiest (lowest negative-nutrient load) to least healthy
    # Features: [energy, sat_fat, sugars, sodium, fiber, proteins]
    nutri_weights = np.array([1.0, 1.0, 1.0, 1.0, -1.0, -1.0])
    nutri_risk_scores = km_n.cluster_centers_ @ nutri_weights
    nutri_order = [int(idx) for idx in np.argsort(nutri_risk_scores)]
    grades = ["A", "B", "C", "D", "E"]
    nutri_cluster_to_grade = {cid: grades[rank] for rank, cid in enumerate(nutri_order)}

    nutri_counts = {int(k): int(v) for k, v in zip(*np.unique(km_n.labels_, return_counts=True))}
    nutri_raw_centroids = scaler_n.inverse_transform(km_n.cluster_centers_)

    # 2. NutriLens Processing Tier K-Means (k=3 -> Tier 1, Tier 3, Tier 4)
    X_proc = clean[list(PROC_FEATURES)].to_numpy(dtype=float)
    scaler_p = StandardScaler().fit(X_proc)
    X_proc_scaled = scaler_p.transform(X_proc)
    km_p = KMeans(n_clusters=3, random_state=random_state, n_init=10).fit(X_proc_scaled)

    # Features: [additives_n, sugars_100g, fat_100g, sodium_100g, fiber_100g]
    proc_weights = np.array([2.0, 1.0, 1.0, 1.0, -0.5])
    proc_scores = km_p.cluster_centers_ @ proc_weights
    proc_order = [int(idx) for idx in np.argsort(proc_scores)]
    proc_cluster_to_tier = {
        cid: {"tier": TIER_RANK_MAP[rank][0], "label": TIER_RANK_MAP[rank][1]}
        for rank, cid in enumerate(proc_order)
    }

    proc_counts = {int(k): int(v) for k, v in zip(*np.unique(km_p.labels_, return_counts=True))}
    proc_raw_centroids = scaler_p.inverse_transform(km_p.cluster_centers_)

    artifact: Dict[str, Any] = {
        "schema_version": "1.0.0",
        "training_rows": int(len(clean)),
        "nutriscore_kmeans": {
            "k": 5,
            "features": list(NUTRI_FEATURES),
            "scaler_mean": [round(float(x), 6) for x in scaler_n.mean_],
            "scaler_scale": [round(float(x), 6) for x in scaler_n.scale_],
            "centroids_scaled": [[round(float(v), 6) for v in row] for row in km_n.cluster_centers_],
            "centroids_raw": [[round(float(v), 3) for v in row] for row in nutri_raw_centroids],
            "cluster_to_grade": {str(k): v for k, v in nutri_cluster_to_grade.items()},
            "cluster_counts": {str(k): v for k, v in nutri_counts.items()},
            "inertia": round(float(km_n.inertia_), 2),
        },
        "processing_tier_kmeans": {
            "k": 3,
            "features": list(PROC_FEATURES),
            "scaler_mean": [round(float(x), 6) for x in scaler_p.mean_],
            "scaler_scale": [round(float(x), 6) for x in scaler_p.scale_],
            "centroids_scaled": [[round(float(v), 6) for v in row] for row in km_p.cluster_centers_],
            "centroids_raw": [[round(float(v), 3) for v in row] for row in proc_raw_centroids],
            "cluster_to_tier": {str(k): v for k, v in proc_cluster_to_tier.items()},
            "cluster_counts": {str(k): v for k, v in proc_counts.items()},
            "inertia": round(float(km_p.inertia_), 2),
        },
    }

    output_path.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    return artifact


_CACHED_ARTIFACT: Optional[Dict[str, Any]] = None


def load_kmeans_artifact(path: Path = DEFAULT_ARTIFACT_PATH) -> Dict[str, Any]:
    global _CACHED_ARTIFACT
    if _CACHED_ARTIFACT is None or path != DEFAULT_ARTIFACT_PATH:
        data = json.loads(path.read_text(encoding="utf-8"))
        if path == DEFAULT_ARTIFACT_PATH:
            _CACHED_ARTIFACT = data
        return data
    return _CACHED_ARTIFACT


def _nearest_cluster(
    values: Sequence[float],
    mean: Sequence[float],
    scale: Sequence[float],
    centroids_scaled: Sequence[Sequence[float]],
) -> Tuple[int, float]:
    x = np.asarray(values, dtype=float)
    m = np.asarray(mean, dtype=float)
    s = np.where(np.asarray(scale, dtype=float) == 0, 1.0, np.asarray(scale, dtype=float))
    x_scaled = (x - m) / s
    centers = np.asarray(centroids_scaled, dtype=float)
    dists = np.linalg.norm(centers - x_scaled, axis=1)
    cid = int(np.argmin(dists))
    return cid, round(float(dists[cid]), 4)


def predict_nutriscore_kmeans(
    *,
    energy_kcal_100g: Optional[float],
    saturated_fat_g_100g: Optional[float],
    sugars_g_100g: Optional[float],
    sodium_mg_100g: Optional[float],
    fiber_g_100g: float = 0.0,
    proteins_g_100g: float = 0.0,
    artifact_path: Path = DEFAULT_ARTIFACT_PATH,
) -> KMeansNutriScoreResult:
    """Predict Nutri-Score / NutriLens Grade (A-E) via nearest K-Means centroid."""
    if (
        energy_kcal_100g is None
        or saturated_fat_g_100g is None
        or sugars_g_100g is None
        or sodium_mg_100g is None
    ):
        return KMeansNutriScoreResult(
            grade=None,
            score=None,
            health_status="Unknown",
            cluster_id=None,
            distance_to_centroid=None,
        )

    model = load_kmeans_artifact(artifact_path)["nutriscore_kmeans"]
    sodium_g_100g = sodium_mg_100g / 1000.0
    cid, dist = _nearest_cluster(
        [
            energy_kcal_100g,
            saturated_fat_g_100g,
            sugars_g_100g,
            sodium_g_100g,
            fiber_g_100g,
            proteins_g_100g,
        ],
        model["scaler_mean"],
        model["scaler_scale"],
        model["centroids_scaled"],
    )
    grade = model["cluster_to_grade"][str(cid)]
    return KMeansNutriScoreResult(
        grade=grade,
        score=GRADE_TO_SCORE[grade],
        health_status=GRADE_TO_STATUS[grade],
        cluster_id=cid,
        distance_to_centroid=dist,
    )


def predict_processing_tier_kmeans(
    *,
    additives_n: Optional[int],
    sugars_g_100g: Optional[float],
    fat_g_100g: Optional[float],
    sodium_mg_100g: Optional[float],
    fiber_g_100g: float = 0.0,
    artifact_path: Path = DEFAULT_ARTIFACT_PATH,
) -> KMeansProcessingTierResult:
    """Predict NutriLens Processing Tier (1, 3, or 4) via nearest K-Means centroid."""
    if (
        additives_n is None
        or sugars_g_100g is None
        or fat_g_100g is None
        or sodium_mg_100g is None
    ):
        return KMeansProcessingTierResult(
            tier=None,
            processing_level="Unknown",
            cluster_id=None,
            distance_to_centroid=None,
        )

    model = load_kmeans_artifact(artifact_path)["processing_tier_kmeans"]
    sodium_g_100g = sodium_mg_100g / 1000.0
    cid, dist = _nearest_cluster(
        [
            float(additives_n),
            sugars_g_100g,
            fat_g_100g,
            sodium_g_100g,
            fiber_g_100g,
        ],
        model["scaler_mean"],
        model["scaler_scale"],
        model["centroids_scaled"],
    )
    mapped = model["cluster_to_tier"][str(cid)]
    return KMeansProcessingTierResult(
        tier=mapped["tier"],
        processing_level=mapped["label"],
        cluster_id=cid,
        distance_to_centroid=dist,
    )
