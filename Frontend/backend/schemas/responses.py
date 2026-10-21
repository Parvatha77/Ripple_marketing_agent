"""
Pydantic response models for Consumer and Competitor agent endpoints.
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime


# ─── Consumer Agent Responses ─────────────────────────────────────────────────

class PersonaEvent(BaseModel):
    """Output of one Consumer/Persona Agent run at one timestep."""
    event_id: str
    actor_type: Literal["persona"] = "persona"
    actor_id: str = Field(..., description="Matches persona_id from personas.csv")
    timestep: Literal["day_0", "day_30", "day_90"]
    purchase_intent_delta: float = Field(..., ge=-1.0, le=1.0, description="Change in purchase intent, -1 to 1")
    loyalty_delta: float = Field(..., ge=-1.0, le=1.0, description="Change in brand loyalty, -1 to 1")
    sentiment: Literal["positive", "mixed", "negative"]
    quote: str = Field(..., description="One line in the persona's own voice")
    persona_name: Optional[str] = Field(None, description="Human-readable segment name")


class ConsumerSimulationResponse(BaseModel):
    """Full response for a multi-persona simulation run."""
    scenario_id: str
    total_events: int
    events: list[PersonaEvent]
    run_timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    summary: dict = Field(
        default_factory=dict,
        description="Aggregated deltas per timestep for quick overview"
    )


# ─── Competitor Agent Responses ───────────────────────────────────────────────

class CompetitorEvent(BaseModel):
    """Output of one Competitor Agent run at one timestep."""
    event_id: str
    actor_type: Literal["competitor"] = "competitor"
    actor_id: str = Field(..., description="Matches competitor_id from competitors.csv")
    timestep: Literal["day_30", "day_90"]
    action: Literal["match", "hold", "escalate"]
    rationale: str = Field(..., description="1-2 sentence reasoning for the competitor's decision")
    competitor_name: Optional[str] = Field(None, description="Human-readable competitor name")
    observed_avg_intent_delta: Optional[float] = Field(None, description="Avg persona intent shift this competitor saw")
    observed_avg_loyalty_delta: Optional[float] = Field(None, description="Avg persona loyalty shift this competitor saw")


class CompetitorSimulationResponse(BaseModel):
    """Full response for a multi-competitor simulation run."""
    scenario_id: str
    total_events: int
    events: list[CompetitorEvent]
    run_timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─── Combined / Health ────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    version: str


class ErrorResponse(BaseModel):
    detail: str
    agent: Optional[str] = None
    persona_id: Optional[str] = None
    competitor_id: Optional[str] = None
