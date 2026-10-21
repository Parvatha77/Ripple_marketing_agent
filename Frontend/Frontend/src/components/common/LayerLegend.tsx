import { LAYER_ORDER, LAYER_LABELS } from '@/types'
import { LAYER_HEX } from './layerColors'

export function LayerLegend({ className = '' }: { className?: string }) {
  return (
    <ul
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}
      aria-label="Causal layer legend"
    >
      {LAYER_ORDER.map((layer) => (
        <li key={layer} className="flex items-center gap-2 text-xs text-ink-soft">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: LAYER_HEX[layer] }}
            aria-hidden
          />
          {LAYER_LABELS[layer]}
        </li>
      ))}
    </ul>
  )
}
