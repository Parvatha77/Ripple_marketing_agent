import type { Competitor, CompetitorEvent } from '@/types'

const ACTION_LABEL: Record<CompetitorEvent['action'], string> = {
  match: 'Matches',
  hold: 'Holds',
  escalate: 'Escalates',
}

export function CompetitorCard({ competitor, event }: { competitor: Competitor; event?: CompetitorEvent }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-competitive/25 bg-competitive-tint/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm text-ink leading-tight">{competitor.name}</span>
        {event && (
          <span className="text-[10px] uppercase tracking-widest font-semibold text-competitive">
            {ACTION_LABEL[event.action]}
          </span>
        )}
      </div>
      {event ? (
        <p className="text-xs text-ink-soft leading-snug">{event.rationale}</p>
      ) : (
        <p className="text-xs text-ink-faint">No action recorded at this checkpoint.</p>
      )}
    </div>
  )
}
