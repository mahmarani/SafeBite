# Graph Report - new  (2026-11-25)

## Corpus Check
- 166 files · ~297,705 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 568 nodes · 1138 edges · 29 communities (23 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 26
- Community 27

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 23 edges
2. `useToast()` - 23 edges
3. `Button()` - 19 edges
4. `compilerOptions` - 16 edges
5. `pipeline()` - 16 edges
6. `useAppData()` - 15 edges
7. `getGradeMeta()` - 12 edges
8. `HealthProfile` - 10 edges
9. `benchmark_engines()` - 10 edges
10. `DashboardLayout()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `prepare_uploaded_image()` --calls--> `preprocess_image()`  [EXTRACTED]
  api/image_input.py → preprocess/preprocess.py
- `benchmark_engines()` --calls--> `clean_text_for_eval()`  [EXTRACTED]
  ocr/compare_ocr.py → preprocess/evaluate_ocr.py
- `benchmark_engines()` --calls--> `run_ocr_on_image()`  [EXTRACTED]
  ocr/compare_ocr.py → preprocess/evaluate_ocr.py
- `benchmark_engines()` --calls--> `pipeline()`  [EXTRACTED]
  ocr/compare_ocr.py → preprocess/steps.py
- `run_ocr_on_image()` --calls--> `extract_ingredients()`  [EXTRACTED]
  preprocess/evaluate_ocr.py → ocr/ocr.py

## Import Cycles
- None detected.

## Communities (29 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (56): FILTER_OPTIONS, IngredientTable(), NutrientRowConfig, NutritionPanel(), Button(), EmptyState(), EmptyStateProps, ALL_GRADES (+48 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (63): fixture, extract_text_classic(), get_full_text(), get_reader(), Any, ndarray, SafeBite - Classic OCR Engine (EasyOCR) Performs local OCR on food-label…, Lazy-initializes and caches the EasyOCR Reader instance. Uses local workspace… (+55 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (39): App(), BrandMark(), ToastContainer(), PublicLayout(), ICON_MAP, Sidebar(), SidebarProps, AppDataProvider() (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (37): PersonalizedInsights(), PersonalizedInsightsProps, ChipMultiSelect(), ChipMultiSelectProps, AppDataContext, AppDataContextValue, DashboardStats, AuthContextValue (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (32): Client, dotenv, express, dependencies, dotenv, express, @google/genai, lucide-react (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (29): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (24): BertMLMCorrector, build_ingredient_vocabulary(), evaluate_corrector(), flag_suspect_words(), levenshtein_distance(), Any, SafeBite - BERT Masked Language Model (MLM) Error Corrector Corrects OCR typos…, Corrects OCR errors using BERT Masked Language Modeling + Levenshtein distance… (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (15): prepare_uploaded_image(), PreparedImage, Server-side validation and preprocessing for uploaded food-label images., Validated, normalized image data passed to server-side OCR only., Validate an image and return preprocessed JPEG bytes for OCR. MIME types…, ImageInputTests, make_jpeg_bytes(), Image (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (17): ButtonProps, ButtonSize, ButtonVariant, SIZE_CLASSES, VARIANT_CLASSES, CameraCaptureModal(), CameraCaptureModalProps, createSampleLabelDataUrl() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (16): BertTokenizerFast, align_labels_with_tokens(), get_tokenizer(), inspect_word_tokens(), Any, BERT Fast Tokenizer and NER label alignment for SafeBite., Return BERT subword tokens, ids, and character offsets for one word., Lazy-load the SafeBite tokenizer, or fall back to the base model. (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (14): assign_brand_split(), load_and_process_dataset(), print_split_summary(), DataFrame, SafeBite - Data Pipeline: Open Food Facts Loader & Pre-splitter Reads the Open…, Deterministically assigns a brand to 80% train, 10% val, or 10% test. Prevents…, Streams the dataset in chunks using sep='\\t' and header=None. Saves: -…, Prints 80/10/10 split statistics. (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (13): defaultdict, _add_entry(), build_from_parquet(), build_ingredient_dictionary(), canonicalize_tag(), Path, Build SafeBite's ingredient dictionary from Open Food Facts tag columns. The…, Turn ``en:citric-acid`` or ``E 330`` into a lookup-safe text key. (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (9): normalize_ingredient(), normalize_ingredients(), NormalizedIngredient, Normalize OCR/NER ingredient text into stable knowledge-base lookup keys. This…, One ingredient before and after canonicalization., Return a lowercase canonical key while preserving the original input. Empty or…, Normalize a sequence, retaining order and duplicate label occurrences., Canonical ingredient names used by the SafeBite risk pipeline. (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (8): BertTokenizer, Dataset, IngredientDataset, SafeBite - Continue MLM Training on Ingredients Dataset Performs domain-…, PyTorch Dataset yielding tokenized ingredient strings for MLM., Continues MLM domain pretraining on ingredients text using a clean native…, run_mlm_training(), Regenerate the domain-adapted MLM checkpoint from text_set.parquet.

### Community 15 - "Community 15"
Cohesion: 0.24
Nodes (8): EvaluationCase, load_held_out_cases(), main(), Path, Held-out evaluation input contract and runner entry point. The manifest is JSON…, Load and validate a JSONL held-out manifest without loading model code., EvaluationManifestTests, Validate a held-out evaluation manifest before a pipeline evaluation run.

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (11): analyze_food_label(), IngredientItem, NutritionalInfo, ProductAnalysis, SafeBite API - FastAPI Backend Provides food-label analysis endpoints for the…, Accepts a food-label image file and returns a complete ProductAnalysis…, root(), BaseModel (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (6): is_valid_label(), Shared BIO labels for SafeBite ingredient-label NER., Return whether *label* belongs to this model's complete label set., Raise ValueError when an I- tag cannot continue the preceding entity., validate_bio_sequence(), NerLabelTests

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (6): Config, pytest_addoption(), pytest_collection_modifyitems(), Pytest policy: resource and integration tests are opt-in., Item, Parser

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (4): __getattr__(), Any, SafeBite NLP package. Heavy training dependencies are imported only when their…, Lazily load existing public helpers without eager optional imports.

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): SafeBite API Test - Step Test Tests the FastAPI application, CORS, and POST…, test_api(), integration

## Knowledge Gaps
- **83 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 4` to `Community 5`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `@google/genai` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06807017543859649 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05311871227364185 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09085213032581453 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08705882352941176 - nodes in this community are weakly interconnected._