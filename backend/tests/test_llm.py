"""Tests the live-mode code path with a fake client (no network, no key)."""

from types import SimpleNamespace

import pytest

from app.config import get_settings
from app.llm import LLMError, analyze_text
from app.rules import needs_human_review
from app.schemas import Analysis

GOOD = Analysis(
    summary="Export fails on Safari",
    category="bug",
    priority="high",
    confidence=0.95,
    reasons=["user reports a broken button"],
)


class FakeMessages:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = 0

    def parse(self, **kwargs):
        self.calls += 1
        out = self.outputs.pop(0)
        return SimpleNamespace(stop_reason=out[0], parsed_output=out[1])


def fake_client(outputs):
    messages = FakeMessages(outputs)
    return SimpleNamespace(beta=SimpleNamespace(messages=messages)), messages


@pytest.fixture
def live_mode():
    settings = get_settings()
    settings.llm_mode = "live"
    yield
    settings.llm_mode = "mock"


def test_valid_output_first_try(live_mode):
    client, messages = fake_client([("end_turn", GOOD)])
    assert analyze_text("x", client=client) == GOOD
    assert messages.calls == 1


def test_retries_once_on_bad_output(live_mode):
    client, messages = fake_client([("end_turn", None), ("end_turn", GOOD)])
    assert analyze_text("x", client=client) == GOOD
    assert messages.calls == 2


def test_gives_up_after_two_bad_outputs(live_mode):
    client, messages = fake_client([("max_tokens", None), ("end_turn", None)])
    with pytest.raises(LLMError):
        analyze_text("x", client=client)
    assert messages.calls == 2


def test_refusal_is_a_clear_error(live_mode):
    client, _ = fake_client([("refusal", None)])
    with pytest.raises(LLMError, match="declined"):
        analyze_text("x", client=client)


def test_rules_only_add_review():
    low_conf = GOOD.model_copy(update={"priority": "low", "confidence": 0.5})
    assert needs_human_review(low_conf) is True
    safe = GOOD.model_copy(update={"priority": "low", "category": "question"})
    assert needs_human_review(safe) is False
