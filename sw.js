/**
 * Service Worker — Stream Master Pro (v3)
 * الإصلاحات:
 *  - عدم تخزين ردود البروكسي ومقاطع البث (.ts/.m3u8) أو أي استجابة opaque.
 *  - تخزين الموارد نفس-الأصل فقط، مع حد أقصى لعدد العناصر.
 *  - stale-while-revalidate للصور/الأنماط بدل cache-first الأبدي.
 *  - network-first للصفحات (مع fallback للكاش ثم offline.html).
 *  - دعم رسالة SKIP_WAITING للتحديث الفوري.
 */
const VERSION = 'v4-redesign';
const STATIC_CACHE  = `stream-master-static-${VERSION}`;
const RUNTIME_CACHE = `stream-master-runtime-${VERSION}`;
const MAX_RUNTIME_ITEMS = 60;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/world-cup-2026/',
  '/store/',
  '/images/og-default.png',
  '/images/store-og.png',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// لا تتدخّل في هذه الطلبات إطلاقاً
const BYPASS_HOSTS = ['worldcup26.ir', 'api.frankfurter.app', 'onesignal.com'];
const BYPASS_PATHS = [/^\/proxy\.php/, /^\/admin-dashboard/, /^\/admin\//, /^\/cart/, /^\/search/];
const NO_CACHE_EXT = /\.(m3u8|m3u|ts|mp4|mpd|key)(\?|$)/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== STATIC_CACHE && n !== RUNTIME_CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    for (const k of keys.slice(0, keys.length - max)) await cache.delete(k);
  }
}

/** هل يجوز تخزين هذه الاستجابة؟ */
function isCacheable(request, response) {
  return (
    response &&
    response.ok &&                      // 200-299 فقط
    response.type === 'basic' &&        // نفس الأصل فقط — لا opaque
    request.method === 'GET' &&
    !NO_CACHE_EXT.test(new URL(request.url).pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  if (BYPASS_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return;
  if (url.origin !== self.location.origin) return;              // لا نتدخل في النطاقات الخارجية
  if (BYPASS_PATHS.some((re) => re.test(url.pathname))) return; // صفحات ديناميكية/حساسة
  if (NO_CACHE_EXT.test(url.pathname)) return;                  // مقاطع البث

  // الصفحات: الشبكة أولاً
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        if (isCacheable(request, net)) {
          const clone = net.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone).then(() => trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS)));
        }
        return net;
      } catch {
        return (await caches.match(request)) || (await caches.match('/offline.html')) || Response.error();
      }
    })());
    return;
  }

  const dest = request.destination;

  // أصول ذات بصمة في الاسم (immutable) ⇒ cache-first
  if (url.pathname.startsWith('/_assets/')) {
    event.respondWith((async () => {
      const hit = await caches.match(request);
      if (hit) return hit;
      const net = await fetch(request);
      if (isCacheable(request, net)) {
        const clone = net.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
      }
      return net;
    })());
    return;
  }

  // الصور/الأنماط/السكربتات/الخطوط ⇒ stale-while-revalidate
  if (['image', 'style', 'script', 'font'].includes(dest)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const network = fetch(request).then((net) => {
        if (isCacheable(request, net)) {
          const clone = net.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone).then(() => trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS)));
        }
        return net;
      }).catch(() => null);
      return cached || (await network) || (dest === 'image' ? caches.match('/icon-192.png') : Response.error());
    })());
    return;
  }

  // غير ذلك: الشبكة ثم الكاش
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
