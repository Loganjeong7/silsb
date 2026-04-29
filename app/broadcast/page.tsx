'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── 타입 ──────────────────────────────────────────────────────
interface Broadcast {
  id: string
  user_id: string
  text: string
  category: string
  is_active: boolean
  sort_order: number
  created_at: string
}
interface BroadcastLog {
  id: string
  text: string
  triggered_by: string
  played_at: string
}
interface Settings {
  interval_minutes: number
  play_mode: 'sequential' | 'random'
  tts_rate: number
  tts_volume: number
  tts_pitch: number
}

const DEFAULT_TEXT = '안녕하세요, 고객 여러분. 엔씨픽스 쇼핑 안내 말씀드립니다. 엔씨픽스는 이랜드가 병행수입한 해외 유명 브랜드 할인 매장으로, 모든 상품은 100% 정품이오니 안심하고 쇼핑을 즐겨 주시기 바랍니다. 옷걸이 상단의 숫자링은 사이즈 표시입니다. 브랜드마다 사이즈가 다를 수 있으니, 정확한 핏을 위해 직접 입어보시길 권장드립니다. 피팅룸은 매장 안쪽에 위치해 있으며, 원활한 이용을 위해 1인당 5벌로 제한하고 있습니다. 양해 부탁드립니다. 매일 새로운 상품이 입고되오니, 자주 방문하시어 다양한 상품을 만나보세요. 오늘도 엔씨픽스에서 즐거운 쇼핑 되시기 바랍니다. 감사합니다.'
const CATEGORIES = ['영업안내', '안전/매너', '프로모션', '마감안내', '커스텀']
const CIRC = 2 * Math.PI * 45

// ── 유튜브 음소거 ──────────────────────────────────────────────
function muteYT() { window.postMessage({ type: 'NCPICKS_MUTE' }, '*') }
function unmuteYT() { window.postMessage({ type: 'NCPICKS_UNMUTE' }, '*') }

