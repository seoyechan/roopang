// 실행: npm run check  (배포 전 CI에서도 실행. 실패하면 배포가 멈춘다)
// 우선순위: P1 금액·날짜 경계 → P2 보상 규칙 → P3 저장 형식 → P4 표시 형식 → P5 화면 계산
import assert from 'node:assert/strict'
import {
  empty, summarize, month, rewardState, groupNew, nextDaily, parse, pieces, earned, validWage,
  dayKey, kstTime, won, dur, clock, shiftMonth, REWARDS, DAILY, type Data, type Session,
  mergeBase, pickCelebrations, trailIndexes, paginate, calendar, compact, moneyParts,
} from './logic.ts'

let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (e) {
    console.error(`✗ ${name}`)
    throw e
  }
}
const kst = (s: string) => Date.parse(s + '+09:00')
const sess = (id: string, wage: number, from: string, to: string): Session => ({ id, hourlyWage: wage, startedAt: kst(from), endedAt: kst(to) })
const data = (sessions: Session[], extra: Partial<Data> = {}): Data => ({ ...empty(), sessions, ...extra })
const at = (d: Data, now = 0) => {
  const s = summarize(d, now)
  return { ...s, r: rewardState(s.days, s.total), day: (k: string) => s.days.get(k) }
}
const ids = (rs: { id: string }[]) => rs.map((x) => x.id)

// ───────── P1. 금액 계산 · 날짜 경계 ─────────

test('기획 9-1: 시급 15,000원 × 5분 = 1,250원 (진행 중 회차)', () => {
  const d = data([], { activeSession: { id: 'a', hourlyWage: 15000, startedAt: kst('2026-09-30T10:00:00') } })
  assert.equal(at(d, kst('2026-09-30T10:05:00')).total, 1250)
  assert.equal(earned(15000, 300_000), 1250)
})

test('진행 중 회차: 시계가 시작 전으로 돌아가면 0원, 날짜 항목도 생기지 않음', () => {
  const d = data([], { activeSession: { id: 'a', hourlyWage: 15000, startedAt: kst('2026-09-30T10:00:00') } })
  const s = at(d, kst('2026-09-30T09:00:00'))
  assert.equal(s.total, 0)
  assert.equal(s.days.size, 0)
})

test('기획 9-2: 종료 회차 + 진행 회차를 함께 더하고 중복 합산하지 않음', () => {
  const d = data([sess('a', 12000, '2026-10-07T09:00:00', '2026-10-07T09:30:00')], {
    activeSession: { id: 'b', hourlyWage: 12000, startedAt: kst('2026-10-07T10:00:00') },
  })
  const s = at(d, kst('2026-10-07T10:30:00'))
  assert.equal(s.total, 12000)
  assert.equal(s.day('2026-10-07')!.items.length, 2)
  assert.deepEqual(s.day('2026-10-07')!.items.map((i) => i.active), [false, true])
})

