/* eLectura · service worker.
   La app abre al instante desde lo guardado en el cel (con o sin internet)
   y se actualiza en segundo plano. Al publicar cambios, sube VERSION. */
const VERSION = 'electura-v1.0.2';
const SHELL = ['./', 'index.html', 'app.js', 'services.js', 'config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7.23.5/babel.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,600&family=Work+Sans:wght@400;500;600&family=Atkinson+Hyperlegible:wght@400;700&display=swap'
];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    // Lo propio es obligatorio; las librerías se intentan una por una.
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    await Promise.all(LIBS.map(u => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Archivos propios: responde con lo guardado y actualiza en segundo plano.
  if (url.origin === self.location.origin) {
    const isPage = req.mode === 'navigate';
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(isPage ? 'index.html' : req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res.ok && !isPage) c.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || new Response('Sin conexión', { status: 503 });
    }));
    return;
  }

  // Librerías y tipografías: versiones fijas, primero lo guardado.
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    })));
  }
  // Búsquedas, diccionario y Google Drive van directo a internet.
});
