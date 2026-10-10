// 오프라인 실행용 서비스워커. 페이지는 네트워크 우선(새 배포 바로 반영), 나머지 같은 출처 파일은 캐시 우선(해시 파일명).
// ponytail: 옛 해시 파일이 캐시에 쌓임. 용량 문제되면 CACHE 이름을 올려 비운다.
const CACHE = 'roopang-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    )
    return
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
      return res
    }))
  )
})
