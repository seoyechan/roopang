import { useEffect, useRef, useState } from 'react'
import { Art, Logo, Mascot } from './art.tsx'
import MoneyCounter from './MoneyCounter.tsx'
import { track } from './ga.ts'
import {
  KEY, MAX_WAGE, DAILY, REWARDS, empty, parse, summarize, month, shiftMonth, rewardState, nextDaily, groupNew,
  validWage, earned, dayKey, kstTime, won, dur, clock,
  type Data, type Session, type Celebration,
} from './logic.ts'

const LONG = 8 * 3_600_000
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

function load(): { data: Data; notice?: string; storageFailed?: boolean } {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return { data: empty(), storageFailed: true }
  }
  const data = parse(raw)
  if (data) return { data, notice: data.activeSession ? '진행 중인 루팡을 이어서 표시했어요.' : undefined }
  // 원본은 지우지 않고 따로 보관한다.
  const backup = `${KEY}:backup-${Date.now()}`
  try {
    localStorage.setItem(backup, raw!)
  } catch {}
  return { data: empty(), notice: `저장된 기록을 읽지 못했어요. 원본은 ${backup}에 보관했어요.` }
}

const initial = load()

export default function App() {
  const [data, setData] = useState(initial.data)
  const [now, setNow] = useState(Date.now)
  const [wageText, setWageText] = useState(initial.data.hourlyWage ? String(initial.data.hourlyWage) : '')
  const [error, setError] = useState('')
  const [saveFailed, setSaveFailed] = useState(!!initial.storageFailed)
  const [notice, setNotice] = useState(initial.notice ?? '')
  const [result, setResult] = useState<{ amount: number; ms: number } | null>(null)
  const [ym, setYm] = useState(dayKey(Date.now()).slice(0, 7))
  const [celeb, setCeleb] = useState<(Celebration & { extra?: string }) | null>(null)
  const [stash, setStash] = useState('')
  const [said, setSaid] = useState('')
  const [openReward, setOpenReward] = useState<string | null>(null)
  const [selDay, setSelDay] = useState<string | null>(null)
  const [pg, setPg] = useState({ day: '', n: 0 })
  const dataRef = useRef(data)
  dataRef.current = data
  const queue = useRef<Celebration[]>([])
  const resumed = useRef(true) // 첫 로드·백그라운드 복귀 시 대표 연출 1개만
  const lastNow = useRef(Date.now())
  const dropRef = useRef<HTMLDivElement>(null)
  const wageRef = useRef<HTMLInputElement>(null)

  /** 다른 탭의 변경을 먼저 읽고 적용한 뒤 저장한다. */
  function commit(fn: (d: Data) => Data) {
    let fresh = dataRef.current
    try {
      fresh = parse(localStorage.getItem(KEY)) ?? fresh
    } catch {}
    const next = fn(fresh)
    if (next !== fresh || fresh !== dataRef.current) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
        setSaveFailed(false)
      } catch {
        setSaveFailed(true)
      }
    }
    dataRef.current = next
    setData(next)
    return next
  }

  // 수집함 밖을 누르면 선택 강조와 달성 기록을 닫는다
  useEffect(() => {
    if (!openReward) return
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('.collection')) setOpenReward(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [openReward])

  // 1초 타이머 + 탭 복귀 + 다른 탭 동기화
  useEffect(() => {
    const tick = () => {
      const t = Date.now()
      if (t < lastNow.current - 5000) setNotice('기기 시계가 바뀐 것 같아요. 경과 시간을 확인해 주세요.')
      lastNow.current = t
      setNow(t)
    }
    const id = setInterval(tick, 1000)
    const onVis = () => {
      if (!document.hidden) {
        resumed.current = true
        tick()
      }
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return
      const d = parse(e.newValue)
      if (d) {
        dataRef.current = d
        setData(d)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    addEventListener('storage', onStorage)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      removeEventListener('storage', onStorage)
    }
  }, [])

  const { days, total } = summarize(data, now)
  const rewards = rewardState(days, total)
  const today = dayKey(now)
  const todayAmount = days.get(today)?.amount ?? 0
  const nextToday = nextDaily(todayAmount)
  const active = data.activeSession
  const running = !!active
  const elapsed = days.get(today)?.ms ?? 0
  const amount = todayAmount
  const wage = Number(wageText)
  const wageOk = wageText !== '' && validWage(wage)
  const rateWage = active?.hourlyWage ?? (wageOk ? wage : 0)

  // 보상 판정: 달성 즉시 저장하고, 연출은 따로 큐에 넣는다.
  useEffect(() => {
    if (document.hidden) return
    const limit = resumed.current ? 1 : 3
    resumed.current = false
    const seen = new Set(data.celebratedRewardKeys)
    const candidates = rewards.keys.filter((k) => !seen.has(k))
    if (!candidates.length) return
    let fresh: string[] = []
    commit((d) => {
      const have = new Set(d.celebratedRewardKeys)
      fresh = candidates.filter((k) => !have.has(k))
      return fresh.length ? { ...d, celebratedRewardKeys: [...d.celebratedRewardKeys, ...fresh] } : d
    })
    const groups = groupNew(fresh)
    if (!groups.length) return
    groups.forEach((g) => track('reward', { reward: g.reward.id, daily: g.daily, lifetime: g.lifetime }))
    // 여러 개면 가장 큰 보상부터 최대 limit개, 나머지는 묶어서 안내
    const shown = groups.slice(-limit)
    queue.current.push(...shown)
    setSaid(groups.map((g) => g.reward.msg).join(' '))
    if (groups.length > shown.length) setStash(`보상 ${groups.length}개를 모았어요`)
    if (!celeb) setCeleb(queue.current.shift()!)
  })

  // 낙하 → 튕김 → 수집함으로 이동
  useEffect(() => {
    if (!celeb) return
    let cancelled = false
    const animations: Animation[] = []
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const pause = (ms: number) => new Promise<void>((resolve) => {
      const timer = setTimeout(() => { timers.delete(timer); resolve() }, ms)
      timers.add(timer)
    })
    const animate = (node: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = node.animate(frames, options)
      animations.push(animation)
      return animation.finished
    }
    const el = dropRef.current
    const id = celeb.reward.id
    const target = document.querySelector<HTMLElement>(celeb.daily ? `[data-collect="${id}"]` : `[data-goal="${id}"]`)
    const run = async () => {
      if (el && !reducedMotion()) {
        const car = id === 'car'
        await animate(el,
          [
            { transform: 'translateY(-64px) rotate(-12deg) scale(.82)', opacity: 0, easing: 'cubic-bezier(.4, 0, .8, .5)' },
            { transform: 'translateY(0) rotate(3deg) scale(1.05, .94)', opacity: 1, offset: .6, easing: 'cubic-bezier(.2, .8, .3, 1)' },
            { transform: 'translateY(-9px) rotate(-2deg) scale(.98, 1.02)', opacity: 1, offset: .8, easing: 'ease-in' },
            { transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 },
          ],
          { duration: car ? 880 : 680, fill: 'both' },
        )
        await pause(320)
        if (cancelled) return
        const destination = target?.querySelector<HTMLElement>('.pile') ?? target
        const r = destination?.getBoundingClientRect()
        const s = el.getBoundingClientRect()
        if (r && r.width && r.top >= 0 && r.bottom <= innerHeight) {
          const dx = r.left + r.width / 2 - (s.left + s.width / 2)
          const dy = r.top + r.height / 2 - (s.top + s.height / 2)
          await animate(el, [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${dx * .35}px,${Math.min(-20, dy * .2)}px) scale(.85)`, opacity: 1, offset: .4 },
            { transform: `translate(${dx}px,${dy}px) scale(.38)`, opacity: 0 },
          ], { duration: 540, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' })
        } else {
          await animate(el, [
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(12px) scale(.65)', opacity: 0 },
          ], { duration: 350, easing: 'ease-in-out', fill: 'forwards' })
          if (cancelled) return
          setStash((s) => s || '수집함에 담았어요')
        }
      }
      if (cancelled) return
      if (target && !reducedMotion()) {
        void animate(target, [
          { background: '#e0f8db', transform: 'scale(1)' },
          { background: '#e0f8db', transform: 'scale(1.025)', offset: .35 },
          { background: 'transparent', transform: 'scale(1)' },
        ], { duration: 600, easing: 'ease-out' }).catch(() => {})
      }
      await pause(1100)
      if (cancelled) return
      const next = queue.current.shift()
      setCeleb(next ?? null)
      if (!next) setStash('')
    }
    void run().catch((error) => {
      if (!cancelled && error?.name !== 'AbortError') console.error('보상 연출을 표시하지 못했어요.', error)
    })
    return () => {
      cancelled = true
      animations.forEach((animation) => animation.cancel())
      timers.forEach(clearTimeout)
    }
  }, [celeb])

  function start() {
    if (!wageOk) {
      setError(`1원부터 ${won(MAX_WAGE)}원 사이의 숫자로 입력해 주세요.`)
      wageRef.current?.focus()
      return
    }
    setError('')
    commit((d) =>
      d.activeSession ? d : { ...d, hourlyWage: wage, activeSession: { id: newId(), hourlyWage: wage, startedAt: Date.now() } },
    )
    setResult(null)
    setNotice('')
    setNow(Date.now())
    setSaid('루팡 시작! 금액이 쌓이기 시작해요.')
    track('lupang_start', { hourly_wage: wage })
  }

  function end() {
    let ended: Session | null = null
    commit((d) => {
      const a = d.activeSession
      if (!a) return d
      const s: Session = { ...a, endedAt: Math.max(Date.now(), a.startedAt) }
      ended = s
      return { ...d, activeSession: null, sessions: [...d.sessions, s] }
    })
    const s = ended as Session | null
    if (!s) return
    const ms = s.endedAt - s.startedAt
    const amt = earned(s.hourlyWage, ms)
    setResult({ amount: amt, ms })
    setNotice('')
    setNow(Date.now())
    setSaid(`일 시작. 이번 루팡 ${won(amt)}원, ${dur(ms)}.`)
    track('lupang_end', { amount: Math.floor(amt), seconds: Math.floor(ms / 1000) })
  }

  function remove(s: Session, isActive: boolean) {
    if (!confirm(`${kstTime(s.startedAt)} 기록을 삭제할까요?\n이 기록으로 모은 보상도 다시 계산돼요.`)) return
    commit((d) =>
      isActive
        ? d.activeSession?.id === s.id ? { ...d, activeSession: null } : d
        : { ...d, sessions: d.sessions.filter((x) => x.id !== s.id) },
    )
    track('session_delete')
  }

  /** 이 브라우저에 저장된 월급루팡 데이터(백업 포함)와 화면 상태를 모두 지운다. */
  function wipeAll() {
    if (!confirm('시급, 모든 기록, 수집한 보상이 전부 삭제돼요.\n되돌릴 수 없어요. 정말 지울까요?')) return
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith(KEY)) localStorage.removeItem(k)
      sessionStorage.clear()
      setSaveFailed(false)
    } catch {
      setSaveFailed(true)
    }
    queue.current = []
    dataRef.current = empty()
    setData(dataRef.current)
    setWageText('')
    setError('')
    setResult(null)
    setCeleb(null)
    setStash('')
    setOpenReward(null)
    setSelDay(null)
    setNotice('모든 기록을 지웠어요.')
    setSaid('모든 기록을 지웠어요.')
    track('wipe_all')
  }

  function saveWage() {
    if (wageText === '') return
    if (!wageOk) return setError(`1원부터 ${won(MAX_WAGE)}원 사이의 숫자로 입력해 주세요.`)
    setError('')
    if (data.hourlyWage !== wage) commit((d) => ({ ...d, hourlyWage: wage }))
  }

  const m = month(days, ym)
  const sel = selDay?.startsWith(ym) ? selDay : today.startsWith(ym) ? today : m.list[0]?.day ?? null
  const selStat = sel ? days.get(sel) : undefined
  // 회차 목록은 최신순 10개씩. 날짜를 바꾸면 첫 페이지로.
  const PER = 10
  const selItems = selStat ? [...selStat.items].sort((a, b) => b.session.startedAt - a.session.startedAt) : []
  const pages = Math.max(1, Math.ceil(selItems.length / PER))
  const page = Math.min(pg.day === sel ? pg.n : 0, pages - 1)
  const goPage = (n: number) => setPg({ day: sel ?? '', n })
  const [y, mo] = ym.split('-').map(Number)
  const monthLabel = ym.slice(0, 4) === today.slice(0, 4) ? `${mo}월` : `${y}년 ${mo}월`
  const lastUnlocked = rewards.unlocked.at(-1)
  const nextIdx = rewards.next ? REWARDS.indexOf(rewards.next) : REWARDS.length
  const trail = [...new Set([Math.max(0, nextIdx - 1), nextIdx, nextIdx + 1, REWARDS.length - 1])].filter((i) => i < REWARDS.length)
  const mode = running ? 'running' : result ? 'done' : 'idle'

  let status = '시급을 알려주세요'
  if (running) status = '루팡 중'
  else if (result) status = `이번 루팡 ${won(result.amount)}원 · ${dur(result.ms)}`
  else if (wageOk) status = '대기 중'

  return (
    <div className="page">
      <header className="top">
        <a className="brand" href="#">
          <Logo /> 월급루팡
        </a>
        <a href="#records">내 기록</a>
      </header>

      <section className="hero">
        <div className="hero-copy">
        <h1>
          잠깐 쉬어도,
          <br />
          월급은 흐르니까.
        </h1>
        <p>쉬는 시간도 차곡차곡.</p>
        </div>
        <Mascot mode={mode} />
      </section>

      {(notice || saveFailed) && (
        <div className="notices">
          {saveFailed && <p className="notice warn">기록을 저장할 수 없어요. 이 창을 닫으면 사라질 수 있어요.</p>}
          {notice && (
            <p className="notice">
              {notice}
              <button className="x" onClick={() => setNotice('')} aria-label="안내 닫기">×</button>
            </p>
          )}
        </div>
      )}

      <p className="sr" aria-live="polite">{said}</p>

      <section className="main">
        <div className="meter">
          <p className={`status ${running ? 'on' : ''}`}>
            <i /> {status}
          </p>
          <p className="label">오늘 루팡한 금액</p>
          <MoneyCounter amount={amount} />
          <p className="elapsed">
            <strong>{clock(elapsed)}</strong>
            <span>
              {rateWage
                ? running
                  ? `1초에 ${(rateWage / 3600).toFixed(2)}원씩 쌓이는 중`
                  : `1초에 약 ${(rateWage / 3600).toFixed(2)}원`
                : '시급을 알려주세요'}
            </span>
          </p>
          {active && now - active.startedAt > LONG && (
            <p className="notice warn long">
              아직 쉬는 중인가요? <button onClick={end}>여기서 종료</button>
            </p>
          )}
        </div>

        <div className="controls">
          <label htmlFor="wage">내 시급</label>
          <div className={`wage ${error ? 'bad' : ''}`}>
            <input
              id="wage"
              ref={wageRef}
              inputMode="numeric"
              autoComplete="off"
              placeholder="예: 15,000"
              disabled={running}
              value={wageText ? Number(wageText).toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                setWageText(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 8))
                setError('')
              }}
              onBlur={saveWage}
              onKeyDown={(e) => e.key === 'Enter' && !running && start()}
              aria-invalid={!!error}
              aria-describedby="wage-help"
            />
            <span>원</span>
          </div>
          <p id="wage-help" className={error ? 'err' : 'hint'} role={error ? 'alert' : undefined}>
            {error || (running ? '루팡 중에는 시급을 바꿀 수 없어요' : '바꾼 시급은 다음 루팡부터 적용돼요')}
          </p>
          <button className="cta" onClick={running ? end : start}>
            {running ? <BriefcaseIcon /> : <MoonIcon />} {running ? '일 시작' : '루팡 시작'}
          </button>
          <p className="hint center">시급과 기록은 이 브라우저에 저장돼요.</p>
        </div>

        <div className={`stage ${celeb ? 'celebrating' : 'waiting'}`}>
          {celeb ? (
            <>
              <div className="drop" ref={dropRef} key={celeb.reward.id} aria-hidden>
                <Art id={celeb.reward.id} size={96} label={celeb.reward.name} />
              </div>
              <div className="stage-text">
                <strong>{celeb.daily ? `${celeb.reward.name} ${unitText(celeb.reward.unit)} 확보!` : celeb.reward.msg}</strong>
                <span>
                  {celeb.daily && celeb.lifetime && '첫 누적 목표도 달성 · '}
                  {celeb.daily
                    ? nextToday ? `다음은 ${nextToday.name} · ${won(Math.ceil(nextToday.amount - todayAmount))}원 남음` : '오늘의 보상 모두 수집!'
                    : rewards.next ? `다음은 ${rewards.next.name} · ${won(Math.ceil(rewards.next.amount - total))}원 남음` : '모든 누적 목표를 달성했어요!'}
                </span>
                {stash && <em>{stash}</em>}
              </div>
            </>
          ) : (
            <>
              <div className="drop idle">
                <Art id={nextToday?.id ?? 'dinner'} size={72} />
              </div>
              <div className="stage-text">
                <strong>
                  {nextToday ? `${nextToday.name} ${unitText(nextToday.unit)}까지 ${won(Math.ceil(nextToday.amount - todayAmount))}원` : '오늘의 보상 모두 수집!'}
                </strong>
                <span>{stash || (nextToday ? '달성하면 수집함에 쏙 담아드려요' : '타이머는 계속 흘러가요')}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="panel collection">
        <h2>
          루팡 수집함 <small>쉬는 시간이 이만큼 쌓였어요</small>
        </h2>
        <div className="shelf">
          {DAILY.map((r) => {
            const n = rewards.dailyDates[r.id].length
            return (
              <button
                key={r.id}
                data-collect={r.id}
                className={`slot ${n ? '' : 'empty'} ${openReward === r.id ? 'open' : ''}`}
                onClick={() => setOpenReward(openReward === r.id ? null : r.id)}
                aria-expanded={openReward === r.id}
              >
                <span className="pile" aria-hidden>
                  {Array.from({ length: Math.max(1, Math.min(n, 3)) }, (_, i) => (
                    <Art key={i} id={r.id} size={76} />
                  ))}
                </span>
                <span className="count">
                  {r.name} <b>{`${n.toLocaleString()}${r.unit}`}</b>
                </span>
              </button>
            )
          })}
        </div>
        {openReward && (
          <div className="history">
            <p>
              <b>{REWARDS.find((r) => r.id === openReward)!.name} 달성 기록</b>
            </p>
            {rewards.dailyDates[openReward].length ? (
              <ul>
                {rewards.dailyDates[openReward].map((d) => (
                  <li key={d}>{dayLabel(d, today)}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">아직 달성한 날이 없어요.</p>
            )}
          </div>
        )}
      </section>

      <section className="panel lifetime">
        <div className="lt-total">
          <h2>누적 루팡</h2>
          <p className="big">₩ {won(total)}</p>
          {lastUnlocked && <p className="muted">{lastUnlocked.name} 달성</p>}
        </div>
        <ol className="trail">
          {trail.map((i) => {
            const r = REWARDS[i]
            const got = total >= r.amount
            return (
              <li key={r.id} data-goal={r.id} className={got ? 'got' : 'locked'}>
                <Art id={r.id} size={44} label={`${r.name} ${got ? '달성' : '미달성'}`} />
                <span>{r.name}</span>
                <b>{short(r.amount)}</b>
              </li>
            )
          })}
        </ol>
        <div className="lt-next">
          {rewards.next ? (
            <>
              <Art id={rewards.next.id} size={40} />
              <p>
                <b>{rewards.next.name}</b>
                <strong>{won(Math.ceil(rewards.next.amount - total))}원 남음</strong>
              </p>
            </>
          ) : (
            <p>
              <strong>자동차 달성!</strong> 루팡은 계속 쌓이는 중
            </p>
          )}
          <p className="final muted">최종 목표 · 자동차 30,000,000원</p>
        </div>
        <details className="all-goals">
          <summary>전체 목표</summary>
          <ol>
            {REWARDS.map((r) => (
              <li key={r.id} data-goal={trail.some((i) => REWARDS[i].id === r.id) ? undefined : r.id} className={total >= r.amount ? 'got' : 'locked'}>
                <Art id={r.id} size={52} label={r.name} />
                <span className="nm">{r.name}</span>
                <b>{won(r.amount)}원</b>
                <small>{total >= r.amount ? r.msg : `${won(Math.ceil(r.amount - total))}원 남음`}</small>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <section className="panel records" id="records">
        <div className="rec-head">
          <button onClick={() => setYm(shiftMonth(ym, -1))} aria-label="이전 달">‹</button>
          <h2>{monthLabel}의 루팡 기록</h2>
          <button onClick={() => setYm(shiftMonth(ym, 1))} aria-label="다음 달">›</button>
        </div>
        <p className="rec-sum">
          <span>이번 달</span> <b>₩ {won(m.amount)}</b> <span className="muted">· {dur(m.ms)}</span>
        </p>
        <div className="cal" role="grid" aria-label={`${monthLabel} 달력`}>
          {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
            <span key={w} className="wd">{w}</span>
          ))}
          {calendar(ym).map((d, i) => {
            if (!d) return <span key={'b' + i} />
            const st = days.get(d)
            return (
              <button
                key={d}
                className={`cell ${st ? 'has' : ''} ${d === today ? 'is-today' : ''} ${d === sel ? 'sel' : ''}`}
                onClick={() => setSelDay(d)}
                aria-label={`${dayLabel(d, today)} ${st ? won(st.amount) + '원' : '기록 없음'}`}
                aria-pressed={d === sel}
              >
                <span className="dn">{Number(d.slice(8))}</span>
                {st && <span className="amt">{compact(st.amount)}</span>}
              </button>
            )
          })}
        </div>
        {sel && (
          <div className="day-detail">
            <p className="dd-head">
              <b>{dayLabel(sel, today)}</b>
              {selStat && (
                <span>
                  <span className="muted">{dur(selStat.ms)}</span> <b>₩ {won(selStat.amount)}</b>
                </span>
              )}
            </p>
            {selStat ? (
              <>
              <ul className="sessions">
                {selItems.slice(page * PER, page * PER + PER).map((it) => (
                  <li key={it.session.id}>
                    <span>
                      {kstTime(it.session.startedAt)}–{it.active ? '진행 중' : kstTime(it.session.endedAt)}
                    </span>
                    <span className="muted">
                      {dur(it.ms)} · 시급 {won(it.session.hourlyWage)}원
                    </span>
                    <b>{it.amount.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원</b>
                    <button className="del" onClick={() => remove(it.session, it.active)}>
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav className="pager" aria-label="회차 목록 페이지">
                  <button onClick={() => goPage(page - 1)} disabled={page === 0} aria-label="이전 페이지">‹</button>
                  <span>
                    {page + 1} / {pages}
                  </span>
                  <button onClick={() => goPage(page + 1)} disabled={page === pages - 1} aria-label="다음 페이지">›</button>
                </nav>
              )}
              </>
            ) : (
              <p className="empty-msg">{m.list.length ? '이 날은 기록이 없어요.' : '아직 기록이 없어요. 첫 루팡을 시작해 보세요.'}</p>
            )}
          </div>
        )}
      </section>

      <footer className="foot muted">
        금액은 입력한 시급으로 계산한 재미용 환산값이에요. 세금이나 실제 급여와는 달라요.
        <br />
        기록은 이 브라우저에만 저장되고 다른 기기와 동기화되지 않아요.
        <br />
        <button className="wipe" onClick={wipeAll}>
          이 브라우저의 기록 전체 삭제
        </button>
      </footer>
    </div>
  )
}

const unitText = (u?: string) => (u === '잔' ? '한 잔' : u === '그릇' ? '한 그릇' : u === '마리' ? '한 마리' : '한 번')
const short = (n: number) => (n >= 10_000 ? `${(n / 10_000).toLocaleString()}만` : `${n / 1000}천`)

/** 달력 칸: 앞쪽 빈칸(null) + 'YYYY-MM-DD' */
function calendar(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)]
}
// 달력 칸용 짧은 금액: 9,999 / 1.5만 / 668만 / 1.2억
const compact = (n: number) =>
  n < 10_000 ? won(n) : n < 1_000_000 ? `${+(n / 10_000).toFixed(1)}만` : n < 100_000_000 ? `${Math.floor(n / 10_000)}만` : `${+(n / 100_000_000).toFixed(1)}억`

function dayLabel(d: string, today: string) {
  const [, m, day] = d.split('-').map(Number)
  return `${m}월 ${day}일${d === today ? ' · 오늘' : ''}`
}

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <rect x="3" y="7" width="18" height="13" rx="3" />
    <path d="M9 7V5h6v2M3 12h18" />
  </svg>
)
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />
  </svg>
)
