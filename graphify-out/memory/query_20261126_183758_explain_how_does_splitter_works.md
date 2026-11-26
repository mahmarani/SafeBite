---
type: "query"
date: "2026-11-26T18:37:58.724242+00:00"
question: "explain how does splitter works"
contributor: "graphify"
outcome: "useful"
source_nodes: ["classify_line", "split_text", "split_ocr_blocks"]
---

# Q: explain how does splitter works

## Answer

Expanded from graph vocabulary: [splitter, section, ingredients, allergen, nutrition, line, block, keyword, classify, text]. backend/services/ocr/splitter.py contains classify_line, split_text, and split_ocr_blocks. Keyword regexes detect allergen headers first, ingredient headers second, then nutrition patterns requiring nutrient/unit cues; comma-rich text may be treated as ingredients, metadata phrases as other, and unmatched lines as other. split_text splits input on newlines and keeps current_section to carry likely continuation lines into sections, returning four strings. The active OCR service calls split_ocr_blocks on spatially ordered OCR blocks; it annotates each block with a section, tracks the last explicit header in current_state, and returns section text plus per-section block lists. It uses keyword rules and context, not ML or image coordinates itself. Limitation: when classify_line detects a comma-rich ingredient block it does not update current_state, so later continuation blocks may not inherit that classification.

## Outcome

- Signal: useful

## Source Nodes

- classify_line
- split_text
- split_ocr_blocks