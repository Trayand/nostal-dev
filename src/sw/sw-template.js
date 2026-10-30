/* Programming Hub service worker (plain JS, no library).
 * scripts/gen-sw.ts copies this file to out/sw.js after `next build` and
 * replaces the two placeholders below with the list of every built file and
 * a content hash. A new hash = a new cache = the app updates.
 */
const PRECACHE = self.__PRECACHE__; // e.g. ["/", "/practice/", "/_next/static/..."]
const CACHE = "ph-" + self.__VERSION__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  // Do not skipWaiting automatically: the page shows an "update available"
  // banner and sends SKIP_WAITING when the user taps reload.
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ph-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Query strings (?_rsc=..., ?track=js) never change the static file served.
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      if (req.mode === "navigate") {
        // "/practice" → "/practice/" (trailingSlash export layout)
        const withSlash = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
        const page = await cache.match(withSlash);
        if (page) return page;
      }

      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (req.mode === "navigate") {
          const home = await cache.match(self.registration.scope);
          if (home) return home;
        }
        throw err;
      }
    })(),
  );
});
