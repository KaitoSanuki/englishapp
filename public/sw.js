const CACHE_NAME = "englishapp-runtime-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Avoid serving stale app routes. For document navigation, prefer network.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          await cache.put(req, res.clone());
          return res;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);
          return cached || Response.error();
        }
      })()
    );
  }
});
