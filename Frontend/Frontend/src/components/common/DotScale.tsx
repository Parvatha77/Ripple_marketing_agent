/** A 5-dot at-a-glance scale for a 0-1 value. Not a chart — a glance indicator. */
export function DotScale({ value, label, color = 'var(--color-accent)' }: { value: number; label: string; color?: string }) {
  const filled = Math.round(value * 5)
  return (
    <span className="inline-flex items-center gap-1.5" title={`${label}: ${(value * 100).toFixed(0)}%`}>
      <span className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="inline-flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: i < filled ? color : 'var(--color-hairline-strong)' }}
          />
        ))}
      </span>
    </span>
  )
}