export default function BroadcastPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [list, setList] = useState<Broadcast[]>([])
  const [logs, setLogs] = useState<BroadcastLog[]>([])
  const [settings, setSettings] = useState<Settings>({
    interval_minutes: 10, play_mode: 'sequential',
    tts_rate: 0.9, tts_volume: 1.0, tts_pitch: 1.0,
  })
  const [isRunning, setIsRunning] = useState(false)
  const [countdown, setCountdown] = useState('--:--')
  const [ringOffset, setRingOffset] = useState(CIRC)
  const [statusLabel, setStatusLabel] = useState('○ 대기')
  const [extConnected, setExtConnected] = useState(false)
  const [banner, setBanner] = useState('')
  const [customText, setCustomText] = useState('')
  const [customCat, setCustomCat] = useState('영업안내')
  const [editItem, setEditItem] = useState<Broadcast | null>(null)
  const [editText, setEditText] = useState('')
  const [editCat, setEditCat] = useState('영업안내')

  const schedulerRef = useRef<{ timer: ReturnType<typeof setInterval> | null; nextTime: number | null; idx: number }>
    ({ timer: null, nextTime: null, idx: 0 })
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // ── 초기화 ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    // Extension 감지
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'NCPICKS_EXT_CONNECTED') setExtConnected(true)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (!userId) return
    loadList()
    loadLogs()
    loadSettings()
  }, [userId])

  // ── Supabase CRUD ────────────────────────────────────────────
  const loadList = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('broadcasts')
      .select('*').eq('user_id', userId).order('sort_order').order('created_at')
    if (data) {
      if (data.length === 0) {
        // 기본 방송 삽입
        const { data: inserted } = await supabase.from('broadcasts').insert([{
          user_id: userId, text: DEFAULT_TEXT, category: '영업안내', is_active: true, sort_order: 0
        }]).select()
        if (inserted) setList(inserted)
      } else {
        setList(data)
      }
    }
  }, [userId])

  const loadLogs = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('broadcast_logs')
      .select('*').eq('user_id', userId).order('played_at', { ascending: false }).limit(20)
    if (data) setLogs(data)
  }, [userId])

  const loadSettings = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('broadcast_settings').select('*').eq('user_id', userId).single()
    if (data) {
      setSettings({ interval_minutes: data.interval_minutes, play_mode: data.play_mode,
        tts_rate: data.tts_rate, tts_volume: data.tts_volume, tts_pitch: data.tts_pitch })
    }
  }, [userId])

  const saveSettings = async (s: Settings) => {
    if (!userId) return
    await supabase.from('broadcast_settings').upsert({ user_id: userId, ...s, updated_at: new Date().toISOString() })
  }

  const addLog = async (text: string, triggeredBy: string) => {
    if (!userId) return
    await supabase.from('broadcast_logs').insert([{ user_id: userId, text, triggered_by: triggeredBy }])
    loadLogs()
  }

  const toggleBroadcast = async (id: string, is_active: boolean) => {
    await supabase.from('broadcasts').update({ is_active }).eq('id', id)
    setList(prev => prev.map(b => b.id === id ? { ...b, is_active } : b))
  }

  const deleteBroadcast = async (id: string) => {
    await supabase.from('broadcasts').delete().eq('id', id)
    setList(prev => prev.filter(b => b.id !== id))
  }

  const addCustom = async () => {
    if (!userId || !customText.trim()) return
    const { data } = await supabase.from('broadcasts').insert([{
      user_id: userId, text: customText.trim(), category: customCat, is_active: true,
      sort_order: list.length,
    }]).select()
    if (data) { setList(prev => [...prev, ...data]); setCustomText('') }
  }

  const saveEdit = async () => {
    if (!editItem || !editText.trim()) return
    await supabase.from('broadcasts').update({ text: editText.trim(), category: editCat }).eq('id', editItem.id)
    setList(prev => prev.map(b => b.id === editItem.id ? { ...b, text: editText.trim(), category: editCat } : b))
    setEditItem(null)
  }

  // ── TTS ─────────────────────────────────────────────────────
  const playTTS = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.rate = settingsRef.current.tts_rate
    u.volume = settingsRef.current.tts_volume
    u.pitch = settingsRef.current.tts_pitch
    u.onend = onEnd || null
    window.speechSynthesis.speak(u)
  }, [])

  const triggerBroadcast = useCallback((triggeredBy: string, targetList: Broadcast[]) => {
    const active = targetList.filter(b => b.is_active)
    if (!active.length) return
    let bc: Broadcast
    if (settingsRef.current.play_mode === 'random') {
      bc = active[Math.floor(Math.random() * active.length)]
    } else {
      bc = active[schedulerRef.current.idx % active.length]
      schedulerRef.current.idx++
    }
    setBanner('🔇 방송 중 — ' + bc.text.slice(0, 40) + '...')
    muteYT()
    setTimeout(() => {
      playTTS(bc.text, () => { unmuteYT(); setBanner(''); loadLogs() })
    }, 1000)
    addLog(bc.text, triggeredBy)
  }, [playTTS, loadLogs])

  const playNow = (bc: Broadcast) => {
    setBanner('🔇 방송 중 — ' + bc.text.slice(0, 40) + '...')
    muteYT()
    setTimeout(() => {
      playTTS(bc.text, () => { unmuteYT(); setBanner(''); loadLogs() })
    }, 1000)
    addLog(bc.text, 'manual')
  }

  const playCustomNow = () => {
    if (!customText.trim()) return
    const text = customText.trim()
    setBanner('🔇 방송 중 — ' + text.slice(0, 40) + '...')
    muteYT()
    setTimeout(() => {
      playTTS(text, () => { unmuteYT(); setBanner('') })
    }, 1000)
    addLog(text, 'manual')
  }

  const playAll = () => {
    const active = list.filter(b => b.is_active)
    if (!active.length) { alert('활성화된 방송이 없습니다.'); return }
    let i = 0
    const next = () => {
      if (i >= active.length) { setBanner(''); loadLogs(); return }
      const bc = active[i++]
      setBanner(`🔇 전체재생 (${i}/${active.length}) — ${bc.text.slice(0, 40)}...`)
      muteYT()
      addLog(bc.text, 'manual')
      setTimeout(() => { playTTS(bc.text, () => { unmuteYT(); next() }) }, 1000)
    }
    next()
  }

  // ── 스케줄러 ──────────────────────────────────────────────────
  const startScheduler = () => {
    const ms = settings.interval_minutes * 60 * 1000
    const now = Date.now()
    schedulerRef.current.nextTime = Math.ceil(now / ms) * ms
    setIsRunning(true)
    setStatusLabel('● 방송 운영 중')
    schedulerRef.current.timer = setInterval(() => {
      const t = Date.now()
      if (schedulerRef.current.nextTime && t >= schedulerRef.current.nextTime) {
        triggerBroadcast('auto', list)
        schedulerRef.current.nextTime! += ms
      }
      updateCountdown(ms)
    }, 1000)
    updateCountdown(ms)
  }

  const stopScheduler = () => {
    if (schedulerRef.current.timer) clearInterval(schedulerRef.current.timer)
    setIsRunning(false)
    setStatusLabel('○ 대기')
    setCountdown('--:--')
    setRingOffset(CIRC)
  }

  const resetScheduler = () => {
    stopScheduler()
    schedulerRef.current.idx = 0
  }

  const updateCountdown = (ms: number) => {
    if (!schedulerRef.current.nextTime) return
    const rem = Math.max(0, schedulerRef.current.nextTime - Date.now())
    const m = Math.floor(rem / 60000)
    const s = Math.floor((rem % 60000) / 1000)
    setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    setRingOffset(CIRC * (rem / ms))
  }

  useEffect(() => () => { if (schedulerRef.current.timer) clearInterval(schedulerRef.current.timer) }, [])

  // ── 설정 저장 ─────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    await saveSettings(settings)
    alert('설정이 저장됐습니다.')
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#090c12', color: '#dce3f5', fontFamily: "'Noto Sans KR', sans-serif", fontSize: 13 }}>
      {/* 배너 */}
      {banner && (
        <div style={{ background: 'rgba(240,92,92,.15)', border: '1px solid #f05c5c', borderRadius: 8, padding: '10px 16px', margin: '0 24px 16px', fontWeight: 700, color: '#f05c5c', textAlign: 'center' }}>
          {banner}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px 24px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>📢 매장방송 자동화 시스템</div>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: '#161b26', border: `1px solid ${extConnected ? '#34d399' : '#222840'}`, color: extConnected ? '#34d399' : '#f0c040' }}>
            {extConnected ? '✅ Extension 연결됨' : '⚠️ Extension 미설치 (유튜브 음소거 불가)'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
          {/* ── 왼쪽 ── */}
          <div>
            {/* 카운트다운 */}
            <div style={{ background: '#161b26', border: '1px solid #222840', borderRadius: 12, padding: '24px 16px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#7d8db5', marginBottom: 16 }}>다음 방송까지</div>
              <svg width="110" height="110" style={{ transform: 'rotate(-90deg)', display: 'block', margin: '0 auto' }}>
                <circle cx="55" cy="55" r="45" fill="none" stroke="#1d2235" strokeWidth="8" />
                <circle cx="55" cy="55" r="45" fill="none" stroke="#5b9bff" strokeWidth="8"
                  strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div style={{ fontFamily: 'monospace', fontSize: 38, fontWeight: 700, marginTop: 8 }}>{countdown}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: isRunning ? '#34d399' : '#3d4d70' }}>{statusLabel}</div>
            </div>

            {/* 스케줄러 */}
            <div style={{ background: '#161b26', border: '1px solid #222840', borderRadius: 12, padding: '16px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>⏱ 스케줄러</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#7d8db5', marginBottom: 6 }}>방송 주기</div>
                <select value={settings.interval_minutes}
                  onChange={e => setSettings(s => ({ ...s, interval_minutes: +e.target.value }))}
                  style={{ width: '100%', background: '#1d2235', border: '1px solid #222840', borderRadius: 6, color: '#dce3f5', fontSize: 13, padding: '7px 10px' }}>
                  {[5, 10, 15, 20, 30, 60].map(v => <option key={v} value={v}>{v}분</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#7d8db5', marginBottom: 6 }}>재생 순서</div>
                <select value={settings.play_mode}
                  onChange={e => setSettings(s => ({ ...s, play_mode: e.target.value as 'sequential' | 'random' }))}
                  style={{ width: '100%', background: '#1d2235', border: '1px solid #222840', borderRadius: 6, color: '#dce3f5', fontSize: 13, padding: '7px 10px' }}>
                  <option value="sequential">순차 재생</option>
                  <option value="random">랜덤 재생</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={startScheduler} disabled={isRunning}
                  style={{ flex: 1, padding: '9px 0', background: '#5b9bff', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? .4 : 1 }}>
                  ▶ 시작
                </button>
                <button onClick={stopScheduler} disabled={!isRunning}
                  style={{ flex: 1, padding: '9px 0', background: '#1d2235', border: '1px solid #222840', borderRadius: 7, color: '#7d8db5', fontWeight: 700, cursor: !isRunning ? 'not-allowed' : 'pointer', opacity: !isRunning ? .4 : 1 }}>
                  ❚❚ 정지
                </button>
                <button onClick={resetScheduler}
                  style={{ width: 36, background: '#1d2235', border: '1px solid #222840', borderRadius: 7, color: '#7d8db5', cursor: 'pointer' }}>↺</button>
              </div>
            </div>

            {/* TTS 설정 */}
            <div style={{ background: '#161b26', border: '1px solid #222840', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🎙 TTS 설정</div>
              {([['tts_rate', '속도', 0.5, 2], ['tts_volume', '음량', 0, 1], ['tts_pitch', '음조', 0, 2]] as const).map(([key, label, min, max]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7d8db5', marginBottom: 4 }}>
                    <span>{label}</span><span>{settings[key as keyof Settings]}</span>
                  </div>
                  <input type="range" min={min} max={max} step={0.1} value={settings[key as keyof Settings]}
                    onChange={e => setSettings(s => ({ ...s, [key]: +e.target.value }))}
                    style={{ width: '100%', accentColor: '#5b9bff' }} />
                </div>
              ))}
              <button onClick={handleSaveSettings}
                style={{ width: '100%', padding: 9, background: '#1d2235', border: '1px solid #222840', borderRadius: 7, color: '#7d8db5', fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                설정 저장
              </button>
            </div>
          </div>

          {/* ── 오른쪽 ── */}
          <div>
            {/* 방송 추가 / 즉시 방송 */}
            <div style={{ background: '#161b26', border: '1px solid #222840', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>✏️ 방송 추가 / 즉시 방송</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select value={customCat} onChange={e => setCustomCat(e.target.value)}
                  style={{ background: '#1d2235', border: '1px solid #222840', borderRadius: 6, color: '#dce3f5', fontSize: 13, padding: '8px 10px' }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input value={customText} onChange={e => setCustomText(e.target.value)}
                  placeholder="방송 멘트를 입력하세요..."
                  style={{ flex: 1, background: '#1d2235', border: '1px solid #222840', borderRadius: 6, color: '#dce3f5', fontSize: 13, padding: '8px 12px' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addCustom}
                  style={{ flex: 1, padding: 9, background: '#1d2235', border: '1px solid #222840', borderRadius: 6, color: '#7d8db5', fontWeight: 700, cursor: 'pointer' }}>
                  + 목록에 저장
                </button>
                <button onClick={playCustomNow}
                  style={{ flex: 1, padding: 9, background: '#5b9bff', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  ▶ 즉시 방송
                </button>
              </div>
            </div>

            {/* 방송 목록 */}
            <div style={{ background: '#161b26', border: '1px solid #222840', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>📋 방송 목록</div>
                  <div style={{ fontSize: 11, color: '#7d8db5' }}>활성화된 방송만 자동 재생</div>
                </div>
                <button onClick={playAll}
                  style={{ padding: '6px 14px', background: '#34d399', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  ▶▶ 전체 순차 재생
                </button>
              </div>
              {list.map(bc => (
                <div key={bc.id}
                  style={{ background: '#1d2235', border: '1px solid #222840', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: bc.is_active ? 1 : .45 }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => { setEditItem(bc); setEditText(bc.text); setEditCat(bc.category) }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#7d8db5', marginBottom: 3 }}>{bc.category}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{bc.text.length > 60 ? bc.text.slice(0, 60) + '…' : bc.text}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => playNow(bc)}
                      style={{ fontSize: 10, padding: '4px 10px', background: '#5b9bff', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>▶ 즉시</button>
                    <label style={{ position: 'relative', display: 'inline-block', width: 34, height: 18, flexShrink: 0 }}>
                      <input type="checkbox" checked={bc.is_active} onChange={e => toggleBroadcast(bc.id, e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: bc.is_active ? '#5b9bff' : '#1d2235', borderRadius: 18, transition: '.2s', border: '1px solid #222840' }}>
                        <span style={{ position: 'absolute', height: 12, width: 12, left: bc.is_active ? 19 : 3, bottom: 3, background: bc.is_active ? '#fff' : '#3d4d70', borderRadius: '50%', transition: '.2s' }} />
                      </span>
                    </label>
                    <button onClick={() => deleteBroadcast(bc.id)}
                      style={{ fontSize: 12, width: 22, height: 22, background: 'none', border: 'none', color: '#3d4d70', cursor: 'pointer', borderRadius: 4 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* 방송 이력 */}
            <div style={{ background: '#161b26', border: '1px solid #222840', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🕐 방송 이력</div>
              {logs.length === 0 && <div style={{ fontSize: 11, color: '#3d4d70' }}>방송 이력이 없습니다</div>}
              {logs.map(l => {
                const d = new Date(l.played_at)
                const t = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0', borderBottom: '1px solid #222840', fontSize: 11 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#3d4d70', flexShrink: 0 }}>{t}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, flexShrink: 0, background: l.triggered_by === 'auto' ? 'rgba(91,155,255,.12)' : 'rgba(52,211,153,.12)', color: l.triggered_by === 'auto' ? '#5b9bff' : '#34d399', border: `1px solid ${l.triggered_by === 'auto' ? 'rgba(91,155,255,.25)' : 'rgba(52,211,153,.25)'}` }}>
                      {l.triggered_by === 'auto' ? '자동' : '수동'}
                    </span>
                    <span style={{ color: '#7d8db5', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {l.text.length > 50 ? l.text.slice(0, 50) + '…' : l.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 방송 편집 모달 */}
      {editItem && (
        <div onClick={e => { if ((e.target as HTMLElement).dataset.overlay) setEditItem(null) }}
          data-overlay="1"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#161b26', border: '1px solid #2c3555', borderRadius: 14, width: '100%', maxWidth: 560, padding: '24px 28px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>✏️ 방송 내용 수정</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#7d8db5', flexShrink: 0 }}>카테고리</label>
              <select value={editCat} onChange={e => setEditCat(e.target.value)}
                style={{ background: '#1d2235', border: '1px solid #222840', borderRadius: 6, color: '#dce3f5', fontSize: 12, padding: '5px 8px', flex: 1 }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)}
              style={{ width: '100%', minHeight: 140, background: '#1d2235', border: '1px solid #222840', borderRadius: 8, color: '#dce3f5', fontSize: 13, lineHeight: 1.7, padding: 12, resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={saveEdit}
                style={{ flex: 1, padding: 10, background: '#5b9bff', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>저장</button>
              <button onClick={() => setEditItem(null)}
                style={{ padding: '10px 18px', background: '#1d2235', border: '1px solid #222840', borderRadius: 8, color: '#7d8db5', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
