import type { Persona, PersonaEvent } from '@/types'
import { DeltaFigure } from '@/components/common/DeltaFigure'

export function PersonaCard({ persona, event }: { persona: Persona; event?: PersonaEvent }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-paper-raised p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-sm text-ink leading-tight">{persona.segment_name}</span>
      </div>
      {event ? (
        <>
          <div className="flex gap-3">
            <DeltaFigure value={event.purchase_intent_delta} label="intent" />
            <DeltaFigure value={event.loyalty_delta} label="loyalty" />
          </div>
          <p className="text-xs text-ink-soft italic leading-snug">"{event.quote}"</p>
          <span className="text-[10px] uppercase tracking-wide text-ink-faint">{event.sentiment}</span>
        </>
      ) : (
        <p className="text-xs text-ink-faint">No reaction recorded at this checkpoint.</p>
      )}
    </div>
  )
}
