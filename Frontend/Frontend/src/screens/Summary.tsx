import { useSimulationStore } from '@/store/simulationStore'
import { useLiveSimulation } from '@/store/useLiveSimulation'
import { BaselineVsOutcome } from '@/components/summary/BaselineVsOutcome'

export function SummaryScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const live = useLiveSimulation()
  if (!bundle || !live) return <div className="text-ink-faint text-sm">Loading…</div>

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">Baseline vs. simulated outcome</p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          What actually moved, by day 90
        </h1>
        <p className="text-sm text-ink-soft mt-1">{bundle.baseline.period} vs. {live.outcome.period}.</p>
      </div>

      <BaselineVsOutcome baseline={bundle.baseline} outcome={live.outcome} />
    </div>
  )
}
