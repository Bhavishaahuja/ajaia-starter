"""Run the eval set and print a pass/fail table.

Usage (from backend/):
    python -m evals.run_evals            uses LLM_MODE from .env
    python -m evals.run_evals --live     forces live Claude calls

Writes evals/results.md so the table can go straight into the submission.
A null expectation means "don't check this field".
"""

import json
import sys
from pathlib import Path

from app.config import get_settings
from app.llm import LLMError, analyze_text
from app.rules import needs_human_review

HERE = Path(__file__).parent


def run():
    settings = get_settings()
    if "--live" in sys.argv:
        settings.llm_mode = "live"

    cases = json.loads((HERE / "cases.json").read_text(encoding="utf-8"))
    rows = []
    passed = 0

    for case in cases:
        try:
            analysis = analyze_text(case["input"])
            got_category = analysis.category
            got_review = needs_human_review(analysis)
            problems = []
            if case["expect_category"] is not None and got_category != case["expect_category"]:
                problems.append(f"category {got_category} != {case['expect_category']}")
            if case["expect_review"] is not None and got_review != case["expect_review"]:
                problems.append(f"review {got_review} != {case['expect_review']}")
            result = "PASS" if not problems else "FAIL: " + "; ".join(problems)
            got = f"{got_category}, review={got_review}, conf={analysis.confidence:.2f}"
        except LLMError as e:
            result = f"ERROR: {e}"
            got = "-"

        if result == "PASS":
            passed += 1
        rows.append((case["id"], case["expect_category"], case["expect_review"], got, result))

    lines = [
        f"Eval run: mode={settings.llm_mode}, model={settings.llm_model}",
        "",
        "| Case | Expected category | Expected review | Got | Result |",
        "|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(v) for v in row) + " |")
    lines.append("")
    lines.append(f"**{passed}/{len(cases)} passed**")

    report = "\n".join(lines)
    print(report)
    (HERE / "results.md").write_text(report + "\n", encoding="utf-8")
    return passed == len(cases)


if __name__ == "__main__":
    ok = run()
    sys.exit(0 if ok else 1)
