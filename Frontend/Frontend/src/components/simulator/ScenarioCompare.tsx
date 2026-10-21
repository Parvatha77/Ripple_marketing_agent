import type { Baseline, Persona } from '@/types'
import { snapshotAtDiscount } from '@/lib/simulationEngine'
import { formatSignedPct, formatSignedPercent } from '@/lib/format'

const RISK_TONE: Record<string, string> = {
  'Low risk': 'text-positive bg-financial-tint',
  'Moderate risk': 'text-behavioral bg-behavioral-tint',
  'High risk': 'text-negative bg-competitive-tint',
}

export function ScenarioCompare({
  scenarioId,
  personas,
  baseline,
  effectiveDiscountPct,
}: {
  scenarioId: string
  personas: Persona[]
  baseline: Baseline
  effectiveDiscountPct: number
}) {
  const low = snapshotAtDiscount(scenarioId, personas, baseline, 15)
  const moderate = snapshotAtDiscount(scenarioId, personas, baseline, 22)
  const yours = snapshotAtDiscount(scenarioId, personas, baseline, effectiveDiscountPct)

  const rows: { label: string; snapshot: ReturnType<typeof snapshotAtDiscount>; isYours: boolean }[] = [
    { label: 'Scenario A', snapshot: low, isYours: false },
    { label: 'Scenario B', snapshot: moderate, isYours: false },
    { label: 'Your input', snapshot: yours, isYours: true },
  ]

  return (
    <div className="rounded-xl border border-hairline bg-paper-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-widest text-ink-faint">Three ways this could go</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`rounded-lg border p-4 flex flex-col gap-3 ${
              row.isYours ? 'border-decision bg-decision-tint/30' : 'border-hairline'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-ink-faint">
                {row.label}
                {row.isYours ? ' · your input' : ''}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISK_TONE[row.snapshot.riskLevel]}`}>
                {row.snapshot.riskLevel}
              </span>
            </div>
            <span className="font-tabular text-2xl font-semibold text-ink">{row.snapshot.discountPct.toFixed(0)}%</span>
            <dl className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Revenue lift, 90d</dt>
                <dd className="font-tabular text-positive">{formatSignedPct(row.snapshot.revenueLiftPct)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Margin impact</dt>
                <dd className="font-tabular text-negative">{formatSignedPercent(row.snapshot.marginImpactPts)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">12-mo CLV shift</dt>
                <dd className={`font-tabular ${row.snapshot.clvShiftPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatSignedPct(row.snapshot.clvShiftPct, 0)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
