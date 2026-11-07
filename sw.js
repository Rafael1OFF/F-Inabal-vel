/* Pilares da Fé — cache offline do aplicativo */
const CACHE_NAME = 'A-fé1';
const CORE_ASSETS = ['./', './index.html', './manifest.webmanifest'];
const OPTIONAL_ASSETS = ['../icons/logo.png', './bg.jpg', './pilar1.png'];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(CORE_ASSETS.map(async (asset) => {
            try {
                const response = await fetch(new Request(asset, { cache: 'reload' }));
                if (response.ok) await cache.put(asset, response);
            } catch (_) {
                // O shell continua instalável mesmo que o host não exponha ./ separadamente.
            }
        }));
        await Promise.all(OPTIONAL_ASSETS.map(async (asset) => {
            try {
                const response = await fetch(new Request(asset, { cache: 'reload' }));
                if (response.ok) await cache.put(asset, response);
            } catch (_) {
                // Imagens opcionais não impedem o modo offline.
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('pilares-da-fe-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            const cachedPage = await caches.match('./index.html');
            try {
                const response = await fetch(request);
                if (response && response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put('./index.html', response.clone());
                }
                return response;
            } catch (_) {
                return cachedPage || new Response('O aplicativo ainda não foi carregado neste dispositivo. Conecte-se à internet uma vez para ativar o modo offline.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
            const response = await fetch(request);
            if (response && response.ok && response.type === 'basic') {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, response.clone());
            }
            return response;
        } catch (_) {
            return new Response('', { status: 504, statusText: 'Offline' });
        }
    })());
});
