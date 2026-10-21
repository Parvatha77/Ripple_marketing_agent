"""
Deterministic financial-impact calculations for a discount-change scenario,
kept separate from the LLM so the dollar figures the Guardrails Agent cites
are computed, not hallucinated.

Model: checkout price falls as the discount deepens (price effect); demand
moves with the average persona purchase_intent_delta, used as a demand-lift
proxy since we have no real conversion/elasticity data (volume effect).
Margin is list_price vs. unit_cost at the old vs. new discount depth.
"""


def calculate_new_price(list_price: float, discount_pct: float) -> float:
    return list_price * (1 - discount_pct / 100)


def calculate_margin(price: float, unit_cost: float) -> float:
    if price <= 0:
        return 0.0
    return (price - unit_cost) / price


def calculate_aov_delta(baseline_aov: float, old_discount_pct: float, new_discount_pct: float) -> float:
    old_ratio = 1 - old_discount_pct / 100
    new_ratio = 1 - new_discount_pct / 100
    if old_ratio <= 0:
        return 0.0
    return baseline_aov * (new_ratio / old_ratio - 1)


def calculate_revenue_delta(
    baseline_revenue: float,
    old_discount_pct: float,
    new_discount_pct: float,
    avg_purchase_intent_delta: float,
) -> float:
    old_ratio = 1 - old_discount_pct / 100
    new_ratio = 1 - new_discount_pct / 100
    if old_ratio <= 0:
        return 0.0
    price_effect = new_ratio / old_ratio
    volume_effect = 1 + avg_purchase_intent_delta
    return baseline_revenue * (price_effect * volume_effect - 1)


def calculate_discount_cost(baseline_revenue: float, old_discount_pct: float, new_discount_pct: float) -> float:
    """Dollar cost of deepening the discount holding volume constant — the
    direct markdown expense, separate from any volume/intent-driven change."""
    return baseline_revenue * (new_discount_pct - old_discount_pct) / 100


def calculate_profit_delta(
    baseline_revenue: float,
    products: list[dict],
    old_discount_pct: float,
    new_discount_pct: float,
    avg_purchase_intent_delta: float,
) -> float:
    old_margins, new_margins = [], []
    for p in products:
        old_price = calculate_new_price(p["list_price"], old_discount_pct)
        new_price = calculate_new_price(p["list_price"], new_discount_pct)
        old_margins.append(calculate_margin(old_price, p["unit_cost"]))
        new_margins.append(calculate_margin(new_price, p["unit_cost"]))

    avg_old_margin = sum(old_margins) / len(old_margins) if old_margins else 0.0
    avg_new_margin = sum(new_margins) / len(new_margins) if new_margins else 0.0

    revenue_delta = calculate_revenue_delta(
        baseline_revenue, old_discount_pct, new_discount_pct, avg_purchase_intent_delta
    )
    new_revenue = baseline_revenue + revenue_delta

    old_profit = baseline_revenue * avg_old_margin
    new_profit = new_revenue * avg_new_margin
    return new_profit - old_profit


def analyze(scenario: dict, baseline: dict, products: list[dict], persona_events: list[dict]) -> dict:
    old_discount_pct = scenario["old_value"]
    new_discount_pct = scenario["new_value"]
    baseline_revenue = baseline["revenue"]
    baseline_aov = baseline["avg_order_value"]

    intent_deltas = [
        e["purchase_intent_delta"] for e in persona_events if e.get("actor_type") == "persona"
    ]
    avg_purchase_intent_delta = sum(intent_deltas) / len(intent_deltas) if intent_deltas else 0.0

    revenue_delta = calculate_revenue_delta(
        baseline_revenue, old_discount_pct, new_discount_pct, avg_purchase_intent_delta
    )
    profit_delta = calculate_profit_delta(
        baseline_revenue, products, old_discount_pct, new_discount_pct, avg_purchase_intent_delta
    )
    aov_delta = calculate_aov_delta(baseline_aov, old_discount_pct, new_discount_pct)

    per_product_margin = []
    for p in products:
        old_price = calculate_new_price(p["list_price"], old_discount_pct)
        new_price = calculate_new_price(p["list_price"], new_discount_pct)
        old_margin = calculate_margin(old_price, p["unit_cost"])
        new_margin = calculate_margin(new_price, p["unit_cost"])
        per_product_margin.append({
            "sku_id": p["sku_id"],
            "name": p["name"],
            "old_price": round(old_price, 2),
            "new_price": round(new_price, 2),
            "old_margin_pct": round(old_margin * 100, 2),
            "new_margin_pct": round(new_margin * 100, 2),
            "margin_delta_pct": round((new_margin - old_margin) * 100, 2),
        })

    avg_margin_delta_pct = (
        sum(p["margin_delta_pct"] for p in per_product_margin) / len(per_product_margin)
        if per_product_margin
        else 0.0
    )

    discount_cost = calculate_discount_cost(baseline_revenue, old_discount_pct, new_discount_pct)

    return {
        "old_discount_pct": old_discount_pct,
        "new_discount_pct": new_discount_pct,
        "avg_purchase_intent_delta": round(avg_purchase_intent_delta, 4),
        "revenue_delta": round(revenue_delta, 2),
        "revenue_delta_pct": round(revenue_delta / baseline_revenue * 100, 2) if baseline_revenue else 0.0,
        "profit_delta": round(profit_delta, 2),
        "aov_delta": round(aov_delta, 2),
        "avg_margin_delta_pct": round(avg_margin_delta_pct, 2),
        "discount_cost": round(discount_cost, 2),
        "per_product_margin": per_product_margin,
    }
