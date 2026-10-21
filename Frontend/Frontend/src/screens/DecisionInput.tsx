import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulationStore } from '@/store/simulationStore'
import { useDiscountStore } from '@/store/discountStore'

export function DecisionInput() {
  const bundle = useSimulationStore((s) => s.bundle)
  const setSiteWideDiscount = useDiscountStore((s) => s.setSiteWideDiscount)
  const initialize = useDiscountStore((s) => s.initialize)
  const navigate = useNavigate()
  const [selectedDiscount, setSelectedDiscount] = useState(30)

  if (!bundle) return <div className="text-ink-faint">Loading…</div>

  const handleRun = () => {
    initialize(bundle.products.map((p) => p.sku_id), selectedDiscount)
    setSiteWideDiscount(selectedDiscount)
    navigate('/simulator')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-deep via-primary-purple to-primary-blue flex items-center justify-center px-4">
      <div className="bg-paper-raised rounded-2xl shadow-panel max-w-xl w-full p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-primary-purple to-primary-blue bg-clip-text text-transparent mb-2">
            Strategy Decision
          </h1>
          <p className="text-ink-soft text-sm">
            Set your discount strategy to test how it cascades through customer behavior, financials, and competitive response.
          </p>
        </div>

        {/* Decision Summary */}
        <div className="bg-primary-purple-tint border border-primary-purple/20 rounded-lg p-5 mb-8">
          <p className="text-xs uppercase tracking-widest text-primary-purple font-semibold mb-2">Decision Type</p>
          <h2 className="font-medium text-lg text-ink mb-3">{bundle.scenario.decision_type}</h2>
          <p className="text-sm text-ink-soft leading-relaxed">{bundle.scenario.description}</p>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
            <div>
              <p className="text-ink-faint uppercase tracking-wide">Scope</p>
              <p className="font-semibold text-ink">{bundle.scenario.scope}</p>
            </div>
            <div>
              <p className="text-ink-faint uppercase tracking-wide">Effective Date</p>
              <p className="font-semibold text-ink">{bundle.scenario.effective_date}</p>
            </div>
            <div>
              <p className="text-ink-faint uppercase tracking-wide">Baseline</p>
              <p className="font-semibold text-ink">{bundle.baseline.avg_discount_depth_pct.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Discount Control */}
        <div className="mb-8">
          <label className="block mb-4">
            <span className="text-xs uppercase tracking-widest text-ink-faint font-semibold mb-3 block">
              Site-Wide Discount Rate
            </span>
            <div className="flex items-baseline gap-4">
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={selectedDiscount}
                onChange={(e) => setSelectedDiscount(Number(e.target.value))}
                className="flex-1 accent-primary-purple h-2 rounded-lg appearance-none bg-gradient-to-r from-primary-blue to-primary-purple"
              />
              <div className="font-display text-4xl font-bold bg-gradient-to-r from-primary-purple to-primary-blue bg-clip-text text-transparent w-16 text-right">
                {selectedDiscount}%
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-ink-faint mt-2 font-tabular">
              <span>0%</span>
              <span>Current</span>
              <span>50%</span>
            </div>
          </label>

          {/* Insight */}
          <div className="bg-behavioral-tint border-l-4 border-behavioral rounded-lg p-4 mt-6">
            <p className="text-xs text-ink-soft">
              {selectedDiscount < bundle.baseline.avg_discount_depth_pct
                ? `📈 Reducing discount from ${bundle.baseline.avg_discount_depth_pct.toFixed(1)}% may improve margin but risks loyalty erosion in high-LTV segments.`
                : selectedDiscount > bundle.baseline.avg_discount_depth_pct + 10
                  ? `📉 Deep discount above ${selectedDiscount}% could trigger competitor escalation and accelerate price-war risk.`
                  : `→ Within historical norms. Testing at ${selectedDiscount}% will show balanced trade-offs across all segments.`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 border-2 border-primary-purple text-primary-purple px-4 py-3 rounded-lg font-medium text-sm hover:bg-primary-purple hover:text-paper transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleRun}
            className="flex-1 bg-gradient-to-r from-primary-purple to-primary-blue text-paper px-4 py-3 rounded-lg font-medium text-sm hover:shadow-lg transition-shadow"
          >
            Simulate Strategy →
          </button>
        </div>
      </div>
    </div>
  )
}
