---
type: "query"
date: "2026-11-26T18:40:54.925726+00:00"
question: "plan better ocr pipeline i think it is not efficient and accurate"
contributor: "graphify"
outcome: "useful"
source_nodes: ["run_ocr_pipeline", "preprocess_image", "split_ocr_blocks", "evaluate_preprocessing_variants"]
---

# Q: plan better ocr pipeline i think it is not efficient and accurate

## Answer

Expanded from graph vocabulary: [ocr, image, preprocess, layout, splitter, section, confidence, fixture, evaluate, nutrition, gemini]. Propose first fixing measurement: replace the OCR evaluation helper's reference-text corruption fallback with real OCR on every image; build a product/brand-separated held-out set covering blur, glare, rotation, perspective, small print, and nutrition tables; score CER/WER, section F1, allergen recall, nutrient exact-match, reject rate, and latency. Then create one adaptive runtime path: preserve original, normalize EXIF/color/size without aggressive global sharpening, detect/crop label panels and measure quality, selectively deskew/perspective-correct/enhance hard regions, keep geometric boxes through OCR, run current and candidate engines on the same benchmark, retry only low-confidence crops, parse sections and nutrition tables layout-aware, calibrate confidence and return unknown for critical ambiguous values. Remove Gemini placeholder geometry/confidence and wire or explicitly disable its nutrition extraction. Bounded worker execution for sync OCR/model calls will improve API concurrency. Existing artifact is only 8 synthetic fixtures and reports 6 readable, 2 unreadable, mean CER .0307 and WER .2292; do not treat as production accuracy evidence.

## Outcome

- Signal: useful

## Source Nodes

- run_ocr_pipeline
- preprocess_image
- split_ocr_blocks
- evaluate_preprocessing_variants