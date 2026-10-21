// ---- Core domain shapes, matching the FastAPI backend's JSON contracts ----

export type TimeOffset = 'day_0' | 'day_30' | 'day_90'

export type CausalLayer =
  | 'decision'
  | 'behavioral'
  | 'financial'
  | 'competitive'
  | 'brand'
  | 'recommendation'

export interface Scenario {
  scenario_id: string
  decision_type: string
  old_value: number | string
  new_value: number | string
  unit: string
  scope: string
  effective_date: string
  description: string
}

export interface PurchaseHistory {
  avg_order_value: number
  purchase_frequency_per_year: number
  last_purchase_days_ago: number
  total_lifetime_spend: number
  typical_categories: string[]
}

export interface Persona {
  persona_id: string
  segment_name: string
  description: string
  backstory: string
  purchase_history: PurchaseHistory
  discount_sensitivity: number // 0-1
  brand_loyalty: number // 0-1
  preferred_channel: string
  price_perception: string
}

export interface Product {
  sku_id: string
  name: string
  category: string
  list_price: number
  unit_cost: number
  current_discount_pct: number
  historical_discount_frequency: string
}

export interface Competitor {
  competitor_id: string
  name: string
  archetype: string
  positioning: string
  price_match_tendency: number // 0-1
  historical_behavior: string
}

export interface Baseline {
  period: string
  revenue: number
  full_price_purchase_pct: number
  avg_order_value: number
  repeat_purchase_rate: number
  avg_discount_depth_pct: number
}

export interface PersonaEvent {
  event_id: string
  scenario_id: string
  actor_type: 'persona'
  actor_id: string
  timestep: TimeOffset
  purchase_intent_delta: number
  loyalty_delta: number
  sentiment: string
  quote: string
}

export interface CompetitorEvent {
  event_id: string
  scenario_id: string
  actor_type: 'competitor'
  actor_id: string
  timestep: TimeOffset
  action: 'match' | 'hold' | 'escalate'
  rationale: string
}

export interface GuardrailEvent {
  event_id: string
  scenario_id: string
  actor_type: 'guardrail'
  actor_id: string
  timestep: TimeOffset
  recommendation: string
  rationale: string
}

export type SimEvent = PersonaEvent | CompetitorEvent | GuardrailEvent

export interface EventLog {
  scenario_id: string
  events: SimEvent[]
}

export interface GraphNode {
  node_id: string
  label: string
  layer: CausalLayer
  time_offset: TimeOffset
  /** optional: which event_log actor(s)/timestep this node is grounded in */
  source_event_ids?: string[]
}

export interface GraphEdge {
  source: string
  target: string
  label: string
}

export interface Graph {
  scenario_id: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ---- Bundled payload the app operates on ----

export interface SimulationBundle {
  scenario: Scenario
  personas: Persona[]
  products: Product[]
  competitors: Competitor[]
  baseline: Baseline
  outcome: Baseline
  eventLog: EventLog
  graph: Graph
}

export const LAYER_ORDER: CausalLayer[] = [
  'decision',
  'behavioral',
  'financial',
  'competitive',
  'brand',
]

export const TIME_OFFSETS: TimeOffset[] = ['day_0', 'day_30', 'day_90']

export const LAYER_LABELS: Record<CausalLayer, string> = {
  decision: 'Decision',
  behavioral: 'Behavioral',
  financial: 'Financial',
  competitive: 'Competitive',
  brand: 'Brand',
  recommendation: 'Recommendation',
}

export const TIME_LABELS: Record<TimeOffset, string> = {
  day_0: 'Day 0',
  day_30: 'Day 30',
  day_90: 'Day 90',
}
