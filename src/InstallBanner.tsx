// 모바일 첫 방문 시 "앱으로 설치" 배너. 닫으면 그날(KST)은 숨기고 다음 날 다시 보여준다.
// 안드로이드: beforeinstallprompt로 설치 창을 띄운다. 아이폰: 설치 API가 없어 공유 → 홈 화면에 추가 방법을 안내한다.
import { useEffect, useState } from 'react'
import { dayKey } from './logic.ts'
import { track } from './ga.ts'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const HIDE = 'roopang-install-hidden'
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const android = /Android/i.test(navigator.userAgent)

function hiddenToday() {
  try {
    const v = localStorage.getItem(HIDE)
    return v === 'installed' || v === dayKey(Date.now())
  } catch { return false }
}
function hide(value: string) {
  try { localStorage.setItem(HIDE, value) } catch { /* 저장 못 해도 이번 화면에서만 닫힘 */ }
}

// React가 뜨기 전에 이벤트가 올 수 있어 모듈 로드 시점에 잡아둔다.
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach((f) => f()) })
addEventListener('appinstalled', () => { hide('installed'); deferred = null; listeners.forEach((f) => f()) })

export default function InstallBanner() {
  const [, rerender] = useState(0)
  const [closed, setClosed] = useState(() => standalone || hiddenToday())

  useEffect(() => {
    const f = () => rerender((n) => n + 1)
    listeners.add(f)
    return () => { listeners.delete(f) }
  }, [])

  if (closed || hiddenToday() || !(ios || (android && deferred))) return null  // 컴퓨터에선 안 띄움

  function close() {
    hide(dayKey(Date.now()))
    setClosed(true)
    track('install_banner', { action: 'close' })
  }
  async function install() {
    const e = deferred!
    deferred = null
    await e.prompt()
    const { outcome } = await e.userChoice
    track('install_banner', { action: outcome })
    if (outcome === 'accepted') setClosed(true)
    else close()
  }

  return (
    <div className={deferred ? 'install android' : 'install'} role="region" aria-label="앱 설치 안내">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="install-text">
        <b>월급루팡 앱으로 쓰기</b>
        {deferred ? (
          <span>홈 화면에서 바로 루팡 시작!</span>
        ) : (
          <span>
            아래 <b>공유</b> 버튼 <svg viewBox="0 0 24 24" width="15" height="15" aria-label="공유 아이콘"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H4.5v10h15V11H18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> → <b>홈 화면에 추가</b>
          </span>
        )}
      </div>
      <div className="install-actions">
        <button className="install-web" onClick={close}>{deferred ? '웹으로 볼게요' : '닫기'}</button>
        {deferred && <button className="install-go" onClick={install}>앱 설치</button>}
      </div>
    </div>
  )
}
