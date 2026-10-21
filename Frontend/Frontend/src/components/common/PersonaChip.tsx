import type { Persona } from '@/types'
import { DotScale } from './DotScale'

export function PersonaChip({ persona }: { persona: Persona }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-paper-raised px-3 py-2.5 min-w-[13rem]">
      <span className="font-display text-sm text-ink">{persona.segment_name}</span>
      <div className="flex flex-col gap-1">
        <DotScale value={persona.discount_sensitivity} label="Discount sens." color="var(--color-behavioral)" />
        <DotScale value={persona.brand_loyalty} label="Loyalty" color="var(--color-brand)" />
      </div>
    </div>
  )
}
