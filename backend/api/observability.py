"""Small structured logging helpers that only emit approved metadata."""

from __future__ import annotations

import json
import logging
import re
import time
from collections.abc import Mapping

logger = logging.getLogger("safebite")
_SCAN_ID = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
_ERROR_CATEGORIES = {"invalid_image", "unsupported_image", "unreadable_label", "ocr_provider_unavailable", "analysis_failed"}


def log_stage(scan_id: str, stage: str, started_at: float, *, error_category: str | None = None) -> None:
    """Emit a JSON event containing only stage, duration, and safe identifiers."""
    safe_scan_id = scan_id if _SCAN_ID.fullmatch(scan_id or "") else "unknown"
    event: dict[str, object] = {
        "event": "analysis_stage",
        "scan_id": safe_scan_id,
        "stage": stage[:40],
        "duration_ms": round(max(0.0, time.perf_counter() - started_at) * 1000, 2),
    }
    if error_category in _ERROR_CATEGORIES:
        event["error_category"] = error_category
    logger.info(json.dumps(event, separators=(",", ":")))


def redact_mapping(value: Mapping[str, object]) -> dict[str, object]:
    """Allowlisted fields for diagnostics; input content and secrets are omitted."""
    allowed = {"event", "scan_id", "stage", "duration_ms", "error_category"}
    return {key: value[key] for key in allowed if key in value}
