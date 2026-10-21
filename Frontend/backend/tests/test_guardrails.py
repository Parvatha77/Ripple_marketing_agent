import asyncio
from unittest.mock import AsyncMock, patch

from agents import guardrails_agent
from schemas.guardrails import GuardrailResult

FAKE_FINANCIAL_ANALYSIS = {
    "revenue_delta": 209759.26,
    "profit_delta": -437872.42,
    "aov_delta": -21.44,
    "avg_margin_delta_pct": -12.1,
    "discount_cost": -965000.0,
}

FAKE_HISTORICAL_DECISIONS = [
    {"decision_id": "hd_001", "discount_pct": 20, "margin_delta_pct": -9.0},
]


def test_run_returns_validated_result():
    fake_result = GuardrailResult(
        primary_risk="Loyalty erosion in the premium segment",
        risk_assessment={
            "overall": "high",
            "customer": "high",
            "financial": "medium",
            "competitive": "medium",
            "brand": "high",
        },
        evidence=[
            {
                "claim": "Premium loyalty dropped sharply",
                "source": "event:evt_005",
                "value": "loyalty_delta -0.30",
            },
        ],
        recommendation={
            "decision": "Replace the flat discount with a minimum-spend Gift-with-Purchase.",
            "proposed_value": None,
            "unit": None,
            "scope": "sitewide",
        },
        rationale="Loyalty dropped -0.30 for the premium segment by day_90 while margin compressed.",
    )

    with patch("agents.guardrails_agent.call_json", new=AsyncMock(return_value=fake_result)):
        result = asyncio.run(guardrails_agent.run(
            scenario={"scenario_id": "scn_test", "new_value": 30},
            event_log_events=[
                {"actor_type": "persona", "purchase_intent_delta": 0.4},
                {"actor_type": "persona", "purchase_intent_delta": 0.5},
            ],
            baseline={},
            products=[],
            financial_analysis=FAKE_FINANCIAL_ANALYSIS,
            historical_decisions=FAKE_HISTORICAL_DECISIONS,
        ))

    assert result.primary_risk == fake_result.primary_risk
    assert result.risk_assessment.overall == "high"
    assert result.evidence[0].source == "event:evt_005"
    assert result.recommendation.decision == fake_result.recommendation.decision

    # impact_summary must come from the deterministic analysis, not the LLM.
    assert result.impact_summary.revenue_delta == FAKE_FINANCIAL_ANALYSIS["revenue_delta"]
    assert result.impact_summary.discount_cost == FAKE_FINANCIAL_ANALYSIS["discount_cost"]

    # confidence must be computed, not whatever (nonexistent) value the LLM stated.
    assert 0.0 <= result.confidence <= 1.0
    assert result.confidence_factors is not None
    assert result.confidence_factors.comparable_decisions == 1
