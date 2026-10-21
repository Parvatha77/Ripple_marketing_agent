import type { CompetitorEvent, EventLog, GuardrailEvent, PersonaEvent, SimEvent, TimeOffset } from '@/types'

export function isPersonaEvent(e: SimEvent): e is PersonaEvent {
  return e.actor_type === 'persona'
}
export function isCompetitorEvent(e: SimEvent): e is CompetitorEvent {
  return e.actor_type === 'competitor'
}
export function isGuardrailEvent(e: SimEvent): e is GuardrailEvent {
  return e.actor_type === 'guardrail'
}

export function personaEventsFor(log: EventLog, personaId: string): PersonaEvent[] {
  return log.events.filter(isPersonaEvent).filter((e) => e.actor_id === personaId)
}

export function personaEventAt(log: EventLog, personaId: string, step: TimeOffset): PersonaEvent | undefined {
  return personaEventsFor(log, personaId).find((e) => e.timestep === step)
}

export function competitorEventsFor(log: EventLog, competitorId: string): CompetitorEvent[] {
  return log.events.filter(isCompetitorEvent).filter((e) => e.actor_id === competitorId)
}

export function competitorEventAt(log: EventLog, competitorId: string, step: TimeOffset): CompetitorEvent | undefined {
  return competitorEventsFor(log, competitorId).find((e) => e.timestep === step)
}

export function guardrailEvent(log: EventLog): GuardrailEvent | undefined {
  return log.events.find(isGuardrailEvent)
}

export function eventsByIds(log: EventLog, ids: string[]): SimEvent[] {
  const idSet = new Set(ids)
  return log.events.filter((e) => idSet.has(e.event_id))
}
