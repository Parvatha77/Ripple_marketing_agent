from typing import List, Literal, Optional

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]


class RiskAssessment(BaseModel):
    overall: RiskLevel
    customer: RiskLevel
    financial: RiskLevel
    competitive: RiskLevel
    brand: RiskLevel


class Recommendation(BaseModel):
    decision: str
    proposed_value: Optional[float] = None
    unit: Optional[str] = None
    scope: Optional[str] = None


class EvidenceItem(BaseModel):
    """One grounded citation supporting a claim — the LLM must point at a real
    number or event it was given, not restate the claim in different words."""

    claim: str
    source: str  # e.g. "financial_analysis.profit_delta", "event:evt_012", "historical:hd_004"
    value: str


class ImpactSummary(BaseModel):
    """Copied verbatim from the deterministic financial analyzer — never LLM-generated."""

    revenue_delta: float
    profit_delta: float
    aov_delta: float
    avg_margin_delta_pct: float
    discount_cost: float


class ConfidenceFactors(BaseModel):
    """Copied verbatim from analysis.confidence_scorer — never LLM-generated."""

    historical_evidence: float
    comparable_decisions: int
    data_completeness: float
    simulation_consistency: float


class GuardrailResult(BaseModel):
    primary_risk: str
    risk_assessment: RiskAssessment
    evidence: List[EvidenceItem]
    recommendation: Recommendation
    rationale: str
    # Not requested from the LLM (see prompts/guardrails.py) — computed and
    # attached by guardrails_agent.run() after the LLM call.
    confidence: float = Field(default=0.0, ge=0, le=1)
    confidence_factors: Optional[ConfidenceFactors] = None
    impact_summary: Optional[ImpactSummary] = None
