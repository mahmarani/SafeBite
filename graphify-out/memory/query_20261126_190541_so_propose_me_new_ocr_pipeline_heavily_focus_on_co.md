---
type: "query"
date: "2026-11-26T19:05:41.874645+00:00"
question: "so propose me new ocr pipeline heavily focus on correct classifying data like ingredients, allergins, calories. so should we use any model ml model for that"
contributor: "graphify"
outcome: "useful"
source_nodes: ["run_ner_on_sections", "classify_line", "split_ocr_blocks"]
---

# Q: so propose me new ocr pipeline heavily focus on correct classifying data like ingredients, allergins, calories. so should we use any model ml model for that

## Answer

Yes: keep OCR as one text-and-box extraction pass, then use a trained layout-aware section model. Input should be all OCR tokens/blocks with text, normalized bounding boxes, reading order, and confidence; output section labels ingredients/allergens/nutrition/other plus calibrated confidence. A lighter first model can reuse a text encoder and add geometry features; benchmark against LayoutLMv3, which jointly models text and layout, before accepting its greater compute/data needs. In this repository safebite_ner is token-level entity NER (INGREDIENT, ADDITIVE, ALLERGEN, NUTRIENT, QUANTITY) over plain strings, not a section classifier and currently receives no boxes. Keep entity extraction as stage two or retrain/multitask after section labels exist. Calories belongs to nutrition; its value and unit should be extracted/linked within that section. Train and evaluate on annotated real labels with brand/product-grouped splits. Measure section macro-F1/allergen recall and exact nutrient-value-unit accuracy. Return unknown/uncertain instead of forcing a section.

## Outcome

- Signal: useful

## Source Nodes

- run_ner_on_sections
- classify_line
- split_ocr_blocks