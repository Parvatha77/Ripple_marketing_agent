import { useMemo, useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useDynamicSimulation } from '@/store/useDynamicSimulation'
import { buildFlowGraph } from '@/lib/simulationEngine'
import { guardrailEvent } from '@/lib/eventLog'
import { DiscountControls } from '@/components/simulator/DiscountControls'
import { ScenarioCompare } from '@/components/simulator/ScenarioCompare'
import { RiskHeatmap } from '@/components/simulator/RiskHeatmap'
import { RippleFlowGraph } from '@/components/simulator/RippleFlowGraph'
import { FlowNodePanel } from '@/components/simulator/FlowNodePanel'
import { GuardrailsCard } from '@/components/guardrails/GuardrailsCard'

export function SimulatorScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const live = useLiveSimulation()
  const dynamicSim = useDynamicSimulation()
  // ONLY use real LLM backend data — no fallback to formula-based simulation
  const simResult = dynamicSim
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const flowGraph = useMemo(() => {
    if (!bundle || !simResult?.eventLog) return null
    return buildFlowGraph(bundle.personas, bundle.competitors, bundle.baseline, simResult)
  }, [bundle, simResult])

  if (!bundle || !simResult || !flowGraph) {
    if (simResult?.error) {
      return <div className="text-red-600 text-sm p-4">Backend LLM error: {simResult.error}</div>
    }
    if (simResult?.loading) {
      return (
        <div className="text-ink-faint text-sm p-4">
          Running full LLM pipeline… this takes 1–3 minutes. {simResult.elapsedSeconds}s elapsed.
        </div>
      )
    }
    return <div className="text-ink-faint text-sm">Loading scenario…</div>
  }

  const selectedNode = flowGraph.nodes.find((n) => n.id === selectedId) ?? null
  const guardrail = guardrailEvent(simResult.eventLog)

  return (
    <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-paper via-paper-raised to-primary-blue-tint/3 min-h-screen">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-primary-purple to-primary-blue bg-clip-text text-transparent">
          Discount Strategy Simulator
        </h1>
        <p className="text-xs text-ink-faint">Live discount at {(simResult?.effectiveDiscountPct || 0).toFixed(1)}%</p>
      </div>

      <DiscountControls scenario={bundle.scenario} products={bundle.products} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Graph */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="bg-paper-raised rounded-xl border border-primary-purple/20 p-5 shadow-card">
            <h2 className="font-medium text-sm text-ink mb-3">Ripple Effect Flow</h2>
            <RippleFlowGraph
              nodes={flowGraph.nodes}
              edges={flowGraph.edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          {/* Node Details Below Graph */}
          {selectedNode && (
            <FlowNodePanel node={selectedNode} eventLog={simResult.eventLog} onClose={() => setSelectedId(null)} />
          )}
        </div>

        {/* Right Column: Guardrail */}
        <div className="flex flex-col gap-4">
          {/* Empty space for guardrail below */}
        </div>
      </div>

      {/* Guardrail Recommendation Card */}
      {guardrail && (
        <div className="bg-gradient-to-r from-primary-purple/10 to-primary-blue/10 border-l-4 border-primary-purple rounded-lg p-5">
          <p className="text-[10px] uppercase tracking-widest text-primary-purple font-bold mb-2">Strategy Guardrail</p>
          <GuardrailsCard event={guardrail} personas={bundle.personas} />
        </div>
      )}

      {/* Scenario Comparison */}
      <ScenarioCompare
        scenarioId={bundle.scenario.scenario_id}
        personas={bundle.personas}
        baseline={bundle.baseline}
        effectiveDiscountPct={simResult.effectiveDiscountPct}
      />

      {/* Risk Heatmap */}
      <RiskHeatmap
        effectiveDiscountPct={simResult.effectiveDiscountPct}
        personas={bundle.personas}
        competitors={bundle.competitors}
      />
    </div>
  )
}
