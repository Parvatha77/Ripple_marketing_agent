import { useMemo, useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useLiveSimulation } from '@/store/useLiveSimulation'
import { useDynamicSimulation } from '@/store/useDynamicSimulation'
import { buildFlowGraph } from '@/lib/simulationEngine'
import { RippleFlowGraph } from '@/components/simulator/RippleFlowGraph'
import { FlowNodePanel } from '@/components/simulator/FlowNodePanel'
import { GraphScene } from '@/components/graph/GraphScene'
import { GraphSidePanel } from '@/components/graph/GraphSidePanel'
import { GraphListView } from '@/components/graph/GraphListView'
import { LayerLegend } from '@/components/common/LayerLegend'

type View = 'flow' | 'list' | '3d'

export function RippleGraphScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const live = useLiveSimulation()
  const dynamicSim = useDynamicSimulation()
  // ONLY use real LLM backend data — no fallback to formula-based simulation
  const simResult = dynamicSim
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<View>('flow')

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
    return <div className="text-ink-faint text-sm">Loading…</div>
  }

  // Use the LLM-generated causal graph from the current simulation, not the static seed graph
  const graph = simResult.graph ?? bundle.graph
  const eventLog = simResult.eventLog
  const selectedGraphNode = graph.nodes.find((n) => n.node_id === selectedId) ?? null
  const selectedFlowNode = flowGraph.nodes.find((n) => n.id === selectedId) ?? null

  const TABS: { id: View; label: string }[] = [
    { id: 'flow', label: 'Flow graph' },
    { id: 'list', label: 'List view' },
    { id: '3d', label: '3D exploration' },
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">The ripple effect</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            How the decision cascades through the system
          </h1>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">
            {view === '3d'
              ? 'Depth is causal layer, left-to-right is time. Select any node for the evidence behind it.'
              : 'Left-to-right is causal distance from the decision. Select any node for the evidence behind it.'}
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Graph view"
          className="flex items-center rounded-md border border-hairline bg-paper-raised p-0.5 shrink-0"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={view === tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                view === tab.id ? 'bg-decision text-paper' : 'text-ink-soft'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'flow' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="rounded-xl border border-hairline bg-paper-raised p-5">
            <RippleFlowGraph
              nodes={flowGraph.nodes}
              edges={flowGraph.edges}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <FlowNodePanel node={selectedFlowNode} eventLog={eventLog} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {view === 'list' && (
        <>
          <LayerLegend className="border-y border-hairline py-2.5" />
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <GraphListView graph={graph} onSelect={setSelectedId} />
            </div>
            <GraphSidePanel node={selectedGraphNode} eventLog={eventLog} onClose={() => setSelectedId(null)} />
          </div>
        </>
      )}

      {view === '3d' && (
        <>
          <LayerLegend className="border-y border-hairline py-2.5" />
          <div className="flex gap-4 items-stretch" style={{ height: '640px' }}>
            <div className="flex-1 rounded-lg border border-hairline overflow-hidden bg-paper">
              <GraphScene
                graph={graph}
                selectedId={selectedId}
                onSelect={setSelectedId}
                nodeMagnitudes={live.nodeMagnitudes}
              />
            </div>
            <GraphSidePanel node={selectedGraphNode} eventLog={eventLog} onClose={() => setSelectedId(null)} />
          </div>
        </>
      )}
    </div>
  )
}
