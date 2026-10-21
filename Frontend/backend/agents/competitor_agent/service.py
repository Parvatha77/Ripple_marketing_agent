"""
Competitor Service — Orchestrates Competitor Agent runs.

Key behaviour:
  - Competitor agents run at day_30 and day_90 only (not day_0)
  - Both competitor calls per timestep are fired CONCURRENTLY
  - Persona events at each timestep are used as aggregation inputs
"""
import asyncio
import logging
from datetime import datetime

from agents.competitor_agent.graph import competitor_agent_graph
from data_loader import load_competitors
from schemas.requests import SimulateAllCompetitorsRequest, SimulateSingleCompetitorRequest
from schemas.responses import CompetitorEvent, CompetitorSimulationResponse

logger = logging.getLogger(__name__)


async def run_single_competitor(
    competitor_id: str,
    timestep: str,
    scenario_id: str,
    persona_events: list[dict],
    scenario_override: dict | None = None,
) -> dict:
    """
    Run the competitor agent graph for one competitor at one timestep.
    Returns the raw event dict from state["event"].
    """
    initial_state = {
        "competitor_id": competitor_id,
        "timestep": timestep,
        "scenario_id": scenario_id,
        "persona_events": persona_events,
        "scenario_override": scenario_override,
        # Initialise remaining state fields
        "competitor": {},
        "scenario": {},
        "avg_intent_delta": 0.0,
        "avg_loyalty_delta": 0.0,
        "sample_quotes": [],
        "llm_response_raw": "",
        "retry_count": 0,
        "is_valid": False,
        "parsed_output": None,
        "event": None,
        "error": None,
    }

    result = await competitor_agent_graph.ainvoke(initial_state)
    return result.get("event") or {}


async def simulate_single_competitor(
    request: SimulateSingleCompetitorRequest,
) -> CompetitorEvent:
    """
    Service handler for POST /api/v1/competitor/simulate/single.
    """
    persona_events = [e.model_dump() for e in request.persona_events]

    event = await run_single_competitor(
        competitor_id=request.competitor_id,
        timestep=request.timestep.value,
        scenario_id=request.scenario_id,
        persona_events=persona_events,
    )

    return CompetitorEvent(**event)


async def simulate_all_competitors(
    request: SimulateAllCompetitorsRequest,
) -> CompetitorSimulationResponse:
    """
    Service handler for POST /api/v1/competitor/simulate/all.

    Execution flow:
      1. Load all competitor IDs from the canonical dataset
      2. For each timestep in [day_30, day_90]:
         a. Filter persona_events to this timestep
         b. Fire both competitor calls CONCURRENTLY with asyncio.gather()
         c. Collect events
      3. Return all events in a single response
    """
    all_competitors = load_competitors()
    competitor_ids = [c["competitor_id"] for c in all_competitors]

    # Only run at day_30 and day_90
    valid_timesteps = {"day_30", "day_90"}
    timesteps = [t.value for t in request.timesteps if t.value in valid_timesteps]

    # Convert persona_events to plain dicts
    persona_events_dicts = [e.model_dump() for e in request.persona_events]
    scenario_id = request.scenario_id

    all_events: list[dict] = []

    logger.info(
        f"[CompetitorService] Starting simulation | "
        f"competitors={len(competitor_ids)} | timesteps={timesteps} | scenario={scenario_id}"
    )

    for timestep in timesteps:
        # Filter persona events to this timestep for aggregation
        timestep_persona_events = [
            e for e in persona_events_dicts
            if e.get("timestep") == timestep
        ]

        logger.info(
            f"[CompetitorService] Running timestep={timestep} | "
            f"{len(timestep_persona_events)} persona events as input"
        )

        # Build coroutines for both competitors at this timestep
        tasks = [
            run_single_competitor(
                competitor_id=cid,
                timestep=timestep,
                scenario_id=scenario_id,
                persona_events=timestep_persona_events,
                scenario_override=request.scenario_override,
            )
            for cid in competitor_ids
        ]

        # ── Fire both concurrently ──────────────────────────────
        timestep_events = await asyncio.gather(*tasks)

        for event in timestep_events:
            if event:
                all_events.append(event)

    logger.info(
        f"[CompetitorService] Simulation complete | total_events={len(all_events)}"
    )

    return CompetitorSimulationResponse(
        scenario_id=scenario_id,
        total_events=len(all_events),
        events=[CompetitorEvent(**e) for e in all_events],
        run_timestamp=datetime.utcnow().isoformat(),
    )
