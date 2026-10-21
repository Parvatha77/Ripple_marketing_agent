import { useState, useEffect } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useDecisionContextStore } from '@/store/decisionContextStore'
import { DecisionKanban, type SimulationStatus } from '@/components/governance/DecisionKanban'
import { SimulationEvidenceDisplay } from '@/components/governance/SimulationEvidenceDisplay'

const API_BASE_URL = 'http://127.0.0.1:8000'

interface SavedSimulation {
  id: string
  created_at: string
  discount_pct: number
  category: string
  initiated_by: string
  revenue_change_pct: number
  margin_impact_pct: number
  evidence?: Record<string, unknown>
  selected_node_id?: string
  status?: SimulationStatus
}

export function GovernanceNewScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const currentDynamicSim = useSimulationStore((s) => s.dynamicSimResult)
  const setUserName = useDecisionContextStore((s) => s.setUserName)
  const setCategory = useDecisionContextStore((s) => s.setCategory)
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([])
  const [selectedSimulation, setSelectedSimulation] = useState<SavedSimulation | null>(null)
  const [detailView, setDetailView] = useState<'evidence' | 'comparison' | null>(null)

  useEffect(() => {
    const fetchSimulations = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/simulations`)
        if (response.ok) {
          const data = await response.json()
          setSavedSimulations(data)
          if (data.length > 0) {
            setSelectedSimulation(data[0])
          }
        }
      } catch (err) {
        console.error('Error fetching simulations:', err)
      }
    }
    fetchSimulations()
  }, [])

  // Auto-save current dynamic simulation to backend when it completes
  useEffect(() => {
    if (currentDynamicSim && !currentDynamicSim.loading && !currentDynamicSim.error && currentDynamicSim.financial_analysis) {
      const saveCurrentSim = async () => {
        try {
          const financial = currentDynamicSim.financial_analysis || {}
          await fetch(`${API_BASE_URL}/simulations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenario_id: currentDynamicSim.scenario?.scenario_id || 'scn_sitewide_discount_30',
              discount_pct: currentDynamicSim.effectiveDiscountPct,
              category: 'sitewide',
              initiated_by: 'simulator',
              revenue_change_pct: (financial.revenue_delta || 0) / (currentDynamicSim.baseline?.revenue || 1) * 100,
              margin_impact_pct: financial.margin_delta || 0,
              repeat_purchase_rate: currentDynamicSim.outcome?.repeat_purchase_rate,
              avg_order_value: currentDynamicSim.outcome?.avg_order_value,
              full_price_purchase_pct: currentDynamicSim.outcome?.full_price_purchase_pct,
              evidence: currentDynamicSim.event_log,
            }),
          })
          // Refresh the simulations list
          const response = await fetch(`${API_BASE_URL}/simulations`)
          if (response.ok) {
            const data = await response.json()
            setSavedSimulations(data)
          }
        } catch (err) {
          console.error('Failed to save simulation:', err)
        }
      }
      saveCurrentSim()
    }
  }, [currentDynamicSim])

  if (!bundle) return <div className="text-gray-500 p-8">Loading…</div>

  const calculateDynamicKPIs = (sim: SavedSimulation) => {
    // Adherence = share of saved simulations landing at reasonable discount levels
    const adherenceRate = savedSimulations.length
      ? Math.round(
          (savedSimulations.filter((s) => s.discount_pct <= 20 + 2).length / savedSimulations.length) * 100,
        )
      : 0
    return {
      adherenceRate,
      overrideCount: savedSimulations.filter((s) => s.margin_impact_pct < -3).length,
      overrideRate: Math.round((savedSimulations.filter((s) => s.margin_impact_pct < -3).length / Math.max(savedSimulations.length, 1)) * 100),
      highRiskCount: savedSimulations.filter((s) => s.discount_pct > 26).length,
      marginalImpact: sim.margin_impact_pct,
    }
  }

  const kpis = selectedSimulation ? calculateDynamicKPIs(selectedSimulation) : null

  const handleStatusChange = (id: string, status: SimulationStatus) => {
    setSavedSimulations((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))
  }

  return (
    <div className="min-h-screen bg-white pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Governance Command Center</h1>
          <p className="text-gray-600">Real-time monitoring of pricing decisions and guardrail adherence</p>
        </div>


        {/* Dynamic KPI Score */}
        {kpis && selectedSimulation && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
            {selectedSimulation.discount_pct > 26 && (
              <div className="bg-amber-50 text-amber-900 px-4 py-2 rounded mb-6 flex items-center gap-2 border border-amber-200">
                <span>⚠️</span>
                <span className="text-sm font-medium">{kpis.highRiskCount} high-risk simulations in history.</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Score Card */}
              <div className="bg-blue-100 border-2 border-blue-300 flex flex-col items-center justify-center w-40 h-40 rounded-2xl">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Current Decision</p>
                <p className="text-5xl font-bold text-blue-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {selectedSimulation.discount_pct}
                </p>
                <p className="text-sm font-semibold text-blue-700 mt-1">%</p>
              </div>

              {/* KPI Cards - Click to show details */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                <button
                  onClick={() => {
                    setDetailView('evidence')
                  }}
                  className="border-l-4 border-gray-400 pl-4 py-2 text-left hover:bg-gray-50 rounded transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Simulations</p>
                  <p className="text-3xl font-bold text-gray-900">{savedSimulations.length}</p>
                  <p className="text-xs text-gray-500 mt-1">📌 Click for history</p>
                </button>

                <button
                  onClick={() => setDetailView('comparison')}
                  className="border-l-4 border-teal-500 pl-4 py-2 text-left hover:bg-teal-50 rounded transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Margin Impact</p>
                  <p className="text-3xl font-bold text-teal-600">{selectedSimulation.margin_impact_pct.toFixed(1)}pp</p>
                  <p className="text-xs text-gray-500 mt-1">📌 Click to see why</p>
                </button>

                <button
                  onClick={() => setDetailView('evidence')}
                  className="border-l-4 border-amber-500 pl-4 py-2 text-left hover:bg-amber-50 rounded transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Override Rate</p>
                  <p className="text-3xl font-bold text-amber-600">{kpis.overrideRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">📌 Click for details</p>
                </button>

                <button
                  onClick={() => setDetailView('evidence')}
                  className="border-l-4 border-red-500 pl-4 py-2 text-left hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">High Risk Decisions</p>
                  <p className="text-3xl font-bold text-red-600">{kpis.highRiskCount}</p>
                  <p className="text-xs text-gray-500 mt-1">📌 Click for list</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decision Pipeline Board */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Decision Pipeline</h3>
            <p className="text-xs text-gray-500">Drag a card to change its review status</p>
          </div>
          <DecisionKanban simulations={savedSimulations} onStatusChange={handleStatusChange} />
        </div>

        {/* Saved Simulations List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Saved Simulations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-semibold text-gray-600 uppercase">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Who</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Discount</th>
                  <th className="py-3 px-4 font-medium">Margin Impact</th>
                  <th className="py-3 px-4 font-medium">Revenue Lift</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedSimulations.map((sim) => (
                  <tr
                    key={sim.id}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedSimulation?.id === sim.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setSelectedSimulation(sim)
                      setCategory(sim.category)
                      setUserName(sim.initiated_by.split('(')[0].trim())
                    }}
                  >
                    <td className="py-3 px-4 text-gray-900">{new Date(sim.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-700 text-xs">{sim.initiated_by}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {sim.category === 'all' ? 'Site-Wide' : sim.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{sim.discount_pct}%</td>
                    <td className={`py-3 px-4 font-mono font-bold ${sim.margin_impact_pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {sim.margin_impact_pct.toFixed(1)}pp
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      {sim.revenue_change_pct ? `+${sim.revenue_change_pct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSimulation(sim)
                          setDetailView('evidence')
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        View Reasoning
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const confirmed = window.confirm('Delete this simulation?')
                          if (!confirmed) return
                          try {
                            await fetch(`${API_BASE_URL}/simulations/${sim.id}`, { method: 'DELETE' })
                            setSavedSimulations((prev) => prev.filter((s) => s.id !== sim.id))
                            if (selectedSimulation?.id === sim.id) {
                              setSelectedSimulation(null)
                              setDetailView(null)
                            }
                          } catch (err) {
                            console.error('Failed to delete simulation:', err)
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-semibold text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel: Evidence/Reasoning */}
        {selectedSimulation && detailView === 'evidence' && (
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-6 mb-8 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">Decision Reasoning</h3>
              <button
                onClick={() => setDetailView(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">Decision Maker</h4>
                <p className="text-gray-700 font-medium">{selectedSimulation.initiated_by}</p>
              </div>

              <div className="bg-white p-4 rounded border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">Scope</h4>
                <p className="text-gray-700 font-medium">
                  {selectedSimulation.category === 'all' ? 'Site-Wide All Products' : `Category: ${selectedSimulation.category}`}
                </p>
              </div>

              <div className="bg-white p-4 rounded border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">Timestamp</h4>
                <p className="text-gray-700 font-medium">{new Date(selectedSimulation.created_at).toLocaleString()}</p>
              </div>
            </div>

            {selectedSimulation.evidence && (
              <div className="bg-white p-4 rounded border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">LLM Simulation Evidence</h4>
                <SimulationEvidenceDisplay evidence={selectedSimulation.evidence} />
              </div>
            )}
          </div>
        )}

        {/* Detail Panel: Comparison */}
        {selectedSimulation && detailView === 'comparison' && (
          <div className="bg-amber-50 border-l-4 border-amber-600 rounded-lg p-6 mb-8 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">Impact Analysis</h3>
              <button
                onClick={() => setDetailView(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-bold mb-2">Discount Depth</p>
                  <p className="text-3xl font-bold text-gray-900">{selectedSimulation.discount_pct}%</p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-bold mb-2">Margin Impact</p>
                  <p className={`text-3xl font-bold ${selectedSimulation.margin_impact_pct < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedSimulation.margin_impact_pct.toFixed(1)}pp
                  </p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-bold mb-2">Revenue Lift</p>
                  <p className="text-3xl font-bold text-green-600">+{selectedSimulation.revenue_change_pct.toFixed(1)}%</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-700">
                  <strong>Analysis:</strong> At {selectedSimulation.discount_pct}% discount, this strategy impacts margin by{' '}
                  <strong>{selectedSimulation.margin_impact_pct.toFixed(1)} percentage points</strong> while driving{' '}
                  <strong>+{selectedSimulation.revenue_change_pct.toFixed(1)}% revenue lift</strong>. The trade-off represents a{' '}
                  {Math.abs(selectedSimulation.margin_impact_pct) < 2 ? 'conservative' : 'moderate to aggressive'} approach.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
