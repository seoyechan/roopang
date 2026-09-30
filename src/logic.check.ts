// 실행: npm run check  (기획서 9장 확인 기준 중 계산·보상 규칙)
import assert from 'node:assert/strict'
import { empty, summarize, month, rewardState, groupNew, parse, clock, shiftMonth, type Data } from './logic.ts'

const kst = (s: string) => Date.parse(s + '+09:00')
const sess = (id: string, wage: number, from: string, to: string) => ({ id, hourlyWage: wage, startedAt: kst(from), endedAt: kst(to) })

// 1. 15,000원 × 5분 = 1,250원 (진행 중 회차)
let d: Data = { ...empty(), activeSession: { id: 'a', hourlyWage: 15000, startedAt: kst('2026-09-30T10:00:00') } }
let s = summarize(d, kst('2026-09-30T10:05:00'))
assert.equal(s.total, 1250)
assert.equal(clock(5 * 60_000), '00:05:00')
// 음수 경과는 0
assert.equal(summarize(d, kst('2026-09-30T09:00:00')).total, 0)

// 5. 월말 자정 넘김: 9/30 23:30 ~ 10/1 00:30 → 두 날짜·두 달에 반씩
d = { ...empty(), sessions: [sess('b', 10000, '2026-09-30T23:30:00', '2026-10-01T00:30:00')] }
s = summarize(d, 0)
assert.equal(s.days.get('2026-09-30')!.amount, 5000)
assert.equal(s.days.get('2026-10-01')!.amount, 5000)
assert.equal(month(s.days, '2026-09').amount, 5000)
assert.equal(month(s.days, '2026-10').ms, 30 * 60_000)
assert.equal(shiftMonth('2026-01', -1), '2025-12')

// 7. 하루 1만 원 → 커피 1 + 짜장면 1, 다음 날 5천 원 → 커피 2
d = {
  ...empty(),
  sessions: [
    sess('c', 10000, '2026-09-29T10:00:00', '2026-09-29T11:00:00'),
    sess('d', 5000, '2026-09-30T10:00:00', '2026-09-30T11:00:00'),
  ],
}
s = summarize(d, 0)
let r = rewardState(s.days, s.total)
assert.equal(r.dailyDates.coffee.length, 2)
assert.equal(r.dailyDates.jjajang.length, 1)
// 11. 누적 15,000원 → 커피·짜장면 해금, 다음 치킨. 일일 개수에 가산되지 않음
assert.deepEqual(r.unlocked.map((x) => x.id), ['coffee', 'jjajang'])
assert.equal(r.next!.id, 'chicken')

// 4,999.99원은 미달
s = summarize({ ...empty(), sessions: [sess('e', 4999.99, '2026-09-30T10:00:00', '2026-09-30T11:00:00')] }, 0)
assert.equal(rewardState(s.days, s.total).dailyDates.coffee.length, 0)

// 12. 첫날 1만 원: 같은 물건 일일+누적은 연출 한 번으로 묶임
s = summarize({ ...empty(), sessions: [sess('f', 10000, '2026-09-30T10:00:00', '2026-09-30T11:00:00')] }, 0)
const g = groupNew(rewardState(s.days, s.total).keys)
assert.deepEqual(g.map((x) => [x.reward.id, x.daily, x.lifetime]), [['coffee', true, true], ['jjajang', true, true]])

// 3천만 원 이후 next 없음
s = summarize({ ...empty(), sessions: [sess('g', 30_000_000, '2026-09-30T10:00:00', '2026-09-30T11:00:00')] }, 0)
assert.equal(rewardState(s.days, s.total).next, null)

// 저장 형식
assert.deepEqual(parse(null), empty())
assert.equal(parse('{bad'), null)
assert.equal(parse('{"version":2}'), null)

console.log('logic ok')
