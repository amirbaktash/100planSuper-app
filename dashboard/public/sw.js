/* 100plan PWA service worker for the DARIC token demo.
 * Cache only the app shell and versioned static assets; never cache API/auth/user data.
 */
const CACHE_PREFIX = "daric-static-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const LEGACY_CACHE_NAMES = new Set(["daric-v1"]);
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./daric-token-512.png",
  "./daric-banner.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable.png",
  "./icons/apple-touch-icon.png",
];

const PRIVATE_PATH = /\/(?:api|auth|account|accounts|wallet|transactions?|kyc|profile|private)(?:\/|$)/i;
const STATIC_FILE = /^(?:assets|icons)\/[^/]+\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webp|woff2?|ttf)$/i;
const ROOT_STATIC_FILE = /^(?:daric-token-512\.png|daric-banner\.png|manifest\.webmanifest)$/i;

function isInScope(url) {
  const scope = new URL(self.registration.scope);
  return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
}

function isCacheableStatic(request, url) {
  if (request.method !== "GET" || request.headers.has("authorization")) return false;
  if (!isInScope(url) || PRIVATE_PATH.test(url.pathname)) return false;

  const scopePath = new URL(self.registration.scope).pathname;
  const relativePath = decodeURIComponent(url.pathname.slice(scopePath.length)).replace(/^\//, "");
  return ROOT_STATIC_FILE.test(relativePath) || STATIC_FILE.test(relativePath);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME &&
                (key.startsWith(CACHE_PREFIX) || LEGACY_CACHE_NAMES.has(key))
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (!isInScope(url) || request.method !== "GET") return;

  // HTML is network-first and is never added to Cache Storage. Only the
  // pre-cached generic shell is used as an offline fallback for navigation.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(new URL("./index.html", self.registration.scope).href))
    );
    return;
  }

  // API, authenticated and other dynamic requests pass directly to the network.
  if (!isCacheableStatic(request, url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const refresh = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          return cache.put(request, response.clone()).then(() => response);
        }
        return response;
      });

      if (cached) {
        event.waitUntil(refresh.catch(() => {}));
        return cached;
      }
      return refresh;
    })()
  );
});
