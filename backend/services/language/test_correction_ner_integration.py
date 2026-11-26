"""Focused tests for correction-to-NER handoff without loading model checkpoints."""

from backend.api.contracts import ExtractedEntity
from backend.services.language.corrector import _is_protected_token
from backend.services.language import service as language_service
from backend.services.language.service import NlpCorrectionResult, run_correction_and_tokenization, run_ner_after_correction


class RecordingNer:
    """Small NER double that records text supplied by the integration boundary."""

    def __init__(self) -> None:
        self.seen = []

    def predict_section(self, text, *, section=None, min_confidence=0.0):
        self.seen.append((section, text))
        start = text.lower().index("sodium")
        return [
            ExtractedEntity(
                text="sodium",
                entity_type="NUTRIENT",
                confidence=0.99,
                start=start,
                end=start + len("sodium"),
                section=section,
            )
        ]


def test_corrected_text_is_the_text_ner_receives_and_offsets_reference_it():
    corrected = "sodium 170mg 7%"
    result = NlpCorrectionResult(
        corrected_sections={"ingredients": "", "allergens": "", "nutrition": corrected},
        corrections=[],
        tokenized_sections={},
    )
    predictor = RecordingNer()

    entities = run_ner_after_correction(result, predictor=predictor)

    assert predictor.seen == [("nutrition", corrected)]
    assert entities[0].text == "sodium"
    assert corrected[entities[0].start:entities[0].end] == entities[0].text


def test_corrector_output_flows_to_ner_without_changing_numeric_evidence(monkeypatch):
    class Corrector:
        def correct_text(self, text, min_confidence):
            return text.replace("Sodivm", "Sodium"), [
                {"original": "Sodivm", "corrected": "Sodium", "score": 0.99, "start": 0, "end": 6}
            ]

    class Tokenizer:
        def convert_ids_to_tokens(self, ids):
            return ["token" for _ in ids]

    monkeypatch.setattr(language_service, "get_tokenizer", lambda: Tokenizer())
    monkeypatch.setattr(
        language_service,
        "tokenize_ingredient_text",
        lambda text, **_: {"input_ids": [[1]], "offset_mapping": [[(0, len(text))]]},
    )
    correction_result = run_correction_and_tokenization(
        {"nutrition": "Sodivm 170mg 7%"}, corrector=Corrector()
    )
    predictor = RecordingNer()

    entities = run_ner_after_correction(correction_result, predictor=predictor)

    assert correction_result.corrected_sections["nutrition"] == "Sodium 170mg 7%"
    assert predictor.seen == [("nutrition", "Sodium 170mg 7%")]
    assert entities[0].text.lower() == "sodium"


def test_numeric_and_measurement_tokens_are_protected_from_mlm_correction():
    for token in ("170mg", "1.5g", "10%", "355mL", "E330", "B12"):
        assert _is_protected_token(token)
