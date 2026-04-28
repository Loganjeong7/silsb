import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const DEFAULT_RECIPIENT = 'jeong_sooman01@eland.co.kr'

function formatKRW(v: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { storeName, dateRange, totalSales, actualSales, grossProfit, grossMargin, quantity, brandSummary } = body

  const topBrands = (brandSummary as { brand: string; actualSales: number; grossProfit: number }[])
    .slice(0, 5)
    .map((b, i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${b.brand}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatKRW(b.actualSales)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:${b.grossProfit >= 0 ? '#10B981' : '#EF4444'};">${formatKRW(b.grossProfit)}</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 28px;">
      <p style="margin:0 0 4px;color:#bfdbfe;font-size:13px;">OPR 영업부 | 일 매출 관리 시스템</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${storeName} 매출 현황 보고</h1>
      <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;">${dateRange}</p>
    </div>
    <div style="padding:28px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
        ${[
          { label: '총 매출액', value: formatKRW(totalSales), color: '#1d4ed8' },
          { label: '실 매출액', value: formatKRW(actualSales), color: '#3b82f6' },
          { label: '매출 총 이익', value: formatKRW(grossProfit), color: grossProfit >= 0 ? '#10b981' : '#ef4444' },
          { label: '총 이익률', value: `${Number(grossMargin).toFixed(1)}%`, color: grossMargin >= 0 ? '#10b981' : '#ef4444' },
          { label: '판매수량', value: `${Number(quantity).toLocaleString('ko-KR')}개`, color: '#6366f1' },
        ].map(c => `
          <div style="background:#f8fafc;border-radius:10px;padding:16px;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">${c.label}</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:${c.color};">${c.value}</p>
          </div>`).join('')}
      </div>
      <h3 style="margin:0 0 12px;font-size:14px;color:#374151;">브랜드별 매출 TOP 5</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">순위</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">브랜드</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">실 매출액</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;font-weight:600;">매출 총 이익</th>
          </tr>
        </thead>
        <tbody>${topBrands}</tbody>
      </table>
    </div>
    <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">본 메일은 일 매출 관리 시스템에서 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: 'OPR 영업부 <onboarding@resend.dev>',
      to: [DEFAULT_RECIPIENT],
      subject: `[${storeName}] 매출 현황 보고 - ${dateRange}`,
      html,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('email_logs').insert({
      recipients: [DEFAULT_RECIPIENT],
      sent_at: new Date().toISOString(),
      status: 'sent',
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
