interface RawEvent {
  event_id: string
  actor_type: 'persona' | 'competitor' | 'guardrail'
  actor_id: string
  timestep?: string
  purchase_intent_delta?: number
  loyalty_delta?: number
  quote?: string
  sentiment?: string
  action?: string
  rationale?: string
  recommendation?: unknown
}

function DeltaBadge({ value, label }: { value: number; label: string }) {
  const positive = value > 0
  const negative = value < 0
  return (
    <span className="inline-flex items-baseline gap-1 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono font-semibold ${positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-400'}`}>
        {value > 0 ? '+' : ''}
        {value.toFixed(2)}
      </span>
    </span>
  )
}

export function SimulationEvidenceDisplay({ evidence }: { evidence: Record<string, unknown> }) {
  const events = Array.isArray((evidence as any)?.events) ? ((evidence as any).events as RawEvent[]) : []

  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No evidence recorded for this simulation.</p>
  }

  const personaEvents = events.filter((e) => e.actor_type === 'persona')
  const competitorEvents = events.filter((e) => e.actor_type === 'competitor')

  return (
    <div className="space-y-4">
      {personaEvents.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Persona Reactions</p>
          <div className="space-y-2">
            {personaEvents.map((e) => (
              <div key={e.event_id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800">{e.actor_id.replace('per_', '').replace(/_/g, ' ')}</span>
                  <div className="flex gap-3">
                    {e.purchase_intent_delta !== undefined && <DeltaBadge value={e.purchase_intent_delta} label="intent" />}
                    {e.loyalty_delta !== undefined && <DeltaBadge value={e.loyalty_delta} label="loyalty" />}
                  </div>
                </div>
                {e.quote && <p className="text-xs text-gray-600 italic leading-snug">"{e.quote}"</p>}
                {e.sentiment && (
                  <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-gray-400">{e.sentiment}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {competitorEvents.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">Competitor Responses</p>
          <div className="space-y-2">
            {competitorEvents.map((e) => (
              <div key={e.event_id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800">{e.actor_id.replace('cmp_', '').replace(/_/g, ' ')}</span>
                  {e.action && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-orange-600">{e.action}</span>
                  )}
                </div>
                {e.rationale && <p className="text-xs text-gray-600 leading-snug">{e.rationale}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
