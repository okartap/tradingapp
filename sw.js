// Service worker — cachea el "app shell" para que la Guía y la Calculadora
// funcionen sin conexión. El Diario/Checklist necesitan conexión para
// sincronizar con Firestore (Firestore ya cachea localmente sus propios datos).
const CACHE = "trading-app-v4";
const ASSETS = ["./TradingOkar.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // No intervenir en llamadas a Firebase/Firestore/Auth — deben ir siempre a red.
  if (url.origin.includes("googleapis") || url.origin.includes("firebase") || url.origin.includes("gstatic")) return;
  // Red primero: así cada actualización del archivo se ve al instante.
  // Si no hay conexión, usa la copia guardada para que la app siga funcionando offline.
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp && resp.ok) caches.open(CACHE).then((c) => c.put(e.request, resp.clone()));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
