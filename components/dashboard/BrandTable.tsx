'use client'

import { formatKRW, formatNumber, formatPercent } from '@/lib/utils/format'
import type { BrandSummary } from '@/lib/utils/parse-excel'

interface Props {
  data: BrandSummary[]
}

export default function BrandTable({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">브랜드별 매출 현황 (Top {data.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-4 py-2.5 text-left font-medium">순위</th>
              <th className="px-4 py-2.5 text-left font-medium">브랜드</th>
              <th className="px-4 py-2.5 text-right font-medium">실 매출액</th>
              <th className="px-4 py-2.5 text-right font-medium">총 매출액</th>
              <th className="px-4 py-2.5 text-right font-medium">매출 총 이익</th>
              <th className="px-4 py-2.5 text-right font-medium">이익률</th>
              <th className="px-4 py-2.5 text-right font-medium">판매수량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, i) => {
              const margin = row.actualSales > 0 ? (row.grossProfit / row.actualSales) * 100 : 0
              return (
                <tr key={row.brand} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${i < 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.brand}</td>
                  <td className="px-4 py-2.5 text-right">{formatKRW(row.actualSales)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{formatKRW(row.totalSales)}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${row.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatKRW(row.grossProfit)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatPercent(margin)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{formatNumber(row.quantity)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
