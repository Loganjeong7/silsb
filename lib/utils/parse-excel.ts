import * as XLSX from 'xlsx'

export interface SalesRow {
  store: string
  purchaseGroup: string
  seasonYear: string
  season: string
  seasonMonth: string
  brand: string
  mch2Code: string
  mch2: string
  mcCode: string
  mc: string
  styleCode: string
  currentPrice: number
  productCode: string
  date: string
  totalSales: number
  actualSales: number
  totalCogs: number
  grossProfit: number
  grossMargin: number
  quantity: number
  salesAtOriginalPrice: number
  estimatedCogs: number
  valuationAdj: number
}

const COL_MAP: Record<string, keyof SalesRow> = {
  '지점(Now)': 'store',
  '구매그룹(Now:상품)': 'purchaseGroup',
  '계절연도(Now)': 'seasonYear',
  '계절(Now)': 'season',
  '계절월(Now)': 'seasonMonth',
  '오리지날브랜드(Now)': 'brand',
  'MCH2(Now)': 'mch2Code',
  'MCH2': 'mch2',
  'MC(자재그룹)(Now)': 'mcCode',
  'MC': 'mc',
  '스타일코드(Now)': 'styleCode',
  '현재판매가(특성)': 'currentPrice',
  '상품코드': 'productCode',
  '일': 'date',
  '총 매출액': 'totalSales',
  '실 매출액': 'actualSales',
  '총 매출원가': 'totalCogs',
  '매출 총 이익': 'grossProfit',
  '매출 총 이익률': 'grossMargin',
  '판매수량': 'quantity',
  '매출액(최초판매가)': 'salesAtOriginalPrice',
  '매출원가(추정)': 'estimatedCogs',
  '평가감환입(추정)': 'valuationAdj',
}

export function parseExcelFile(buffer: ArrayBuffer): SalesRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, dateNF: 'yyyy-mm-dd' })

  return raw.map((row) => {
    const mapped: Partial<SalesRow> = {}
    for (const [korKey, field] of Object.entries(COL_MAP)) {
      const val = row[korKey]
      if (val === undefined || val === null) continue
      const numFields: Array<keyof SalesRow> = [
        'currentPrice', 'totalSales', 'actualSales', 'totalCogs',
        'grossProfit', 'grossMargin', 'quantity', 'salesAtOriginalPrice',
        'estimatedCogs', 'valuationAdj',
      ]
      if (numFields.includes(field)) {
        (mapped as Record<string, unknown>)[field] = Number(val) || 0
      } else {
        (mapped as Record<string, unknown>)[field] = String(val)
      }
    }
    return mapped as SalesRow
  })
}

export interface DailySummary {
  date: string
  totalSales: number
  actualSales: number
  grossProfit: number
  grossMargin: number
  quantity: number
}

export function aggregateByDate(rows: SalesRow[]): DailySummary[] {
  const map = new Map<string, DailySummary>()
  for (const row of rows) {
    const d = row.date.slice(0, 10)
    if (!map.has(d)) {
      map.set(d, { date: d, totalSales: 0, actualSales: 0, grossProfit: 0, grossMargin: 0, quantity: 0 })
    }
    const s = map.get(d)!
    s.totalSales += row.totalSales
    s.actualSales += row.actualSales
    s.grossProfit += row.grossProfit
    s.quantity += row.quantity
  }
  for (const s of map.values()) {
    s.grossMargin = s.actualSales > 0 ? (s.grossProfit / s.actualSales) * 100 : 0
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export interface BrandSummary {
  brand: string
  totalSales: number
  actualSales: number
  grossProfit: number
  quantity: number
}

export function aggregateByBrand(rows: SalesRow[]): BrandSummary[] {
  const map = new Map<string, BrandSummary>()
  for (const row of rows) {
    if (!map.has(row.brand)) {
      map.set(row.brand, { brand: row.brand, totalSales: 0, actualSales: 0, grossProfit: 0, quantity: 0 })
    }
    const s = map.get(row.brand)!
    s.totalSales += row.totalSales
    s.actualSales += row.actualSales
    s.grossProfit += row.grossProfit
    s.quantity += row.quantity
  }
  return Array.from(map.values()).sort((a, b) => b.actualSales - a.actualSales)
}
