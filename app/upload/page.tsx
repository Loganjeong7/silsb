'use client'

import { useRef, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ count?: number; error?: string } | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFile(f: File) {
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name)
    if (!ok) { setResult({ error: '.xlsx, .xls, .csv 파일만 업로드 가능합니다.' }); return }
    setFile(f)
    setResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setResult(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      setResult(json)
      if (json.success) {
        setTimeout(() => router.push('/dashboard'), 1500)
      }
    } catch {
      setResult({ error: '업로드 실패. 다시 시도해주세요.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">데이터 업로드</h1>
          <p className="text-sm text-gray-500 mt-1">일별 매출 상세조회 파일을 업로드하면 자동으로 집계됩니다.</p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {file ? (
              <div>
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-700">파일을 드래그하거나 클릭해서 선택</p>
                <p className="text-sm text-gray-400 mt-1">.xlsx, .xls, .csv 지원</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">필요 컬럼 안내</h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            지점(Now), 일, 총 매출액, 실 매출액, 매출 총 이익, 매출 총 이익률, 판매수량, 오리지날브랜드(Now), MCH2, MC 등 23개 컬럼이 포함된 파일이어야 합니다.
          </p>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-xl ${result.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {result.error ? `오류: ${result.error}` : `${result.count?.toLocaleString('ko-KR')}건 업로드 완료. 대시보드로 이동합니다...`}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading ? '업로드 중...' : '업로드'}
          </button>
          {file && (
            <button onClick={() => { setFile(null); setResult(null) }}
              className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              취소
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
