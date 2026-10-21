import asyncio
import logging
from agents import graph_builder_agent, guardrails_agent
from agents.competitor_agent.service import simulate_all_competitors
from agents.persona_agent.service import simulate_all_personas
from analysis import financial_analyzer
from data_loader import load_scenario
from io_utils import load_json, save_json
from schemas.requests import PersonaEventInput, SimulateAllCompetitorsRequest, SimulateAllPersonasRequest

logger = logging.getLogger(__name__)

DATA_DIR = "data"
OUTPUT_DIR = "outputs"
SCENARIO_ID = "scn_sitewide_discount_30"


def create_dynamic_scenario(discount_pct: float, category: str = "sitewide") -> dict:
    """Generate a scenario for the given discount percentage and category."""
    return {
        "scenario_id": f"scn_{category}_discount_{int(discount_pct)}",
        "decision_type": f"{category}_discount_change",
        "old_value": 10,
        "new_value": discount_pct,
        "unit": "percent",
        "scope": category,
        "effective_date": "2026-09-01",
        "description": f"{'Increase' if discount_pct > 10 else 'Decrease'} {category} discount from 10% to {discount_pct}% across {'all product categories' if category == 'sitewide' else f'{category} products'}, effective September 1.",
    }


def _next_event_id(events):
    return f"evt_guardrail_{len(events) + 1:03d}"


async def run_pipeline(scenario_id=SCENARIO_ID, scenario_override: dict = None):
    scenario = scenario_override if scenario_override else load_scenario(scenario_id)
    scenario_id = scenario.get("scenario_id", scenario_id)
    baseline = load_json(f"{DATA_DIR}/baseline.json")
    products = load_json(f"{DATA_DIR}/products.json")
    historical_decisions = load_json(f"{DATA_DIR}/historical_decisions.json")

    # ─── Run personas first (they're the foundation) ──────────────────────────────
    logger.info(f"[Orchestrator] Running personas for {scenario_id}")
    persona_result = await simulate_all_personas(
        SimulateAllPersonasRequest(scenario_id=scenario_id, scenario_override=scenario_override)
    )
    persona_events = [e.model_dump() for e in persona_result.events]

    # Compute financial analysis from personas alone (doesn't need competitors yet)
    financial_analysis = financial_analyzer.analyze(scenario, baseline, products, persona_events)

    # ─── Prepare competitor request for parallel execution ────────────────────────
    competitor_request = SimulateAllCompetitorsRequest(
        scenario_id=scenario_id,
        persona_events=[
            PersonaEventInput(
                persona_id=e["actor_id"],
                timestep=e["timestep"],
                purchase_intent_delta=e["purchase_intent_delta"],
                loyalty_delta=e["loyalty_delta"],
                sentiment=e["sentiment"],
                quote=e["quote"],
            )
            for e in persona_events
        ],
        scenario_override=scenario_override,
    )

    # ─── Run competitors and guardrail in parallel ─────────────────────────────────
    logger.info("[Orchestrator] Running competitors and guardrail in parallel")
    competitor_task = simulate_all_competitors(competitor_request)
    guardrail_task = guardrails_agent.run(
        scenario, persona_events, baseline, products, financial_analysis, historical_decisions
    )
    competitor_result, guardrail = await asyncio.gather(competitor_task, guardrail_task)
    competitor_events = [e.model_dump() for e in competitor_result.events]

    # ─── Assemble full behavioral log and run graph builder ──────────────────────
    behavioral_events = persona_events + competitor_events
    guardrail_event = {
        "event_id": _next_event_id(behavioral_events),
        "actor_type": "guardrail",
        "actor_id": "guardrails_agent",
        "timestep": "day_90",
        **guardrail.model_dump(),
    }
    full_log = {"scenario_id": scenario_id, "events": behavioral_events + [guardrail_event]}

    logger.info("[Orchestrator] Running graph builder")
    graph = await graph_builder_agent.run(full_log, financial_analysis)

    # ─── Save all outputs ───────────────────────────────────────────────────────
    save_json(f"{OUTPUT_DIR}/event_log.json", full_log)
    save_json(f"{OUTPUT_DIR}/financial_analysis.json", financial_analysis)
    save_json(f"{OUTPUT_DIR}/guardrail.json", guardrail.model_dump())
    save_json(f"{OUTPUT_DIR}/graph.json", graph.model_dump())

    return guardrail, graph
