import { useEffect, useRef } from 'react'

// 카카오 애드핏 배너. 광고 단위 ID가 없으면 아무것도 그리지 않는다.
const PC = import.meta.env.VITE_ADFIT_PC as string | undefined // 728×90
const MOBILE = import.meta.env.VITE_ADFIT_MOBILE as string | undefined // 320×100

export default function AdFit() {
  const ref = useRef<HTMLDivElement>(null)
  // ponytail: 첫 화면 폭으로 한 번만 고른다. 회전·창 크기 변경 시 재선택은 필요해지면 추가
  const wide = matchMedia('(min-width: 768px)').matches
  const unit = wide ? PC : MOBILE

  useEffect(() => {
    if (!unit || !ref.current) return
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://t1.daumcdn.net/kas/static/ba.min.js'
    ref.current.append(s)
  }, [unit])

  if (!unit) return null
  return (
    <div className={`ad ${wide ? 'ad-pc' : 'ad-mobile'}`} ref={ref} aria-label="광고">
      <ins className="kakao_ad_area" style={{ display: 'none' }} data-ad-unit={unit} data-ad-width={wide ? '728' : '320'} data-ad-height={wide ? '90' : '100'} />
    </div>
  )
}
