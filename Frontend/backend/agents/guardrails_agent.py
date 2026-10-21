import json

from analysis import confidence_scorer
from config import GROQ_MODEL_LARGE
from llm_client import call_json
from prompts.guardrails import SYSTEM_TEMPLATE
from schemas.guardrails import ConfidenceFactors, GuardrailResult, ImpactSummary


async def run(scenario, event_log_events, baseline, products, financial_analysis, historical_decisions):
    prompt = SYSTEM_TEMPLATE.format(
        scenario_json=json.dumps(scenario, indent=2),
        event_log_json=json.dumps(event_log_events, indent=2),
        baseline_json=json.dumps(baseline, indent=2),
        products_json=json.dumps(products, indent=2),
        financial_analysis_json=json.dumps(financial_analysis, indent=2),
        historical_decisions_json=json.dumps(historical_decisions, indent=2),
    )
    guardrail = await call_json(
        prompt, task_label="guardrails_agent", model=GROQ_MODEL_LARGE, schema=GuardrailResult
    )

    # Never let the LLM produce these — copy them straight from the deterministic analyzer.
    guardrail.impact_summary = ImpactSummary(
        revenue_delta=financial_analysis["revenue_delta"],
        profit_delta=financial_analysis["profit_delta"],
        aov_delta=financial_analysis["aov_delta"],
        avg_margin_delta_pct=financial_analysis["avg_margin_delta_pct"],
        discount_cost=financial_analysis["discount_cost"],
    )

    # Confidence is computed, not stated by the LLM — see analysis/confidence_scorer.py.
    confidence = confidence_scorer.calculate_confidence(
        historical_decisions, scenario["new_value"], event_log_events
    )
    guardrail.confidence = confidence["overall"]
    guardrail.confidence_factors = ConfidenceFactors(
        historical_evidence=confidence["historical_evidence"],
        comparable_decisions=confidence["comparable_decisions"],
        data_completeness=confidence["data_completeness"],
        simulation_consistency=confidence["simulation_consistency"],
    )

    return guardrail
