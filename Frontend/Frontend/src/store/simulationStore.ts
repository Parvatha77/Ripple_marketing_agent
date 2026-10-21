import { create } from 'zustand'
import { api } from '@/api/client'
import type { SimulationBundle } from '@/types'

interface DynamicSimulationResult {
  scenario: any
  outcome: any
  baseline: any
  event_log: any
  eventLog: any
  guardrail: any
  graph: any
  financial_analysis: any
  effectiveDiscountPct: number
  confidence: number
  loading: boolean
  elapsedSeconds: number
  error: string | null
}

interface SimulationStore {
  bundle: SimulationBundle | null
  loading: boolean
  error: string | null

  // Persistent LLM simulation results
  dynamicSimResult: DynamicSimulationResult | null
  setDynamicSimResult: (result: DynamicSimulationResult | null) => void

  loadBundle: () => Promise<void>
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  bundle: null,
  loading: false,
  error: null,
  dynamicSimResult: null,

  setDynamicSimResult: (result) => set({ dynamicSimResult: result }),

  loadBundle: async () => {
    if (get().bundle || get().loading) return
    set({ loading: true, error: null })
    try {
      const bundle = await api.getBundle()
      set({ bundle, loading: false })
    } catch (err) {
      console.error('Failed to load simulation bundle:', err)
      set({ loading: false, error: err instanceof Error ? err.message : String(err) })
    }
  },
}))
