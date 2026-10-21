export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function formatSigned(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${Math.abs(value).toFixed(digits)}`
}

export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatCurrency(Math.abs(value))}`
}

export function formatSignedPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${Math.abs(value).toFixed(digits)}pp`
}

/** Signed percentage where the value is itself already a % change, not percentage-points. */
export function formatSignedPct(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}
