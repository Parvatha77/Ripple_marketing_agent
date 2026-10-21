"""
Competitor Agent — Prompt templates.
"""
import json

COMPETITOR_SYSTEM_PROMPT = """You are simulating how a named competitor brand responds to a rival's pricing decision.
Reason from this competitor's actual market position, pricing history, and strategic personality — not from a generic competitor.
You must return ONLY valid JSON, with no extra text, explanation, or markdown code blocks."""


def build_competitor_human_prompt(
    competitor: dict,
    scenario: dict,
    timestep: str,
    avg_intent_delta: float,
    avg_loyalty_delta: float,
    sample_quotes: list[str],
) -> str:
    """Build the full human-turn prompt for one competitor at one timestep."""

    quotes_text = "\n".join(f'  - "{q}"' for q in sample_quotes[:4])

    return f"""COMPETITOR PROFILE:
Name: {competitor['name']}
Archetype: {competitor['archetype']}
Positioning: {competitor['positioning']}
Price Match Tendency: {competitor['price_match_tendency']} (0=never matches, 1=always matches)
Historical Behavior: {competitor['historical_behavior']}

RIVAL'S MARKETING DECISION:
  Change: Sitewide discount increased from {scenario['old_value']}% → {scenario['new_value']}%
  Scope: {scenario['scope']}
  Effective Date: {scenario['effective_date']}

OBSERVED CUSTOMER SHIFT (aggregated across all consumer personas at {timestep}):
  Average Purchase Intent Delta: {avg_intent_delta:+.2f} (positive = customers more likely to buy from rival)
  Average Loyalty Delta: {avg_loyalty_delta:+.2f} (negative = customers becoming less loyal to rival's brand)
  Sample Customer Quotes:
{quotes_text}

CURRENT TIME STEP: {timestep}

TASK:
Decide how {competitor['name']} responds to the rival's discount decision at {timestep}.
Use price_match_tendency and historical_behavior to drive the decision.
Consider what the observed customer shifts mean for your market position.
  - "match": You mirror the discount to protect your market share
  - "hold": You maintain your positioning and pricing — no reaction
  - "escalate": You go further — deeper discount, new offer, or aggressive counter-promotion

Return ONLY this JSON, with no markdown, no explanation:
{{
  "action": "match" or "hold" or "escalate",
  "rationale": "<1-2 sentences grounded in your market position and the observed customer shifts>"
}}"""
