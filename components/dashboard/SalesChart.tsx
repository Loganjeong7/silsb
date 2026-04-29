'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import type { DailySummary } from '@/lib/utils/parse-excel'

interface Props {
  data: DailySummary[]
}

function formatAxis(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}백만`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}천`
  return String(value)
}

function formatTooltip(value: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value)
}

export default function SalesChart({ data }: Props) {
  const chartData = data.map(d => ({
    ...d,
    date: d.date.slice(5),
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 실 매출액</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v) => typeof v === 'number' ? formatTooltip(v) : String(v)} labelFormatter={l => `날짜: ${l}`} />
            <Bar dataKey="actualSales" name="실 매출액" fill="#3B82F6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">일별 이익 / 이익률 추이</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tickFormatter={formatAxis} tick={{ fontSize: 11 }} width={60} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(v, name) => typeof v === 'number' ? (name === '이익률(%)' ? `${v.toFixed(1)}%` : formatTooltip(v)) : String(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="grossProfit" name="매출 총 이익" stroke="#10B981" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="grossMargin" name="이익률(%)" stroke="#6366F1" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
