self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("englishapp-v1").then((cache) => cache.addAll(["/", "/practice", "/materials", "/profile"])));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
