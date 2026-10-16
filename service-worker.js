// Service Worker لتطبيق حَلَقَتي
// الفكرة: نخزّن الصفحة وكل ملف ناجح (حتى لو من CDN خارجي مثل React أو الخطوط) في الكاش
// فور نجاح تحميله أول مرة بالإنترنت. بعدها، أي فتح لاحق للتطبيق بدون إنترنت
// يعتمد على هذه النسخة المخزّنة بدل ما يفشل بالكامل.

const CACHE_NAME = 'halaqati-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // نخزّن أي استجابة ناجحة (الصفحة نفسها، أو أي مكتبة/خط جاء من CDN) لتعمل لاحقاً بدون إنترنت
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || caches.match('./index.html'));

      // إن وجدت نسخة مخزّنة مسبقاً نعيدها فوراً (أسرع)، وإلا ننتظر نتيجة الشبكة
      return cached || networkFetch;
    })
  );
});
