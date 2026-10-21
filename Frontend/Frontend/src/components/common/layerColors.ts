import type { CausalLayer } from '@/types'

export const LAYER_HEX: Record<CausalLayer, string> = {
  decision: '#1F2A44',
  behavioral: '#C87F1E',
  financial: '#0F7A6E',
  competitive: '#B4472C',
  brand: '#6A4C93',
  recommendation: '#1F2A44',
}

export const LAYER_TINT_CLASS: Record<CausalLayer, string> = {
  decision: 'bg-decision-tint text-decision',
  behavioral: 'bg-behavioral-tint text-behavioral',
  financial: 'bg-financial-tint text-financial',
  competitive: 'bg-competitive-tint text-competitive',
  brand: 'bg-brand-tint text-brand',
  recommendation: 'bg-decision-tint text-decision',
}
