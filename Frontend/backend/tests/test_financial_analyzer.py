from analysis.financial_analyzer import (
    calculate_aov_delta,
    calculate_margin,
    calculate_new_price,
    calculate_revenue_delta,
    analyze,
)


def test_calculate_new_price():
    assert calculate_new_price(100.0, 30) == 70.0


def test_calculate_margin():
    assert calculate_margin(70.0, 35.0) == 0.5
    assert calculate_margin(0.0, 35.0) == 0.0


def test_calculate_aov_delta_deepening_discount_lowers_aov():
    delta = calculate_aov_delta(baseline_aov=96.50, old_discount_pct=10, new_discount_pct=30)
    assert delta < 0


def test_calculate_revenue_delta_zero_intent_is_pure_price_effect():
    delta = calculate_revenue_delta(
        baseline_revenue=1_000_000, old_discount_pct=10, new_discount_pct=30, avg_purchase_intent_delta=0.0
    )
    # price effect only: (0.7/0.9 - 1) * 1_000_000
    assert round(delta, 2) == round((0.7 / 0.9 - 1) * 1_000_000, 2)


def test_analyze_end_to_end():
    scenario = {"old_value": 10, "new_value": 30}
    baseline = {"revenue": 1_000_000, "avg_order_value": 96.50}
    products = [
        {"sku_id": "sku_1", "name": "Item", "list_price": 100.0, "unit_cost": 40.0},
    ]
    persona_events = [
        {"actor_type": "persona", "purchase_intent_delta": 0.5},
        {"actor_type": "persona", "purchase_intent_delta": -0.1},
        {"actor_type": "competitor", "purchase_intent_delta": 999},  # must be excluded
    ]

    result = analyze(scenario, baseline, products, persona_events)

    assert result["avg_purchase_intent_delta"] == 0.2
    assert result["per_product_margin"][0]["sku_id"] == "sku_1"
    assert "revenue_delta" in result and "profit_delta" in result and "aov_delta" in result
