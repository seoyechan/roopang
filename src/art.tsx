// 괴도 캐릭터와 보상 그림. 검은 굵은 선 + 초록 포인트, 투명 배경.
import type { ReactNode } from 'react'

const S = { stroke: 'var(--ink)', strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
const W = '#fff'

// 쇼핑백~자동차: 앞 4개(daily-rewards.png)와 같은 느낌으로 굵은 외곽선 + 명암 + 광택 + 괴도 얼굴 로고. 128 좌표계.
const O = { stroke: 'var(--ink)', strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
const C = { g: '#4be35f', gd: '#2cb845', gl: '#a4f7ae', cream: '#f8f1dc', creamD: '#e4d8b4', dark: '#262626', silver: '#dfe3e6', silverD: '#b7bec4' }
const gloss = { fill: 'none', stroke: '#fff', strokeWidth: 5, strokeLinecap: 'round', opacity: 0.6 } as const

/** 커피 컵·치킨 상자에 있는 잠든 괴도 얼굴 로고 */
function Face({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" stroke="var(--ink)" strokeWidth={4} />
      <ellipse cx={x} cy={y + r * 0.1} rx={r * 0.72} ry={r * 0.56} fill="var(--ink)" />
      <path d={`M${x - r * 0.5} ${y - r * 0.02}q${r * 0.16} ${-r * 0.14} ${r * 0.32} 0M${x + r * 0.18} ${y - r * 0.02}q${r * 0.16} ${-r * 0.14} ${r * 0.32} 0M${x - r * 0.26} ${y + r * 0.3}q${r * 0.26} ${r * 0.2} ${r * 0.52} 0`} fill="none" stroke="#fff" strokeWidth={Math.max(2, r * 0.11)} strokeLinecap="round" />
      <path d={`M${x} ${y - r * 0.5}q${-r * 0.1} ${-r * 0.3} ${r * 0.14} ${-r * 0.42}`} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
    </g>
  )
}

const ART: Record<string, ReactNode> = {
  shopping: (
    <>
      <path d="M44 50C44 14 84 14 84 50" fill="none" {...O} strokeWidth={11} />
      <path d="M44 50C44 14 84 14 84 50" fill="none" stroke={C.cream} strokeWidth={4} strokeLinecap="round" />
      <path d="M98 44l12 10-5 58-9 4z" fill={C.gd} {...O} />
      <path d="M22 44h76l-2 72H28z" fill={C.g} {...O} />
      <path d="M22 44h76l-.6 12H22.4z" fill={C.gl} {...O} strokeWidth={4} />
      <circle cx="44" cy="50" r="3.5" fill="var(--ink)" />
      <circle cx="84" cy="50" r="3.5" fill="var(--ink)" />
      <Face x={60} y={86} r={17} />
      <path d="M32 64v38" {...gloss} />
    </>
  ),
  sneakers: (
    <>
      <path d="M8 94h108a8 8 0 0 1 0 16H16a8 8 0 0 1-8-8z" fill="#fff" {...O} />
      <path d="M12 102h100" stroke={C.creamD} strokeWidth={4} strokeLinecap="round" />
      <path d="M40 42l7-16c2-4 8-4 10 0l-3 30z" fill={C.cream} {...O} strokeWidth={4} />
      <path d="M12 94V48c0-6 4-9 9-9h14c5 0 8 3 9 8l4 14c10 6 22 9 36 11l12 2c14 3 20 10 20 20z" fill={C.g} {...O} />
      <path d="M88 72l6 1c14 3 20 10 20 21H90c-4-7-4-15-2-22z" fill={C.cream} {...O} strokeWidth={4} />
      <path d="M12 50v22h11V47z" fill={C.gd} {...O} strokeWidth={4} />
      <path d="M46 50l16 8M45 61l18 8M50 72l17 5" fill="none" {...O} strokeWidth={9} />
      <path d="M46 50l16 8M45 61l18 8M50 72l17 5" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      <path d="M22 86c16-10 36-10 54-2" fill="none" stroke={C.cream} strokeWidth={7} strokeLinecap="round" />
      <Face x={31} y={64} r={7} />
      <path d="M18 78v8" {...gloss} strokeWidth={4} />
    </>
  ),
  headphones: (
    <>
      <path d="M28 78V62a36 36 0 0 1 72 0v16" fill="none" {...O} strokeWidth={16} />
      <path d="M28 78V62a36 36 0 0 1 72 0v16" fill="none" stroke={C.gd} strokeWidth={7} strokeLinecap="round" />
      <path d="M36 44a32 32 0 0 1 22-14" {...gloss} strokeWidth={3} />
      <rect x="12" y="66" width="28" height="46" rx="13" fill={C.g} {...O} />
      <rect x="88" y="66" width="28" height="46" rx="13" fill={C.g} {...O} />
      <rect x="36" y="72" width="12" height="34" rx="6" fill={C.dark} {...O} strokeWidth={4} />
      <rect x="80" y="72" width="12" height="34" rx="6" fill={C.dark} {...O} strokeWidth={4} />
      <Face x={26} y={89} r={10} />
      <path d="M104 76v26" {...gloss} strokeWidth={4} />
    </>
  ),
  travel: (
    <>
      <path d="M50 38V24a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v14" fill="none" {...O} strokeWidth={7} />
      <rect x="22" y="36" width="84" height="74" rx="14" fill={C.g} {...O} />
      <path d="M44 38v70M84 38v70" stroke={C.gd} strokeWidth={6} />
      <path d="M22 50V50a14 14 0 0 1 14-14h0v14zM106 50a14 14 0 0 0-14-14v14zM22 96v0a14 14 0 0 0 14 14V96zM106 96a14 14 0 0 1-14 14V96z" fill={C.cream} {...O} strokeWidth={4} />
      <Face x={64} y={62} r={12} />
      <rect x="54" y="82" width="22" height="16" rx="4" fill={C.cream} {...O} strokeWidth={4} transform="rotate(-8 65 90)" />
      <circle cx="38" cy="116" r="7" fill={C.dark} {...O} strokeWidth={4} />
      <circle cx="90" cy="116" r="7" fill={C.dark} {...O} strokeWidth={4} />
      <path d="M32 56v34" {...gloss} />
    </>
  ),
  laptop: (
    <>
      <rect x="20" y="18" width="88" height="64" rx="8" fill={C.dark} {...O} />
      <rect x="27" y="25" width="74" height="50" rx="3" fill={C.g} />
      <path d="M27 75l30-50h18L45 75z" fill="#fff" opacity=".25" />
      <Face x={64} y={50} r={14} />
      <path d="M6 86h116l-7 16a6 6 0 0 1-5 3H18a6 6 0 0 1-5-3z" fill={C.silver} {...O} />
      <path d="M6 86h116" {...O} />
      <rect x="52" y="90" width="24" height="6" rx="3" fill={C.silverD} />
    </>
  ),
  carkey: (
    <>
      <circle cx="30" cy="24" r="13" fill="none" {...O} strokeWidth={11} />
      <circle cx="30" cy="24" r="13" fill="none" stroke={C.silver} strokeWidth={4} />
      <path d="M56 70h52l8 8-8 6v8h-8v-6h-8v8h-8v-8h-8v6h-8z" fill={C.silver} {...O} />
      <path d="M64 76h40" stroke={C.silverD} strokeWidth={3} strokeLinecap="round" />
      <rect x="16" y="34" width="46" height="80" rx="20" fill={C.dark} {...O} transform="rotate(-12 39 74)" />
      <g transform="rotate(-12 39 74)">
        <circle cx="39" cy="56" r="9" fill={C.g} {...O} strokeWidth={3} />
        <circle cx="39" cy="80" r="9" fill={C.g} {...O} strokeWidth={3} />
        <path d="M35 57v-3a4 4 0 0 1 8 0v3M34 57h10v6H34z" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M35 80l4-4 4 4M39 76v9" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx="39" cy="100" r="5" fill={C.gd} />
        <path d="M24 50v44" {...gloss} strokeWidth={4} opacity=".35" />
      </g>
    </>
  ),
  car: (
    <>
      <ellipse cx="64" cy="112" rx="54" ry="5" fill="var(--ink)" opacity=".12" />
      <path d="M8 96V82c0-8 5-13 13-15l15-3 14-18c3-4 8-6 13-6h20c7 0 12 3 16 9l11 16c9 2 14 7 14 15v16z" fill={C.g} {...O} />
      <path d="M40 64l12-15c2-2 4-3 7-3h8v18zM75 46h8c5 0 8 2 11 6l8 12H75z" fill="#dff6f7" {...O} strokeWidth={4} />
      <path d="M48 58l6-7" {...gloss} strokeWidth={4} />
      <path d="M8 86h116" stroke={C.gd} strokeWidth={5} />
      <path d="M112 76h10v8h-9z" fill="#ffd84d" {...O} strokeWidth={3.5} />
      <path d="M8 76h6v8H8z" fill="#ff7a6b" {...O} strokeWidth={3.5} />
      <Face x={72} y={78} r={9} />
      <g className="wheel">
        <circle cx="34" cy="98" r="14" fill={C.dark} {...O} />
        <circle cx="34" cy="98" r="6" fill={C.silver} stroke="var(--ink)" strokeWidth={3} />
      </g>
      <g className="wheel">
        <circle cx="96" cy="98" r="14" fill={C.dark} {...O} />
        <circle cx="96" cy="98" r="6" fill={C.silver} stroke="var(--ink)" strokeWidth={3} />
      </g>
    </>
  ),
}

export function Art({ id, size = 48, label }: { id: string; size?: number; label?: string }) {
  const cell = ['coffee', 'jjajang', 'chicken', 'dinner'].indexOf(id)
  if (cell !== -1) return (
    <span
      className={`art reward-sprite art-${id}`}
      style={{ width: size, height: size, backgroundPosition: `${(cell % 2) * 100}% ${Math.floor(cell / 2) * 100}%` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
  return (
    <svg className={`art art-${id}`} viewBox="0 0 128 128" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {ART[id]}
    </svg>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
      <circle cx="16" cy="17" r="12" fill={W} {...S} />
      <path d="M4 13h24v6c-4 2-8 1-12-1-4 2-8 3-12 1z" fill="var(--ink)" />
      <circle cx="11" cy="16" r="1.6" fill={W} />
      <circle cx="21" cy="16" r="1.6" fill={W} />
    </svg>
  )
}

/** 대기: 돈통 옆에서 기다림 · 루팡 중: 느리게 들썩임 · 종료: 짧게 자세 변경 */
export function Mascot({ mode }: { mode: 'idle' | 'running' | 'done' }) {
  return (
    <div className={`mascot mascot-${mode}`} aria-hidden>
      <img src={`${import.meta.env.BASE_URL}art/lupin-resting.png`} width="1536" height="1024" alt="" fetchPriority="high" />
      {mode === 'running' && <span className="rest-marks"><i>z</i><i>z</i><i>Z</i></span>}
    </div>
  )
}

