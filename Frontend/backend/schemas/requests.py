"""
Pydantic request models for Consumer and Competitor agent endpoints.
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class Timestep(str, Enum):
    day_0 = "day_0"
    day_30 = "day_30"
    day_90 = "day_90"


# ─── Consumer Agent Requests ──────────────────────────────────────────────────

class PriorReaction(BaseModel):
    """A single prior reaction from a persona at a previous timestep."""
    timestep: Timestep
    purchase_intent_delta: float = Field(..., ge=-1.0, le=1.0)
    loyalty_delta: float = Field(..., ge=-1.0, le=1.0)
    sentiment: Literal["positive", "mixed", "negative"]
    quote: str


class SimulateSinglePersonaRequest(BaseModel):
    """Run one persona at one timestep."""
    persona_id: str = Field(..., example="p1_deal_seeker")
    timestep: Timestep = Field(..., example="day_0")
    scenario_id: str = Field(default="scn_sitewide_discount_30", example="scn_sitewide_discount_30")
    prior_reactions: list[PriorReaction] = Field(
        default=[],
        description="Prior reactions from earlier timesteps — empty for day_0"
    )


class SimulateAllPersonasRequest(BaseModel):
    """
    Run all 6 personas across all 3 timesteps.
    Persona calls at each timestep are fired concurrently.
    Day 0 outputs are automatically fed as priors into Day 30,
    Day 30 outputs are fed into Day 90.
    """
    scenario_id: str = Field(default="scn_sitewide_discount_30", example="scn_sitewide_discount_30")
    persona_ids: list[str] = Field(
        default=["all"],
        description="List of persona IDs to run, or ['all'] for all 6 personas"
    )
    timesteps: list[Timestep] = Field(
        default=[Timestep.day_0, Timestep.day_30, Timestep.day_90]
    )
    scenario_override: Optional[dict] = Field(
        default=None,
        description="Full scenario dict to use instead of loading scenario_id from disk — for dynamically-created scenarios"
    )


# ─── Competitor Agent Requests ────────────────────────────────────────────────

class PersonaEventInput(BaseModel):
    """A persona event passed to the competitor agent for aggregation."""
    persona_id: str
    timestep: Timestep
    purchase_intent_delta: float
    loyalty_delta: float
    sentiment: Literal["positive", "mixed", "negative"]
    quote: str


class SimulateSingleCompetitorRequest(BaseModel):
    """Run one competitor at one timestep with given persona events."""
    competitor_id: str = Field(..., example="comp_fast_follower")
    timestep: Timestep = Field(
        ...,
        example="day_30",
        description="Competitor agents run at day_30 and day_90 only"
    )
    scenario_id: str = Field(default="scn_sitewide_discount_30")
    persona_events: list[PersonaEventInput] = Field(
        ...,
        description="Persona events at this timestep — used to compute avg shifts"
    )


class SimulateAllCompetitorsRequest(BaseModel):
    """
    Run both competitors at day_30 and day_90.
    Both competitor calls per timestep are fired concurrently.
    """
    scenario_id: str = Field(default="scn_sitewide_discount_30")
    timesteps: list[Timestep] = Field(
        default=[Timestep.day_30, Timestep.day_90]
    )
    persona_events: list[PersonaEventInput] = Field(
        ...,
        description="All persona events (across all timesteps) from the consumer simulation"
    )
    scenario_override: Optional[dict] = Field(
        default=None,
        description="Full scenario dict to use instead of loading scenario_id from disk — for dynamically-created scenarios"
    )
