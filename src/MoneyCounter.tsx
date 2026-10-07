import { memo, useLayoutEffect, useRef } from 'react'
import { moneyParts } from './logic.ts'

/** Keep each place mounted: only the digits that change roll, never the whole amount. */
const RollingDigit = memo(function RollingDigit({ value }: { value: string }) {
  const old = useRef<HTMLSpanElement>(null)
  const current = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = value
    if (from === value || !old.current || !current.current) return
    old.current.textContent = from
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timing = { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    const leave = old.current.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-105%)', opacity: 0 },
    ], timing)
    const enter = current.current.animate([
      { transform: 'translateY(105%)', opacity: .35 },
      { transform: 'translateY(0)', opacity: 1 },
    ], timing)
    return () => { leave.cancel(); enter.cancel() }
  }, [value])

  return <span className="digit-window">
    <span ref={old} className="digit-old" aria-hidden />
    <span ref={current} className="digit-current">{value}</span>
  </span>
})

export default function MoneyCounter({ amount }: { amount: number }) {
  const { whole: formatted, fraction } = moneyParts(amount)

  return <p className={`amount len-${Math.min(formatted.length, 13)}`} aria-label={`${formatted}.${fraction}원`}>
    <span className="money-visual" aria-hidden>
      <span className="cur">₩</span>
      <span className="digits">
        {[...formatted].map((char, i) => char === ','
          ? <span className="digit-comma" key={`comma-${formatted.length - i}`}>,</span>
          : <RollingDigit key={`place-${formatted.length - i}`} value={char} />)}
      </span>
      <span className="frac">.{fraction}</span>
    </span>
  </p>
}
