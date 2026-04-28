import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '일 매출 관리 시스템 | OPR 영업부',
  description: '강서점 일별 매출 현황 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          crossOrigin="anonymous"
          async
        />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
