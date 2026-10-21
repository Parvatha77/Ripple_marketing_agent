import { create } from 'zustand'

interface DiscountStore {
  /** sku_id -> live discount percent. Populated once products load. */
  productDiscountPct: Record<string, number>
  /** which product the single slider currently targets; 'all' = site-wide bulk apply */
  selectedProductId: string | 'all'

  initialize: (skuIds: string[], defaultPct: number) => void
  setSelectedProduct: (id: string | 'all') => void
  setSiteWideDiscount: (pct: number) => void
  setProductDiscount: (skuId: string, pct: number) => void
}

export const useDiscountStore = create<DiscountStore>((set, get) => ({
  productDiscountPct: {},
  selectedProductId: 'all',

  initialize: (skuIds, defaultPct) => {
    if (Object.keys(get().productDiscountPct).length > 0) return
    const initial: Record<string, number> = {}
    for (const id of skuIds) initial[id] = defaultPct
    set({ productDiscountPct: initial })
  },

  setSelectedProduct: (id) => set({ selectedProductId: id }),

  setSiteWideDiscount: (pct) => {
    const current = get().productDiscountPct
    const next: Record<string, number> = {}
    for (const id of Object.keys(current)) next[id] = pct
    set({ productDiscountPct: next })
  },

  setProductDiscount: (skuId, pct) => {
    set({ productDiscountPct: { ...get().productDiscountPct, [skuId]: pct } })
  },
}))
