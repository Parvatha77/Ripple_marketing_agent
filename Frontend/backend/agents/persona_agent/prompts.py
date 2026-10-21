"""
Consumer/Persona Agent — Prompt templates.

The SYSTEM prompt sets the agent's character.
The HUMAN prompt provides all context and asks for JSON output.
"""
import json

CONSUMER_SYSTEM_PROMPT = """You are simulating the purchasing psychology of a single customer persona for a retail brand.
Stay fully in character — reason the way this specific person would, never like a generic customer.
You must return ONLY valid JSON, with no extra text, explanation, or markdown code blocks."""


def build_consumer_human_prompt(
    persona: dict,
    scenario: dict,
    products: list[dict],
    prior_reactions: list[dict],
    timestep: str,
) -> str:
    """Build the full human-turn prompt for one persona at one timestep."""

    prior_text = (
        json.dumps(prior_reactions, indent=2)
        if prior_reactions
        else "None — this is the first reaction (day_0)."
    )

    products_summary = "\n".join(
        f"- {p['name']} (${p['list_price']}, category: {p['category']}, "
        f"current discount: {p['current_discount_pct']}%, margin note: {p['historical_discount_frequency']})"
        for p in products[:6]  # Top 6 most relevant for context window
    )

    return f"""PERSONA:
Name/Segment: {persona['segment_name']}
Description: {persona['description']}
Backstory: {persona['backstory']}

Purchase History:
  - Avg Order Value: ${persona['avg_order_value']}
  - Purchase Frequency: {persona['purchase_frequency_per_year']}x/year
  - Last Purchase: {persona['last_purchase_days_ago']} days ago
  - Total Lifetime Spend: ${persona['total_lifetime_spend']}
  - Typical Categories: {persona['typical_categories']}

Behavioral Scores:
  - Discount Sensitivity: {persona['discount_sensitivity']} (0=ignores discounts, 1=only buys on sale)
  - Brand Loyalty: {persona['brand_loyalty']} (0=will switch instantly, 1=will never leave)
  - Price Perception: {persona['price_perception']}
  - Preferred Channel: {persona['preferred_channel']}

MARKETING DECISION BEING TESTED:
  Decision: {scenario['decision_type']}
  Change: {scenario['old_value']}% → {scenario['new_value']}% discount
  Scope: {scenario['scope']}
  Effective Date: {scenario['effective_date']}
  Description: {scenario['description']}

RELEVANT PRODUCTS (sample):
{products_summary}

THIS PERSONA'S OWN PRIOR REACTIONS (empty at day_0):
{prior_text}

CURRENT TIME STEP: {timestep}

TASK:
React to this decision as this persona would at {timestep}.
Let discount_sensitivity, brand_loyalty, and purchase history shape the reaction.
If there are prior reactions, let the attitude EVOLVE — do not repeat the same reaction.
Examples of evolution:
  - day_0 excitement → day_30 conditioning (starting to wait for deals)
  - day_30 hesitation → day_90 loyalty erosion (quietly drifting to a competitor)
  - day_0 skepticism → day_90 confirmed distrust of brand pricing

Return ONLY this JSON, with no markdown, no explanation:
{{
  "purchase_intent_delta": <number between -1.0 and 1.0>,
  "loyalty_delta": <number between -1.0 and 1.0>,
  "sentiment": "positive" or "mixed" or "negative",
  "quote": "<one sentence in this persona's authentic voice>"
}}"""
