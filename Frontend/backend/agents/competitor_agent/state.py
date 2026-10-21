"""
Consumer/Persona Agent — LangGraph State definition.

The state flows through 5 nodes:
  load_data → inject_prior_reactions → call_llm → validate_output → emit_event
"""
from typing import TypedDict, Optional, Literal


class CompetitorAgentState(TypedDict):
    # ─── Inputs (set before graph starts) ──────────────────────
    competitor_id: str
    timestep: Literal["day_30", "day_90"]
    scenario_id: str
    persona_events: list[dict]    # All persona events at this timestep
    scenario_override: Optional[dict]  # Full scenario dict for dynamically-created scenarios not on disk

    # ─── Loaded from CSV inside graph ──────────────────────────
    competitor: dict              # Full competitor record
    scenario: dict                # Full scenario record

    # ─── Aggregated from persona_events ────────────────────────
    avg_intent_delta: float
    avg_loyalty_delta: float
    sample_quotes: list[str]

    # ─── LLM interaction ───────────────────────────────────────
    llm_response_raw: str
    retry_count: int

    # ─── Validation & output ───────────────────────────────────
    is_valid: bool
    parsed_output: Optional[dict]
    event: Optional[dict]
    error: Optional[str]
