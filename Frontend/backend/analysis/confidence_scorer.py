"""
Deterministic confidence scoring for the Guardrails Agent's output — kept
out of the LLM so "how sure are we" is measured from real signals, not an
arbitrary number the model states.

Three factors, each 0-1:
  - historical_evidence: do we have comparable past decisions to check against?
  - data_completeness: what fraction of persona/competitor calls actually
    produced a real reading, vs. falling back to a neutral placeholder after
    exhausting retries?
  - simulation_consistency: how tightly do the personas agree with each
    other? A simulation where everyone reacts wildly differently is a
    weaker signal than one where the segments agree.
"""

_PERSONA_FALLBACK_QUOTE = "Unable to determine reaction at this time."
_COMPETITOR_FALLBACK_RATIONALE = "Unable to determine competitive response at this time."

_WEIGHTS = {"historical": 0.35, "completeness": 0.30, "consistency": 0.35}


def score_historical_evidence(historical_decisions: list[dict], new_discount_pct: float, tolerance: float = 10):
    comparable = [
        d for d in historical_decisions
        if abs(d["discount_pct"] - new_discount_pct) <= tolerance
    ]
    if not comparable:
        return 0.3, 0
    coverage = min(len(comparable) / 3, 1.0)
    return round(0.4 + 0.6 * coverage, 2), len(comparable)


def score_data_completeness(behavioral_events: list[dict]) -> float:
    if not behavioral_events:
        return 0.0
    failed = sum(
        1 for e in behavioral_events
        if e.get("quote") == _PERSONA_FALLBACK_QUOTE or e.get("rationale") == _COMPETITOR_FALLBACK_RATIONALE
    )
    return round((len(behavioral_events) - failed) / len(behavioral_events), 2)


def score_simulation_consistency(behavioral_events: list[dict]) -> float:
    deltas = [e["purchase_intent_delta"] for e in behavioral_events if e.get("actor_type") == "persona"]
    if len(deltas) < 2:
        return 0.5
    mean = sum(deltas) / len(deltas)
    variance = sum((d - mean) ** 2 for d in deltas) / len(deltas)
    spread = variance ** 0.5
    return round(max(0.0, 1 - min(spread, 1.0)), 2)


def calculate_confidence(
    historical_decisions: list[dict], new_discount_pct: float, behavioral_events: list[dict]
) -> dict:
    historical_score, comparable_count = score_historical_evidence(historical_decisions, new_discount_pct)
    completeness_score = score_data_completeness(behavioral_events)
    consistency_score = score_simulation_consistency(behavioral_events)

    overall = (
        historical_score * _WEIGHTS["historical"]
        + completeness_score * _WEIGHTS["completeness"]
        + consistency_score * _WEIGHTS["consistency"]
    )

    return {
        "overall": round(overall, 2),
        "historical_evidence": historical_score,
        "comparable_decisions": comparable_count,
        "data_completeness": completeness_score,
        "simulation_consistency": consistency_score,
    }
