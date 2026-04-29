'use client'

import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'

interface Props {
  captureRef: React.RefObject<HTMLDivElement | null>
  storeName: string
  dateRange: string
  onEmail: () => void
  emailLoading: boolean
}

declare global {
  interface Window {
    Kakao: {
      isInitialized: () => boolean
      init: (key: string) => void
      Share: {
        uploadImage: (options: { file: File[] }) => Promise<{ infos: { original: { url: string } } }>
        sendDefault: (options: object) => void
      }
    }
  }
}

export default function ShareBar({ captureRef, storeName, dateRange, onEmail, emailLoading }: Props) {
  const [capturing, setCapturing] = useState(false)
  const [kakaoLoading, setKakaoLoading] = useState(false)

  async function captureImage(): Promise<Blob | null> {
    if (!captureRef.current) return null
    setCapturing(true)
    try {
      const canvas = await html2canvas(captureRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    } finally {
      setCapturing(false)
    }
  }

  async function handleDownload() {
    const blob = await captureImage()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${storeName}_매출현황_${dateRange.replace(/\s/g, '')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleKakao() {
    setKakaoLoading(true)
    try {
      const blob = await captureImage()
      if (!blob) return

      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
      if (!kakaoKey) {
        alert('카카오 앱 키가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY를 추가하세요.')
        return
      }

      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey)
      }

      const file = new File([blob], 'dashboard.png', { type: 'image/png' })
      const result = await window.Kakao.Share.uploadImage({ file: [file] })
      const imageUrl = result.infos.original.url

      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${storeName} 매출 현황`,
          description: dateRange,
          imageUrl,
          link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
        },
      })
    } catch (e) {
      console.error(e)
      alert('카카오톡 공유 중 오류가 발생했습니다.')
    } finally {
      setKakaoLoading(false)
    }
  }

  const busy = capturing || kakaoLoading

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={handleDownload}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        PNG 저장
      </button>

      <button
        onClick={handleKakao}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#FEE500] text-[#191919] text-sm font-semibold rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.75 1.6 5.17 4 6.6l-.85 3.1c-.1.35.3.63.6.42L9.5 18.6c.82.18 1.66.28 2.5.28 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
        </svg>
        {kakaoLoading ? '공유 중...' : '카카오톡 공유'}
      </button>

      <button
        onClick={onEmail}
        disabled={busy || emailLoading}
        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {emailLoading ? '발송 중...' : '이메일 발송'}
      </button>
    </div>
  )
}
