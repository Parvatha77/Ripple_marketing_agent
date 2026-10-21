import { useEffect, useMemo } from 'react'
import { useSimulationStore } from './simulationStore'
import { useDiscountStore } from './discountStore'
import { runLiveSimulation, type LiveSimulationResult } from '@/lib/simulationEngine'

/**
 * Single source of truth for "what does the app look like right now given the
 * live discount inputs." Every screen that shows simulated data (graph node
 * sizes, timeline cards, summary metrics, the guardrail memo) reads from this
 * so moving a slider on one screen is instantly visible on all of them.
 */
export function useLiveSimulation(): LiveSimulationResult | null {
  const bundle = useSimulationStore((s) => s.bundle)
  const productDiscountPct = useDiscountStore((s) => s.productDiscountPct)
  const initialize = useDiscountStore((s) => s.initialize)

  useEffect(() => {
    if (bundle) {
      initialize(
        bundle.products.map((p) => p.sku_id),
        Number(bundle.scenario.new_value),
      )
    }
  }, [bundle, initialize])

  return useMemo(() => {
    if (!bundle || Object.keys(productDiscountPct).length === 0) return null
    return runLiveSimulation(
      bundle.scenario.scenario_id,
      bundle.personas,
      bundle.competitors,
      bundle.products,
      bundle.baseline,
      productDiscountPct,
      bundle.graph,
    )
  }, [bundle, productDiscountPct])
}
