// Google Analytics 4. VITE_GA_ID가 없으면 아무것도 하지 않는다.
declare global {
  interface Window { dataLayer: unknown[]; gtag: (...args: unknown[]) => void }
}

const ID = import.meta.env.VITE_GA_ID as string | undefined

if (ID) {
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`
  document.head.append(s)
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', ID)
}

export const track = (name: string, params?: Record<string, unknown>) => {
  if (ID) window.gtag('event', name, params)
}
