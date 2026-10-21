import type { Product, Scenario } from '@/types'
import { useDiscountStore } from '@/store/discountStore'

export function DiscountControls({ scenario, products }: { scenario: Scenario; products: Product[] }) {
  const productDiscountPct = useDiscountStore((s) => s.productDiscountPct)
  const selectedProductId = useDiscountStore((s) => s.selectedProductId)
  const setSelectedProduct = useDiscountStore((s) => s.setSelectedProduct)
  const setSiteWideDiscount = useDiscountStore((s) => s.setSiteWideDiscount)
  const setProductDiscount = useDiscountStore((s) => s.setProductDiscount)

  const isAll = selectedProductId === 'all'
  const sliderValue = isAll
    ? Object.values(productDiscountPct).reduce((a, b) => a + b, 0) / (Object.values(productDiscountPct).length || 1)
    : (productDiscountPct[selectedProductId] ?? 0)

  const handleSlider = (pct: number) => {
    if (isAll) setSiteWideDiscount(pct)
    else setProductDiscount(selectedProductId, pct)
  }

  return (
    <div className="bg-gradient-to-r from-primary-purple/10 via-primary-blue/10 to-paper-raised border border-primary-purple/20 rounded-xl p-5 space-y-4">
      {/* Scenario header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-primary-purple font-bold mb-1">Decision Scenario</p>
        <h2 className="font-display text-base font-semibold text-ink">{scenario.description}</h2>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-ink-soft"><span className="text-ink-faint">Scope:</span> {scenario.scope}</span>
          <span className="text-ink-soft"><span className="text-ink-faint">Effective:</span> {scenario.effective_date}</span>
        </div>
      </div>

      {/* Main discount slider */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-primary-blue font-bold mb-3">Site-Wide Discount</p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={sliderValue}
            onChange={(e) => handleSlider(Number(e.target.value))}
            className="flex-1 accent-primary-purple h-2 rounded-lg appearance-none bg-gradient-to-r from-primary-blue to-primary-purple"
            aria-label="Site-wide discount percent"
          />
          <span className="font-display text-3xl font-bold bg-gradient-to-r from-primary-purple to-primary-blue bg-clip-text text-transparent w-16 text-right">
            {sliderValue.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Product quick toggles */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-ink-faint font-bold mb-2">Quick Product Select</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedProduct('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isAll
                ? 'bg-gradient-to-r from-primary-purple to-primary-blue text-paper shadow-lg'
                : 'border border-primary-purple/30 text-ink-soft hover:bg-primary-purple/10'
            }`}
          >
            All Products
          </button>
          {products.slice(0, 5).map((p) => {
            const active = selectedProductId === p.sku_id
            return (
              <button
                key={p.sku_id}
                onClick={() => setSelectedProduct(p.sku_id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-primary-blue text-paper shadow-lg'
                    : 'border border-primary-blue/30 text-ink-soft hover:bg-primary-blue/10'
                }`}
              >
                {p.name.split(' ').slice(0, 2).join(' ')}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
