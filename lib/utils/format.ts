export function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}
