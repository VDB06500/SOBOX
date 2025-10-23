const CACHE_NAME = 'sobox-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/offline.html',
    '/assets/css/styles.css',
    '/assets/css/bootstrap-icons.css',
    '/assets/fonts/bootstrap-icons.woff2',
    '/assets/css/bootstrap-icons_font_bootstrap-icons.css',
    '/assets/css/bootstrap@5.3.0_dist_css_bootstrap.min.css',
    '/assets/css/font-awesome_6.0.0_css_all.min.css',
    '/assets/js/script.js',
    '/assets/images/sobox-logo.svg',
    '/assets/images/presentation.png',
    '/assets/images/pas-de-coup-de-coeur.jpg',
    '/assets/images/noEvents.png',
    '/assets/images/logo-seul-sobox.png',
    // ---- Gestion des boutons : wifi
    '/assets/images/btn_pasdewifi.png',
    // --- Gestion des boutons : modale
    '/assets/images/btn_info.png',
    '/assets/images/btn_warning.png',
    '/assets/images/btn_error.png'
];

// === Installation ===
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache ouvert, préchargement des assets');
                return cache.addAll(ASSETS_TO_CACHE); // Utilise addAll() pour simplifier
            })
            .then(() => self.skipWaiting()) // Active immédiatement le nouveau SW
            .catch(err => console.error('[SW] Échec de l’installation:', err))
    );
});

// === Gestion des requêtes (Network First) ===
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Ignore les requêtes non-HTTP(S) ou non-GET (API, POST, etc.)
    if (!['http:', 'https:'].includes(requestUrl.protocol) ||
        event.request.method !== 'GET' ||
        requestUrl.pathname.includes('/api/')) {
        return fetch(event.request); // Pas de mise en cache
    }

    event.respondWith(
        fetch(event.request) // 1. Essaye d'abord le réseau
            .then(networkResponse => {
                // Mise à jour du cache en arrière-plan
                if (networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseClone));
                }
                return networkResponse;
            })
            .catch(() => {
                // 2. Fallback au cache si hors ligne
                return caches.match(event.request)
                    .then(cachedResponse => {
                        // Fallback spécial pour les pages (mode navigate)
                        if (event.request.mode === 'navigate' && !cachedResponse) {
                            return caches.match('/offline.html');
                        }
                        return cachedResponse || new Response('Hors ligne', { status: 503 });
                    });
            })
    );
});

// === Nettoyage des anciens caches ===
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(name => {
                        if (name !== CACHE_NAME) return caches.delete(name);
                    })
                );
            })
            .then(() => {
                console.log('[SW] Anciens caches nettoyés, prêt à contrôler les clients');
                return self.clients.claim(); // Prend le contrôle immédiat
            })
    );
});