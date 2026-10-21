import { useSimulationStore } from '@/store/simulationStore'
import { useLiveSimulation } from '@/store/useLiveSimulation'
import { useDecisionContextStore } from '@/store/decisionContextStore'
import { TIME_OFFSETS, TIME_LABELS } from '@/types'
import { personaEventAt, competitorEventAt } from '@/lib/eventLog'

export function TimelineNewScreen() {
  const bundle = useSimulationStore((s) => s.bundle)
  const live = useLiveSimulation()
  const context = useDecisionContextStore((s) => s.context)

  if (!bundle || !live) return <div className="text-gray-500 p-8">Loading…</div>

  const { personas, competitors } = bundle
  const eventLog = live.eventLog

  return (
    <div className="min-h-screen bg-white pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Reaction Timeline</h1>
          <p className="text-gray-600 mb-4">
            Projected market response across discount rollout phases at {live.effectiveDiscountPct.toFixed(1)}% discount
          </p>

          {/* Decision Context Display */}
          {context.user_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Initiated By</p>
                  <p className="text-gray-900 font-medium">{context.user_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Category</p>
                  <p className="text-gray-900 font-medium">{context.category === 'all' ? 'Site-Wide' : context.category}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Products</p>
                  <p className="text-gray-900 font-medium">
                    {context.product_ids.length === 0 ? 'All Products' : `${context.product_ids.length} SKUs`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Grid: 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TIME_OFFSETS.map((step, i) => {
            const getIntentColor = (delta: number) => {
              if (delta > 5) return 'text-green-600'
              if (delta < -5) return 'text-red-600'
              return 'text-gray-600'
            }

            const getRiskBadge = (delta: number) => {
              if (delta < -10) return { bg: 'bg-red-100', text: 'text-red-700', label: 'ATTRITION' }
              if (delta > 10) return { bg: 'bg-green-100', text: 'text-green-700', label: 'GROWTH' }
              return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'STABLE' }
            }

            return (
              <div key={step} className="flex flex-col gap-4">
                {/* Timeline Header */}
                <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {i + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{TIME_LABELS[step]}</h2>
                    <p className="text-xs text-gray-600">
                      {step === 'day_0' ? 'Immediate' : step === 'day_30' ? 'Short-term' : 'Equilibrium'}
                    </p>
                  </div>
                </div>

                {/* Persona Cards (show all personas) */}
                <div className="space-y-3">
                  {personas.map((p) => {
                    const event = personaEventAt(eventLog, p.persona_id, step)
                    const risk = getRiskBadge(event?.purchase_intent_delta || 0)

                    return (
                      <div key={p.persona_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-xs font-bold text-gray-600 uppercase">{p.segment_name}</p>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${risk.bg} ${risk.text}`}>{risk.label}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Intent</p>
                            <p className={`text-lg font-bold font-mono ${getIntentColor(event?.purchase_intent_delta || 0)}`}>
                              {event?.purchase_intent_delta ? (event.purchase_intent_delta > 0 ? '+' : '') + event.purchase_intent_delta.toFixed(1) + '%' : '0%'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Loyalty</p>
                            <p className={`text-lg font-bold font-mono ${getIntentColor(event?.loyalty_delta || 0)}`}>
                              {event?.loyalty_delta ? (event.loyalty_delta > 0 ? '+' : '') + event.loyalty_delta.toFixed(1) + '%' : '0%'}
                            </p>
                          </div>
                        </div>

                        {event?.quote && (
                          <div className="bg-gray-50 p-3 rounded border-l-2 border-orange-400 text-sm italic text-gray-700">
                            "{event.quote}"
                          </div>
                        )}

                        {/* Progress bar for loyalty */}
                        {event?.loyalty_delta && (
                          <div className="mt-3 w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${event.loyalty_delta > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(Math.abs(event.loyalty_delta) * 5, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Competitor Response (Day 30 & Day 90) */}
                {step !== 'day_0' && (
                  <div className="mt-6 pt-4 border-t-2 border-dashed border-orange-200">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1">
                      📡 Competitor Response
                    </p>
                    <div className="space-y-2">
                      {competitors.map((comp) => {
                        const compEvent = competitorEventAt(eventLog, comp.competitor_id, step)
                        const actionColors = {
                          match: 'bg-blue-100 text-blue-700 border-blue-200',
                          hold: 'bg-green-100 text-green-700 border-green-200',
                          escalate: 'bg-red-100 text-red-700 border-red-200',
                        }

                        return (
                          <div key={comp.competitor_id} className={`p-3 rounded border ${actionColors[compEvent?.action as keyof typeof actionColors] || actionColors.hold}`}>
                            <div className="flex justify-between items-center mb-2">
                              <p className="font-bold text-sm">{comp.name}</p>
                              <span className="text-xs font-bold uppercase px-2 py-0.5 bg-white/50 rounded">{compEvent?.action.toUpperCase()}</span>
                            </div>
                            {compEvent?.rationale && <p className="text-xs leading-relaxed">{compEvent.rationale}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
