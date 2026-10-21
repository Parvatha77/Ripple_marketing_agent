import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSimulationStore } from '@/store/simulationStore'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { GovernanceNewScreen } from '@/screens/GovernanceNew'
import { SimulatorConsolidatedScreen } from '@/screens/SimulatorConsolidated'
import { TimelineNewScreen } from '@/screens/TimelineNew'

export default function App() {
  const loadBundle = useSimulationStore((s) => s.loadBundle)
  const error = useSimulationStore((s) => s.error)
  const retry = useSimulationStore((s) => s.loadBundle)

  useEffect(() => {
    loadBundle()
  }, [loadBundle])

  return (
    <BrowserRouter>
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 ml-64">
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm flex items-center justify-between gap-4">
              <span>Failed to load data from the backend: {error}</span>
              <button
                onClick={() => {
                  useSimulationStore.setState({ bundle: null, error: null })
                  retry()
                }}
                className="shrink-0 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/governance" replace />} />
              <Route path="/governance" element={<GovernanceNewScreen />} />
              <Route path="/simulator" element={<SimulatorConsolidatedScreen />} />
              <Route path="/timeline" element={<TimelineNewScreen />} />
              <Route path="*" element={<Navigate to="/governance" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  )
}
