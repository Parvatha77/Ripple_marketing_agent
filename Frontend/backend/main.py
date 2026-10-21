from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from routes_frontend import router as frontend_router

app = FastAPI(title="Guardrails + Graph Builder Service")

SCENARIO_ID = "scn_sitewide_discount_30"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(frontend_router)

_status = {"state": "idle", "guardrail": None, "graph": None, "error": None}


class RunRequest(BaseModel):
    scenario_id: str = SCENARIO_ID


class SimulationRequest(BaseModel):
    discount_pct: float
    category: str = "sitewide"
    initiated_by: str = "unknown"


async def _execute(scenario_id: str):
    _status.update(state="running", error=None)
    try:
        from orchestrator import run_pipeline
        guardrail, graph = await run_pipeline(scenario_id)
        _status.update(state="complete", guardrail=guardrail.model_dump(), graph=graph.model_dump())
    except Exception as e:
        _status.update(state="failed", error=str(e))


@app.post("/run")
async def trigger_run(request: RunRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_execute, request.scenario_id)
    return {"status": "started", "scenario_id": request.scenario_id}


@app.post("/simulate")
async def simulate(request: SimulationRequest):
    """
    Dynamic simulation endpoint: generates scenario outcomes based on discount % and category.
    Calls the full LLM pipeline and returns updated scenario, outcomes, guardrails, events, graph.
    """
    from orchestrator import create_dynamic_scenario, run_pipeline
    from routes_frontend import _guardrail_recommendation_text
    from io_utils import load_json

    try:
        # Create dynamic scenario
        scenario = create_dynamic_scenario(request.discount_pct, request.category)
        print(f"[/simulate] Created scenario: {scenario['scenario_id']}")

        # Run full LLM pipeline
        print(f"[/simulate] Running pipeline...")
        guardrail, graph = await run_pipeline(scenario_override=scenario)
        print(f"[/simulate] Pipeline completed. Loading output files...")

        # Load baseline and financial results
        baseline = load_json("data/baseline.json")
        print(f"[/simulate] Loaded baseline")
        financial = load_json("outputs/financial_analysis.json")
        print(f"[/simulate] Loaded financial_analysis")
        event_log = load_json("outputs/event_log.json")
        print(f"[/simulate] Loaded event_log")

        # Calculate outcome (post-decision metrics)
        outcome = {
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

        # Flatten guardrail recommendation
        guardrail_event = next((e for e in event_log["events"] if e["actor_type"] == "guardrail"), None)
        if guardrail_event:
            guardrail_event["recommendation"] = _guardrail_recommendation_text(guardrail_event.get("recommendation", {}))

        # Flatten graph source event IDs
        graph_dict = graph.model_dump()
        for n in graph_dict.get("nodes", []):
            n["source_event_ids"] = [
                ev.split(":", 1)[1] for ev in n.get("evidence", []) if ev.startswith("event:")
            ]

        print(f"[/simulate] Success - returning response")
        return {
            "scenario": scenario,
            "outcome": outcome,
            "baseline": baseline,
            "event_log": event_log,
            "guardrail": guardrail.model_dump(),
            "graph": graph_dict,
            "financial_analysis": financial,
        }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"[/simulate] ERROR: {error_msg}")
        return {"error": str(e), "status": "failed"}


@app.get("/status")
async def get_status():
    return _status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
