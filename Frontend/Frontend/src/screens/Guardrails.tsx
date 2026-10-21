import { useSimulationStore } from '@/store/simulationStore'
import { useDynamicSimulation } from '@/store/useDynamicSimulation'
import { guardrailEvent } from '@/lib/eventLog'
import { GuardrailsCard } from '@/components/guardrails/GuardrailsCard'

export function GuardrailsScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const dynamicSim = useDynamicSimulation()
  if (!bundle || !dynamicSim) return <div className="text-ink-faint text-sm">Loading…</div>

  if (dynamicSim.loading) {
    return (
      <div className="text-ink-faint text-sm">
        Running LLM analysis… this takes 1–3 minutes. {dynamicSim.elapsedSeconds}s elapsed.
      </div>
    )
  }

  if (dynamicSim.error) {
    return <div className="text-red-600 text-sm">Error: {dynamicSim.error}</div>
  }

  const event = guardrailEvent(dynamicSim.eventLog)
  if (!event) return <div className="text-ink-faint text-sm">No recommendation available.</div>

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">The resolution</p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          What to do instead
        </h1>
      </div>

      <GuardrailsCard event={event} personas={bundle.personas} />
    </div>
  )
}
