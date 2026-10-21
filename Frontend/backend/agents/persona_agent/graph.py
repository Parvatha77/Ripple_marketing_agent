"""
Consumer/Persona Agent — LangGraph graph definition.

Graph structure:
  load_data → inject_prior_reactions → call_llm → validate_output
                                                        ↓ (valid)
                                          ←────── (invalid + retry_count<=1)
                                                        ↓ (invalid + retry exhausted)
                                               emit_event → END
"""
from langgraph.graph import StateGraph, END

from agents.persona_agent.state import ConsumerAgentState
from agents.persona_agent.nodes import (
    load_data_node,
    inject_prior_reactions_node,
    call_llm_node,
    validate_output_node,
    emit_event_node,
    route_after_validation,
)


def build_consumer_agent_graph() -> StateGraph:
    """
    Builds and compiles the Consumer/Persona Agent LangGraph.

    Returns a compiled graph that accepts ConsumerAgentState as input.

    Usage:
        graph = build_consumer_agent_graph()
        result = await graph.ainvoke({
            "persona_id": "p1_deal_seeker",
            "timestep": "day_0",
            "scenario_id": "scn_sitewide_discount_30",
            "prior_reactions": [],
        })
        event = result["event"]
    """
    graph = StateGraph(ConsumerAgentState)

    # ── Register nodes ──────────────────────────────────────────
    graph.add_node("load_data", load_data_node)
    graph.add_node("inject_prior_reactions", inject_prior_reactions_node)
    graph.add_node("call_llm", call_llm_node)
    graph.add_node("validate_output", validate_output_node)
    graph.add_node("emit_event", emit_event_node)

    # ── Define edges ────────────────────────────────────────────
    graph.set_entry_point("load_data")
    graph.add_edge("load_data", "inject_prior_reactions")
    graph.add_edge("inject_prior_reactions", "call_llm")
    graph.add_edge("call_llm", "validate_output")

    # Conditional: retry once on bad JSON, then proceed to emit_event
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


# ── Compiled singleton — reused for all persona runs ─────────────────────────
consumer_agent_graph = build_consumer_agent_graph()
