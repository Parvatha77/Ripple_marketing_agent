import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import { useDynamicSimulation } from '@/store/useDynamicSimulation'
import { useDiscountStore } from '@/store/discountStore'
import { useDecisionContextStore } from '@/store/decisionContextStore'
import { buildFlowGraph, snapshotAtDiscount } from '@/lib/simulationEngine'
import { guardrailEvent } from '@/lib/eventLog'
import { RippleFlowGraph } from '@/components/simulator/RippleFlowGraph'
import { FlowNodePanel } from '@/components/simulator/FlowNodePanel'
import { BaselineVsOutcome } from '@/components/summary/BaselineVsOutcome'

const API_BASE_URL = 'http://127.0.0.1:8000'

/** Builds a lightweight "effective result" from the most recently saved
 * simulation record, so the screen has real numbers to show on first load
 * instead of sitting on a blank/loading state until the user runs a fresh
 * (1-3 minute) pipeline call. It has no event log / graph, so the ripple
 * graph and node panel stay empty until a real simulation runs. */
function resultFromSavedSimulation(saved: any, bundle: any) {
  if (!saved || !bundle) return null
  return {
    outcome: {
      period: 'post-decision',
      revenue: saved.revenue ?? bundle.baseline.revenue,
      full_price_purchase_pct: saved.full_price_purchase_pct ?? bundle.baseline.full_price_purchase_pct,
      avg_order_value: saved.avg_order_value ?? bundle.baseline.avg_order_value,
      repeat_purchase_rate: saved.repeat_purchase_rate ?? bundle.baseline.repeat_purchase_rate,
      avg_discount_depth_pct: saved.discount_pct,
    },
    baseline: bundle.baseline,
    guardrail: null as any,
    guardrailRecommendationValue: saved.guardrail_recommendation ?? null,
    marginImpactPct: saved.margin_impact_pct ?? null,
    eventLog: null as any,
    isFromSavedRecord: true,
  }
}

// Categories will be dynamically pulled from bundle.products
function getCategoriesFromProducts(products: any[]): Record<string, string> {
  const categories = new Set<string>()
  products.forEach((p) => categories.add(p.category.toLowerCase()))

  const result: Record<string, string> = {
    all: 'All Products (Site-Wide)',
  }

  Array.from(categories)
    .sort()
    .forEach((cat) => {
      result[cat] = cat.charAt(0).toUpperCase() + cat.slice(1)
    })

  return result
}

