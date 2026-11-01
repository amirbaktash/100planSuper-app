/* ═══════════════════════════════════════════════════════════
   DARIC Super App — Service Worker (PWA: نصب روی اندروید/iOS)
   ═══════════════════════════════════════════════════════════ */
const CACHE = "daric-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./daric-token-512.png",
  "./daric-banner.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // ناوبری: شبکه اول، در صورت قطعی از کش
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // بقیه منابع: کش اول، سپس شبکه (stale-while-revalidate)
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((r) => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return r;
        })
    )
  );
});