test('기획 9-6: 시급 변경은 과거 회차에 영향 없음 (회차마다 시작 시 시급 사용)', () => {
  const d = data(
    [sess('old', 10000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')],
    { hourlyWage: 99999, activeSession: { id: 'new', hourlyWage: 20000, startedAt: kst('2026-10-07T11:00:00') } },
  )
  assert.equal(at(d, kst('2026-10-07T11:30:00')).total, 10000 + 10000)
})

test('기획 9-5: 월말 자정 넘김 → 두 날짜·두 달에 정확히 나눔', () => {
  const s = at(data([sess('b', 10000, '2026-09-30T23:30:00', '2026-10-01T00:30:00')]))
  assert.equal(s.day('2026-09-30')!.amount, 5000)
  assert.equal(s.day('2026-10-01')!.amount, 5000)
  assert.equal(month(s.days, '2026-09').amount, 5000)
  assert.equal(month(s.days, '2026-10').ms, 30 * 60_000)
})

test('연말 자정 넘김 → 12/31과 1/1, 두 해로 나눔', () => {
  const s = at(data([sess('y', 6000, '2026-12-31T23:00:00', '2027-01-01T01:00:00')]))
  assert.equal(month(s.days, '2026-12').amount, 6000)
  assert.equal(month(s.days, '2027-01').amount, 6000)
})

test('며칠에 걸친 회차는 날짜마다 나뉘고 합계는 원래 금액과 같음', () => {
  const s = sess('l', 1000, '2026-10-07T23:00:00', '2026-10-10T01:00:00')
  const p = pieces(s)
  assert.deepEqual(p.map((x) => [x.day, x.ms / 3_600_000]), [['2026-10-07', 1], ['2026-10-08', 24], ['2026-10-09', 24], ['2026-10-10', 1]])
  assert.equal(p.reduce((a, x) => a + x.amount, 0), earned(1000, s.endedAt - s.startedAt))
})

test('자정 경계: 00:00:00 시작은 새 날짜, 23:59:59.999 종료는 그날', () => {
  assert.deepEqual(pieces(sess('m', 3600, '2026-10-08T00:00:00', '2026-10-08T00:00:01')).map((p) => p.day), ['2026-10-08'])
  const s = { ...sess('m', 3600, '2026-10-07T23:59:59', '2026-10-08T00:00:00'), endedAt: kst('2026-10-08T00:00:00') - 1 }
  assert.deepEqual(pieces(s).map((p) => p.day), ['2026-10-07'])
  assert.equal(dayKey(kst('2026-10-07T23:59:59.999')), '2026-10-07')
  assert.equal(dayKey(kst('2026-10-08T00:00:00')), '2026-10-08')
})

test('회귀(오늘 금액 자정 초기화): 자정을 넘겨 진행 중이면 오늘 금액은 자정 이후분만', () => {
  const d = data([], { activeSession: { id: 'a', hourlyWage: 6000, startedAt: kst('2026-10-07T23:00:00') } })
  const s = at(d, kst('2026-10-08T00:30:00'))
  assert.equal(s.day('2026-10-08')!.amount, 3000)
  assert.equal(s.day('2026-10-07')!.amount, 6000)
  assert.equal(s.total, 9000)
})

test('길이 0 또는 거꾸로 된 회차는 금액 0, 날짜 항목 없음', () => {
  assert.deepEqual(pieces(sess('z', 10000, '2026-10-07T09:00:00', '2026-10-07T09:00:00')), [])
  assert.deepEqual(pieces(sess('r', 10000, '2026-10-07T10:00:00', '2026-10-07T09:00:00')), [])
})

test('월 합계 = 그 달 날짜별 원본 금액의 합 (반올림 전), 날짜는 최신순', () => {
  const s = at(data([
    sess('a', 1000, '2026-10-01T09:00:00', '2026-10-01T09:00:01'), // 0.2777…원
    sess('b', 1000, '2026-10-02T09:00:00', '2026-10-02T09:00:01'),
    sess('c', 1000, '2026-10-03T09:00:00', '2026-10-03T09:00:01'),
  ]))
  const m = month(s.days, '2026-10')
  assert.deepEqual(m.list.map((d) => d.day), ['2026-10-03', '2026-10-02', '2026-10-01'])
  assert.ok(Math.abs(m.amount - 3000 / 3600) < 1e-9)
  assert.equal(month(s.days, '2026-11').list.length, 0)
})

test('전체 합계 = 모든 날짜 금액의 합', () => {
  const s = at(data([sess('a', 7000, '2026-10-06T22:10:00', '2026-10-07T01:20:00'), sess('b', 13000, '2026-10-07T09:00:00', '2026-10-07T09:47:00')]))
  const sum = [...s.days.values()].reduce((a, d) => a + d.amount, 0)
  assert.ok(Math.abs(sum - s.total) < 1e-9)
})

test('shiftMonth: 연도 넘김 양방향', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
  assert.equal(shiftMonth('2026-01', -13), '2024-12')
  assert.equal(shiftMonth('2026-10', 0), '2026-10')
})

test('validWage: 1~10,000,000 정수만', () => {
  for (const w of [1, 15000, 10_000_000]) assert.ok(validWage(w), String(w))
  for (const w of [0, -1, 10_000_001, 1.5, NaN, Infinity]) assert.ok(!validWage(w), String(w))
})

// ───────── P2. 보상 규칙 ─────────

test('기획 9-7: 하루 1만 원 → 커피 1 + 짜장면 1 (커피 2잔 아님), 다음 날 5천 원 → 커피 누적 2', () => {
  const s = at(data([sess('c', 10000, '2026-09-29T10:00:00', '2026-09-29T11:00:00'), sess('d', 5000, '2026-09-30T10:00:00', '2026-09-30T11:00:00')]))
  assert.deepEqual(s.r.dailyDates.coffee, ['2026-09-30', '2026-09-29'])
  assert.deepEqual(s.r.dailyDates.jjajang, ['2026-09-29'])
  assert.deepEqual(s.r.dailyDates.chicken, [])
})

test('일일 보상 기준 경계: 정확히 기준액이면 획득, 0.01원 모자라면 미획득', () => {
  for (const r of DAILY) {
    const hit = at(data([sess('h', r.amount, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
    assert.equal(hit.r.dailyDates[r.id].length, 1, `${r.id} 정확히`)
    const miss = at(data([sess('m', r.amount - 0.01, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
    assert.equal(miss.r.dailyDates[r.id].length, 0, `${r.id} 미달`)
  }
})

test('같은 날 여러 회차가 합쳐서 기준을 넘으면 획득 (회차 단위가 아니라 하루 단위)', () => {
  const s = at(data([sess('a', 12000, '2026-10-07T09:00:00', '2026-10-07T09:15:00'), sess('b', 12000, '2026-10-07T14:00:00', '2026-10-07T14:10:00')]))
  assert.equal(s.day('2026-10-07')!.amount, 5000)
  assert.equal(s.r.dailyDates.coffee.length, 1)
})

test('회귀(부동소수): 여러 회차 합이 수학적으로 정확히 5,000원이면 커피 획득', () => {
  for (const [wage, n] of [[3000, 3], [6000, 6], [9000, 8], [12000, 6], [1000, 9]] as const) {
    const each = (5000 * 3_600_000) / wage / n
    assert.ok(Number.isInteger(each), '실제 시각은 ms 정수') // 데이터 자체가 가능한 조합인지
    const base = kst('2026-10-07T09:00:00')
    const sessions = Array.from({ length: n }, (_, i) => ({ id: `x${i}`, hourlyWage: wage, startedAt: base + i * each * 2, endedAt: base + i * each * 2 + each }))
    assert.equal(at(data(sessions)).r.dailyDates.coffee.length, 1, `${wage}원 × ${n}회`)
  }
})

test('자정을 넘긴 회차는 날짜별로 따로 판정 (23:00~01:00 시급 5,000원 = 하루 5,000원씩)', () => {
  const s = at(data([sess('n', 5000, '2026-10-07T23:00:00', '2026-10-08T01:00:00')]))
  assert.deepEqual(s.r.dailyDates.coffee, ['2026-10-08', '2026-10-07']) // 이틀 다 커피
  assert.deepEqual(s.r.dailyDates.jjajang, []) // 합치면 1만 원이지만 하루 기준 미달
  const s2 = at(data([sess('n', 5000, '2026-10-07T22:00:00', '2026-10-08T00:30:00')])) // 10/7 2시간, 10/8 30분
  assert.deepEqual(s2.r.dailyDates.jjajang, ['2026-10-07'])
  assert.deepEqual(s2.r.dailyDates.coffee, ['2026-10-07'])
})

test('기획 9-11: 누적 목표 경계 199,999 → 200,000원에서 운동화 해금, 다음은 헤드폰', () => {
  const before = at(data([sess('a', 199_999, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
  assert.equal(before.r.next!.id, 'sneakers')
  const after = at(data([sess('a', 200_000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
  assert.ok(ids(after.r.unlocked).includes('sneakers'))
  assert.equal(after.r.next!.id, 'headphones')
})

test('누적 목표 순서: 100만 → 노트북이 다음, 3천만 → 전부 해금·다음 없음', () => {
  const m = at(data([sess('a', 1_000_000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
  assert.equal(m.r.next!.id, 'laptop')
  const all = at(data([sess('a', 30_000_000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
  assert.deepEqual(ids(all.r.unlocked), ids(REWARDS))
  assert.equal(all.r.next, null)
})

test('REWARDS는 금액 오름차순이고 id가 겹치지 않음 (next·trail 계산 전제)', () => {
  for (let i = 1; i < REWARDS.length; i++) assert.ok(REWARDS[i].amount > REWARDS[i - 1].amount)
  assert.equal(new Set(ids(REWARDS)).size, REWARDS.length)
  assert.deepEqual(ids(DAILY), ['coffee', 'jjajang', 'chicken', 'dinner'])
})

test('기획 9-11: 누적 해금은 일일 개수에 더하지 않음 (lifetime 키와 daily 키 분리)', () => {
  const s = at(data([sess('a', 30_000_000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
  assert.equal(s.r.dailyDates.coffee.length, 1)
  assert.equal(s.r.keys.filter((k) => k.startsWith('daily:')).length, 4)
  assert.equal(s.r.keys.filter((k) => k.startsWith('lifetime:')).length, 11)
  assert.equal(new Set(s.r.keys).size, s.r.keys.length)
  assert.ok(s.r.keys.includes('daily:2026-10-07:coffee') && s.r.keys.includes('lifetime:car'))
})

test('기획 9-12: 회차 삭제 시 수집·해금이 다시 계산됨', () => {
  const both = [sess('a', 10000, '2026-10-07T09:00:00', '2026-10-07T10:00:00'), sess('b', 10000, '2026-10-08T09:00:00', '2026-10-08T10:00:00')]
  const s1 = at(data(both))
  assert.equal(s1.r.dailyDates.jjajang.length, 2)
  assert.ok(ids(s1.r.unlocked).includes('chicken')) // 누적 2만
  const s2 = at(data(both.filter((x) => x.id !== 'b')))
  assert.equal(s2.r.dailyDates.jjajang.length, 1)
  assert.ok(!ids(s2.r.unlocked).includes('chicken'))
  assert.equal(s2.r.next!.id, 'chicken')
})

test('기획 9-12: 같은 물건 일일+누적은 연출 한 번, 금액 오름차순', () => {
  const s = at(data([sess('f', 10000, '2026-09-30T10:00:00', '2026-09-30T11:00:00')]))
  assert.deepEqual(groupNew(s.r.keys).map((x) => [x.reward.id, x.daily, x.lifetime]), [['coffee', true, true], ['jjajang', true, true]])
})

test('groupNew: 여러 날의 같은 일일 보상은 하나로 묶임 (오래 비운 뒤 재방문)', () => {
  const g = groupNew(['daily:2026-10-01:coffee', 'daily:2026-10-02:coffee', 'lifetime:shopping'])
  assert.deepEqual(g.map((x) => [x.reward.id, x.daily, x.lifetime]), [['coffee', true, false], ['shopping', false, true]])
})

test('nextDaily: 기준 경계와 전부 달성 후 null', () => {
  assert.equal(nextDaily(0)!.id, 'coffee')
  assert.equal(nextDaily(4999.99)!.id, 'coffee')
  assert.equal(nextDaily(5000)!.id, 'jjajang')
  assert.equal(nextDaily(49_999)!.id, 'dinner')
  assert.equal(nextDaily(50_000), null)
})

// ───────── P3. 저장 형식 (localStorage 신뢰 경계) ─────────

test('기획 9-3: 실제 데이터는 JSON 왕복 후 그대로 복구', () => {
  const d = data([sess('a', 15000, '2026-10-07T09:00:00', '2026-10-07T09:05:00')], {
    hourlyWage: 15000,
    activeSession: { id: 'b', hourlyWage: 15000, startedAt: kst('2026-10-07T10:00:00') },
    celebratedRewardKeys: ['daily:2026-10-07:coffee', 'lifetime:coffee'],
  })
  assert.deepEqual(parse(JSON.stringify(d)), d)
})

test('저장값 없음은 빈 데이터, 깨진 값은 null (원본 보관 판단용)', () => {
  assert.deepEqual(parse(null), empty())
  for (const raw of ['', '{bad', 'null', '[]', '1', '"x"', '{"version":2}', '{}']) assert.equal(parse(raw), null, JSON.stringify(raw))
})

test('필드 형식이 틀리면 null', () => {
  const base = empty()
  const bad: unknown[] = [
    { ...base, hourlyWage: '15000' },
    { ...base, sessions: {} },
    { ...base, sessions: [{ id: 'a', hourlyWage: 1, startedAt: 1 }] }, // endedAt 없음
    { ...base, sessions: [{ id: 1, hourlyWage: 1, startedAt: 1, endedAt: 2 }] },
    { ...base, activeSession: { id: 'a', hourlyWage: 1 } },
    { ...base, celebratedRewardKeys: 'x' },
  ]
  for (const b of bad) assert.equal(parse(JSON.stringify(b)), null, JSON.stringify(b))
})

test('회귀(parse 강화): 0·음수 시급(전체·회차), 문자열이 아닌 축하 키는 거부', () => {
  assert.equal(parse(JSON.stringify({ ...empty(), hourlyWage: 0 })), null)
  assert.equal(parse(JSON.stringify({ ...empty(), activeSession: { id: 'a', hourlyWage: -1, startedAt: 1 } })), null)
  assert.equal(parse(JSON.stringify({ ...empty(), hourlyWage: -5 })), null)
  assert.equal(parse(JSON.stringify({ ...empty(), sessions: [{ id: 'a', hourlyWage: -100, startedAt: 10, endedAt: 20 }] })), null)
  assert.equal(parse(JSON.stringify({ ...empty(), celebratedRewardKeys: [1, null] })), null)
})

test('회귀(groupNew): 보상표에 없는 id(보상표 변경 후 옛 키)는 건너뜀', () => {
  const g = groupNew(['lifetime:unknown', 'daily:2026-10-07:coffee'])
  assert.deepEqual(g.map((x) => x.reward?.id), ['coffee'])
})

// ───────── P4. 표시 형식 ─────────

test('won: 원 단위 내림 + 천 단위 쉼표', () => {
  assert.equal(won(0), '0')
  assert.equal(won(1250.99), '1,250')
  assert.equal(won(30_000_000), '30,000,000')
})

test('dur: 초·분·시간 경계', () => {
  assert.equal(dur(0), '0초')
  assert.equal(dur(59_999), '59초')
  assert.equal(dur(60_000), '1분')
  assert.equal(dur(3_600_000), '1시간')
  assert.equal(dur(3_660_000), '1시간 1분')
})

test('clock: 음수는 00:00:00, 100시간 이상도 표시', () => {
  assert.equal(clock(-5), '00:00:00')
  assert.equal(clock(5 * 60_000), '00:05:00')
  assert.equal(clock(360_000_000 + 61_000), '100:01:01')
})

test('kstTime/dayKey: 한국 시간 기준', () => {
  assert.equal(kstTime(Date.parse('2026-10-07T15:30:00Z')), '00:30')
  assert.equal(dayKey(Date.parse('2026-10-07T15:30:00Z')), '2026-10-08')
})

test('회귀(moneyParts): 부동소수 오차로 0.01원 적게 보이지 않음, 소수는 내림', () => {
  const show = (x: number) => { const p = moneyParts(x); return `${p.whole}.${p.fraction}` }
  assert.equal(show(0.29), '0.29')
  assert.equal(show(4.35), '4.35')
  assert.equal(show(1.13), '1.13')
  assert.equal(show(1250), '1,250.00')
  assert.equal(show(9999.999), '9,999.99') // 반올림 아님: 내림
  assert.equal(show(-3), '0.00')
  assert.equal(show(12_345_678.9), '12,345,678.90')
})

test('compact: 달력 칸 금액 단위 경계', () => {
  assert.equal(compact(0), '0')
  assert.equal(compact(9_999.9), '9,999')
  assert.equal(compact(10_000), '1만')
  assert.equal(compact(15_400), '1.5만')
  assert.equal(compact(999_999), '100만')
  assert.equal(compact(6_682_000), '668만')
  assert.equal(compact(99_999_999), '9999만')
  assert.equal(compact(120_000_000), '1.2억')
})

// ───────── P5. 화면 계산 (App에서 분리한 순수 함수) ─────────

test('회귀(저장 실패 시 기록 유실): 저장이 실패 중이면 저장소 대신 화면 데이터를 기준으로 합침', () => {
  const current = data([sess('a', 10000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')])
  assert.equal(mergeBase(null, current, true), current) // 한 번도 저장 못 해 비어 있어도 유지
  assert.equal(mergeBase(JSON.stringify(empty()), current, true), current) // 낡은 저장값으로 덮지 않음
  assert.equal(mergeBase(undefined, current, false), current) // 읽기 자체가 실패
})

test('mergeBase: 저장이 정상이면 다른 탭의 변경(전체 삭제 포함)을 따름, 깨진 값은 무시', () => {
  const current = data([sess('a', 10000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')])
  const other = data([sess('b', 20000, '2026-10-07T11:00:00', '2026-10-07T12:00:00')])
  assert.deepEqual(mergeBase(JSON.stringify(other), current, false), other)
  assert.deepEqual(mergeBase(null, current, false), empty()) // 다른 탭에서 전체 삭제
  assert.equal(mergeBase('{bad', current, false), current)
})

test('pickCelebrations: 큰 보상부터 limit개, 넘치면 한 줄 요약', () => {
  const s = at(data([sess('a', 30_000_000, '2026-10-07T09:00:00', '2026-10-07T10:00:00')]))
  const g = groupNew(s.r.keys) // 11종
  const three = pickCelebrations(g, 3)
  assert.deepEqual(ids(three.shown.map((x) => x.reward)), ['laptop', 'carkey', 'car'])
  assert.equal(three.summary, '보상 11개를 모았어요')
  const one = pickCelebrations(g.slice(0, 1), 3)
  assert.equal(one.shown.length, 1)
  assert.equal(one.summary, '')
  assert.equal(pickCelebrations(g, 0).shown.length, 1) // limit 0이어도 최소 1개
})

test('trailIndexes: 처음·중간·전부 달성', () => {
  const name = (is: number[]) => is.map((i) => REWARDS[i].id)
  assert.deepEqual(name(trailIndexes(REWARDS[0])), ['coffee', 'jjajang', 'car'])
  assert.deepEqual(name(trailIndexes(REWARDS[6])), ['sneakers', 'headphones', 'travel', 'car'])
  assert.deepEqual(name(trailIndexes(REWARDS[10])), ['carkey', 'car'])
  assert.deepEqual(name(trailIndexes(null)), ['car'])
})

test('paginate: 빈 목록, 경계, 삭제로 페이지가 줄면 마지막 페이지로', () => {
  assert.deepEqual(paginate([], 0, 5), { page: 0, pages: 1, items: [] })
  const xs = Array.from({ length: 11 }, (_, i) => i)
  assert.deepEqual(paginate(xs, 0, 5).items, [0, 1, 2, 3, 4])
  assert.deepEqual(paginate(xs, 2, 5), { page: 2, pages: 3, items: [10] })
  assert.equal(paginate(xs.slice(0, 10), 2, 5).page, 1) // 11번째 삭제 → 2페이지로
  assert.equal(paginate(xs, -1, 5).page, 0)
  assert.equal(paginate(xs.slice(0, 5), 0, 5).pages, 1) // 딱 5개면 페이지 1개
})

test('calendar: 시작 요일 빈칸과 날짜 수 (윤년 포함)', () => {
  const oct = calendar('2026-10') // 2026-10-01은 목요일
  assert.equal(oct.filter((x) => x === null).length, 4)
  assert.equal(oct.filter(Boolean).length, 31)
  assert.equal(oct[4], '2026-10-01')
  assert.equal(calendar('2027-02').filter(Boolean).length, 28)
  assert.equal(calendar('2028-02').filter(Boolean).length, 29)
  assert.equal(calendar('2026-11').filter((x) => x === null).length, 0) // 11/1 일요일
})

console.log(`logic ok (${passed}개 통과)`)
