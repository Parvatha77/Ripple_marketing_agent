import type { Competitor } from '@/types'

export function CompetitorChip({ competitor }: { competitor: Competitor }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-hairline bg-paper-raised px-3 py-2.5 min-w-[13rem]">
      <span className="font-display text-sm text-ink">{competitor.name}</span>
      <span className="text-xs text-competitive font-medium">{competitor.archetype}</span>
    </div>
  )
}
