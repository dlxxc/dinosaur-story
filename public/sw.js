// Service Worker：恐龙教养故事网站离线支持
// 缓存策略：
//   1. App Shell（HTML/JS/CSS）：cache-first，离线时可访问
//   2. 故事图片/音频：不拦截（由 IndexedDB 中的 base64 处理）
//   3. 外部请求：network-first
const CACHE_VERSION = 'v2'
const SHELL_CACHE = `dino-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `dino-runtime-${CACHE_VERSION}`
const APP_SHELL = [
  '/',
  '/index.html'
]

// Install：预缓存 App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

// Activate：清理旧缓存
self.addEventListener('activate', (event) => {
  const expectedCaches = [SHELL_CACHE, RUNTIME_CACHE]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !expectedCaches.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch：缓存优先策略
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // 只处理同源请求
  if (url.origin !== self.location.origin) return

  // 跳过 POST/PUT/DELETE 等非 GET 请求
  if (req.method !== 'GET') return

  // 导航请求（HTML 页面）：cache-first
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const clone = resp.clone()
        caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone))
        return resp
      }).catch(() => caches.match('/index.html')))
    )
    return
  }

  // 故事图片/音频：不缓存（已由 IndexedDB 存储 base64，避免双重存储）
  if (url.pathname.startsWith('/stories/') || url.pathname.startsWith('/audio/')) {
    return
  }

  // 静态资源（JS/CSS/字体/非故事图片）：cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((resp) => {
        // 只缓存成功的同源响应
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone))
        }
        return resp
      }).catch(() => cached)
    })
  )
})

// 监听消息：允许更新缓存版本
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
