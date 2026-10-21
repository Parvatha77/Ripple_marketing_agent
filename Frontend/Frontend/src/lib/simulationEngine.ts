// Client-side "what-if" simulation engine.
//
// There is no live backend model behind the discount slider — this is a
// transparent, deterministic formula over the seed personas/competitors/
// products, so every slider position produces an instant, internally
// consistent result. It's tuned so that the default (all products at the
// scenario's proposed 30%) reproduces roughly the same story as the
// hand-authored seed event log, then generalizes smoothly to any discount.

import type {
  Baseline,
  Competitor,
  CompetitorEvent,
  EventLog,
  Graph,
  GuardrailEvent,
  Persona,
  PersonaEvent,
  Product,
  TimeOffset,
} from '@/types'
import { TIME_OFFSETS } from '@/types'

// t-index-aligned tuning curves (day_0, day_30, day_90)
const ATTRACT_DECAY = [1.0, 0.72, 0.42]
const FATIGUE_GROWTH = [0.15, 0.65, 1.1]
const DEVALUE_GROWTH = [1.0, 1.7, 2.3]
const WARMTH_DECAY = [1.0, 0.75, 0.55]

const K_ATTRACT = 3.2
const K_FATIGUE = 0.9
const K_DEVALUE = 0.72
const K_WARMTH = 0.5

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Revenue-weighted average discount across all products currently priced in the UI. */
export function computeEffectiveDiscountPct(products: Product[], productDiscountPct: Record<string, number>): number {
  let weightedSum = 0
  let weightTotal = 0
  for (const p of products) {
    const d = productDiscountPct[p.sku_id] ?? p.current_discount_pct
    weightedSum += d * p.list_price
    weightTotal += p.list_price
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 0
}

interface PersonaReaction {
  timestep: TimeOffset
  intentDelta: number
  loyaltyDelta: number
  sentiment: string
  quote: string
}

function sentimentFor(intentDelta: number, loyaltyDelta: number): string {
  if (loyaltyDelta < -0.35) return 'Alienated'
  if (loyaltyDelta < -0.15) return 'Skeptical'
  if (intentDelta > 0.45) return 'Excited'
  if (intentDelta > 0.2) return 'Persuaded'
  if (intentDelta > 0.05) return 'Pragmatic'
  if (intentDelta < -0.15) return 'Disengaged'
  return 'Neutral'
}

/** Stable, cheap hash so the same persona always lands on the same variant for a given bucket. */
function pickVariant<T>(seed: string, variants: T[]): T {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return variants[hash % variants.length]
}

function quoteFor(persona: Persona, t: TimeOffset, discountPct: number, intentDelta: number, loyaltyDelta: number): string {
  const depth = `${Math.round(discountPct)}%`
  const category = persona.purchase_history.typical_categories[0]?.toLowerCase() ?? 'the catalog'
  const highSensitivity = persona.discount_sensitivity > 0.6
  const highLoyalty = persona.brand_loyalty > 0.6
  const seed = `${persona.persona_id}_${t}`

  if (t === 'day_0') {
    if (highSensitivity && intentDelta > 0.3) {
      return pickVariant(seed, [
        `${depth} off is enough to move me. Adding items to cart.`,
        `${depth} off finally clears my bar — checking out before it changes.`,
        `That's a real number. Grabbing ${category} while it's ${depth} off.`,
      ])
    }
    if (highLoyalty && loyaltyDelta < -0.1) {
      return pickVariant(seed, [
        `If it's ${depth} off now, was I ever paying a fair price?`,
        `Part of why I buy here is that it isn't discounted like everything else.`,
        `${depth} off makes me wonder what changed about the brand.`,
      ])
    }
    if (intentDelta > 0.15) {
      return pickVariant(seed, [
        `Good timing on this one, worth a look at ${depth} off.`,
        `${depth} off is the nudge I needed to finally check out.`,
        `Been eyeing ${category} for a while — ${depth} off makes the call easy.`,
      ])
    }
    return pickVariant(seed, [
      `Noticed the ${depth} off. Not changing much for me yet.`,
      `${depth} off registers, but I wasn't in the market this week anyway.`,
    ])
  }

  if (t === 'day_30') {
    if (highLoyalty && loyaltyDelta < -0.25) {
      return pickVariant(seed, [
        `It reads as a brand that's struggling, not one being generous.`,
        `A month in at ${depth} off and it doesn't feel special anymore — it feels like clearance.`,
        `I've started associating them with markdowns instead of ${category}.`,
      ])
    }
    if (highSensitivity && intentDelta > 0.25) {
      return pickVariant(seed, [
        `Still cheaper than the alternative, but it's just always ${depth} off now.`,
        `I've stopped waiting for a sale — this is just the price now.`,
        `${depth} off, same as last time I checked. Still buying, just less excited about it.`,
      ])
    }
    if (intentDelta < 0) {
      return pickVariant(seed, [
        `Full-price feels naive when it's discounted this often.`,
        `Hard to justify paying more when ${depth} off is the default now.`,
      ])
    }
    return pickVariant(seed, [
      `The discount's become part of the wallpaper at this point.`,
      `Barely register the ${depth} off banner anymore.`,
    ])
  }

  // day_90
  if (highLoyalty && loyaltyDelta < -0.35) {
    return pickVariant(seed, [
      `I've mostly stopped opening their emails.`,
      `Moved my ${category} order elsewhere. It still feels considered there.`,
      `Three months of ${depth} off and I'm not sure this is the same brand.`,
    ])
  }
  if (highSensitivity && intentDelta > 0.1) {
    return pickVariant(seed, [
      `I don't really track which site it came from, just the number.`,
      `Whoever's deepest on ${category} gets the order. Still them, for now.`,
    ])
  }
  if (intentDelta < -0.1) {
    return pickVariant(seed, [
      `Doesn't feel like a deal anymore, it just feels like the price.`,
      `${depth} off stopped meaning anything a while back.`,
    ])
  }
  return pickVariant(seed, [
    `Settled into a routine — I'll buy when I need to, discount or not.`,
    `Not thinking about the discount much either way at this point.`,
  ])
}

export function simulatePersonaReactions(persona: Persona, effectiveDiscountPct: number, baselineDiscountPct: number): PersonaReaction[] {
  const d = effectiveDiscountPct / 100
  const delta = (effectiveDiscountPct - baselineDiscountPct) / 100

  return TIME_OFFSETS.map((t, i) => {
    const attractiveness = K_ATTRACT * persona.discount_sensitivity * delta * ATTRACT_DECAY[i]
    const fatigue = K_FATIGUE * (1 - persona.discount_sensitivity) * d * FATIGUE_GROWTH[i]
    const devaluation = K_DEVALUE * persona.brand_loyalty * d * DEVALUE_GROWTH[i]
    const warmth = K_WARMTH * (1 - persona.brand_loyalty) * delta * WARMTH_DECAY[i]

    const intentDelta = clamp(attractiveness - fatigue, -1, 1)
    const loyaltyDelta = clamp(warmth * 0.3 - devaluation, -1, 1)
    const sentiment = sentimentFor(intentDelta, loyaltyDelta)
    const quote = quoteFor(persona, t, effectiveDiscountPct, intentDelta, loyaltyDelta)

    return { timestep: t, intentDelta, loyaltyDelta, sentiment, quote }
  })
}

export function buildPersonaEvents(personas: Persona[], scenarioId: string, effectiveDiscountPct: number, baselineDiscountPct: number): PersonaEvent[] {
  const events: PersonaEvent[] = []
  for (const persona of personas) {
    const reactions = simulatePersonaReactions(persona, effectiveDiscountPct, baselineDiscountPct)
    for (const r of reactions) {
      events.push({
        event_id: `evt_${persona.persona_id}_${r.timestep}`,
        scenario_id: scenarioId,
        actor_type: 'persona',
        actor_id: persona.persona_id,
        timestep: r.timestep,
        purchase_intent_delta: Number(r.intentDelta.toFixed(2)),
        loyalty_delta: Number(r.loyaltyDelta.toFixed(2)),
        sentiment: r.sentiment,
        quote: r.quote,
      })
    }
  }
  return events
}

function competitorActionFor(competitor: Competitor, effectiveDiscountPct: number, t: TimeOffset): CompetitorEvent['action'] {
  const gapPressure = effectiveDiscountPct / 100 * competitor.price_match_tendency
  const timeIndex = TIME_OFFSETS.indexOf(t)
  const threshold = t === 'day_30' ? 0.14 : 0.1 // easier to escalate by day_90
  if (gapPressure < threshold) return 'hold'
  if (timeIndex >= 2 && gapPressure > threshold * 1.8) return 'escalate'
  return 'match'
}

function competitorRationale(competitor: Competitor, action: CompetitorEvent['action'], effectiveDiscountPct: number): string {
  const depth = Math.round(effectiveDiscountPct)
  if (action === 'hold') {
    return `Held list price at ${depth}% market depth, continuing to lean on "${competitor.positioning.split('.')[0].toLowerCase()}" as its point of difference.`
  }
  if (action === 'escalate') {
    return `Escalated beyond ${depth}% to reclaim share of the deal-seeking segment, betting the brand can't sustain this depth into next quarter.`
  }
  return `Matched close to ${depth}%, consistent with its historical pattern: ${competitor.historical_behavior.split('.')[0].toLowerCase()}.`
}

export function buildCompetitorEvents(competitors: Competitor[], scenarioId: string, effectiveDiscountPct: number): CompetitorEvent[] {
  const events: CompetitorEvent[] = []
  for (const competitor of competitors) {
    for (const t of TIME_OFFSETS) {
      if (t === 'day_0') continue // competitors need time to react
      const action = competitorActionFor(competitor, effectiveDiscountPct, t)
      events.push({
        event_id: `evt_${competitor.competitor_id}_${t}`,
        scenario_id: scenarioId,
        actor_type: 'competitor',
        actor_id: competitor.competitor_id,
        timestep: t,
        action,
        rationale: competitorRationale(competitor, action, effectiveDiscountPct),
      })
    }
  }
  return events
}

export function buildGuardrailEvent(
  scenarioId: string,
  effectiveDiscountPct: number,
  personas: Persona[],
  personaEvents: PersonaEvent[],
): GuardrailEvent {
  const day90 = personaEvents.filter((e) => e.timestep === 'day_90')
  const loyaltyAtRisk = personas
    .filter((p) => p.brand_loyalty > 0.6)
    .filter((p) => (day90.find((e) => e.actor_id === p.persona_id)?.loyalty_delta ?? 0) < -0.2)
    .map((p) => p.segment_name)
  const dealSeekers = personas
    .filter((p) => p.discount_sensitivity > 0.55)
    .map((p) => p.segment_name)

  const SAFE_CAP = 18
  const depth = Math.round(effectiveDiscountPct)

  if (effectiveDiscountPct <= SAFE_CAP + 2) {
    return {
      event_id: 'evt_guardrail_live',
      scenario_id: scenarioId,
      actor_type: 'guardrail',
      actor_id: 'guardrail_agent',
      timestep: 'day_90',
      recommendation: `Approve — ${depth}% sits within a sustainable range.`,
      rationale: `At ${depth}%, projected loyalty erosion stays shallow across the highest-LTV segments (${loyaltyAtRisk.join(', ') || 'none at material risk'}), and the depth is unlikely to trigger a competitor escalation cycle. No guardrail intervention needed at this level.`,
    }
  }

  const recommendation =
    loyaltyAtRisk.length > 0
      ? `Cap the standing discount at ${SAFE_CAP}% and replace the remaining margin with a targeted loyalty offer for ${loyaltyAtRisk.join(' and ')}.`
      : `Cap the standing discount at ${SAFE_CAP}% to protect margin while competitor fast-follow pressure is still low.`

  return {
    event_id: 'evt_guardrail_live',
    scenario_id: scenarioId,
    actor_type: 'guardrail',
    actor_id: 'guardrail_agent',
    timestep: 'day_90',
    recommendation,
    rationale: `At ${depth}%, the discount converts price-sensitive segments (${dealSeekers.join(', ') || 'few'}) but is compressing margin faster than it grows volume, and is actively eroding loyalty in ${loyaltyAtRisk.join(' and ') || 'the brand\'s most loyal segments'}, who read a deep standing discount as a quality signal rather than a savings signal. An ${SAFE_CAP}% cap preserves most of the conversion lift for deal-seeking segments while protecting the relationship with the segments actually driving lifetime value.`,
  }
}

export function buildEventLog(
  scenarioId: string,
  personas: Persona[],
  competitors: Competitor[],
  effectiveDiscountPct: number,
  baselineDiscountPct: number,
): EventLog {
  const personaEvents = buildPersonaEvents(personas, scenarioId, effectiveDiscountPct, baselineDiscountPct)
  const competitorEvents = buildCompetitorEvents(competitors, scenarioId, effectiveDiscountPct)
  const guardrailEvent = buildGuardrailEvent(scenarioId, effectiveDiscountPct, personas, personaEvents)
  return { scenario_id: scenarioId, events: [...personaEvents, ...competitorEvents, guardrailEvent] }
}

/** Simulated end-state metrics (day-90) as a function of the live discount + persona reactions. */
export function buildOutcome(baseline: Baseline, personaEvents: PersonaEvent[], effectiveDiscountPct: number): Baseline {
  const day90 = personaEvents.filter((e) => e.timestep === 'day_90')
  const avgIntent = day90.reduce((sum, e) => sum + e.purchase_intent_delta, 0) / (day90.length || 1)
  const avgLoyalty = day90.reduce((sum, e) => sum + e.loyalty_delta, 0) / (day90.length || 1)

  // volume responds to intent; realized price-per-unit is a straight ratio of the two discount depths
  // (properly multiplicative, not additive — a 20pp deeper discount is a real ~22% per-unit price cut)
  const volumeLift = 1 + avgIntent * 0.6
  const priceRealization = (1 - effectiveDiscountPct / 100) / (1 - baseline.avg_discount_depth_pct / 100)
  const revenue = Math.round(baseline.revenue * volumeLift * priceRealization)

  const fullPricePct = clamp(baseline.full_price_purchase_pct - effectiveDiscountPct * 1.05 + avgLoyalty * 8, 4, 95)
  const aov = Math.round(baseline.avg_order_value * (1 - effectiveDiscountPct / 100 * 0.55 + avgIntent * 0.05))
  const repeatRate = clamp(baseline.repeat_purchase_rate + avgLoyalty * 14 + avgIntent * 4, 5, 90)

  return {
    period: 'Day 90, live simulation',
    revenue,
    full_price_purchase_pct: Number(fullPricePct.toFixed(1)),
    avg_order_value: aov,
    repeat_purchase_rate: Number(repeatRate.toFixed(1)),
    avg_discount_depth_pct: Number(effectiveDiscountPct.toFixed(1)),
  }
}

/** 0-1 magnitude per graph node — drives sphere size / prominence in the 3D graph. */
export function computeNodeMagnitudes(
  graph: Graph,
  personaEvents: PersonaEvent[],
  competitorEvents: CompetitorEvent[],
  effectiveDiscountPct: number,
  baselineDiscountPct: number,
): Record<string, number> {
  const magnitudes: Record<string, number> = {}
  const deltaFraction = clamp(Math.abs(effectiveDiscountPct - baselineDiscountPct) / 40, 0, 1)

  const avgAbsIntentByStep: Record<TimeOffset, number> = { day_0: 0, day_30: 0, day_90: 0 }
  const avgAbsLoyaltyByStep: Record<TimeOffset, number> = { day_0: 0, day_30: 0, day_90: 0 }
  for (const t of TIME_OFFSETS) {
    const evts = personaEvents.filter((e) => e.timestep === t)
    avgAbsIntentByStep[t] = evts.reduce((s, e) => s + Math.abs(e.purchase_intent_delta), 0) / (evts.length || 1)
    avgAbsLoyaltyByStep[t] = evts.reduce((s, e) => s + Math.abs(e.loyalty_delta), 0) / (evts.length || 1)
  }
  const escalations = competitorEvents.filter((e) => e.action === 'escalate').length
  const competitorPressure = clamp(escalations / Math.max(1, competitorEvents.length) + deltaFraction * 0.3, 0, 1)

  for (const node of graph.nodes) {
    let magnitude = 0.5
    if (node.layer === 'decision') magnitude = 0.55 + deltaFraction * 0.45
    else if (node.layer === 'behavioral') magnitude = clamp(avgAbsIntentByStep[node.time_offset] * 1.4, 0.2, 1)
    else if (node.layer === 'financial') magnitude = clamp(0.3 + deltaFraction * 0.7, 0.2, 1)
    else if (node.layer === 'competitive') magnitude = clamp(0.3 + competitorPressure * 0.9, 0.2, 1)
    else if (node.layer === 'brand') magnitude = clamp(avgAbsLoyaltyByStep[node.time_offset] * 1.5, 0.2, 1)
    else if (node.layer === 'recommendation') magnitude = 0.75 + deltaFraction * 0.25
    magnitudes[node.node_id] = magnitude
  }
  return magnitudes
}

export interface ScenarioSnapshot {
  discountPct: number
  revenueLiftPct: number
  marginImpactPts: number
  clvShiftPct: number
  riskLevel: 'Low risk' | 'Moderate risk' | 'High risk'
}

/** Quick summary at an arbitrary flat discount depth — used for the scenario comparison cards. */
export function snapshotAtDiscount(
  scenarioId: string,
  personas: Persona[],
  baseline: Baseline,
  discountPct: number,
): ScenarioSnapshot {
  const personaEvents = buildPersonaEvents(personas, scenarioId, discountPct, baseline.avg_discount_depth_pct)
  const outcome = buildOutcome(baseline, personaEvents, discountPct)
  const day90 = personaEvents.filter((e) => e.timestep === 'day_90')
  const avgLoyalty90 = day90.reduce((s, e) => s + e.loyalty_delta, 0) / (day90.length || 1)

  const revenueLiftPct = ((outcome.revenue - baseline.revenue) / baseline.revenue) * 100
  const marginImpactPts = -(discountPct - baseline.avg_discount_depth_pct) * 0.34
  const clvShiftPct = avgLoyalty90 * 22

  const riskLevel: ScenarioSnapshot['riskLevel'] = discountPct <= 18 ? 'Low risk' : discountPct <= 26 ? 'Moderate risk' : 'High risk'

  return {
    discountPct,
    revenueLiftPct: Number(revenueLiftPct.toFixed(1)),
    marginImpactPts: Number(marginImpactPts.toFixed(1)),
    clvShiftPct: Number(clvShiftPct.toFixed(0)),
    riskLevel,
  }
}

export interface LiveSimulationResult {
  effectiveDiscountPct: number
  eventLog: EventLog
  outcome: Baseline
  nodeMagnitudes: Record<string, number>
  confidence: {
    dataQuality: number
    historicalSupport: number
    modelUncertainty: number
    elevatedRisk: boolean
  }
}

export function runLiveSimulation(
  scenarioId: string,
  personas: Persona[],
  competitors: Competitor[],
  products: Product[],
  baseline: Baseline,
  productDiscountPct: Record<string, number>,
  graph: Graph,
): LiveSimulationResult {
  const effectiveDiscountPct = computeEffectiveDiscountPct(products, productDiscountPct)
  const baselineDiscountPct = baseline.avg_discount_depth_pct

  const personaEvents = buildPersonaEvents(personas, scenarioId, effectiveDiscountPct, baselineDiscountPct)
  const competitorEvents = buildCompetitorEvents(competitors, scenarioId, effectiveDiscountPct)
  const guardrailEvent = buildGuardrailEvent(scenarioId, effectiveDiscountPct, personas, personaEvents)
  const eventLog: EventLog = { scenario_id: scenarioId, events: [...personaEvents, ...competitorEvents, guardrailEvent] }

  const outcome = buildOutcome(baseline, personaEvents, effectiveDiscountPct)
  const nodeMagnitudes = computeNodeMagnitudes(graph, personaEvents, competitorEvents, effectiveDiscountPct, baselineDiscountPct)

  // historically-observed range is roughly baseline..40%; confidence degrades outside it
  const overreach = Math.max(0, effectiveDiscountPct - 40, baselineDiscountPct - effectiveDiscountPct)
  const dataQuality = clamp(92 - overreach * 1.5, 30, 96)
  const historicalSupport = clamp(88 - Math.abs(effectiveDiscountPct - 25) * 2.2, 15, 92)
  const modelUncertainty = clamp(20 + overreach * 3 + Math.abs(effectiveDiscountPct - 25) * 0.8, 10, 95)

  return {
    effectiveDiscountPct,
    eventLog,
    outcome,
    nodeMagnitudes,
    confidence: {
      dataQuality: Math.round(dataQuality),
      historicalSupport: Math.round(historicalSupport),
      modelUncertainty: Math.round(modelUncertainty),
      elevatedRisk: effectiveDiscountPct > 26 || modelUncertainty > 55,
    },
  }
}

// ---- Simplified order-tiered flow graph (the primary, legible graph view) ----
//
// Instead of a (layer × timestep) lattice, this collapses the causal story
// into a fixed 9-node chain read left-to-right by "order" — hops of causal
// distance from the decision — which is what actually reads clearly at a
// glance. Time shows up as motion (flow dots along each edge) rather than as
// its own axis.

export type FlowOrder = 0 | 1 | 2 | 3

export interface FlowNode {
  id: string
  label: string
  order: FlowOrder
  /** 0-1, drives node size */
  magnitude: number
  /** short live readout, e.g. "+18% intent" */
  value: string
  tone: 'positive' | 'negative' | 'neutral'
}

export interface FlowEdge {
  source: string
  target: string
  order: FlowOrder
}

export const FLOW_EDGES: FlowEdge[] = [
  { source: 'discount', target: 'conversion', order: 1 },
  { source: 'discount', target: 'full_price_loss', order: 1 },
  { source: 'conversion', target: 'revenue', order: 1 },
  { source: 'full_price_loss', target: 'price_sensitivity', order: 2 },
  { source: 'revenue', target: 'margin', order: 2 },
  { source: 'revenue', target: 'competitor', order: 3 },
  { source: 'price_sensitivity', target: 'clv_retention', order: 3 },
  { source: 'margin', target: 'clv_retention', order: 3 },
  { source: 'competitor', target: 'brand', order: 3 },
]

function magnitudeFromAbs(value: number, scale: number): number {
  return clamp(Math.abs(value) / scale, 0.15, 1)
}

function toneFrom(value: number, positiveIsGood = true): 'positive' | 'negative' | 'neutral' {
  if (Math.abs(value) < 0.02) return 'neutral'
  const good = value > 0 === positiveIsGood
  return good ? 'positive' : 'negative'
}

export function buildFlowGraph(
  personas: Persona[],
  competitors: Competitor[],
  baseline: Baseline,
  live: Pick<LiveSimulationResult, 'eventLog' | 'outcome' | 'effectiveDiscountPct'>,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const personaEvents = live.eventLog.events.filter((e): e is PersonaEvent => e.actor_type === 'persona')
  const competitorEvents = live.eventLog.events.filter((e): e is CompetitorEvent => e.actor_type === 'competitor')

  const day0 = personaEvents.filter((e) => e.timestep === 'day_0')
  const day90 = personaEvents.filter((e) => e.timestep === 'day_90')
  const avgIntentDay0 = day0.reduce((s, e) => s + e.purchase_intent_delta, 0) / (day0.length || 1)
  const avgIntentDay90 = day90.reduce((s, e) => s + e.purchase_intent_delta, 0) / (day90.length || 1)
  const avgLoyaltyDay90 = day90.reduce((s, e) => s + e.loyalty_delta, 0) / (day90.length || 1)

  const fullPriceDeltaPts = live.outcome.full_price_purchase_pct - baseline.full_price_purchase_pct
  const revenueDeltaPct = ((live.outcome.revenue - baseline.revenue) / baseline.revenue) * 100
  const marginImpactPts = -(live.effectiveDiscountPct - baseline.avg_discount_depth_pct) * 0.34

  const reactingCompetitors = competitorEvents.filter((e) => e.action !== 'hold').length
  const totalCompetitorChecks = competitors.length || 1
  const competitorPressure = reactingCompetitors / totalCompetitorChecks

  const alienatedShare =
    day90.filter((e) => e.loyalty_delta < -0.3).length / (personas.length || 1)

  const nodes: FlowNode[] = [
    {
      id: 'discount',
      label: 'Discount',
      order: 0,
      magnitude: 0.7 + clamp(live.effectiveDiscountPct / 50, 0, 1) * 0.3,
      value: `${live.effectiveDiscountPct.toFixed(0)}%`,
      tone: 'neutral',
    },
    {
      id: 'conversion',
      label: 'Conversion',
      order: 1,
      magnitude: magnitudeFromAbs(avgIntentDay0, 0.5),
      value: `${avgIntentDay0 >= 0 ? '+' : ''}${(avgIntentDay0 * 100).toFixed(0)}% intent`,
      tone: toneFrom(avgIntentDay0),
    },
    {
      id: 'full_price_loss',
      label: 'Full-price loss',
      order: 1,
      magnitude: magnitudeFromAbs(fullPriceDeltaPts, 30),
      value: `${fullPriceDeltaPts >= 0 ? '+' : ''}${fullPriceDeltaPts.toFixed(1)}pp`,
      tone: toneFrom(fullPriceDeltaPts),
    },
    {
      id: 'revenue',
      label: 'Revenue',
      order: 1,
      magnitude: magnitudeFromAbs(revenueDeltaPct, 30),
      value: `${revenueDeltaPct >= 0 ? '+' : ''}${revenueDeltaPct.toFixed(1)}%`,
      tone: toneFrom(revenueDeltaPct),
    },
    {
      id: 'price_sensitivity',
      label: 'Price sensitivity',
      order: 2,
      magnitude: magnitudeFromAbs(avgIntentDay90, 0.4),
      value: avgIntentDay90 >= 0 ? 'Still responsive' : 'Fatigue setting in',
      tone: avgIntentDay90 >= 0.05 ? 'neutral' : 'negative',
    },
    {
      id: 'margin',
      label: 'Margin',
      order: 2,
      magnitude: magnitudeFromAbs(marginImpactPts, 15),
      value: `${marginImpactPts >= 0 ? '+' : ''}${marginImpactPts.toFixed(1)}pp`,
      tone: toneFrom(marginImpactPts),
    },
    {
      id: 'competitor',
      label: 'Competitor',
      order: 3,
      magnitude: magnitudeFromAbs(competitorPressure, 1),
      value: `${reactingCompetitors} of ${competitors.length} reacting`,
      tone: reactingCompetitors === 0 ? 'positive' : 'negative',
    },
    {
      id: 'clv_retention',
      label: 'CLV / retention',
      order: 3,
      magnitude: magnitudeFromAbs(avgLoyaltyDay90, 0.4),
      value: `${avgLoyaltyDay90 >= 0 ? '+' : ''}${(avgLoyaltyDay90 * 100).toFixed(0)}% loyalty`,
      tone: toneFrom(avgLoyaltyDay90),
    },
    {
      id: 'brand',
      label: 'Brand',
      order: 3,
      magnitude: magnitudeFromAbs(alienatedShare, 0.6),
      value: alienatedShare > 0.3 ? 'Perception at risk' : 'Holding steady',
      tone: alienatedShare > 0.3 ? 'negative' : 'positive',
    },
  ]

  return { nodes, edges: FLOW_EDGES }
}
