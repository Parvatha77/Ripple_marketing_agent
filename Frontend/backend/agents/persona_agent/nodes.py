"""
Consumer/Persona Agent — LangGraph node functions.

Node execution order:
  load_data_node
      ↓
  inject_prior_reactions_node
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

from agents.persona_agent.state import ConsumerAgentState
from agents.persona_agent.prompts import (
    CONSUMER_SYSTEM_PROMPT,
    build_consumer_human_prompt,
)
from langchain_llm_client import ainvoke_with_fallback
from data_loader import load_persona_by_id, load_scenario, load_products

logger = logging.getLogger(__name__)


async def load_data_node(state: ConsumerAgentState) -> dict:
    """
    Node 1: Load persona, scenario, and products from the canonical dataset.
    Populates: persona, scenario, products
    """
    persona = load_persona_by_id(state["persona_id"])
    if not persona:
        return {
            "error": f"Persona '{state['persona_id']}' not found",
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

    products = load_products()

    logger.info(f"[ConsumerAgent] Loaded persona={state['persona_id']} | timestep={state['timestep']}")

    return {
        "persona": persona,
        "scenario": scenario,
        "products": products,
        "retry_count": 0,
        "is_valid": False,
        "error": None,
    }


async def inject_prior_reactions_node(state: ConsumerAgentState) -> dict:
    """
    Node 2: Prior reactions are already in state (passed in at graph invocation).
    This node is a no-op placeholder for clarity — it logs and passes through.
    At day_0, prior_reactions will be an empty list.
    """
    prior_count = len(state.get("prior_reactions", []))
    logger.info(
        f"[ConsumerAgent] persona={state['persona_id']} | "
        f"timestep={state['timestep']} | prior_reactions={prior_count}"
    )
    return {}  # No state mutation needed


async def call_llm_node(state: ConsumerAgentState) -> dict:
    """
    Node 3: Call Groq LLM with the persona + scenario + prior reactions context.
    Stores raw text response in llm_response_raw.
    """
    if state.get("error") and not state.get("persona"):
        # Data load failed — skip LLM call
        return {"llm_response_raw": ""}

    human_prompt = build_consumer_human_prompt(
        persona=state["persona"],
        scenario=state["scenario"],
        products=state["products"],
        prior_reactions=state.get("prior_reactions", []),
        timestep=state["timestep"],
    )

    messages = [
        SystemMessage(content=CONSUMER_SYSTEM_PROMPT),
        HumanMessage(content=human_prompt),
    ]

    logger.info(
        f"[ConsumerAgent] LLM call → persona={state['persona_id']} | "
        f"timestep={state['timestep']} | retry={state.get('retry_count', 0)}"
    )

    response = await ainvoke_with_fallback(messages)
    raw = response.content.strip()

    logger.debug(f"[ConsumerAgent] Raw LLM response: {raw[:200]}")
    return {"llm_response_raw": raw}


async def validate_output_node(state: ConsumerAgentState) -> dict:
    """
    Node 4: Parse and validate the LLM's JSON response.
    Sets is_valid=True and parsed_output if valid.
    Sets is_valid=False if malformed — triggers retry edge.
    """
    raw = state.get("llm_response_raw", "")

    # Strip markdown code fences if the LLM added them despite instructions
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw

    try:
        parsed = json.loads(raw)

        # Schema validation
        required_fields = {"purchase_intent_delta", "loyalty_delta", "sentiment", "quote"}
        if not required_fields.issubset(parsed.keys()):
            missing = required_fields - parsed.keys()
            raise ValueError(f"Missing fields: {missing}")

        # Value range checks
        for field in ["purchase_intent_delta", "loyalty_delta"]:
            val = float(parsed[field])
            parsed[field] = max(-1.0, min(1.0, val))  # Clamp to [-1, 1]

        if parsed["sentiment"] not in ["positive", "mixed", "negative"]:
            parsed["sentiment"] = "mixed"

        logger.info(f"[ConsumerAgent] Valid output for persona={state['persona_id']} | timestep={state['timestep']}")
        return {"is_valid": True, "parsed_output": parsed, "error": None}

    except (json.JSONDecodeError, ValueError, KeyError) as e:
        logger.warning(
            f"[ConsumerAgent] Invalid output for persona={state['persona_id']} | "
            f"retry={state.get('retry_count', 0)} | error={e}"
        )
        return {
            "is_valid": False,
            "parsed_output": None,
            "retry_count": state.get("retry_count", 0) + 1,
            "error": str(e),
        }


async def emit_event_node(state: ConsumerAgentState) -> dict:
    """
    Node 5: Format the final event from parsed_output.
    Uses a neutral fallback if all retries were exhausted.
    """
    persona_id = state["persona_id"]
    timestep = state["timestep"]
    persona = state.get("persona", {})

    if state.get("is_valid") and state.get("parsed_output"):
        output = state["parsed_output"]
    else:
        # Fallback — neutral event when LLM output is unrecoverable
        logger.error(
            f"[ConsumerAgent] Fallback event for persona={persona_id} | "
            f"timestep={timestep} | error={state.get('error')}"
        )
        output = {
            "purchase_intent_delta": 0.0,
            "loyalty_delta": 0.0,
            "sentiment": "mixed",
            "quote": "Unable to determine reaction at this time.",
        }

    event = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "actor_type": "persona",
        "actor_id": persona_id,
        "timestep": timestep,
        "purchase_intent_delta": output["purchase_intent_delta"],
        "loyalty_delta": output["loyalty_delta"],
        "sentiment": output["sentiment"],
        "quote": output["quote"],
        "persona_name": persona.get("segment_name", persona_id),
    }

    logger.info(
        f"[ConsumerAgent] Event emitted → {persona_id} | {timestep} | "
        f"intent={output['purchase_intent_delta']:+.2f} | "
        f"loyalty={output['loyalty_delta']:+.2f} | "
        f"sentiment={output['sentiment']}"
    )

    return {"event": event}


# ─── Conditional routing function ─────────────────────────────────────────────

def route_after_validation(state: ConsumerAgentState) -> str:
    """
    Conditional edge after validate_output_node.
    - valid → emit_event
    - invalid + retry_count <= 1 → call_llm (one retry)
    - invalid + retry_count > 1 → emit_event (with fallback)
    """
    if state.get("is_valid"):
        return "emit_event"
    if state.get("retry_count", 0) <= 1:
        return "call_llm"
    return "emit_event"
