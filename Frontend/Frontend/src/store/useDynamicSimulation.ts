import { useState, useEffect, useRef, useCallback } from 'react'
import { useDecisionContextStore } from './decisionContextStore'
import { useDiscountStore } from './discountStore'
import { useSimulationStore } from './simulationStore'

const API_BASE_URL = 'http://127.0.0.1:8000'

export interface DynamicSimulationResult {
  scenario: any
  outcome: any
  baseline: any
  event_log: any
  eventLog: any  // Transformed version for buildFlowGraph
  guardrail: any
  graph: any
  financial_analysis: any
  effectiveDiscountPct: number  // Added for buildFlowGraph
  confidence: number  // Guardrail's confidence score
  loading: boolean
  elapsedSeconds: number
  error: string | null
}

const EMPTY_DATA = {
  scenario: null,
  outcome: null,
  baseline: null,
  event_log: null,
  eventLog: null,
  guardrail: null,
  graph: null,
  financial_analysis: null,
  confidence: 0,
}

export function useDynamicSimulation(): DynamicSimulationResult | null {
  const productDiscountPct = useDiscountStore((s) => s.productDiscountPct)
  const storedResult = useSimulationStore((s) => s.dynamicSimResult)
  const setStoredResult = useSimulationStore((s) => s.setDynamicSimResult)

  // data holds the last successfully-fetched (or errored) payload — separate from loading/error
  // so the in-flight status is always fresh even while data is stale.
  const [data, setData] = useState<Omit<DynamicSimulationResult, 'loading' | 'elapsedSeconds' | 'error'> | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Track previous state to only fetch on actual changes (not on initial mount)
  const prevStateRef = useRef<{ discount: number } | null>(null)
  // Single-flight guard: only one /simulate pipeline run is ever in flight.
  // If the slider moves again while one is running, we don't fire a second
  // one (they'd race to overwrite the same output files on disk) — we just
  // remember the latest desired state and fire it once the current run ends.
  const inFlightRef = useRef(false)
  const pendingRef = useRef<{ discount: number } | null>(null)
  // Only gates setState-after-unmount. Must be set true in the effect body
  // (not just via useRef's initial value) — React StrictMode's dev-mode
  // mount→cleanup→remount cycle runs the cleanup once immediately, which
  // would otherwise leave this stuck false forever after the first mount,
  // silently discarding every future setData/setLoading call.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const discountPct = Object.values(productDiscountPct).reduce((a, b) => a + b, 0) / (Object.values(productDiscountPct).length || 1)

  const runFetch = useCallback(async (state: { discount: number }) => {
    inFlightRef.current = true
    setLoading(true)
    setError(null)
    setElapsedSeconds(0)
    const tickStart = Date.now()
    const tick = setInterval(() => {
      if (mountedRef.current) setElapsedSeconds(Math.floor((Date.now() - tickStart) / 1000))
    }, 1000)

    try {
      const response = await fetch(`${API_BASE_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_pct: state.discount,
          category: 'sitewide',
          initiated_by: 'user',
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const raw = await response.json()
      if (raw.error) {
        throw new Error(raw.error)
      }

      if (!mountedRef.current) return
      const result = {
        ...raw,
        eventLog: raw.event_log,
        effectiveDiscountPct: state.discount,
        confidence: raw.guardrail?.confidence ?? 0,
      }
      setData(result)
      // Save to global store so results persist across tab switches
      setStoredResult({ ...result, loading: false, elapsedSeconds: 0, error: null })
    } catch (err) {
      if (!mountedRef.current) return
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg)
      setData({ ...EMPTY_DATA, effectiveDiscountPct: state.discount })
    } finally {
      clearInterval(tick)
      inFlightRef.current = false
      if (mountedRef.current) {
        setLoading(false)
        // The slider moved again while this run was in flight — fire the
        // latest desired value now, immediately (no need to re-debounce).
        const next = pendingRef.current
        pendingRef.current = null
        if (next) runFetch(next)
      }
    }
  }, [])

  useEffect(() => {
    if (discountPct === undefined || discountPct === null) return
    // The per-SKU discount map hasn't been seeded yet (page just loaded) —
    // don't capture a baseline off of this transient empty state, or the
    // seeding step right after it will look like a user-driven change.
    if (Object.keys(productDiscountPct).length === 0) return

    const currentState = { discount: discountPct }

    // On first render with a seeded map, just initialize the ref — don't
    // fetch yet. This avoids firing the full LLM pipeline the moment the
    // slider is seeded with a default/last-saved value; only an actual
    // user-driven change should fetch.
    if (prevStateRef.current === null) {
      prevStateRef.current = currentState
      return
    }

    // Only fetch if discount has actually changed from previous value
    const changed = prevStateRef.current.discount !== discountPct

    if (!changed) return
    prevStateRef.current = currentState

    if (inFlightRef.current) {
      // A pipeline run is already going — don't start a second one.
      // Remember this as the value to run next once it finishes.
      pendingRef.current = currentState
      return
    }

    // Clear old stored result when discount changes to indicate a new run is needed
    setStoredResult(null)
    // Debounce the fetch — only fires once the slider settles, since each run is a full LLM pipeline
    const timer = setTimeout(() => runFetch(currentState), 500)
    return () => clearTimeout(timer)
  }, [discountPct, productDiscountPct, runFetch, setStoredResult])

  // If we have stored results, use them (persists across tab switches)
  // Only fetch fresh if discount changed or no results exist
  if (storedResult && !loading && !error) {
    return storedResult
  }

  if (!data && !loading && !error) return storedResult ?? null

  return {
    ...(data ?? { ...EMPTY_DATA, effectiveDiscountPct: discountPct }),
    loading,
    elapsedSeconds,
    error,
  }
}