export function SimulatorConsolidatedScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const dynamicSim = useDynamicSimulation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string>('')
  // undefined = not fetched yet, null = fetched but none exist
  const [lastSaved, setLastSaved] = useState<any>(undefined)
  const seededFromSavedRef = useRef(false)

  const context = useDecisionContextStore((s) => s.context)
  const setUserName = useDecisionContextStore((s) => s.setUserName)
  const setCategory = useDecisionContextStore((s) => s.setCategory)
  const setProductIds = useDecisionContextStore((s) => s.setProductIds)

  const productDiscountPct = useDiscountStore((s) => s.productDiscountPct)
  const setSiteWideDiscount = useDiscountStore((s) => s.setSiteWideDiscount)
  const initializeDiscounts = useDiscountStore((s) => s.initialize)

  // ONLY use real backend data — no fallback to formula-based simulation.
  // Until the user runs a fresh simulation, fall back to the last simulation
  // they saved (fetched below), so the screen isn't blank on first load.
  const simResult = dynamicSim

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE_URL}/simulations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled) return
        setLastSaved(Array.isArray(data) && data.length > 0 ? data[0] : null)
      })
      .catch(() => {
        if (!cancelled) setLastSaved(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Seed the per-SKU discount map (and who/what context) directly to its
  // final value — last saved simulation if one exists, otherwise the
  // scenario default — in a single step, exactly once, as soon as both the
  // product bundle and the saved-history fetch are ready. Seeding in one
  // step (rather than default-then-overwrite) matters: useDynamicSimulation
  // treats any change to an already-seeded value as a user-driven edit and
  // fires the real (1-3 minute) pipeline call for it.
  useEffect(() => {
    if (seededFromSavedRef.current) return
    if (!bundle || lastSaved === undefined) return
    seededFromSavedRef.current = true
    initializeDiscounts(bundle.products.map((p) => p.sku_id), lastSaved ? lastSaved.discount_pct : Number(bundle.scenario.new_value))
    if (lastSaved) {
      if (lastSaved.initiated_by && lastSaved.initiated_by !== 'unknown') setUserName(lastSaved.initiated_by)
      if (lastSaved.category) setCategory(lastSaved.category)
    }
  }, [bundle, lastSaved, initializeDiscounts, setUserName, setCategory])

  const savedResult = useMemo(() => resultFromSavedSimulation(lastSaved, bundle), [lastSaved, bundle])
  // What the UI actually renders: the live backend result once one exists,
  // otherwise the last saved simulation so first load isn't empty.
  const effectiveResult: any = simResult?.outcome ? simResult : savedResult

  const affectedPersonaNames = useMemo(() => {
    if (!bundle || !simResult?.eventLog?.events) return []
    const idToName = new Map(bundle.personas.map((p: any) => [p.persona_id, p.segment_name]))
    const ids = new Set(
      simResult.eventLog.events.filter((e: any) => e.actor_type === 'persona').map((e: any) => e.actor_id),
    )
    return Array.from(ids).map((id) => idToName.get(id as string) || (id as string))
  }, [bundle, simResult])

  // Get real categories from products data
  const PRODUCT_CATEGORIES = useMemo(() => {
    if (!bundle) return { all: 'All Products (Site-Wide)' }
    return getCategoriesFromProducts(bundle.products)
  }, [bundle])

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (!bundle) return []
    if (context.category === 'all') return bundle.products
    return bundle.products.filter((p) => p.category.toLowerCase() === context.category.toLowerCase())
  }, [bundle, context.category])

  const flowGraph = useMemo(() => {
    if (!bundle || !simResult?.eventLog) return null
    return buildFlowGraph(bundle.personas, bundle.competitors, bundle.baseline, simResult)
  }, [bundle, simResult])

  const scenarioA = useMemo(() => (bundle ? snapshotAtDiscount(bundle.scenario.scenario_id, bundle.personas, bundle.baseline, 15) : null), [bundle])
  const scenarioB = useMemo(() => (bundle ? snapshotAtDiscount(bundle.scenario.scenario_id, bundle.personas, bundle.baseline, 35) : null), [bundle])

  // Don't render the interactive slider until the discount map is actually
  // seeded with real per-SKU keys (seededFromSavedRef effect above, which
  // waits on the async GET /simulations call). Dragging the slider before
  // that finishes is a silent no-op — setSiteWideDiscount has no keys yet
  // to write into — and looks like "nothing happened."
  if (!bundle || Object.keys(productDiscountPct).length === 0) {
    return <div className="text-gray-500 p-8">Loading…</div>
  }

  if (simResult?.error) {
    return <div className="text-red-600 p-8">Backend LLM error: {simResult.error}</div>
  }

  if (!effectiveResult && !dynamicSim?.loading) {
    return <div className="text-gray-500 p-8">Move the discount slider to run your first simulation.</div>
  }

  if (!effectiveResult) {
    // dynamicSim.loading is true here but there's no last-saved fallback to
    // show underneath — this is a true first-ever run, so block the whole
    // screen on the loading message.
    return (
      <div className="text-gray-500 p-8">
        Running full LLM pipeline (18 persona calls + competitors + guardrail + causal graph)…
        this takes 1–3 minutes. {dynamicSim?.elapsedSeconds}s elapsed.
      </div>
    )
  }

  const sliderValue = Object.values(productDiscountPct).reduce((a, b) => a + b, 0) / (Object.values(productDiscountPct).length || 1)
  const selectedNode = flowGraph?.nodes.find((n: any) => n.id === selectedId) ?? null
  const guardrail = simResult?.eventLog ? guardrailEvent(simResult.eventLog) : null
  const isShowingSavedOnly = !simResult?.outcome
  const marginImpactPct: number | null = simResult?.financial_analysis?.avg_margin_delta_pct ?? effectiveResult.marginImpactPct ?? null

  const handleSlider = (pct: number) => {
    setSiteWideDiscount(pct)
  }

  const handleSaveSimulation = async () => {
    if (!bundle || !simResult || !context.user_name) {
      setSaveMessage('Please enter your name first')
      return
    }

    setSavingState('saving')
    setSaveMessage('')

    try {
      // Use dynamic simulation results if available, fallback to the last saved simulation
      const outcome = dynamicSim?.outcome || effectiveResult?.outcome || {}
      const baseline = dynamicSim?.baseline || bundle.baseline
      const guardrailData = dynamicSim?.guardrail || guardrail

      const revenue_change_pct = ((outcome.revenue - baseline.revenue) / baseline.revenue) * 100
      const margin_impact_pct = -(sliderValue - baseline.avg_discount_depth_pct) * 0.34

      // Ensure all required fields are present
      if (!outcome.revenue || !baseline.revenue) {
        throw new Error('Missing outcome or baseline data')
      }

      const simulation = {
        scenario_id: dynamicSim?.scenario?.scenario_id || bundle.scenario.scenario_id,
        discount_pct: sliderValue || 0,
        product_id: context.category === 'all' ? 'all' : context.product_ids[0] || 'all',
        category: context.category || 'all',
        product_ids: context.product_ids || [],
        initiated_by: context.user_name || 'unknown',
        revenue: Number(outcome.revenue) || 0,
        revenue_change_pct: Number(revenue_change_pct) || 0,
        margin_impact_pct: Number(margin_impact_pct) || 0,
        repeat_purchase_rate: Number(outcome.repeat_purchase_rate) || 0,
        avg_order_value: Number(outcome.avg_order_value) || 0,
        full_price_purchase_pct: Number(outcome.full_price_purchase_pct) || 0,
        guardrail_recommendation: guardrailData?.recommendation?.proposed_value || null,
        selected_node_id: selectedId || null,
        evidence: context.evidence || null,
      }

      console.log('Saving simulation:', simulation)

      const response = await fetch(`${API_BASE_URL}/simulations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulation),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      setSavingState('saved')
      setSaveMessage('✓ Saved to Governance')
      setTimeout(() => {
        setSavingState('idle')
        setSaveMessage('')
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setSavingState('error')
      setSaveMessage(`Error: ${errorMessage}`)
      setTimeout(() => {
        setSavingState('idle')
        setSaveMessage('')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen bg-white pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {dynamicSim?.loading && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm flex items-center gap-3">
            <span className="inline-block w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            Running full LLM pipeline (18 persona calls + competitors + guardrail + causal graph)… this takes 1–3 minutes. {dynamicSim.elapsedSeconds}s elapsed.
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Strategy Simulator</h1>
          <p className="text-gray-600 mb-6">Test discount strategies and see cascading impact across personas, financials, and competition</p>

          {/* Decision Context Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">Who & What</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Your Name</label>
                <input
                  type="text"
                  defaultValue={context.user_name}
                  onBlur={(e) => setUserName(e.target.value)}
                  placeholder="e.g., Sarah Chen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Scope</label>
                <select
                  value={context.category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    setProductIds([])
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(PRODUCT_CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Selection */}
            {context.category !== 'all' && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Products in {PRODUCT_CATEGORIES[context.category as keyof typeof PRODUCT_CATEGORIES]}</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="products"
                      checked={context.product_ids.length === 0}
                      onChange={() => setProductIds([])}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">All {context.category} products</span>
                  </label>
                  <details className="ml-6">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">Or select specific SKUs</summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <label key={p.sku_id} className="flex items-center gap-2 p-1 hover:bg-blue-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={context.product_ids.includes(p.sku_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProductIds([...context.product_ids, p.sku_id])
                              } else {
                                setProductIds(context.product_ids.filter((id) => id !== p.sku_id))
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Center */}
        <div className="bg-gradient-to-br from-white to-blue-50 border border-gray-200 rounded-xl p-6 shadow-sm mb-8 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Simulated Discount</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {sliderValue.toFixed(1)}%
                </div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mt-1">Proposed Strategy</p>
              </div>
            </div>

            {/* Slider */}
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-amber-400 to-red-400 rounded-full h-3 top-1/2 -translate-y-1/2"></div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={sliderValue}
                onChange={(e) => handleSlider(Number(e.target.value))}
                className="w-full relative z-10 h-4 rounded-full appearance-none bg-transparent accent-blue-600 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>0% (Full Price)</span>
              <span>50% (Max Clearance)</span>
            </div>
        </div>

        {/* COMPARISON ZONE: 3 Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Scenario A */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900">Scenario A</h3>
              <span className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded">LOW RISK</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
              15%
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue lift (90d)</span>
                <span className="font-bold text-gray-900">+{scenarioA?.revenueLiftPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin impact</span>
                <span className="font-bold text-red-600">{scenarioA?.marginImpactPts.toFixed(1)}pp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">12-mo CLV shift</span>
                <span className="font-bold text-gray-900">{scenarioA?.clvShiftPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Scenario B */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900">Scenario B</h3>
              <span className="text-xs font-bold text-white bg-amber-600 px-2 py-1 rounded">MED RISK</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
              35%
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue lift (90d)</span>
                <span className="font-bold text-gray-900">+{scenarioB?.revenueLiftPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin impact</span>
                <span className="font-bold text-red-600">{scenarioB?.marginImpactPts.toFixed(1)}pp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">12-mo CLV shift</span>
                <span className="font-bold text-gray-900">{scenarioB?.clvShiftPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Your Input */}
          <div className="bg-white border-2 border-blue-600 rounded-xl p-5 shadow-md relative scale-105">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900">Your Strategy</h3>
              <span className={`text-xs font-bold text-white px-2 py-1 rounded ${sliderValue <= 18 ? 'bg-green-600' : sliderValue <= 26 ? 'bg-blue-600' : 'bg-red-600'}`}>
                {sliderValue <= 18 ? 'LOW RISK' : sliderValue <= 26 ? 'MED RISK' : 'HIGH RISK'}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {sliderValue.toFixed(1)}%
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenue lift (90d)</span>
                <span className="font-bold text-gray-900">+{(((effectiveResult.outcome.revenue - bundle.baseline.revenue) / bundle.baseline.revenue) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin impact</span>
                <span className="font-bold text-red-600">
                  {marginImpactPct != null ? `${marginImpactPct.toFixed(1)}pp` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">12-mo CLV shift</span>
                <span className="font-bold text-gray-900">{((effectiveResult.outcome.repeat_purchase_rate - bundle.baseline.repeat_purchase_rate) * 100).toFixed(1)}%</span>
              </div>
            </div>
            {isShowingSavedOnly && (
              <p className="text-xs text-gray-400 mt-3 italic">From last saved simulation — move the slider to run a new one.</p>
            )}
          </div>
        </div>

        {/* BENTO GRID: Flow Graph + Guardrail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Flow Graph */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🔗 Causal Ripple Graph
            </h2>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-80 flex items-center justify-center">
              {flowGraph ? (
                <RippleFlowGraph nodes={flowGraph.nodes} edges={flowGraph.edges} selectedId={selectedId} onSelect={setSelectedId} />
              ) : (
                <p className="text-sm text-gray-500">Move the slider to run a live simulation and see the ripple graph.</p>
              )}
            </div>
            {/* Node Detail Panel — shown here, in the space below the graph */}
            {selectedNode ? (
              <FlowNodePanel node={selectedNode} eventLog={simResult?.eventLog} onClose={() => setSelectedId(null)} />
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">Click a node above to see the evidence behind it.</p>
            )}
          </div>

          {/* Guardrail Card */}
          <div className="lg:col-span-4 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                🛡️ Guardrail Recommendation
              </h2>
              {simResult?.guardrail ? (
                <div>
                  <p className="text-sm mb-3 leading-relaxed">
                    <strong>{simResult.guardrail.recommendation?.decision || 'Recommendation'}.</strong> {simResult.guardrail.primary_risk}
                  </p>
                  <p className="text-sm leading-relaxed">{simResult.guardrail.rationale}</p>
                </div>
              ) : isShowingSavedOnly && effectiveResult?.guardrailRecommendationValue != null ? (
                <p className="text-sm leading-relaxed">
                  Last saved run recommended a discount around {effectiveResult.guardrailRecommendationValue}%. Move the slider to get an updated recommendation.
                </p>
              ) : (
                <p className="text-sm">No simulation run yet. Run a simulation to get guardrail recommendations.</p>
              )}
            </div>

            {affectedPersonaNames.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-100">Affected Personas</p>
                <div className="flex flex-wrap gap-2">
                  {affectedPersonaNames.map((name) => (
                    <span key={name} className="text-xs font-medium bg-white/20 border border-white/30 px-2 py-1 rounded">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: Summary Table + Save CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Financial Summary */}
          <div className="lg:col-span-9 bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-x-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Financial Delta Summary</h3>
            <BaselineVsOutcome baseline={effectiveResult.baseline ?? bundle.baseline} outcome={effectiveResult.outcome} />
          </div>

          {/* Save CTA */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
              💾
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Ready to Commit?</h4>
            <p className="text-sm text-gray-600 mb-6">Save this simulation to governance audit trail and compare future iterations.</p>
            <button
              onClick={handleSaveSimulation}
              disabled={savingState === 'saving'}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                savingState === 'saving'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : savingState === 'saved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : savingState === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:shadow-lg'
              }`}
            >
              {savingState === 'saving' ? '⏳ Saving...' : savingState === 'saved' ? '✓ Saved!' : savingState === 'error' ? '✗ Error' : '💾 Save Simulation'}
            </button>
            {saveMessage && <p className={`text-xs mt-2 font-medium ${savingState === 'saved' ? 'text-green-600' : 'text-red-600'}`}>{saveMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
