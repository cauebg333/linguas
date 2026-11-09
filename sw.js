// Service worker do Linguas: deixa o app funcionando offline.
// O publicar.py troca CACHE_VERSION por um hash do conteúdo em dist/sw.js,
// então cada publicação nova força o celular a baixar a versão atualizada.
const CACHE_VERSION = 'linguas-87f4fb4148';

const PRECACHE = [
  './',
  './index.html',
  './app.html',
  './manifest.webmanifest',
  './vendor/ts-fsrs.mjs',
  './corpus/corpus.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: responde na hora com o cache (funciona offline)
// e atualiza o cache em segundo plano quando há rede. Mudanças publicadas
// aparecem na abertura seguinte do app.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      if (res) return res;
      if (req.mode === 'navigate') {
        const shell = await cache.match('./app.html');
        if (shell) return shell;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
