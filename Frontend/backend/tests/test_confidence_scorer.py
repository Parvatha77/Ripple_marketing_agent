from analysis.confidence_scorer import (
    calculate_confidence,
    score_data_completeness,
    score_historical_evidence,
    score_simulation_consistency,
)

HISTORICAL = [
    {"decision_id": "hd_001", "discount_pct": 20},
    {"decision_id": "hd_002", "discount_pct": 25},
    {"decision_id": "hd_004", "discount_pct": 35},
]


def test_historical_evidence_finds_comparable_decisions():
    score, count = score_historical_evidence(HISTORICAL, new_discount_pct=30, tolerance=10)
    assert count == 3  # 20, 25, 35 are all within 10 points of 30
    assert score > 0.3


def test_historical_evidence_no_comparables_is_low_confidence():
    score, count = score_historical_evidence(HISTORICAL, new_discount_pct=90, tolerance=10)
    assert count == 0
    assert score == 0.3


def test_data_completeness_penalizes_fallback_events():
    events = [
        {"actor_type": "persona", "quote": "Real reaction here."},
        {"actor_type": "persona", "quote": "Unable to determine reaction at this time."},
    ]
    assert score_data_completeness(events) == 0.5


def test_data_completeness_full_marks_when_nothing_fell_back():
    events = [{"actor_type": "persona", "quote": "Real reaction."}] * 4
    assert score_data_completeness(events) == 1.0


def test_simulation_consistency_rewards_tight_agreement():
    tight = [{"actor_type": "persona", "purchase_intent_delta": v} for v in (0.30, 0.31, 0.29)]
    spread = [{"actor_type": "persona", "purchase_intent_delta": v} for v in (0.9, -0.8, 0.1)]
    assert score_simulation_consistency(tight) > score_simulation_consistency(spread)


def test_calculate_confidence_returns_bounded_overall_score():
    events = [{"actor_type": "persona", "purchase_intent_delta": 0.3, "quote": "ok"}] * 6
    result = calculate_confidence(HISTORICAL, 30, events)
    assert 0.0 <= result["overall"] <= 1.0
    assert result["comparable_decisions"] == 3
