// Service worker — guarda una copia de la app para que abra sin conexión.
// Los datos (Firestore/Auth) siempre van a la red; Firestore ya guarda su
// propia copia local de las operaciones.
const CACHE = "trading-app-v6";
const ASSETS = ["./TradingOkar.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

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

  // Librerías de Firebase (versión fija) y tipografías: copia guardada primero.
  // Sin esto la app no arranca sin conexión, porque sin Firebase no hay login.
  const esLibreria = (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"))
    || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (esLibreria) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
        if (resp && (resp.ok || resp.type === "opaque")) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      }))
    );
    return;
  }

  // Llamadas de datos a Firebase/Google: siempre a la red, sin tocar.
  if (url.origin !== self.location.origin) return;

  // Archivos de la propia app: red primero (cada actualización se ve al
  // instante) y, sin conexión, la copia guardada.
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp && resp.ok) {
        const copia = resp.clone(); // se copia ANTES de devolver la respuesta
        caches.open(CACHE).then((c) => c.put(e.request, copia));
      }
      return resp;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
