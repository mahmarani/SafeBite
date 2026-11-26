"""OCR helpers with lazy optional-engine imports."""

from importlib import import_module

_EXPORTS = {
    "extract_text_classic": (".classic_ocr", "extract_text_classic"),
    "get_full_text": (".classic_ocr", "get_full_text"),
    "extract_ingredients": (".gemini_ocr", "extract_ingredients"),
    "extract_nutrition_table": (".gemini_ocr", "extract_nutrition_table"),
    "split_text": (".splitter", "split_text"),
    "split_ocr_blocks": (".splitter", "split_ocr_blocks"),
    "order_blocks_by_layout": (".layout", "order_blocks_by_layout"),
    "run_ocr_pipeline": (".service", "run_ocr_pipeline"),
    "OcrStageResult": (".service", "OcrStageResult"),
    "UnreadableLabelError": (".service", "UnreadableLabelError"),
    "OcrProviderUnavailableError": (".service", "OcrProviderUnavailableError"),
}

__all__ = list(_EXPORTS)


def __getattr__(name: str):
    if name not in _EXPORTS:
        raise AttributeError(name)
    module_name, attribute = _EXPORTS[name]
    value = getattr(import_module(module_name, __name__), attribute)
    globals()[name] = value
    return value
