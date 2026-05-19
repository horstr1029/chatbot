const CACHE = 'mst-chatbot-v1'
const STATIC = ['/', '/login', '/manifest.json', '/icon.svg', '/logo.jpg']

// Pre-cache shell on install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

// Take control of all clients immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Network-first for API/auth, cache-first for static assets
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API calls: network-only (never cache)
  if (url.pathname.startsWith('/api/')) return

  // Static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/)
  ) {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached ?? fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
      )
    )
    return
  }

  // Pages: network-first, fall back to cache
  e.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(request, clone))
        return res
      })
      .catch(() => caches.match(request))
  )
})

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'MST Chatbot', {
      body: data.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/chat' },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url || '/chat'
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(target)
    })
  )
})
