'use client'

import { formatKRW, formatNumber, formatPercent } from '@/lib/utils/format'

interface Props {
  totalSales: number
  actualSales: number
  grossProfit: number
  grossMargin: number
  quantity: number
  storeName: string
  dateRange: string
}

export default function SummaryCards({ totalSales, actualSales, grossProfit, grossMargin, quantity, storeName, dateRange }: Props) {
  const cards = [
    { label: '총 매출액', value: formatKRW(totalSales), sub: '정가 기준', color: 'bg-blue-600' },
    { label: '실 매출액', value: formatKRW(actualSales), sub: '실제 수취액', color: 'bg-blue-500' },
    { label: '매출 총 이익', value: formatKRW(grossProfit), sub: '실매출 - 원가', color: grossProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
    { label: '총 이익률', value: formatPercent(grossMargin), sub: '이익/실매출', color: grossMargin >= 0 ? 'bg-emerald-600' : 'bg-red-600' },
    { label: '판매수량', value: formatNumber(quantity) + '개', sub: '총 판매 건', color: 'bg-indigo-500' },
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{storeName}</h2>
          <p className="text-sm text-gray-500">{dateRange}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className={`inline-block w-2 h-2 rounded-full ${c.color} mb-2`} />
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-base font-bold text-gray-900 leading-tight">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
