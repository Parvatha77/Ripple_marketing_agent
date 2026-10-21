import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulationStore } from '@/store/simulationStore'

function KPICard({ label, value, unit, trend }: { label: string; value: string | number; unit?: string; trend?: number }) {
  const trendColor = trend === undefined ? '' : trend > 0 ? 'text-positive' : 'text-negative'
  const trendArrow = trend === undefined ? '' : trend > 0 ? '↑' : '↓'

  return (
    <div className="bg-gradient-to-br from-primary-blue-tint to-primary-purple-tint border-l-4 border-primary-purple rounded-lg p-4 flex flex-col justify-between">
      <p className="text-xs uppercase tracking-widest text-ink-faint font-medium">{label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="font-tabular text-3xl font-bold text-primary-deep">{value}</span>
        {unit && <span className="text-xs text-ink-soft">{unit}</span>}
      </div>
      {trend !== undefined && (
        <p className={`text-xs font-medium mt-2 ${trendColor}`}>
          {trendArrow} {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
  )
}

function RiskCard({ title, level, description }: { title: string; level: 'low' | 'medium' | 'high'; description: string }) {
  const colors = {
    low: { bg: 'bg-financial-tint', text: 'text-financial', label: 'Low Risk' },
    medium: { bg: 'bg-behavioral-tint', text: 'text-behavioral', label: 'Medium Risk' },
    high: { bg: 'bg-competitive-tint', text: 'text-competitive', label: 'High Risk' },
  }

  const color = colors[level]

  return (
    <div className={`${color.bg} border border-hairline rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-ink">{title}</h4>
        <span className={`text-xs font-bold uppercase tracking-wide ${color.text}`}>{color.label}</span>
      </div>
      <p className="text-xs text-ink-soft leading-relaxed">{description}</p>
    </div>
  )
}

export function GovernanceDashboard() {
  const bundle = useSimulationStore((s) => s.bundle)
  const navigate = useNavigate()

  useEffect(() => {
    if (!bundle) return
  }, [bundle])

  if (!bundle) {
    return <div className="text-ink-faint text-sm">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-paper via-paper-raised to-primary-blue-tint/5">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-deep to-primary-purple text-paper px-8 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-3xl font-bold mb-1">Ripple Intelligence</h1>
          <p className="text-paper/80 text-sm">Decision Governance & Impact Simulation Platform</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Grid */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-ink mb-4">Current Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Avg Order Value" value="$127.50" unit="USD" trend={3.2} />
            <KPICard label="Repeat Purchase Rate" value="42.3" unit="%" trend={-1.8} />
            <KPICard label="Margin Depth" value="10.0" unit="%" trend={0} />
            <KPICard label="Brand Perception" value="7.4" unit="/10" trend={1.1} />
          </div>
        </section>

        {/* Risk Overview */}
        <section className="mb-10">
          <h2 className="font-display text-xl font-bold text-ink mb-4">Governance & Risk</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RiskCard
              title="Margin Compression Risk"
              level="medium"
              description="Current pricing strategy is within guardrails, but aggressive discounting could erode margins by 5–8pp over 90 days."
            />
            <RiskCard
              title="Customer Price Sensitivity"
              level="low"
              description="Brand-loyal segments remain resilient. Discount-seekers are concentrated in new-customer acquisition."
            />
            <RiskCard
              title="Competitive Pressure"
              level="high"
              description="Two major competitors actively matching deep discounts. Risk of price-war escalation in Q3."
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-gradient-to-r from-primary-purple/10 to-primary-blue/10 border border-primary-purple/20 rounded-xl p-8">
          <h2 className="font-display text-xl font-bold text-ink mb-4">Next Steps</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-2xl">
            Use the simulator below to test discount strategies against synthetic customer personas and competitors. See how pricing cascades through behavior, financials, brand, and competitive response.
          </p>
          <button
            onClick={() => navigate('/decision')}
            className="bg-gradient-to-r from-primary-purple to-primary-blue text-paper px-6 py-3 rounded-lg font-medium text-sm hover:shadow-lg transition-shadow"
          >
            Run Strategy Simulation →
          </button>
        </section>

        {/* Historical Data Snapshot */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-paper-raised rounded-lg p-5 border border-hairline">
            <h3 className="font-medium text-sm text-ink mb-3">Baseline (Last 30 Days)</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Revenue</dt>
                <dd className="font-tabular font-semibold text-ink">${(bundle.baseline.revenue / 1000).toFixed(0)}k</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Avg Discount Depth</dt>
                <dd className="font-tabular font-semibold text-ink">{bundle.baseline.avg_discount_depth_pct.toFixed(1)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Full-Price Purchase %</dt>
                <dd className="font-tabular font-semibold text-ink">{bundle.baseline.full_price_purchase_pct.toFixed(1)}%</dd>
              </div>
            </dl>
          </div>

          <div className="bg-paper-raised rounded-lg p-5 border border-hairline">
            <h3 className="font-medium text-sm text-ink mb-3">Scenario Summary</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              <strong>{bundle.scenario.decision_type}</strong><br/>
              {bundle.scenario.description}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
