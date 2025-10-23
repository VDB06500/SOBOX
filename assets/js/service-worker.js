const CACHE_NAME = 'webapp-v1';
const OFFLINE_PAGE = '/offline.html';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/offline.html',
    '/assets/css/styles.css',
    '/assets/js/script.js',
    // Ajoutez ici toutes les ressources à mettre en cache
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retourner la ressource en cache si elle existe
                if (response) {
                    return response;
                }

                // Sinon, faire une requête réseau
                return fetch(event.request)
                    .catch(() => {
                        // Si la requête échoue (hors ligne), afficher la page hors ligne
                        return caches.match(OFFLINE_PAGE);
                    });
            })
    );
});

// Mise à jour du cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});