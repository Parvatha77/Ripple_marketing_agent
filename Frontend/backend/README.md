# Marketing Ripple-Effect Agent

Full 4-agent pipeline for the Marketing Decision Intelligence POC: Persona +
Competitor agents (LangGraph) simulate customer/competitor reactions to a
scenario, then the Guardrails and Graph Builder agents turn that event log
into a risk recommendation and a causal ripple-effect graph. All four live
under `agents/`, one subpackage/module per agent.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY (or GROQ_API_KEYS for multi-key fallback)
```

`GROQ_API_KEYS` accepts a comma-separated list of Groq account keys — a
rate-limited call rotates to the next key automatically. `OPEN_ROUTER_API_KEY`
is an optional second fallback tier, tried after every Groq key is exhausted.

## Run

```bash
python -c "import asyncio; from orchestrator import run_pipeline; asyncio.run(run_pipeline())"
```

Runs all 24 LLM calls (18 persona + 4 competitor + guardrails + graph
builder) plus the deterministic financial analysis, and writes
`outputs/event_log.json`, `outputs/financial_analysis.json`,
`outputs/guardrail.json`, and `outputs/graph.json`.

Or serve it:

```bash
uvicorn main:app --reload
```

`POST /run` (optionally `{"scenario_id": "..."}`, defaults to the current
scenario) starts a pipeline run in the background, `GET /status` polls it.

## Test

```bash
pytest
```

Unit tests in `tests/` mock the LLM call and only check schema validation —
they don't hit the network.

## Layout

```
agents/
├── guardrails_agent.py, graph_builder_agent.py   # single-call agents
├── persona_agent/                                 # LangGraph state machine
│   ├── state.py, prompts.py, nodes.py, graph.py
│   └── service.py            # concurrent fan-out across all 6 personas
└── competitor_agent/                              # LangGraph state machine
    ├── state.py, prompts.py, nodes.py, graph.py
    └── service.py            # concurrent fan-out across both competitors

schemas/       # Pydantic models — guardrails.py (RiskAssessment, EvidenceItem,
               # Recommendation, ImpactSummary, ConfidenceFactors, GuardrailResult),
               # graph.py (GraphNode w/ evidence citations, business-rule validator),
               # event.py, requests.py/responses.py
prompts/       # prompt templates for guardrails_agent / graph_builder_agent
analysis/
├── financial_analyzer.py    # deterministic price/margin/revenue/profit/AOV/
│                             # discount-cost math — fed into both agent prompts
│                             # as ground truth so the LLM doesn't invent numbers
└── confidence_scorer.py     # deterministic confidence: historical-decision
                              # coverage + simulation data completeness (fallback
                              # events count against it) + cross-persona agreement.
                              # The LLM is never asked for a confidence number.
data/*.json    # canonical scenario/persona/competitor/product/baseline/
               # historical_decisions dataset
data_loader.py # reads data/*.json for the persona/competitor agents

config.py               # env-var constants (models, temperature, keys)
key_pool.py              # Groq multi-key + OpenRouter fallback config
llm_client.py             # raw Groq/OpenAI JSON-mode client (guardrails, graph builder)
langchain_llm_client.py    # LangChain Groq/OpenRouter client (persona, competitor)

orchestrator.py   # runs the full pipeline: persona → competitor → guardrails → graph builder
main.py           # FastAPI: POST /run, GET /status
outputs/          # pipeline results for the most recent run
```

## Evidence and confidence

Every conclusion in `outputs/guardrail.json` and `outputs/graph.json` is
expected to cite something real: a `financial_analysis.<field>`, a specific
`event:<event_id>` from the simulation, or a `historical:<decision_id>` from
`data/historical_decisions.json`. The LLM is told to point at data it was
actually given, not invent supporting numbers.

`confidence` and `confidence_factors` on the guardrail are **computed**, not
LLM-stated — see `analysis/confidence_scorer.py`. It's a weighted blend of:
how many comparable historical decisions exist for this discount depth, what
fraction of persona/competitor calls actually produced a real reading
(vs. falling back to a neutral placeholder after exhausting retries), and
how tightly the personas agree with each other.

`data/historical_decisions.json` is used purely as contextual evidence for
this POC — the system does not train or recalibrate on it. In a production
version, the same historical-outcomes data could be used to continuously
recalibrate the financial-impact model itself; that's future work, not
something this POC claims to do.
