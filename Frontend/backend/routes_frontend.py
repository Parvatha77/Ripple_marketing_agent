"""
Read-only + simulation-log endpoints consumed by the Ripple frontend
(Frontend/src/api/client.ts). Serves the canonical seed data straight from
data/*.json, derives /outcome from the financial analysis, reshapes the
guardrail event in /event-log to the frontend's flat string contract, and
persists user-run simulations from the Simulator screen to disk so the
Governance screen can list them.
"""
import uuid
from datetime import datetime, timezone

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from io_utils import load_json, save_json

SimulationStatus = Literal["pending_review", "under_review", "approved", "rejected"]

router = APIRouter(tags=["frontend"])

DATA_DIR = "data"
OUTPUT_DIR = "outputs"
SIMULATIONS_PATH = f"{DATA_DIR}/simulations.json"


@router.get("/scenario")
def get_scenario():
    return load_json(f"{DATA_DIR}/scenario.json")


@router.get("/personas")
def get_personas():
    return load_json(f"{DATA_DIR}/personas.json")


@router.get("/products")
def get_products():
    return load_json(f"{DATA_DIR}/products.json")


@router.get("/competitors")
def get_competitors():
    return load_json(f"{DATA_DIR}/competitors.json")


@router.get("/baseline")
def get_baseline():
    return load_json(f"{DATA_DIR}/baseline.json")


@router.get("/outcome")
def get_outcome():
    """Post-decision Baseline snapshot, derived from baseline + the guardrails
    pipeline's financial analysis (same shape as /baseline so the frontend
    can diff them directly)."""
    baseline = load_json(f"{DATA_DIR}/baseline.json")
    try:
        financial = load_json(f"{OUTPUT_DIR}/financial_analysis.json")
    except FileNotFoundError:
        # Return baseline as outcome if simulation hasn't run yet
        return baseline

    return {
        "period": "post-decision",
        "revenue": round(baseline["revenue"] + financial["revenue_delta"], 2),
        "full_price_purchase_pct": round(
            max(0.0, baseline["full_price_purchase_pct"] - financial["avg_purchase_intent_delta"] * 20), 2
        ),
        "avg_order_value": round(baseline["avg_order_value"] + financial["aov_delta"], 2),
        "repeat_purchase_rate": round(
            max(0.0, baseline["repeat_purchase_rate"] + financial["avg_purchase_intent_delta"] * 0.05), 4
        ),
        "avg_discount_depth_pct": financial["new_discount_pct"],
    }


def _guardrail_recommendation_text(rec: dict) -> str:
    value = rec.get("proposed_value")
    unit = rec.get("unit", "")
    decision = rec.get("decision", "")
    scope = rec.get("scope", "")
    unit_str = "%" if unit == "percent" else f" {unit}"
    return f"Set {decision} to {value}{unit_str} ({scope})".strip()


@router.get("/event-log")
def get_event_log():
    """Same shape as outputs/event_log.json, except the guardrail event's
    `recommendation` (an object in the pipeline output) is flattened to the
    plain string the frontend's GuardrailEvent type expects."""
    try:
        log = load_json(f"{OUTPUT_DIR}/event_log.json")
    except FileNotFoundError:
        # Return empty event log if simulation hasn't run yet
        return {"scenario_id": "scn_initial", "events": []}

    events = []
    for e in log["events"]:
        if e["actor_type"] == "guardrail":
            e = dict(e)
            e["recommendation"] = _guardrail_recommendation_text(e.get("recommendation", {}))
        events.append(e)
    return {"scenario_id": log["scenario_id"], "events": events}


