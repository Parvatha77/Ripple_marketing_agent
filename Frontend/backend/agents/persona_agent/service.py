"""
Consumer Service — Orchestrates Consumer/Persona Agent runs.

Key behaviour:
  - For simulate_all: fires all 6 persona calls CONCURRENTLY per timestep
    using asyncio.gather(), then chains outputs as priors to the next timestep.
  - For simulate_single: runs one persona at one timestep.
"""
import asyncio
import logging
from datetime import datetime

from agents.persona_agent.graph import consumer_agent_graph
from data_loader import load_personas
from schemas.requests import SimulateAllPersonasRequest, SimulateSinglePersonaRequest
from schemas.responses import PersonaEvent, ConsumerSimulationResponse

logger = logging.getLogger(__name__)


async def run_single_persona(
    persona_id: str,
    timestep: str,
    scenario_id: str,
    prior_reactions: list[dict],
    scenario_override: dict | None = None,
) -> dict:
    """
    Run the consumer agent graph for one persona at one timestep.
    Returns the raw event dict from state["event"].
    """
    initial_state = {
        "persona_id": persona_id,
        "timestep": timestep,
        "scenario_id": scenario_id,
        "prior_reactions": prior_reactions,
        "scenario_override": scenario_override,
        # Initialise remaining state fields
        "persona": {},
        "scenario": {},
        "products": [],
        "llm_response_raw": "",
        "retry_count": 0,
        "is_valid": False,
        "parsed_output": None,
        "event": None,
        "error": None,
    }

    result = await consumer_agent_graph.ainvoke(initial_state)
    return result.get("event") or {}


async def simulate_single_persona(
    request: SimulateSinglePersonaRequest,
) -> PersonaEvent:
    """
    Service handler for POST /api/v1/consumer/simulate/single.
    Runs one persona at one timestep with optional prior reactions.
    """
    prior_reactions = [r.model_dump() for r in request.prior_reactions]

    event = await run_single_persona(
        persona_id=request.persona_id,
        timestep=request.timestep.value,
        scenario_id=request.scenario_id,
        prior_reactions=prior_reactions,
    )

    return PersonaEvent(**event)


async def simulate_all_personas(
    request: SimulateAllPersonasRequest,
) -> ConsumerSimulationResponse:
    """
    Service handler for POST /api/v1/consumer/simulate/all.

    Execution flow:
      1. Determine which personas to run (all or filtered list)
      2. For each timestep in order [day_0, day_30, day_90]:
         a. Fire all persona calls CONCURRENTLY with asyncio.gather()
         b. Collect events for this timestep
         c. Index events by persona_id for next timestep's prior_reactions
      3. Return all events flat in a single response
    """
    # ── Resolve persona list ────────────────────────────────────
    all_personas = load_personas()
    if "all" in request.persona_ids:
        persona_ids = [p["persona_id"] for p in all_personas]
    else:
        persona_ids = request.persona_ids

    timesteps = [t.value for t in request.timesteps]
    scenario_id = request.scenario_id

    all_events: list[dict] = []
    # prior_reactions_map: persona_id → list of prior event dicts
    prior_reactions_map: dict[str, list[dict]] = {pid: [] for pid in persona_ids}

    logger.info(
        f"[ConsumerService] Starting simulation | "
        f"personas={len(persona_ids)} | timesteps={timesteps} | scenario={scenario_id}"
    )

    for timestep in timesteps:
        logger.info(f"[ConsumerService] Running timestep={timestep} for {len(persona_ids)} personas concurrently")

        # Build coroutines for all personas at this timestep
        tasks = [
            run_single_persona(
                persona_id=pid,
                timestep=timestep,
                scenario_id=scenario_id,
                prior_reactions=prior_reactions_map[pid],
                scenario_override=request.scenario_override,
            )
            for pid in persona_ids
        ]

        # ── Fire all concurrently ───────────────────────────────
        timestep_events = await asyncio.gather(*tasks)

        # ── Collect & update priors for next timestep ───────────
        for event in timestep_events:
            if event:
                all_events.append(event)
                pid = event.get("actor_id")
                if pid in prior_reactions_map:
                    # Add this timestep's reaction as a prior for the next timestep
                    prior_reactions_map[pid].append({
                        "timestep": event.get("timestep"),
                        "purchase_intent_delta": event.get("purchase_intent_delta", 0.0),
                        "loyalty_delta": event.get("loyalty_delta", 0.0),
                        "sentiment": event.get("sentiment", "mixed"),
                        "quote": event.get("quote", ""),
                    })

    # ── Build aggregated summary per timestep ───────────────────
    summary = _build_summary(all_events, timesteps)

    logger.info(
        f"[ConsumerService] Simulation complete | total_events={len(all_events)}"
    )

    return ConsumerSimulationResponse(
        scenario_id=scenario_id,
        total_events=len(all_events),
        events=[PersonaEvent(**e) for e in all_events],
        run_timestamp=datetime.utcnow().isoformat(),
        summary=summary,
    )


def _build_summary(events: list[dict], timesteps: list[str]) -> dict:
    """Build a per-timestep aggregated summary of deltas."""
    summary = {}
    for ts in timesteps:
        ts_events = [e for e in events if e.get("timestep") == ts]
        if ts_events:
            avg_intent = sum(e.get("purchase_intent_delta", 0) for e in ts_events) / len(ts_events)
            avg_loyalty = sum(e.get("loyalty_delta", 0) for e in ts_events) / len(ts_events)
            sentiments = [e.get("sentiment") for e in ts_events]
            summary[ts] = {
                "avg_purchase_intent_delta": round(avg_intent, 4),
                "avg_loyalty_delta": round(avg_loyalty, 4),
                "sentiment_breakdown": {
                    "positive": sentiments.count("positive"),
                    "mixed": sentiments.count("mixed"),
                    "negative": sentiments.count("negative"),
                },
                "total_personas": len(ts_events),
            }
    return summary
