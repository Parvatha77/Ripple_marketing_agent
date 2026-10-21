import type { Competitor, Persona } from '@/types'

const HORIZONS = ['Day 1', 'Month 1', 'Quarter 1', 'Year 1']
const TIME_GROWTH = [0.28, 0.52, 0.78, 1.0]

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function severityColor(v: number): string {
  if (v < 20) return '#7FD9C4'
  if (v < 40) return '#B7D98A'
  if (v < 55) return '#E8C468'
  if (v < 70) return '#EFA15B'
  return '#E0714F'
}

export function RiskHeatmap({
  effectiveDiscountPct,
  personas,
  competitors,
}: {
  effectiveDiscountPct: number
  personas: Persona[]
  competitors: Competitor[]
}) {
  const depthFactor = clamp(effectiveDiscountPct / 30, 0.15, 1.9)
  const avgSensitivity = personas.reduce((s, p) => s + p.discount_sensitivity, 0) / personas.length
  const avgLoyalty = personas.reduce((s, p) => s + p.brand_loyalty, 0) / personas.length
  const avgMatchTendency = competitors.reduce((s, c) => s + c.price_match_tendency, 0) / competitors.length

  const rows: { label: string; base: number; multiplier: number }[] = [
    { label: 'Margin erosion', base: 78, multiplier: depthFactor },
    { label: 'Full-price cannibalization', base: 70, multiplier: depthFactor * (0.6 + avgSensitivity) },
    { label: 'Customer price sensitivity', base: 60, multiplier: depthFactor * (0.5 + avgSensitivity * 0.8) },
    { label: 'Competitor price response', base: 68, multiplier: depthFactor * (0.4 + avgMatchTendency) },
    { label: 'Brand perception', base: 55, multiplier: depthFactor * (0.4 + avgLoyalty) },
  ]

  return (
    <div className="rounded-xl border border-hairline bg-paper-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-widest text-ink-faint">Severity by time horizon</p>
        <p className="text-[11px] text-ink-faint">Recolors live as discount changes</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left font-normal text-ink-faint pb-2 pr-4 w-40"> </th>
              {HORIZONS.map((h) => (
                <th key={h} className="text-center font-normal text-[10px] uppercase tracking-wide text-ink-faint pb-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="pr-4 py-1 text-ink-soft whitespace-nowrap">{row.label}</td>
                {TIME_GROWTH.map((growth, i) => {
                  const severity = Math.round(clamp(row.base * row.multiplier * growth, 3, 96))
                  return (
                    <td key={i} className="py-1 px-1">
                      <div
                        className="rounded-md py-2 text-center font-tabular font-medium text-ink"
                        style={{ backgroundColor: severityColor(severity) }}
                      >
                        {severity}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
