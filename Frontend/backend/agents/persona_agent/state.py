"""
Consumer/Persona Agent — LangGraph State definition.

The state flows through 5 nodes:
  load_data → inject_prior_reactions → call_llm → validate_output → emit_event

The graph uses a conditional edge after validate_output:
  - If valid JSON → emit_event
  - If invalid AND retry_count == 0 → call_llm (retry once)
  - If invalid AND retry_count >= 1 → emit_event (with fallback)
"""
from typing import TypedDict, Optional, Literal


class ConsumerAgentState(TypedDict):
    # ─── Inputs (set before graph starts) ──────────────────────
    persona_id: str
    timestep: Literal["day_0", "day_30", "day_90"]
    scenario_id: str
    prior_reactions: list[dict]   # Reactions from earlier timesteps
    scenario_override: Optional[dict]  # Full scenario dict for dynamically-created scenarios not on disk

    # ─── Loaded from CSV inside graph ──────────────────────────
    persona: dict                 # Full persona record
    scenario: dict                # Full scenario record
    products: list[dict]          # All product SKUs

    # ─── LLM interaction ───────────────────────────────────────
    llm_response_raw: str         # Raw text from Groq
    retry_count: int              # Starts at 0, max 1 retry

    # ─── Validation & output ───────────────────────────────────
    is_valid: bool                # Whether llm_response parsed cleanly
    parsed_output: Optional[dict] # Parsed JSON from LLM
    event: Optional[dict]         # Final formatted event for the caller
    error: Optional[str]          # Error message if all retries exhausted
