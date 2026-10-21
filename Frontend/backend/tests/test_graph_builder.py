import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from agents import graph_builder_agent
from schemas.graph import GraphResult

VALID_GRAPH = {
    "scenario_id": "scn_test",
    "nodes": [
        {"node_id": "n0", "label": "Discount raised", "layer": "decision", "time_offset": "day_0"},
        {"node_id": "n1", "label": "Intent surges", "layer": "behavioral", "time_offset": "day_0"},
        {"node_id": "n2", "label": "Loyalty erodes", "layer": "behavioral", "time_offset": "day_30"},
        {"node_id": "n3", "label": "Margin compresses", "layer": "financial", "time_offset": "day_30"},
        {"node_id": "n4", "label": "Rival escalates", "layer": "competitive", "time_offset": "day_30"},
        {"node_id": "n5", "label": "Brand equity erodes", "layer": "brand", "time_offset": "day_90"},
        {"node_id": "n6", "label": "Shift to targeted discount", "layer": "recommendation", "time_offset": "day_90"},
    ],
    "edges": [
        {"source": "n0", "target": "n1", "label": "triggers"},
        {"source": "n1", "target": "n2", "label": "conditions"},
        {"source": "n2", "target": "n3", "label": "compresses"},
        {"source": "n3", "target": "n4", "label": "provokes"},
        {"source": "n4", "target": "n5", "label": "accumulates into"},
        {"source": "n5", "target": "n6", "label": "informs"},
    ],
}


def test_run_returns_validated_result():
    fake_result = GraphResult(**VALID_GRAPH)

    with patch("agents.graph_builder_agent.call_json", new=AsyncMock(return_value=fake_result)):
        result = asyncio.run(graph_builder_agent.run({"scenario_id": "scn_test", "events": []}, {}))

    assert result.scenario_id == "scn_test"
    assert len(result.nodes) == 7
    assert len(result.edges) == 6


def test_too_few_nodes_rejected():
    with pytest.raises(ValidationError):
        GraphResult(scenario_id="scn_test", nodes=VALID_GRAPH["nodes"][:2], edges=[])


def test_missing_recommendation_node_rejected():
    nodes = [n for n in VALID_GRAPH["nodes"] if n["layer"] != "recommendation"]
    with pytest.raises(ValidationError):
        GraphResult(scenario_id="scn_test", nodes=nodes, edges=[])


def test_edge_to_nonexistent_node_rejected():
    bad_edges = VALID_GRAPH["edges"] + [{"source": "n0", "target": "does_not_exist", "label": "causes"}]
    with pytest.raises(ValidationError):
        GraphResult(scenario_id="scn_test", nodes=VALID_GRAPH["nodes"], edges=bad_edges)


def test_self_referencing_edge_rejected():
    bad_edges = VALID_GRAPH["edges"] + [{"source": "n0", "target": "n0", "label": "causes"}]
    with pytest.raises(ValidationError):
        GraphResult(scenario_id="scn_test", nodes=VALID_GRAPH["nodes"], edges=bad_edges)
