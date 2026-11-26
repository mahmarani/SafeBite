"""Start the development API without exposing server-side API keys to the frontend."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]

import uvicorn


if __name__ == "__main__":
    uvicorn.run("backend.api.main:app", host="127.0.0.1", port=8000, reload=True)
