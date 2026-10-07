// 계산·저장 형식·보상 판정. DOM 없이 동작해야 한다 (logic.check.ts에서 node로 실행).

export const KEY = 'roopang:v1'
export const MIN_WAGE = 1
export const MAX_WAGE = 10_000_000

export type Active = { id: string; hourlyWage: number; startedAt: number }
export type Session = Active & { endedAt: number }
export type Data = {
  version: 1
  hourlyWage: number | null
  activeSession: Active | null
  sessions: Session[]
  rewardCatalogVersion: 1
  celebratedRewardKeys: string[]
}

export const empty = (): Data => ({
  version: 1,
  hourlyWage: null,
  activeSession: null,
  sessions: [],
  rewardCatalogVersion: 1,
  celebratedRewardKeys: [],
})

const H = 3_600_000
const DAY = 86_400_000
// Asia/Seoul은 서머타임이 없어 고정 +9시간으로 충분하다.
const KST = 9 * H

export const dayKey = (t: number) => new Date(t + KST).toISOString().slice(0, 10)
export const kstTime = (t: number) => new Date(t + KST).toISOString().slice(11, 16)
export const earned = (wage: number, ms: number) => (wage * ms) / H
export const validWage = (w: number) => Number.isInteger(w) && w >= MIN_WAGE && w <= MAX_WAGE

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const pos = (v: unknown) => num(v) && (v as number) > 0
const isActive = (s: any) => s && typeof s.id === 'string' && pos(s.hourlyWage) && num(s.startedAt)

/** null이면 형식이 잘못된 데이터. 저장값이 없으면 빈 데이터. */
export function parse(raw: string | null): Data | null {
  if (raw == null) return empty()
  try {
    const d = JSON.parse(raw)
    if (
      d?.version !== 1 ||
      !(d.hourlyWage === null || pos(d.hourlyWage)) ||
      !(d.activeSession === null || isActive(d.activeSession)) ||
      !Array.isArray(d.sessions) ||
      !d.sessions.every((s: any) => isActive(s) && num(s.endedAt)) ||
      !Array.isArray(d.celebratedRewardKeys) ||
      !d.celebratedRewardKeys.every((k: unknown) => typeof k === 'string')
    )
      return null
    return d
  } catch {
    return null
  }
}

/**
 * 저장 직전에 다른 탭의 변경을 반영할 기준 데이터.
 * 저장이 실패 중이거나 읽기에 실패하면(undefined) 저장소가 낡았으므로 화면 데이터를 기준으로 한다.
 */
export function mergeBase(stored: string | null | undefined, current: Data, writeFailed: boolean): Data {
  if (writeFailed || stored === undefined) return current
  return parse(stored) ?? current
}

/** 한국 시간 자정 경계로 회차를 나눈다. */
export function pieces(s: Session) {
  const out: { day: string; ms: number; amount: number }[] = []
  const end = Math.max(s.startedAt, s.endedAt)
  for (let t = s.startedAt; t < end; ) {
    const next = Math.min(end, Math.floor((t + KST) / DAY) * DAY + DAY - KST)
    out.push({ day: dayKey(t), ms: next - t, amount: earned(s.hourlyWage, next - t) })
    t = next
  }
  return out
}

export type DayItem = { session: Session; active: boolean; amount: number; ms: number }
export type DayStat = { day: string; amount: number; ms: number; items: DayItem[] }

/** 진행 중 회차를 now까지 포함해 날짜별 합계를 계산한다. 음수 경과는 0. */
export function summarize(data: Data, now: number) {
  const all = data.sessions.map((session) => ({ session, active: false }))
  const a = data.activeSession
  if (a) all.push({ session: { ...a, endedAt: Math.max(now, a.startedAt) }, active: true })
  const days = new Map<string, DayStat>()
  let total = 0
  for (const { session, active } of all)
    for (const p of pieces(session)) {
      let d = days.get(p.day)
      if (!d) days.set(p.day, (d = { day: p.day, amount: 0, ms: 0, items: [] }))
      d.amount += p.amount
      d.ms += p.ms
      d.items.push({ session, active, amount: p.amount, ms: p.ms })
      total += p.amount
    }
  return { days, total }
}

export function month(days: Map<string, DayStat>, ym: string) {
  const list = [...days.values()].filter((d) => d.day.startsWith(ym)).sort((a, b) => (a.day < b.day ? 1 : -1))
  return { list, amount: list.reduce((s, d) => s + d.amount, 0), ms: list.reduce((s, d) => s + d.ms, 0) }
}

export const shiftMonth = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 7)
}

export type Reward = { id: string; name: string; amount: number; msg: string; unit?: string }

