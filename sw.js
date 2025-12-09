// sw.js

const CACHE_NAME = "pwa-network-reloader-v1.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 對自己的資源用 Cache-first，對外部資源直接走網路（交給瀏覽器）
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 同源資源 → 使用 Cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).catch(() => {
            // 若需要可回傳自訂離線頁
            return cached;
          })
        );
      })
    );
    return;
  }

  // 外部資源：直接 let it go（通常是 iframe 需要的資源）
  // 你也可以改成 network-first + fallback，看需求
});