@router.get("/graph")
def get_graph():
    """Same shape as outputs/graph.json, plus `source_event_ids` derived from
    each node's `evidence` citations (only the ones that reference an actual
    event_log entry, e.g. "event:evt_012")."""
    try:
        graph = load_json(f"{OUTPUT_DIR}/graph.json")
    except FileNotFoundError:
        # Return empty graph if simulation hasn't run yet
        return {"scenario_id": "scn_initial", "nodes": [], "edges": []}

    nodes = []
    for n in graph["nodes"]:
        n = dict(n)
        n["source_event_ids"] = [
            ev.split(":", 1)[1] for ev in n.get("evidence", []) if ev.startswith("event:")
        ]
        nodes.append(n)
    return {"scenario_id": graph["scenario_id"], "nodes": nodes, "edges": graph["edges"]}


@router.get("/guardrail")
def get_guardrail():
    """Full structured guardrail memo (risk assessment, evidence, confidence,
    impact summary) — richer than the flattened event in /event-log, for
    screens that want to render the whole recommendation memo."""
    try:
        return load_json(f"{OUTPUT_DIR}/guardrail.json")
    except FileNotFoundError:
        # Return empty guardrail if simulation hasn't run yet
        return {
            "primary_risk": "No simulation run yet",
            "risk_assessment": {"overall": "low", "customer": "low", "financial": "low", "competitive": "low", "brand": "low"},
            "evidence": [],
            "recommendation": {"decision": "", "proposed_value": 0, "unit": "", "scope": ""},
            "rationale": "",
            "confidence": 0,
            "impact_summary": {"revenue_delta": 0, "profit_delta": 0, "aov_delta": 0, "avg_margin_delta_pct": 0, "discount_cost": 0},
        }


@router.get("/financial-analysis")
def get_financial_analysis():
    """Per-product margin deltas and top-line financial impact from the
    guardrails pipeline — not currently surfaced anywhere in the frontend."""
    try:
        return load_json(f"{OUTPUT_DIR}/financial_analysis.json")
    except FileNotFoundError:
        # Return empty financial analysis if simulation hasn't run yet
        return {}


class SimulationIn(BaseModel):
    scenario_id: str
    discount_pct: float
    product_id: str | None = None
    category: str | None = None
    product_ids: list[str] = []
    initiated_by: str
    revenue: float | None = None
    revenue_change_pct: float
    margin_impact_pct: float
    repeat_purchase_rate: float | None = None
    avg_order_value: float | None = None
    full_price_purchase_pct: float | None = None
    guardrail_recommendation: float | None = None
    selected_node_id: str | None = None
    evidence: dict | list | None = None


class SimulationStatusUpdate(BaseModel):
    status: SimulationStatus


def _load_simulations() -> list[dict]:
    try:
        simulations = load_json(SIMULATIONS_PATH)
    except FileNotFoundError:
        return []
    # Older saved records predate the status field — default them so the
    # governance Kanban board has somewhere to put them.
    for s in simulations:
        s.setdefault("status", "pending_review")
    return simulations


@router.get("/simulations")
def list_simulations():
    return sorted(_load_simulations(), key=lambda s: s["created_at"], reverse=True)


@router.post("/simulations")
def create_simulation(sim: SimulationIn):
    simulations = _load_simulations()
    record = {
        **sim.model_dump(),
        "id": f"sim_{uuid.uuid4().hex[:8]}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "category": sim.category or "all",
        "status": "pending_review",
    }
    simulations.append(record)
    save_json(SIMULATIONS_PATH, simulations)
    return record


@router.patch("/simulations/{sim_id}")
def update_simulation_status(sim_id: str, update: SimulationStatusUpdate):
    simulations = _load_simulations()
    for s in simulations:
        if s["id"] == sim_id:
            s["status"] = update.status
            save_json(SIMULATIONS_PATH, simulations)
            return s
    raise HTTPException(status_code=404, detail=f"Simulation {sim_id} not found")


@router.delete("/simulations/{sim_id}")
def delete_simulation(sim_id: str):
    simulations = _load_simulations()
    remaining = [s for s in simulations if s["id"] != sim_id]
    if len(remaining) == len(simulations):
        raise HTTPException(status_code=404, detail=f"Simulation {sim_id} not found")
    save_json(SIMULATIONS_PATH, remaining)
    return {"status": "deleted", "id": sim_id}
