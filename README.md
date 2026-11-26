# SafeBite

SafeBite scans food labels and returns extracted ingredients, nutrition details, allergen matches, and evidence-linked warnings.

## Project layout

- `frontend/` — React and TypeScript application.
- `backend/` — FastAPI app, scan services, datasets, model files, and developer tools.
- `backend/archive/` — older project copy and archived project notes/checks retained during the reorganization.

The backend scan flow is `backend/api/main.py` → image services → OCR and section detection → language processing and entity extraction → ingredient normalization → food rules and response assembly.

## Run the backend

Install the Python dependencies:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Start the API from the repository root:

```bash
python -m backend.tools.run_api
```

The API docs are available at <http://127.0.0.1:8000/docs>. Local OCR is used by default. Optional Gemini OCR credentials belong in the backend environment, never in the frontend.

## Run the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `http://127.0.0.1:8000` by default. Set `VITE_API_BASE_URL` in `frontend/.env.local` to override it.

## Data and model files

Datasets and label fixtures are under `backend/data/assets/`. Local OCR and BERT checkpoints are under `backend/models/`. Dataset preparation, model training, and OCR utilities are under `backend/tools/` and can be run as modules from the repository root, for example:

```bash
python -m backend.tools.build_data
python -m backend.tools.run_ocr_fixtures
python -m backend.tools.train_mlm
```
