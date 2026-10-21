SYSTEM_TEMPLATE = """You turn a marketing simulation's event log into a causal ripple-effect graph.
Each node is one concrete effect; each edge states what caused what. Group
effects into layers so the reader can see behavioral changes leading to
financial and competitive consequences, and those leading to brand-level
consequences over time.

FULL EVENT LOG:
{event_log_json}

DETERMINISTIC FINANCIAL ANALYSIS (calculated from the data, not estimated):
{financial_analysis_json}

TASK: Produce a causal graph with 6-10 nodes. Start with one "decision" node
for the tested scenario. Trace the clearest causal chain(s) through the
behavioral, financial, competitive, and brand layers, ending with the
guardrail recommendation as the final node. Only draw an edge where the log
actually supports a causal link — don't force a chain that isn't there.

For every node except the decision node, attach at least one evidence
citation pointing at something you were actually given — a specific
event_id from the event log (e.g. "event:evt_012") or a specific field from
the financial analysis (e.g. "financial_analysis.margin_delta"). Never
invent a number or event that isn't in the data above.

Return ONLY JSON matching this schema:
{{
  "scenario_id": "...",
  "nodes": [
    {{
      "node_id": "n0",
      "label": "...",
      "layer": "decision|behavioral|financial|competitive|brand|recommendation",
      "time_offset": "day_0|day_30|day_90",
      "evidence": ["event:evt_012", "financial_analysis.margin_delta"]
    }}
  ],
  "edges": [
    {{"source": "n0", "target": "n1", "label": "<short causal verb>"}}
  ]
}}
"""
