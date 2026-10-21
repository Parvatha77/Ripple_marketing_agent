"""
JSON data loading utilities for the Persona/Competitor agents — reads the
canonical data/*.json files shared with the Guardrails/Graph Builder agents.
"""
import json
from typing import Optional

DATA_DIR = "data"


def _read_json(filename: str):
    with open(f"{DATA_DIR}/{filename}", encoding="utf-8") as f:
        return json.load(f)


def _flatten_persona(persona: dict) -> dict:
    flat = dict(persona)
    flat.update(flat.pop("purchase_history", {}))
    return flat


def load_personas() -> list[dict]:
    return [_flatten_persona(p) for p in _read_json("personas.json")]


def load_persona_by_id(persona_id: str) -> Optional[dict]:
    for p in load_personas():
        if p["persona_id"] == persona_id:
            return p
    return None


def load_products() -> list[dict]:
    return _read_json("products.json")


def load_competitors() -> list[dict]:
    return _read_json("competitors.json")


def load_competitor_by_id(competitor_id: str) -> Optional[dict]:
    for c in load_competitors():
        if c["competitor_id"] == competitor_id:
            return c
    return None


def load_scenario(scenario_id: str = "scn_sitewide_discount_30") -> Optional[dict]:
    scenario = _read_json("scenario.json")
    return scenario if scenario.get("scenario_id") == scenario_id else None
