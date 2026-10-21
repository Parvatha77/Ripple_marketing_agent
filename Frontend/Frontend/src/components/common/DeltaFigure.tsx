import { formatSigned } from '@/lib/format'

/** Tabular-figure signed number with a directional glyph. No gauges, no gimmicks. */
export function DeltaFigure({
  value,
  digits = 2,
  suffix = '',
  label,
}: {
  value: number
  digits?: number
  suffix?: string
  label?: string
}) {
  const positive = value > 0
  const negative = value < 0
  return (
    <span className="inline-flex items-baseline gap-1">
      {label && <span className="text-xs text-ink-faint">{label}</span>}
      <span
        className={`font-tabular text-sm font-medium ${
          positive ? 'text-positive' : negative ? 'text-negative' : 'text-ink-faint'
        }`}
      >
        {formatSigned(value, digits)}
        {suffix}
      </span>
    </span>
  )
}
