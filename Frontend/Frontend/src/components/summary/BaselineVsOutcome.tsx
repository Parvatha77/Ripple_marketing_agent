import type { Baseline } from '@/types'
import { formatCurrency, formatPercent, formatSignedCurrency, formatSignedPercent } from '@/lib/format'

interface Row {
  label: string
  before: string
  after: string
  delta: string
  positive: boolean | null
}

function buildRows(baseline: Baseline, outcome: Baseline): Row[] {
  return [
    {
      label: 'Revenue',
      before: formatCurrency(baseline.revenue),
      after: formatCurrency(outcome.revenue),
      delta: formatSignedCurrency(outcome.revenue - baseline.revenue),
      positive: outcome.revenue >= baseline.revenue,
    },
    {
      label: 'Full-price purchases',
      before: formatPercent(baseline.full_price_purchase_pct),
      after: formatPercent(outcome.full_price_purchase_pct),
      delta: formatSignedPercent(outcome.full_price_purchase_pct - baseline.full_price_purchase_pct),
      positive: outcome.full_price_purchase_pct >= baseline.full_price_purchase_pct,
    },
    {
      label: 'Avg order value',
      before: formatCurrency(baseline.avg_order_value),
      after: formatCurrency(outcome.avg_order_value),
      delta: formatSignedCurrency(outcome.avg_order_value - baseline.avg_order_value),
      positive: outcome.avg_order_value >= baseline.avg_order_value,
    },
    {
      label: 'Repeat purchase rate',
      before: formatPercent(baseline.repeat_purchase_rate),
      after: formatPercent(outcome.repeat_purchase_rate),
      delta: formatSignedPercent(outcome.repeat_purchase_rate - baseline.repeat_purchase_rate),
      positive: outcome.repeat_purchase_rate >= baseline.repeat_purchase_rate,
    },
    {
      label: 'Avg discount depth',
      before: formatPercent(baseline.avg_discount_depth_pct),
      after: formatPercent(outcome.avg_discount_depth_pct),
      delta: formatSignedPercent(outcome.avg_discount_depth_pct - baseline.avg_discount_depth_pct),
      positive: outcome.avg_discount_depth_pct <= baseline.avg_discount_depth_pct,
    },
  ]
}

export function BaselineVsOutcome({ baseline, outcome }: { baseline: Baseline; outcome: Baseline }) {
  const rows = buildRows(baseline, outcome)

  return (
    <div className="rounded-lg border border-hairline bg-paper-raised overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-paper-sunken">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-widest text-ink-faint">Metric</th>
              <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-widest text-ink-faint">
                Baseline
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-widest text-ink-faint">
                Simulated end-state
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-widest text-ink-faint">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5 text-ink">{row.label}</td>
                <td className="px-4 py-2.5 text-right font-tabular text-ink-soft">{row.before}</td>
                <td className="px-4 py-2.5 text-right font-tabular text-ink font-medium">{row.after}</td>
                <td
                  className={`px-4 py-2.5 text-right font-tabular font-medium ${
                    row.positive ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
