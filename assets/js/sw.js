const CACHE_NAME = 'sobox-v2';
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'assets/css/styles.css',
    'assets/js/script.js',
    'assets/images/sobox-logo.svg',
    'assets/images/presentation.png',
    'assets/images/pas-de-coup-de-coeur.jpg',
    'assets/images/noEvents.png',
    'assets/images/logo-seul-sobox.png'
    // Retirez les URLs externes ou traitez-les séparément
];
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to fetch ${url}: ${response.status}`);
                                }
                                return cache.put(url, response);
                            })
                            .catch(err => {
                                console.warn(`Could not cache ${url}:`, err);
                                // Continue même si une ressource échoue
                            });
                    })
                );
            })
            .then(() => self.skipWaiting())
            .catch(err => {
                console.error('Cache installation failed:', err);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Exclusion des requêtes API et autres ressources dynamiques
    if (event.request.url.includes('/api/') ||
        event.request.method !== 'GET') {
        return fetch(event.request);
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                return cachedResponse || fetch(event.request)
                    .then(networkResponse => {
                        // Mise en cache des nouvelles réponses
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                    })
                    .catch(() => {
                        // Fallback pour les pages
                        if (event.request.mode === 'navigate') {
                            return caches.match('offline.html');
                        }
                        return new Response('Ressource non disponible hors ligne');
                    });
            })
    );
});


// Gestion de l'installation PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Affiche le bouton après un délai (optionnel)
    setTimeout(() => {
        const installContainer = document.getElementById('installContainer');
        if (installContainer) installContainer.style.display = 'block';
    }, 3000);
});

// Gestion du clic sur le bouton d'installation
document.addEventListener('DOMContentLoaded', () => {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();

            const { outcome } = await deferredPrompt.userChoice;
            console.log('Résultat de l\'installation:', outcome);

            deferredPrompt = null;
            document.getElementById('installContainer').style.display = 'none';
        });
    }
});

// Cache le bouton si l'app est déjà installée
window.addEventListener('appinstalled', () => {
    const installContainer = document.getElementById('installContainer');
    if (installContainer) installContainer.style.display = 'none';
    console.log('PWA installée avec succès');
});