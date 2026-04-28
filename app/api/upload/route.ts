import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseExcelFile } from '@/lib/utils/parse-excel'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const rows = parseExcelFile(buffer)

  if (rows.length === 0) return NextResponse.json({ error: '데이터가 없습니다' }, { status: 400 })

  const uploadId = crypto.randomUUID()

  const records = rows.map(r => ({
    store_name: r.store,
    purchase_group: r.purchaseGroup,
    season_year: r.seasonYear,
    season: r.season,
    season_month: r.seasonMonth,
    brand: r.brand,
    mch2_code: r.mch2Code,
    mch2: r.mch2,
    mc_code: r.mcCode,
    mc: r.mc,
    style_code: r.styleCode,
    current_price: r.currentPrice,
    product_code: r.productCode,
    date: r.date.slice(0, 10),
    total_sales: r.totalSales,
    actual_sales: r.actualSales,
    total_cogs: r.totalCogs,
    gross_profit: r.grossProfit,
    gross_margin: r.grossMargin,
    quantity: r.quantity,
    sales_at_original_price: r.salesAtOriginalPrice,
    estimated_cogs: r.estimatedCogs,
    valuation_adj: r.valuationAdj,
    upload_id: uploadId,
  }))

  const BATCH = 500
  for (let i = 0; i < records.length; i += BATCH) {
    const { error } = await supabase.from('sales_daily').insert(records.slice(i, i + BATCH))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: records.length, uploadId })
}
