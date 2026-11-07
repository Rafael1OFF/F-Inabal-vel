/* Pilares da Fé — cache offline do aplicativo */
const CACHE_NAME = 'pilares-da-fe1';
const CORE_ASSETS = [
    './',
    './index.html',
    './intro.html',
    './manifest.webmanifest',
    './icons/logo.png',
    './icons/favicon-32.png',
    './icons/favicon-48.png',
    './icons/apple-touch-icon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];
const OPTIONAL_ASSETS = ['./bg.jpg', './pilar1.png'];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(CORE_ASSETS.map(async (asset) => {
            try {
                const response = await fetch(new Request(asset, { cache: 'reload' }));
                if (response.ok) await cache.put(asset, response);
            } catch (_) {
                // Um recurso opcional ou indisponível não impede a instalação do shell.
            }
        }));
        await Promise.all(OPTIONAL_ASSETS.map(async (asset) => {
            try {
                const response = await fetch(new Request(asset, { cache: 'reload' }));
                if (response.ok) await cache.put(asset, response);
            } catch (_) {}
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter((key) => key.startsWith('pilares-da-fe-') && key !== CACHE_NAME)
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
            try {
                const response = await fetch(request);
                if (response && response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put('./index.html', response.clone());
                }
                return response;
            } catch (_) {
                const cachedPage = await caches.match('./index.html');
                return cachedPage || new Response(
                    'Conecte-se à internet uma vez para carregar o aplicativo e ativar o modo offline.',
                    { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
                );
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
                await cache.put(request, response.clone());
            }
            return response;
        } catch (_) {
            return new Response('', { status: 504, statusText: 'Offline' });
        }
    })());
});
