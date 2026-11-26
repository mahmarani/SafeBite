---
type: "query"
date: "2026-11-26T18:02:27.305122+00:00"
question: "analyze this project and explain it to me how does it works"
contributor: "graphify"
outcome: "useful"
source_nodes: ["analyze_food_label", "run_ocr_pipeline", "run_correction_and_tokenization", "run_ner_on_sections", "evaluate_risk_rules", "build_product_analysis", "analysisService"]
---

# Q: analyze this project and explain it to me how does it works

## Answer

Expanded from graph vocabulary: [api, image, ocr, ingredient, normalize, risk, product, analysis, pipeline, frontend, model, ner]. SafeBite is a React frontend plus FastAPI backend for food-label scanning. ScannerPage collects image and metadata; analysisService posts multipart form data to POST /analyze, and AppDataContext saves returned ProductAnalysis in browser storage. Backend pipeline validates and preprocesses image, runs layout-aware OCR and section splitting, BERT MLM correction/tokenization, BERT NER, canonical ingredient normalization, nutrition parsing, deterministic threshold/allergen/additive rules, then builds an evidence-linked ProductAnalysis response. Local OCR is default, with optional Gemini provider/fallback. Frontend dashboard also seeds demo products; personalized warnings are derived client-side from stored profile/product data. README is behind implementation: it describes OCR-stage results and later NLP/risk work, but main.py currently defaults target_stage to risk and wires the full pipeline. Health scoring includes K-means predictions when available and heuristic fallback; missing nutrient/ingredient evidence yields partial/unknown results. Main modules: api/main.py, api/image_input.py, ocr/service.py, nlp/service.py, nlp/ner.py, kb/risk_engine.py, api/orchestrator.py, frontend/frontend/src/services/analysisService.ts. Graph query and source inspection used; no tests run.

## Outcome

- Signal: useful

## Source Nodes

- analyze_food_label
- run_ocr_pipeline
- run_correction_and_tokenization
- run_ner_on_sections
- evaluate_risk_rules
- build_product_analysis
- analysisService