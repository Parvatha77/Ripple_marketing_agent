from typing import List, Literal

from pydantic import BaseModel, Field, model_validator

Layer = Literal["decision", "behavioral", "financial", "competitive", "brand", "recommendation"]
TimeOffset = Literal["day_0", "day_30", "day_90"]


class GraphNode(BaseModel):
    node_id: str
    label: str
    layer: Layer
    time_offset: TimeOffset
    # Grounded citations for why this node exists — e.g. "event:evt_012",
    # "financial_analysis.margin_delta". Optional: the decision node itself
    # has no upstream evidence to cite.
    evidence: List[str] = Field(default_factory=list)


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str


class GraphResult(BaseModel):
    scenario_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]

    @model_validator(mode="after")
    def _validate_graph_shape(self):
        errors = []
        node_ids = {n.node_id for n in self.nodes}

        if not (6 <= len(self.nodes) <= 10):
            errors.append(f"expected 6-10 nodes, got {len(self.nodes)}")

        decision_nodes = [n for n in self.nodes if n.layer == "decision"]
        if len(decision_nodes) != 1:
            errors.append(f"expected exactly 1 decision node, got {len(decision_nodes)}")

        recommendation_nodes = [n for n in self.nodes if n.layer == "recommendation"]
        if len(recommendation_nodes) != 1:
            errors.append(f"expected exactly 1 recommendation node, got {len(recommendation_nodes)}")

        for edge in self.edges:
            if edge.source not in node_ids:
                errors.append(f"edge source '{edge.source}' does not reference an existing node")
            if edge.target not in node_ids:
                errors.append(f"edge target '{edge.target}' does not reference an existing node")
            if edge.source == edge.target:
                errors.append(f"edge '{edge.source}' -> '{edge.target}' is self-referencing")

        if errors:
            raise ValueError("; ".join(errors))

        return self
