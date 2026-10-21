"""
Competitor Agent — LangGraph graph definition.

Graph structure:
  load_data → aggregate_persona_shifts → call_llm → validate_output
                                                          ↓ (valid)
                                            ←──────  (invalid + retry_count<=1)
                                                          ↓ (invalid + retry exhausted)
                                                 emit_event → END
"""
from langgraph.graph import StateGraph, END

from agents.competitor_agent.state import CompetitorAgentState
from agents.competitor_agent.nodes import (
    load_data_node,
    aggregate_persona_shifts_node,
    call_llm_node,
    validate_output_node,
    emit_event_node,
    route_after_validation,
)


def build_competitor_agent_graph() -> StateGraph:
    """
    Builds and compiles the Competitor Agent LangGraph.

    Returns a compiled graph that accepts CompetitorAgentState as input.

    Usage:
        graph = build_competitor_agent_graph()
        result = await graph.ainvoke({
            "competitor_id": "c1_fast_follower",
            "timestep": "day_30",
            "scenario_id": "scn_sitewide_discount_30",
            "persona_events": [...],  # from consumer agent output
        })
        event = result["event"]
    """
    graph = StateGraph(CompetitorAgentState)

    # ── Register nodes ──────────────────────────────────────────
    graph.add_node("load_data", load_data_node)
    graph.add_node("aggregate_persona_shifts", aggregate_persona_shifts_node)
    graph.add_node("call_llm", call_llm_node)
    graph.add_node("validate_output", validate_output_node)
    graph.add_node("emit_event", emit_event_node)

    # ── Define edges ────────────────────────────────────────────
    graph.set_entry_point("load_data")
    graph.add_edge("load_data", "aggregate_persona_shifts")
    graph.add_edge("aggregate_persona_shifts", "call_llm")
    graph.add_edge("call_llm", "validate_output")

    # Conditional: retry once on bad JSON, then emit
    graph.add_conditional_edges(
        "validate_output",
        route_after_validation,
        {
            "call_llm": "call_llm",
            "emit_event": "emit_event",
        },
    )

    graph.add_edge("emit_event", END)

    return graph.compile()


# ── Compiled singleton — reused for all competitor runs ──────────────────────
competitor_agent_graph = build_competitor_agent_graph()
