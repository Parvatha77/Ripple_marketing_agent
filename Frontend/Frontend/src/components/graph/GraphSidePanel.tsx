import type { EventLog, GraphNode } from '@/types'
import { LAYER_LABELS, TIME_LABELS } from '@/types'
import { eventsByIds, isCompetitorEvent, isGuardrailEvent, isPersonaEvent } from '@/lib/eventLog'
import { DeltaFigure } from '@/components/common/DeltaFigure'
import { LAYER_HEX } from '@/components/common/layerColors'

export function GraphSidePanel({
  node,
  eventLog,
  onClose,
}: {
  node: GraphNode | null
  eventLog: EventLog
  onClose: () => void
}) {
  if (!node) {
    return (
      <aside className="w-80 shrink-0 rounded-lg border border-hairline bg-paper-raised p-5">
        <p className="text-sm text-ink-faint">
          Select a node in the graph to see the evidence behind it — the quotes and deltas that produced it.
        </p>
      </aside>
    )
  }

  const evidence = node.source_event_ids ? eventsByIds(eventLog, node.source_event_ids) : []

  return (
    <aside className="w-80 shrink-0 rounded-lg border border-hairline bg-paper-raised p-5 flex flex-col gap-4 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: LAYER_HEX[node.layer] }}
          >
            {LAYER_LABELS[node.layer]} · {TIME_LABELS[node.time_offset]}
          </span>
          <h3 className="font-display text-base text-ink mt-1 leading-snug">{node.label}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-ink-faint hover:text-ink text-sm shrink-0"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {evidence.length === 0 ? (
        <p className="text-xs text-ink-faint">No underlying events linked to this node.</p>
      ) : (
        <div className="flex flex-col gap-3 border-t border-hairline pt-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-faint">Grounded in</p>
          {evidence.map((e) => {
            if (isPersonaEvent(e)) {
              return (
                <div key={e.event_id} className="flex flex-col gap-1.5 rounded-md bg-paper-sunken p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">{e.actor_id.replace('per_', '')}</span>
                    <div className="flex gap-2">
                      <DeltaFigure value={e.purchase_intent_delta} label="intent" />
                      <DeltaFigure value={e.loyalty_delta} label="loyalty" />
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft italic leading-snug">"{e.quote}"</p>
                </div>
              )
            }
            if (isCompetitorEvent(e)) {
              return (
                <div key={e.event_id} className="flex flex-col gap-1.5 rounded-md bg-paper-sunken p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">{e.actor_id.replace('cmp_', '')}</span>
                    <span className="text-[10px] uppercase tracking-wide text-competitive font-semibold">
                      {e.action}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft leading-snug">{e.rationale}</p>
                </div>
              )
            }
            if (isGuardrailEvent(e)) {
              return (
                <div key={e.event_id} className="flex flex-col gap-1.5 rounded-md bg-paper-sunken p-2.5">
                  <p className="text-xs font-medium text-ink">{e.recommendation}</p>
                  <p className="text-xs text-ink-soft leading-snug">{e.rationale}</p>
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </aside>
  )
}
