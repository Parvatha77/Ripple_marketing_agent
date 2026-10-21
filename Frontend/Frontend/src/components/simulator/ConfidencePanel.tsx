import type { LiveSimulationResult } from '@/lib/simulationEngine'

function ConfidenceBar({ label, value, tone }: { label: string; value: number; tone: 'positive' | 'warning' }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="font-tabular font-medium text-ink">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-paper-sunken overflow-hidden">
        <div
          className={`h-full rounded-full ${tone === 'positive' ? 'bg-financial' : 'bg-behavioral'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ConfidencePanel({ confidence }: { confidence: LiveSimulationResult['confidence'] }) {
  return (
    <div className="rounded-xl border border-hairline bg-paper-raised p-5 flex flex-col gap-4">
      <p className="text-[11px] uppercase tracking-widest text-ink-faint">Should you trust this?</p>
      <div className="flex flex-col gap-3">
        <ConfidenceBar label="Data quality" value={confidence.dataQuality} tone="positive" />
        <ConfidenceBar label="Historical support" value={confidence.historicalSupport} tone="positive" />
        <ConfidenceBar label="Model uncertainty" value={confidence.modelUncertainty} tone="warning" />
      </div>
      {confidence.elevatedRisk && (
        <div className="rounded-lg border border-competitive/30 bg-competitive-tint/50 p-3">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-competitive mb-1">
            Elevated risk detected
          </p>
          <p className="text-xs text-ink-soft leading-relaxed">
            This depth falls outside the historically-observed range — confidence drops the further out you go.
          </p>
        </div>
      )}
    </div>
  )
}
