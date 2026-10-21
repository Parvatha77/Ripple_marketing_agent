import { useSimulationStore } from '@/store/simulationStore'
import { useLiveSimulation } from '@/store/useLiveSimulation'
import { TIME_OFFSETS, TIME_LABELS } from '@/types'
import { personaEventAt, competitorEventAt } from '@/lib/eventLog'
import { PersonaCard } from '@/components/timeline/PersonaCard'
import { CompetitorCard } from '@/components/timeline/CompetitorCard'

export function TimelineScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const live = useLiveSimulation()
  if (!bundle || !live) return <div className="text-ink-faint text-sm">Loading…</div>

  const { personas, competitors } = bundle
  const eventLog = live.eventLog

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">Reaction timeline</p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          From day 0 excitement to day 90 fatigue
        </h1>
        <p className="text-sm text-ink-soft mt-1 max-w-xl">
          The receipts behind the graph — every quote and delta each persona and competitor actually produced, live
          at {live.effectiveDiscountPct.toFixed(1)}% average discount.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {TIME_OFFSETS.map((step, i) => (
          <div key={step} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-hairline">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-decision text-paper font-tabular text-[11px]">
                {i + 1}
              </span>
              <span className="font-display text-lg text-ink">{TIME_LABELS[step]}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {personas.map((persona) => (
                <PersonaCard
                  key={persona.persona_id}
                  persona={persona}
                  event={personaEventAt(eventLog, persona.persona_id, step)}
                />
              ))}
            </div>

            {step !== 'day_0' && (
              <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-hairline">
                <p className="text-[10px] uppercase tracking-widest text-ink-faint">Competitor response</p>
                {competitors.map((competitor) => (
                  <CompetitorCard
                    key={competitor.competitor_id}
                    competitor={competitor}
                    event={competitorEventAt(eventLog, competitor.competitor_id, step)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
