import type { CompetitorEvent, EventLog, PersonaEvent, TimeOffset } from '@/types'
import { isCompetitorEvent, isPersonaEvent } from '@/lib/eventLog'

function topPersonaEvents(log: EventLog, step: TimeOffset, sortBy: 'intent' | 'loyalty', count = 3): PersonaEvent[] {
  return log.events
    .filter(isPersonaEvent)
    .filter((e) => e.timestep === step)
    .sort((a, b) => {
      const av = sortBy === 'intent' ? Math.abs(a.purchase_intent_delta) : Math.abs(a.loyalty_delta)
      const bv = sortBy === 'intent' ? Math.abs(b.purchase_intent_delta) : Math.abs(b.loyalty_delta)
      return bv - av
    })
    .slice(0, count)
}

/** Which persona/competitor events are "the evidence" behind each simplified flow node. */
export function evidenceForFlowNode(nodeId: string, log: EventLog): (PersonaEvent | CompetitorEvent)[] {
  switch (nodeId) {
    case 'conversion':
      return topPersonaEvents(log, 'day_0', 'intent')
    case 'full_price_loss':
      return topPersonaEvents(log, 'day_30', 'intent')
    case 'revenue':
      return topPersonaEvents(log, 'day_90', 'intent')
    case 'price_sensitivity':
      return topPersonaEvents(log, 'day_90', 'intent')
    case 'margin':
      return topPersonaEvents(log, 'day_30', 'loyalty')
    case 'competitor':
      return log.events.filter(isCompetitorEvent)
    case 'clv_retention':
      return topPersonaEvents(log, 'day_90', 'loyalty')
    case 'brand':
      return log.events
        .filter(isPersonaEvent)
        .filter((e) => e.timestep === 'day_90' && e.loyalty_delta < -0.15)
        .slice(0, 3)
    default:
      return []
  }
}
