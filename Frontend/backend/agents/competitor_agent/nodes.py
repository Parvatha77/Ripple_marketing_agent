"""
Competitor Agent — LangGraph node functions.

Node execution order:
  load_data_node
      ↓
  aggregate_persona_shifts_node
      ↓
  call_llm_node  ←─────────────────────┐
      ↓                                │ retry (once)
  validate_output_node ─── invalid ────┘
      ↓ valid
  emit_event_node
"""
import json
import uuid
import logging
from langchain_core.messages import HumanMessage, SystemMessage

from agents.competitor_agent.state import CompetitorAgentState
from agents.competitor_agent.prompts import (
    COMPETITOR_SYSTEM_PROMPT,
    build_competitor_human_prompt,
)
from langchain_llm_client import ainvoke_with_fallback
from data_loader import load_competitor_by_id, load_scenario

logger = logging.getLogger(__name__)


async def load_data_node(state: CompetitorAgentState) -> dict:
    """
    Node 1: Load competitor profile and scenario from the canonical dataset.
    """
    competitor = load_competitor_by_id(state["competitor_id"])
    if not competitor:
        return {
            "error": f"Competitor '{state['competitor_id']}' not found",
            "is_valid": False,
        }

    # A dynamically-created scenario (e.g. from the /simulate slider) isn't on disk —
    # use the object passed in directly instead of re-fetching it by id.
    scenario = state.get("scenario_override") or load_scenario(state["scenario_id"])
    if not scenario:
        return {
            "error": f"Scenario '{state['scenario_id']}' not found",
            "is_valid": False,
        }

    logger.info(
        f"[CompetitorAgent] Loaded competitor={state['competitor_id']} | "
        f"timestep={state['timestep']}"
    )

    return {
        "competitor": competitor,
        "scenario": scenario,
        "retry_count": 0,
        "is_valid": False,
        "error": None,
    }


async def aggregate_persona_shifts_node(state: CompetitorAgentState) -> dict:
    """
    Node 2: Compute aggregated persona shift metrics from persona_events.
    Filters persona events to the current timestep only, then averages deltas.
    Also extracts up to 4 sample quotes for the LLM prompt.
    """
    # Filter events to this timestep only
    events_at_timestep = [
        e for e in state.get("persona_events", [])
        if e.get("timestep") == state["timestep"]
    ]

    if not events_at_timestep:
        # Fallback: use all persona events if timestep filter returns nothing
        events_at_timestep = state.get("persona_events", [])

    if events_at_timestep:
        avg_intent = sum(e.get("purchase_intent_delta", 0) for e in events_at_timestep) / len(events_at_timestep)
        avg_loyalty = sum(e.get("loyalty_delta", 0) for e in events_at_timestep) / len(events_at_timestep)
        quotes = [e.get("quote", "") for e in events_at_timestep if e.get("quote")][:4]
    else:
        avg_intent = 0.0
        avg_loyalty = 0.0
        quotes = []

    logger.info(
        f"[CompetitorAgent] Aggregated {len(events_at_timestep)} persona events | "
        f"avg_intent={avg_intent:+.2f} | avg_loyalty={avg_loyalty:+.2f}"
    )

    return {
        "avg_intent_delta": round(avg_intent, 4),
        "avg_loyalty_delta": round(avg_loyalty, 4),
        "sample_quotes": quotes,
    }


async def call_llm_node(state: CompetitorAgentState) -> dict:
    """
    Node 3: Call Groq LLM with competitor profile + aggregated customer shifts.
    """
    if state.get("error") and not state.get("competitor"):
        return {"llm_response_raw": ""}

    human_prompt = build_competitor_human_prompt(
        competitor=state["competitor"],
        scenario=state["scenario"],
        timestep=state["timestep"],
        avg_intent_delta=state.get("avg_intent_delta", 0.0),
        avg_loyalty_delta=state.get("avg_loyalty_delta", 0.0),
        sample_quotes=state.get("sample_quotes", []),
    )

    messages = [
        SystemMessage(content=COMPETITOR_SYSTEM_PROMPT),
        HumanMessage(content=human_prompt),
    ]

    logger.info(
        f"[CompetitorAgent] LLM call → competitor={state['competitor_id']} | "
        f"timestep={state['timestep']} | retry={state.get('retry_count', 0)}"
    )

    response = await ainvoke_with_fallback(messages)
    raw = response.content.strip()

    logger.debug(f"[CompetitorAgent] Raw LLM response: {raw[:200]}")
    return {"llm_response_raw": raw}


async def validate_output_node(state: CompetitorAgentState) -> dict:
    """
    Node 4: Parse and validate the LLM's JSON response.
    """
    raw = state.get("llm_response_raw", "")

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw

    try:
        parsed = json.loads(raw)

        required_fields = {"action", "rationale"}
        if not required_fields.issubset(parsed.keys()):
            missing = required_fields - parsed.keys()
            raise ValueError(f"Missing fields: {missing}")

        if parsed["action"] not in ["match", "hold", "escalate"]:
            raise ValueError(f"Invalid action: {parsed['action']}")

        logger.info(
            f"[CompetitorAgent] Valid output for competitor={state['competitor_id']} | "
            f"action={parsed['action']}"
        )
        return {"is_valid": True, "parsed_output": parsed, "error": None}

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        logger.warning(
            f"[CompetitorAgent] Invalid output for competitor={state['competitor_id']} | "
            f"retry={state.get('retry_count', 0)} | error={e}"
        )
        return {
            "is_valid": False,
            "parsed_output": None,
            "retry_count": state.get("retry_count", 0) + 1,
            "error": str(e),
        }


async def emit_event_node(state: CompetitorAgentState) -> dict:
    """
    Node 5: Format the final competitor event.
    Uses 'hold' as the fallback action when LLM output is unrecoverable.
    """
    competitor_id = state["competitor_id"]
    timestep = state["timestep"]
    competitor = state.get("competitor", {})

    if state.get("is_valid") and state.get("parsed_output"):
        output = state["parsed_output"]
    else:
        logger.error(
            f"[CompetitorAgent] Fallback event for competitor={competitor_id} | "
            f"timestep={timestep} | error={state.get('error')}"
        )
        output = {
            "action": "hold",
            "rationale": "Unable to determine competitive response at this time.",
        }

    event = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "actor_type": "competitor",
        "actor_id": competitor_id,
        "timestep": timestep,
        "action": output["action"],
        "rationale": output["rationale"],
        "competitor_name": competitor.get("name", competitor_id),
        "observed_avg_intent_delta": state.get("avg_intent_delta"),
        "observed_avg_loyalty_delta": state.get("avg_loyalty_delta"),
    }

    logger.info(
        f"[CompetitorAgent] Event emitted → {competitor_id} | {timestep} | "
        f"action={output['action']}"
    )

    return {"event": event}


# ─── Conditional routing function ─────────────────────────────────────────────

def route_after_validation(state: CompetitorAgentState) -> str:
    """
    Conditional edge: valid → emit_event, invalid+retry → call_llm, exhausted → emit_event
    """
    if state.get("is_valid"):
        return "emit_event"
    if state.get("retry_count", 0) <= 1:
        return "call_llm"
    return "emit_event"
