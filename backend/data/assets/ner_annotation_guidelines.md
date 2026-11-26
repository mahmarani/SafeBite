# SafeBite NER/KIE Annotation Guidelines (v1.0)

These guidelines govern token-level BIO annotation for `data/gold_ner_200.jsonl` and model evaluation against `nlp/ner_labels.py`.

## Label Set

Every token is assigned `O` or `B-<TYPE>` / `I-<TYPE>` for one of five entity types:

1. **`INGREDIENT`**: Whole foods, culinary bases, oils, flours, sugars, spices, and compound ingredient names when appearing in an ingredient list.
   - Multi-word phrases use `B-INGREDIENT` followed by `I-INGREDIENT` (e.g., `organic/B-INGREDIENT rolled/I-INGREDIENT oats/I-INGREDIENT`, `cocoa/B-INGREDIENT butter/I-INGREDIENT`, `palm/B-INGREDIENT kernel/I-INGREDIENT oil/I-INGREDIENT`).
   - Non-dairy plant "butters" (`cocoa butter`, `shea butter`) are `INGREDIENT`, **not** `ALLERGEN`.
2. **`ADDITIVE`**: Functional food additives, E-numbers, emulsifiers, preservatives, stabilizers, thickeners, acidulants, colorings, and flavor enhancers.
   - Examples: `e330`, `e 330`, `citric acid`, `soy lecithin`, `sunflower lecithin`, `sodium benzoate`, `potassium sorbate`, `xanthan gum`, `carrageenan`, `mono and diglycerides`, `monosodium glutamate`, `baking soda`, `sodium bicarbonate`, `ascorbic acid`, `calcium carbonate`.
   - When an additive overlaps with an allergen carrier (e.g. `soy lecithin`), annotate as `ADDITIVE` in the ingredient list; explicit `Contains: soy` declarations are `ALLERGEN`.
3. **`ALLERGEN`**: Major food allergens and allergen-bearing ingredients (`milk`, `whey`, `whey powder`, `skim milk powder`, `cream`, `butter`, `cheese`, `yogurt`, `casein`, `lactose`, `wheat`, `wheat flour`, `gluten`, `barley`, `rye`, `soy`, `soybean`, `soybeans`, `peanut`, `peanuts`, `peanut butter`, `hazelnuts`, `almonds`, `walnuts`, `cashews`, `pecans`, `pistachios`, `tree nuts`, `nuts`, `egg`, `eggs`, `egg white`, `fish`, `shellfish`, `crustaceans`, `sesame`, `sesame oil`, `sesame seeds`, `mustard`, `celery`, `lupin`, `sulfites`, `sulphites`).
   - Multi-word allergens use `B-ALLERGEN` + `I-ALLERGEN` (e.g., `whey/B-ALLERGEN powder/I-ALLERGEN`, `tree/B-ALLERGEN nuts/I-ALLERGEN`, `wheat/B-ALLERGEN flour/I-ALLERGEN`).
4. **`NUTRIENT`**: Nutrition-panel nutrient labels (`Calories`, `Energy`, `Total Fat`, `Saturated Fat`, `Trans Fat`, `Cholesterol`, `Sodium`, `Salt`, `Total Carbohydrates`, `Carbohydrates`, `Dietary Fiber`, `Fiber`, `Total Sugars`, `Sugars`, `Added Sugars`, `Protein`, `Calcium`, `Iron`, `Potassium`, `Vitamin D`).
   - Context disambiguation: inside a nutrition panel, `Total sugars` and `Sodium` are `NUTRIENT`; inside an ingredients paragraph, `sugar` is `INGREDIENT`.
5. **`QUANTITY`**: Numeric amounts, percentages, and attached or separated measurement units (`73 %`, `120 kcal`, `5 g`, `150 mg`, `150mg`, `100g`, `240 ml`, `0.5 g`, `25 %`).
6. **`O` (Outside)**: Punctuation (`,`, `;`, `.`, `(`, `)`, `:`, `&`), conjunctions/prepositions (`and`, `or`, `of`, `with`, `from`, `less than`), and boilerplate headers (`Ingredients`, `Contains`, `May contain`, `May contain traces of`, `Traces of`, `Allergens`, `Nutrition Facts`, `Serving size`, `Per 100g`, `Daily Value`).

## BIO Sequence Validity & Split Isolation

- Every sequence must pass `nlp.ner_labels.validate_bio_sequence` (no orphan `I-<TYPE>` without a preceding `B-<TYPE>` or `I-<TYPE>`).
- Train, validation, and test splits are grouped by brand (falling back to product code) so no brand appears in more than one split.
