/**
 * Service Worker — OWL Finance PWA
 * 
 * Estratégia: Cache-first para assets estáticos,
 * Network-first para API calls (com fallback pro cache).
 */

const CACHE_NAME = 'owlfinance-v1';

// Assets estáticos que devem ser cacheados na instalação
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── INSTALL ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Ativar imediatamente sem esperar
  self.skipWaiting();
});

// ─── ACTIVATE ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  // Tomar controle de todas as páginas abertas
  self.clients.claim();
});

// ─── FETCH ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET (POST, PUT, DELETE passam direto)
  if (request.method !== 'GET') return;

  // API calls: Network-first com fallback para cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear a resposta da API para uso offline
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Sem rede: tentar cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Sem cache: retornar erro formatado
            return new Response(
              JSON.stringify({ error: 'offline', message: 'Dados offline não disponíveis' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Assets estáticos: Cache-first com fallback para rede
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cachear para próximas vezes
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback: para navegação, retornar a página principal cacheada
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
