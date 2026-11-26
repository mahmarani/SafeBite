---
type: "query"
date: "2026-11-26T18:32:04.744606+00:00"
question: "explain me how does backend/service/ocr works"
contributor: "graphify"
outcome: "useful"
source_nodes: ["run_ocr_pipeline", "extract_text_classic", "order_blocks_by_layout", "split_ocr_blocks", "extract_ingredients"]
---

# Q: explain me how does backend/service/ocr works

## Answer

Expanded from graph vocabulary: [ocr, service, image, local, classic, gemini, layout, split, confidence, section]. The active OCR package is backend/services/ocr. api.main passes server-preprocessed JPEG bytes to run_ocr_pipeline. The service chooses SAFEBITE_OCR_PROVIDER (default local), decodes bytes, and calls EasyOCR extract_text_classic or Gemini. It orders detected boxes with order_blocks_by_layout, rejects empty/low-confidence/too-short text, then split_ocr_blocks assigns ingredients/allergens/nutrition/other sections and annotates blocks. It returns typed OcrBlock records plus sections/provider/count/mean confidence. Local OCR returns per-word text, real boxes and EasyOCR confidences; optional Gemini fallback requires GOOGLE_API_KEY. Current Gemini adapter calls only extract_ingredients, builds placeholder boxes and hardcodes confidence 0.95; although extract_nutrition_table exists, run_ocr_pipeline does not call it, so Gemini mode does not supply nutrition text. target_stage=ocr returns this partial result; normal API scans continue to NLP. Error mapping is unreadable label 422 or unavailable OCR provider 503.

## Outcome

- Signal: useful

## Source Nodes

- run_ocr_pipeline
- extract_text_classic
- order_blocks_by_layout
- split_ocr_blocks
- extract_ingredients