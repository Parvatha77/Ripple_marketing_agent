import { useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8000'

export type SimulationStatus = 'pending_review' | 'under_review' | 'approved' | 'rejected'

export interface KanbanSimulation {
  id: string
  created_at: string
  discount_pct: number
  category: string
  initiated_by: string
  revenue_change_pct: number
  margin_impact_pct: number
  status?: SimulationStatus
}

const COLUMNS: { status: SimulationStatus; label: string; accent: string; dot: string }[] = [
  { status: 'pending_review', label: 'Pending Review', accent: 'border-t-gray-400', dot: 'bg-gray-400' },
  { status: 'under_review', label: 'Under Review', accent: 'border-t-amber-500', dot: 'bg-amber-500' },
  { status: 'approved', label: 'Approved', accent: 'border-t-emerald-500', dot: 'bg-emerald-500' },
  { status: 'rejected', label: 'Rejected', accent: 'border-t-red-500', dot: 'bg-red-500' },
]

export function DecisionKanban({
  simulations,
  onStatusChange,
}: {
  simulations: KanbanSimulation[]
  onStatusChange: (id: string, status: SimulationStatus) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<SimulationStatus | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const moveTo = async (id: string, status: SimulationStatus) => {
    setPendingId(id)
    onStatusChange(id, status)
    try {
      await fetch(`${API_BASE_URL}/simulations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch {
      // Best-effort — the optimistic move already applied; a page refresh will
      // resync from the server if the PATCH failed.
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = simulations.filter((s) => (s.status ?? 'pending_review') === col.status)
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverCol(col.status)
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col.status ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              setDragOverCol(null)
              if (dragId) moveTo(dragId, col.status)
              setDragId(null)
            }}
            className={`bg-gray-50 border border-gray-200 border-t-4 ${col.accent} rounded-lg p-3 min-h-[220px] transition-colors ${
              dragOverCol === col.status ? 'bg-blue-50 ring-2 ring-blue-300' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{col.label}</h4>
              <span className="ml-auto text-xs font-semibold text-gray-400">{items.length}</span>
            </div>

            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-xs text-gray-400 italic px-1 py-4 text-center">Drop a card here</p>
              )}
              {items.map((sim) => (
                <div
                  key={sim.id}
                  draggable
                  onDragStart={() => setDragId(sim.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`bg-white border border-gray-200 rounded-md p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                    dragId === sim.id ? 'opacity-40' : ''
                  } ${pendingId === sim.id ? 'animate-pulse' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm text-gray-900">{sim.discount_pct}%</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                      {sim.category === 'all' ? 'Site-Wide' : sim.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{sim.initiated_by}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className={sim.margin_impact_pct < 0 ? 'text-red-600' : 'text-green-600'}>
                      {sim.margin_impact_pct.toFixed(1)}pp
                    </span>
                    <span className="text-gray-400">{new Date(sim.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
