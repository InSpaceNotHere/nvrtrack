const CACHE_NAME = "nvrtrack-static-v1";
const STATIC_PATHS = [
  "/manifest.webmanifest",
  "/pwa/icon-192",
  "/pwa/icon-512",
  "/pwa/apple-icon",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_PATHS.map((path) => new Request(path, { cache: "reload" })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const isSafeStaticAsset =
    url.pathname.startsWith("/_next/static/") || STATIC_PATHS.includes(url.pathname);

  if (!isSafeStaticAsset) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })(),
  );
});