// unit이 있으면 매일 수집도 되는 보상.
export const REWARDS: Reward[] = [
  { id: 'coffee', name: '커피', amount: 5_000, msg: '커피 한 잔 확보!', unit: '잔' },
  { id: 'jjajang', name: '짜장면', amount: 10_000, msg: '오늘 점심은 짜장면!', unit: '그릇' },
  { id: 'chicken', name: '치킨', amount: 20_000, msg: '퇴근 후 치킨 각!', unit: '마리' },
  { id: 'dinner', name: '외식', amount: 50_000, msg: '오늘 저녁은 내가 쏜다!', unit: '회' },
  { id: 'shopping', name: '쇼핑백', amount: 100_000, msg: '쇼핑백 하나 챙겼다!' },
  { id: 'sneakers', name: '운동화', amount: 200_000, msg: '루팡해서 새 신발!' },
  { id: 'headphones', name: '헤드폰', amount: 500_000, msg: '이제 잡음은 안 들려요.' },
  { id: 'travel', name: '여행 가방', amount: 1_000_000, msg: '월급은 흐르고, 나는 떠나고.' },
  { id: 'laptop', name: '노트북', amount: 3_000_000, msg: '쉬어서 장비 바꿨다!' },
  { id: 'carkey', name: '자동차 열쇠', amount: 10_000_000, msg: '드림카가 가까워졌다!' },
  { id: 'car', name: '자동차', amount: 30_000_000, msg: '드디어 내 차 한 대!' },
]
export const DAILY = REWARDS.filter((r) => r.unit)

export function rewardState(days: Map<string, DayStat>, total: number) {
  const list = [...days.values()]
  // 수집 개수 = 해당 기준을 넘긴 날짜 수 (최근 날짜 먼저)
  const dailyDates: Record<string, string[]> = {}
  for (const r of DAILY)
    dailyDates[r.id] = list.filter((d) => d.amount >= r.amount).map((d) => d.day).sort().reverse()
  const unlocked = REWARDS.filter((r) => total >= r.amount)
  const next = REWARDS.find((r) => total < r.amount) ?? null
  const keys = [
    ...DAILY.flatMap((r) => dailyDates[r.id].map((day) => `daily:${day}:${r.id}`)),
    ...unlocked.map((r) => `lifetime:${r.id}`),
  ]
  return { dailyDates, unlocked, next, keys }
}

export const nextDaily = (today: number) => DAILY.find((r) => today < r.amount) ?? null

export type Celebration = { reward: Reward; daily: boolean; lifetime: boolean }

/** 새로 달성한 키를 물건별로 묶는다. 같은 물건의 일일·누적 달성은 연출 한 번. */
export function groupNew(keys: string[]): Celebration[] {
  const m = new Map<string, Celebration>()
  for (const k of keys) {
    const id = k.split(':').pop()!
    const reward = REWARDS.find((r) => r.id === id)
    if (!reward) continue // 보상표가 바뀌기 전 키
    const c = m.get(id) ?? { reward, daily: false, lifetime: false }
    if (k.startsWith('daily:')) c.daily = true
    else c.lifetime = true
    m.set(id, c)
  }
  return [...m.values()].sort((a, b) => a.reward.amount - b.reward.amount)
}

export const won = (n: number) => Math.floor(n).toLocaleString('ko-KR')

export function dur(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return m ? `${h}시간 ${m}분` : `${h}시간`
  return m ? `${m}분` : `${s}초`
}

export function clock(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

/** 여러 보상을 한 번에 받으면 큰 것부터 limit개만 연출하고 나머지는 한 줄로 묶는다. */
export function pickCelebrations(groups: Celebration[], limit: number) {
  const shown = groups.slice(-Math.max(1, limit))
  return { shown, summary: groups.length > shown.length ? `보상 ${groups.length}개를 모았어요` : '' }
}

/** 누적 목표 미리보기: 직전 달성, 다음, 그다음, 최종(자동차) 위치 */
export function trailIndexes(next: Reward | null) {
  const i = next ? REWARDS.indexOf(next) : REWARDS.length
  return [...new Set([Math.max(0, i - 1), i, i + 1, REWARDS.length - 1])].filter((x) => x < REWARDS.length)
}

export function paginate<T>(items: T[], page: number, per: number) {
  const pages = Math.max(1, Math.ceil(items.length / per))
  const p = Math.min(Math.max(0, page), pages - 1)
  return { page: p, pages, items: items.slice(p * per, p * per + per) }
}

/** 달력 칸: 앞쪽 빈칸(null, 일요일 시작) + 'YYYY-MM-DD' */
export function calendar(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)] as (string | null)[]
}

/** 달력 칸용 짧은 금액: 9,999 / 1.5만 / 668만 / 1.2억 */
export const compact = (n: number) =>
  n < 10_000 ? won(n) : n < 1_000_000 ? `${+(n / 10_000).toFixed(1)}만` : n < 100_000_000 ? `${Math.floor(n / 10_000)}만` : `${+(n / 100_000_000).toFixed(1)}억`

/** 큰 금액 표시용: 소수 둘째 자리까지 내림. 0.29×100 = 28.999… 같은 부동소수 오차를 먼저 보정한다. */
export function moneyParts(amount: number) {
  const cents = Math.floor(Number((Math.max(0, amount) * 100).toFixed(6)))
  return { whole: won(Math.floor(cents / 100)), fraction: String(cents % 100).padStart(2, '0') }
}
