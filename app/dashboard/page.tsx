'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import SummaryCards from '@/components/dashboard/SummaryCards'
import SalesChart from '@/components/dashboard/SalesChart'
import BrandTable from '@/components/dashboard/BrandTable'
import ShareBar from '@/components/dashboard/ShareBar'
import { aggregateByDate, aggregateByBrand, type SalesRow, type DailySummary, type BrandSummary } from '@/lib/utils/parse-excel'

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from: toISO(from), to: toISO(to) }
}

export default function DashboardPage() {
  const defaultRange = getDefaultRange()
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [rows, setRows] = useState<SalesRow[]>([])
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [toast, setToast] = useState('')
  const captureRef = useRef<HTMLDivElement>(null)

  const daily: DailySummary[] = aggregateByDate(rows)
  const brands: BrandSummary[] = aggregateByBrand(rows)

  const totalSales = rows.reduce((s, r) => s + r.totalSales, 0)
  const actualSales = rows.reduce((s, r) => s + r.actualSales, 0)
  const grossProfit = rows.reduce((s, r) => s + r.grossProfit, 0)
  const grossMargin = actualSales > 0 ? (grossProfit / actualSales) * 100 : 0
  const quantity = rows.reduce((s, r) => s + r.quantity, 0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales?from=${from}&to=${to}&store=강서점`)
      const json = await res.json()
      if (json.data) {
        const mapped: SalesRow[] = json.data.map((d: Record<string, unknown>) => ({
          store: d.store_name, purchaseGroup: d.purchase_group, seasonYear: d.season_year,
          season: d.season, seasonMonth: d.season_month, brand: d.brand,
          mch2Code: d.mch2_code, mch2: d.mch2, mcCode: d.mc_code, mc: d.mc,
          styleCode: d.style_code, currentPrice: Number(d.current_price),
          productCode: d.product_code, date: String(d.date),
          totalSales: Number(d.total_sales), actualSales: Number(d.actual_sales),
          totalCogs: Number(d.total_cogs), grossProfit: Number(d.gross_profit),
          grossMargin: Number(d.gross_margin), quantity: Number(d.quantity),
          salesAtOriginalPrice: Number(d.sales_at_original_price),
          estimatedCogs: Number(d.estimated_cogs), valuationAdj: Number(d.valuation_adj),
        }))
        setRows(mapped)
      }
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleEmail() {
    setEmailLoading(true)
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: '강서점', dateRange: `${from} ~ ${to}`,
          totalSales, actualSales, grossProfit, grossMargin, quantity,
          brandSummary: brands,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setToast('이메일이 발송되었습니다.')
      } else {
        setToast(`오류: ${json.error}`)
      }
    } finally {
      setEmailLoading(false)
      setTimeout(() => setToast(''), 4000)
    }
  }

  const dateRange = `${from} ~ ${to}`

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <label className="text-xs text-gray-500 font-medium">시작일</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm border-none outline-none bg-transparent" />
          </div>
          <span className="text-gray-400 text-sm">~</span>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <label className="text-xs text-gray-500 font-medium">종료일</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border-none outline-none bg-transparent" />
          </div>
          <button onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            조회
          </button>
          {loading && <span className="text-sm text-gray-400">불러오는 중...</span>}
        </div>

        <ShareBar
          captureRef={captureRef}
          storeName="강서점"
          dateRange={dateRange}
          onEmail={handleEmail}
          emailLoading={emailLoading}
        />

        {/* Capturable area */}
        <div ref={captureRef} className="bg-gray-50 p-2 rounded-xl">
          {rows.length === 0 && !loading ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 py-20 text-center">
              <p className="text-gray-400 text-sm mb-2">데이터가 없습니다</p>
              <a href="/upload" className="text-blue-600 text-sm font-medium hover:underline">
                데이터 업로드하기 →
              </a>
            </div>
          ) : (
            <>
              <SummaryCards
                storeName="강서점"
                dateRange={dateRange}
                totalSales={totalSales}
                actualSales={actualSales}
                grossProfit={grossProfit}
                grossMargin={grossMargin}
                quantity={quantity}
              />
              <SalesChart data={daily} />
              <BrandTable data={brands} />
            </>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-fade-in">
            {toast}
          </div>
        )}
      </main>
    </div>
  )
}
