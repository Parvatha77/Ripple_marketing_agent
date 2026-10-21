from typing import List, Literal, Optional

from pydantic import BaseModel

Timestep = Literal["day_0", "day_30", "day_90"]


class Event(BaseModel):
    event_id: str
    actor_type: Literal["persona", "competitor", "guardrail"]
    actor_id: str
    timestep: Timestep
    purchase_intent_delta: Optional[float] = None
    loyalty_delta: Optional[float] = None
    sentiment: Optional[Literal["positive", "mixed", "negative"]] = None
    quote: Optional[str] = None
    action: Optional[Literal["match", "hold", "escalate"]] = None
    recommendation: Optional[str] = None
    rationale: Optional[str] = None


class EventLog(BaseModel):
    scenario_id: str
    events: List[Event]
