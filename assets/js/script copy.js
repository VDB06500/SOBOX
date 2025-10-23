// Gestionnaire d'application
class App {
    constructor() {

        // Variables globales
        this.imagesList = []; // Liste des images
        this.batchSize = 10; // Taille du lot d'images à charger
        this.currentBatchIndex = 0; // Index du lot actuel
        this.currentImageIndex = 0; // Index de l'image actuellement affichée
        this.currentImageToDownload = null; // Image actuellement sélectionnée pour le téléchargement

        this.observers = []; // Pour stocker les instances d'observers
        this.isLoadingBatch = false; // Pour éviter les chargements multiples

        this.scrollObserver = null; // Ajoutez cette ligne

        // this.handleResize = this.handleResize.bind(this);
        // window.addEventListener('resize', this.handleResize)

        // Attendre que le DOM soit chargé
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeDOMReferences();
            this.init();
        });
    }

    handleResize() {
        // Recréer le sentinel si nécessaire
        if (this.currentBatchIndex < this.imagesList.length) {
            this.setupScrollObserver();
        }
    }

    initializeDOMReferences() {
        this.mainContent = document.getElementById('mainContent');
        this.titreHeader = document.getElementById('eventName');
        this.btnRetour = document.getElementById('btnRetour');
        this.gallery = document.getElementById('gallery');
        this.photoCountElement = document.querySelector('#main-nav [data-page="photobooth-page"] span');

        this.nextImageButton = document.getElementById('nextImage');
        this.prevImageButton = document.getElementById('prevImage');
        this.downloadButton = document.getElementById('downloadButton');

        document.getElementById('openModalButton').addEventListener('click', openEventCodeModal);

    }

    // Fonction pour ouvrir la modale
    openEventCodeModal() {
        document.getElementById('eventCodeModal').style.display = 'block';
        document.getElementById('eventCodeInput').focus(); // Focus sur le champ input
    }

    // Fonction pour fermer la modale
    closeEventCodeModal() {
        document.getElementById('eventCodeModal').style.display = 'none';
        document.getElementById('eventCodeInput').value = ''; // Réinitialiser le champ
    }

    init() {
        // Initialiser la navigation
        console.log('this.setupNavigation()');
        this.setupNavigation();

        // Cacher la barre de navigation au démarrage
        console.log('this.toggleNavBar(false)');
        this.toggleNavBar(false);

        // Gestion de la modale
        console.log('this.setupEventCodeModal()');
        this.setupEventCodeModal();

        // Simuler un chargement pour la splash screen
        setTimeout(() => {
            console.log('this.navigateTo(events-page)');
            this.navigateTo('events-page');
        }, 3000);
    }

    showError(message, type = 'alert') {
        console.error('Erreur:', message);

        // Méthode 1: Alert standard
        if (type === 'alert') {
            alert(`Erreur: ${message}`);
            return;
        }

        // Méthode 2: Toast notification
        if (type === 'toast') {
            this.showToast(message, 'error');
            return;
        }

        // Méthode 3: Message inline dans l'UI
        const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';

        // Masquer après 5 secondes
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    createErrorContainer() {
        const container = document.createElement('div');
        container.id = 'error-container';
        container.className = 'error-message';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: #ff4444;
            color: white;
            border-radius: 5px;
            display: none;
            z-index: 1000;
        `;
        document.body.appendChild(container);
        return container;
    }

    setupNavigation() {
        // Gestion des clics sur les éléments de navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.getAttribute('data-page');
                if (pageId !== this.currentPage) {
                    this.navigateTo(pageId);
                }
            });
        });

        // Gestion des clics sur les cartes d'événements
        document.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const galleryId = card.getAttribute('data-gallery');
                if (galleryId) {
                    // this.loadthis.gallery(this.galleryId);
                    this.navigateTo('gallery-page');
                    console.log('dddddd');
                }
            });
        });
    }

    loadgallery(galleryId) {
        const gallery = galleries[galleryId];
        if (!gallery) return;

        // Mettre à jour le titre de la galerie
        document.getElementById('gallery-title').textContent = gallery.title;

        // Générer le contenu de la galerie
        const galleryContent = document.getElementById('gallery-content');
        galleryContent.innerHTML = '';

        this.gallery.images.forEach(imageUrl => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'gallery-item';
            galleryContent.appendChild(img);
        });
    }

    // ------------------------------------------------------------------------------------------------------
    //  OUVERTURE DE LA BDD : EventsDB
    // ------------------------------------------------------------------------------------------------------

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EventsDB', 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                try {
                    if (!db.objectStoreNames.contains('events')) {
                        const store = db.createObjectStore('events', { keyPath: 'id' });
                        // Vous pouvez ajouter des index ici si besoin
                        // store.createIndex('name', 'nom', { unique: false });
                    }
                } catch (error) {
                    reject(`Erreur lors de la création du store: ${error}`);
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => {
                console.error('IndexedDB error:', e.target.error);
                reject(`Erreur IndexedDB: ${e.target.error.name}`);
            };
        });
    }

    navigateTo(pageId) {

        // Masquer toutes les pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Afficher la nouvelle page
        const activePage = document.getElementById(pageId);
        if (activePage) {
            activePage.classList.add('active');
        }

        // Gérer la visibilité de la navigation
        const navBar = document.getElementById('main-nav');
        if (navBar) {
            // Toujours afficher la nav sauf pour events-page
            navBar.style.display = pageId === 'events-page' ? 'none' : 'flex';
        }

        // Initialisations spécifiques
        if (pageId === 'events-page') this.initPage();
        if (pageId === 'gallery-page') this.initializeApp();
        if (pageId === 'photobooth-page') this.initPhotobooth(pageId);
        if (pageId === 'favorites-page') this.initFavorites(pageId);
        if (pageId === 'qrcode-page') this.initQrcode(pageId);
    }

    toggleNavBar(show) {
        // Cette fonction n'est plus nécessaire si la nav est toujours visible
        // Ou vous pouvez l'utiliser pour changer le contenu/état de la nav
        const navBar = document.getElementById('main-nav');
        navBar.style.display = show ? 'flex' : 'none';
    }

    async initPhotobooth(pageId) {
        // Retirer active de tous les éléments
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        const page = document.getElementById('gallery-page');
        page.classList.add('active');

    }

    async initFavorites(pageId) {
        // Retirer active de tous les éléments
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }

    async initQrcode(pageId) {
        // Retirer active de tous les éléments
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        await this.generateQR();

    }

    // ------------------------------------------------------------------------------------------------------
    //  AFFICHAGE DES EVENEMENTS
    // ------------------------------------------------------------------------------------------------------

    initPage = async () => {

        this.mainContent.style.display = 'block';

        // this.toggleNavBar(false);

        this.titreHeader.textContent = 'So Box';

        this.btnRetour.style.display = 'none';

        // 1. Ré initialisation de l'événement en cours
        localStorage.setItem("Evenement_En_Cours", 0);

        // 2. Ouverture de la base de données "events"
        const db = await this.openDB();
        const transaction = db.transaction('events', 'readonly');
        const store = transaction.objectStore('events');

        // 3. Chargement des événements
        const request = store.getAll();
        request.onsuccess = (event) => {

            // 3.1 Stockage des événements dans 'events'
            const events = event.target.result;

            // 3.2 Initialisation HTML 'eventList'
            const eventList = document.getElementById('eventList');
            eventList.innerHTML = '';

            // 3.3 Pas d'événement stocké
            if (events.length === 0) {
                eventList.innerHTML = '<p>Aucun événement disponible.</p>';
                return;
            }

            // 3.4 On boucle sur l'ensemble des événements
            events.forEach((event) => {

                // 3.4.1 Création d'un élément 'DIV' -> eventCard
                const eventCard = document.createElement('div');

                // 3.4.2 Affectation de la classe 'event-card'
                eventCard.className = 'event-card';

                // 3.4.3 Formatage HTML lié à l'événement lu
                eventCard.innerHTML = `
                                            <h2>${event.nom}</h2>
                                            <div class="event-details">
                                                <div class="event-date">
                                                    <i class="fa-solid fa-calendar-days"></i>
                                                    <p>${event.date}</p>
                                                </div>
                                                <div class="event-location">
                                                    <i class="fa-solid fa-location-dot"></i>
                                                    <p>${event.lieu}</p>
                                                </div>
                                            </div>
                                        `;

                // 3.4.4 Au clic sur la carte, redirige vers index.html avec l'ID de l'événement
                eventCard.addEventListener('click', () => {

                    // Stocker l'objet complet de l'événement
                    const eventData = {
                        id: event.id,
                        nom: event.nom,
                        lieu: event.lieu,
                        date: event.date,
                        synchro: event.synchro
                    };
                    localStorage.setItem("Evenement_En_Cours", JSON.stringify(eventData));

                    // Appel à la gallerie photos
                    eventCodeModal.navigateTo('gallery-page');
                });

                eventList.appendChild(eventCard);
            });
        };

        request.onerror = (event) => {
            console.error('Erreur lors de la lecture des événements :', event.target.errorCode);
        };
    };

    // Nouvelle méthode pour gérer la modal de code
    setupEventCodeModal() {
        const eventCodeModal = document.getElementById('eventCodeModal');
        const eventCodeInput = document.getElementById('eventCodeInput');

        // Bouton d'annulation
        document.getElementById('cancelEventCode').addEventListener('click', () => {
            eventCodeModal.style.display = 'none';
        });

        // Bouton de rejoindre un événement
        document.getElementById('joinEventButton').addEventListener('click', () => {
            eventCodeModal.style.display = 'flex';
            eventCodeInput.focus();
        });

        // Optionnel : Gestion de la soumission du formulaire
        document.getElementById('eventCodeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventCodeSubmission(eventCodeInput.value);
        });
    }

    // Méthode pour gérer la soumission du code
    handleEventCodeSubmission = async (code) => {
        if (!code || code.trim() === "") {
            alert("Veuillez entrer un code valide");
            return;
        }

        try {
            await this.fetchEvent(code.trim());
        } catch (error) {
            console.error("Erreur:", error);
            alert("Échec de la recherche: " + error.message);
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  ENREGISTREMENT DE L EVENEMENT
    // ------------------------------------------------------------------------------------------------------

    addEventToDB = async (event) => {
        try {
            const db = await this.openDB();
            const transaction = db.transaction('events', 'readwrite');
            const store = transaction.objectStore('events');

            const existing = await new Promise((resolve, reject) => {
                const request = store.get(event.id);
                request.onsuccess = () => {
                    resolve(request.result); // Retourne l'objet si trouvé
                };
                request.onerror = () => {
                    reject('Erreur lors de la lecture de la base de données.');
                };
            });

            if (existing) {
                console.warn('Cet événement existe déjà:', existing);
                alert('Cet événement est déjà enregistré.');
            } else {
                const addRequest = store.add(event);
                addRequest.onsuccess = () => {
                    console.log('Événement ajouté avec succès:', event);
                };
                addRequest.onerror = (e) => {
                    console.error('Erreur lors de l\'ajout de l\'événement:', e.target.error);
                };
            }
        } catch (error) {
            console.error('Erreur dans addEventToDB:', error);
            alert('Une erreur inattendue est survenue.');
        }
    };

    // ------------------------------------------------------------------------------------------------------
    //  APPEL API RECHERCHE DU CODE EVENEMENT
    // ------------------------------------------------------------------------------------------------------

    // Méthode pour faire l'appel API
    fetchEvent = async (eventCode) => {
        const apiUrl = `http://www.so-box.fr/webapp/api/get_events.php?password=${encodeURIComponent(eventCode)}`;
        const eventCodeModal = document.getElementById('eventCodeModal');

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                redirect: 'manual',
                headers: { 'Accept': 'application/json' }
            });

            let finalResponse = response;

            // Gestion des redirections
            if (response.status === 301 || response.status === 302) {
                const redirectedURL = response.headers.get('Location');
                finalResponse = await fetch(redirectedURL);
            }

            if (!finalResponse.ok) {
                throw new Error(`Erreur serveur: ${finalResponse.status}`);
            }

            const result = await finalResponse.json();

            if (result.status === "success") {
                await this.addEventToDB({
                    id: result.data.id,
                    nom: result.data.nom,
                    date: result.data.date,
                    lieu: result.data.lieu,
                    synchro: '2000-01-01 00:00:00'
                });

                eventCodeModal.style.display = 'none';
                await this.initPage(); // Rafraîchit la liste des événements
            } else {
                throw new Error(result.message || "Code événement invalide");
            }
        } catch (error) {
            console.error("Erreur fetchEvent:", error);
            throw error; // On remonte l'erreur pour la gérer dans handleEventCodeSubmission
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  GESTION DU LOADING
    // ------------------------------------------------------------------------------------------------------

    openDBgalleryDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('galleryDB', 3); // Version incrémentée

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                console.log('Création/mise à jour de la base de données');

                if (!db.objectStoreNames.contains('photos')) {
                    const photosStore = db.createObjectStore('photos', { keyPath: 'url' });
                    photosStore.createIndex('name', 'name', { unique: false });
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => {
                console.error('IndexedDB error:', e.target.error);
                reject(`Erreur IndexedDB: ${e.target.error.name}`);
            };
        });
    }

    async showLoading() {
        const container = document.getElementById('loading-bar-container');
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');

        container.style.display = 'block';
        text.style.display = 'block';
        bar.style.width = '30%'; // Progression initiale
    }

    updateLoading(percent) {
        const bar = document.getElementById('loading-bar');
        bar.style.width = percent + '%';
    }

    hideLoading() {
        const container = document.getElementById('loading-bar-container');
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');

        bar.style.width = '100%'; // Complète à 100% avant de disparaître
        setTimeout(() => {
            container.style.display = 'none';
            text.style.display = 'none';
            bar.style.width = '0%'; // Réinitialise
        }, 300);
    }

    // ------

    // 🔄 Fonction pour trier les images du plus récent au plus ancien
    // Méthode pour trier les images
    sortImagesByDate(images) {
        return images.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // 📂 Fonction pour récupérer toutes les images depuis IndexedDB
    getAllImagesFromDB(db) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('photos', 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.getAll();

            request.onsuccess = () => {
                const images = request.result;
                // CORRECTION : Vérifiez et normalisez la structure des données
                const normalizedImages = images.map(img => ({
                    data: img.data || img.url, // Assurez-vous que cette propriété existe
                    name: img.name,
                    date: img.date,
                    url: img.url // Conservez l'URL originale
                }));
                resolve(this.sortImagesByDate(normalizedImages));
            };
            request.onerror = () => reject('Erreur de lecture');
        });
    }

    // 🔍 Fonction pour observer les images et les charger uniquement lorsqu'elles deviennent visibles
    observeImage(card, img) {
        if (!img.dataset.src) {
            console.error('Image sans data-src:', img);
            return;
        }

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Debug avant chargement
                    console.log('Chargement image:', {
                        src: img.dataset.src,
                        element: img
                    });

                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');

                        // Gestion des erreurs de chargement
                        img.onerror = () => {
                            console.error('Erreur chargement image:', img.dataset.src);
                            img.src = 'chemin/vers/image-par-defaut.jpg';
                        };
                    }

                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });

        observer.observe(card);
        this.observers.push(observer);
    }

    // Dans le destructeur ou quand nécessaire
    cleanupObservers() {
        this.observers.forEach(obs => obs.disconnect());
        this.observers = [];
    }

    // 🎞️ Fonction pour observer le défilement de la galerie et charger les images par lots
    observeGalleryScroll() {
        // Nettoyez d'abord l'ancien observer
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }

        const sentinel = document.getElementById('gallerySentinel');
        if (!sentinel) return;

        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoadingBatch) {
                    console.log('Sentinel visible - Chargement du lot suivant');
                    this.loadImagesBatch();
                }
            });
        }, {
            root: null,
            rootMargin: '100px', // Réduisez cette valeur
            threshold: 0.01
        });

        this.scrollObserver.observe(sentinel);
    }

    // 📸 Fonction pour charger les images par lots
    async loadImagesBatch() {
        if (this.isLoadingBatch || !this.imagesList) return;
        this.isLoadingBatch = true;

        try {
            const startIdx = this.currentBatchIndex;
            const endIdx = Math.min(startIdx + this.batchSize, this.imagesList.length);

            // Utilisez requestAnimationFrame pour un chargement plus fluide
            await new Promise(resolve => requestAnimationFrame(() => {
                for (let i = startIdx; i < endIdx; i++) {
                    const card = this.createImageCard(this.imagesList[i], i);
                    this.gallery.appendChild(card);
                }
                resolve();
            }));

            this.currentBatchIndex = endIdx;
            this.updatePhotoCount();

            // Configurez le sentinel seulement si nécessaire
            if (this.currentBatchIndex < this.imagesList.length) {
                this.setupNewSentinel();
            }
        } catch (error) {
            console.error('Erreur dans loadImagesBatch:', error);
        } finally {
            this.isLoadingBatch = false;
        }
    }

    setupNewSentinel() {
        // Supprimez l'ancien sentinel
        const oldSentinel = document.getElementById('gallerySentinel');
        if (oldSentinel) oldSentinel.remove();

        // Créez le nouveau sentinel
        const sentinel = document.createElement('div');
        sentinel.id = 'gallerySentinel';

        // Positionnez-le juste après le dernier élément
        if (this.gallery.lastChild) {
            this.gallery.insertBefore(sentinel, this.gallery.lastChild.nextSibling);
        } else {
            this.gallery.appendChild(sentinel);
        }

        // Réactivez l'observer
        this.observeGalleryScroll();
    }

    cleanupScrollObserver() {
        // Supprimer l'ancien sentinel
        const oldSentinel = document.getElementById('gallerySentinel');
        if (oldSentinel) oldSentinel.remove();

        // Arrêter l'ancien observer
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
    }

    // 📷 Fonction pour créer une carte d'image avec lazy loading
    createImageCard(image, index) {
        const card = document.createElement('div');
        card.className = 'gallery-item';

        // Créez l'élément img correctement
        const img = document.createElement('img');
        img.dataset.src = image.data || image.url; // Selon votre structure
        img.className = 'gallery-img';
        img.alt = image.name || 'Photo événement';
        img.loading = 'lazy';

        // Style initial pour l'animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        // Ajoutez l'image à la carte
        card.appendChild(img);

        // Gestion du clic
        card.addEventListener('click', () => {
            this.currentImageIndex = index;
            this.currentImageToDownload = image;
            this.openModal(image, index, this.imagesList);
        });

        // Observez la carte (pas seulement l'image)
        this.observeImage(card, img);

        return card; // N'oubliez pas de retourner l'élément!
    }

    // Modifiez également updateGallery() :
    async updateGallery() {
        try {
            if (!this.gallery) throw new Error("Élément gallery non disponible");

            const db = await this.openDBgalleryDB();
            const images = await this.getAllImagesFromDB(db);

            // DEBUG : Affichez les premières images
            console.log('Exemple de données image:', images.slice(0, 3));

            // Réinitialiser complètement
            this.imagesList = this.sortImagesByDate(images);
            this.currentBatchIndex = 0;
            this.gallery.innerHTML = '';
            this.cleanupScrollObserver();

            // Charger le premier lot
            await this.loadImagesBatch();

        } catch (error) {
            console.error("Erreur dans updateGallery:", error);
        }
    }

    // Fonction pour vérifier si une image est déjà dans IndexedDB
    checkImageInDB = (db, url) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('photos', 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.get(url);

            request.onsuccess = () => resolve(request.result !== undefined);
            request.onerror = () => reject('Erreur lors de la vérification de l\'image dans la base de données.');
        });
    };

    async updateSyncDate(eventId, newSyncDate) {
        const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('EventsDB', 1);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject("Erreur d'ouverture");
        });

        return new Promise((resolve, reject) => {
            const transaction = db.transaction('events', 'readwrite');
            const store = transaction.objectStore('events');

            // 1. Récupérer l'événement existant
            const getRequest = store.get(eventId);

            getRequest.onsuccess = () => {
                const eventData = getRequest.result || {};

                // 2. Mettre à jour la date
                eventData.synchro = newSyncDate;

                // 3. Sauvegarder
                const putRequest = store.put(eventData);

                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject("Erreur de mise à jour");
            };

            getRequest.onerror = () => reject("Erreur de lecture");
        });
    }

    async getEventById(eventId) {
        const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('EventsDB', 1);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject("Erreur d'ouverture de la base");
        });

        return new Promise((resolve, reject) => {
            const transaction = db.transaction('events', 'readonly');
            const store = transaction.objectStore('events');
            const request = store.get(eventId);

            request.onsuccess = () => resolve(request.result || {});
            request.onerror = () => reject("Erreur de lecture");
        });
    }

    // 🌐 Fonction pour récupérer les images depuis l'API
    async fetchImagesFromAPI() {
        // 1. Récupération de l'ID depuis le localStorage
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours")) || {};
        const { id: eventId } = eventData;

        if (!eventId) {
            console.error("Aucun ID d'événement trouvé");
            return [];
        }

        try {
            // 2. Récupération de la date de synchro depuis IndexedDB
            const eventFromDB = await this.getEventById(eventId);
            const synchro = eventFromDB?.synchro || "2000-01-01 00:00:00";

            console.log(`Utilisation de la date de synchro: ${synchro}`);

            // 3. Construction de l'URL
            const apiUrl = new URL('http://www.so-box.fr/webapp/api/getImages.php');
            apiUrl.searchParams.append('id', eventId);
            apiUrl.searchParams.append('lastSync', encodeURIComponent(synchro));

            // 4. Requête API
            const response = await fetch(apiUrl.toString());

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            // 5. Traitement des images
            if (!data?.images?.length) {
                console.log("Aucune nouvelle image à synchroniser");
                return [];
            }

            // Tri par date
            const sortedImages = data.images.sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );

            // 6. Mise à jour de la date de synchro dans IndexedDB
            const lastImageDate = sortedImages[sortedImages.length - 1].date;
            await this.updateSyncDate(eventId, lastImageDate);

            return sortedImages.map(({ url, name, date }) => ({
                url,
                name,
                date,
                timestamp: new Date(date).getTime()
            }));

        } catch (error) {
            console.error("Erreur lors de la récupération des images:", error);

            if (error.message.includes('Failed to fetch')) {
                alert("Problème de connexion réseau");
            }

            return [];
        }
    };

    // Fonction pour convertir une image en base64
    async convertImageToBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Erreur lors du téléchargement de l'image : ${response.statusText}`);
            }
            const blob = await response.blob(); // Obtenir les données de l'image sous forme de blob

            return await new Promise((resolve, reject) => {
                const reader = new FileReader(); // Utiliser FileReader pour lire le blob
                reader.onloadend = () => resolve(reader.result.split(",")[1]); // Récupérer uniquement la partie base64
                reader.onerror = (error) => reject(`Erreur lors de la conversion en base64 : ${error}`);
                reader.readAsDataURL(blob); // Lire les données en tant que URL de données
            });
        } catch (error) {
            console.error("Erreur dans convertImageToBase64 :", error);
            return null;
        }
    };

    // Fonction pour stocker l'image encodée en base64 dans IndexedDB
    async storeImageInDB(imageUrl, imageBase64, imageName, imageDate) {
        try {
            // Ouvrir la base de données IndexedDB
            const db = await this.openDBgalleryDB();

            if (!db) {
                console.error("La base de données n'est pas ouverte !");
                return;
            }

            // Vérifier si l'image existe déjà
            const imageInDB = await this.checkImageInDB(db, imageUrl);
            if (imageInDB) {
                console.log("L'image existe déjà dans la base de données.");
                return;
            }

            // Créer une nouvelle transaction pour l'ajout
            const transaction = db.transaction('photos', 'readwrite');
            const store = transaction.objectStore('photos');

            // Préparer les données de l'image
            const imageData = {
                url: imageUrl,
                data: `data:image/jpeg;base64,${imageBase64}`,
                name: imageName,
                date: imageDate
            };

            // Ajouter l'image
            return new Promise((resolve, reject) => {
                const request = store.add(imageData);

                request.onsuccess = () => {
                    console.log("Image ajoutée avec succès à IndexedDB !");
                    resolve();
                };

                request.onerror = (event) => {
                    console.error("Erreur lors de l'ajout de l'image à IndexedDB :", event.target.error);
                    reject(event.target.error);
                };

                // Gérer la fin de la transaction
                // transaction.oncomplete = () => {
                //     console.log("Transaction terminée avec succès");
                // };

                transaction.onerror = (event) => {
                    console.error("Erreur de transaction :", event.target.error);
                };
            });
        } catch (error) {
            console.error("Erreur lors de l'ouverture de IndexedDB ou du stockage de l'image :", error);
            throw error;
        }
    };

    // Fonction principale pour surveiller et synchroniser les images
    async startImageWatch() {
        const syncImages = async () => {
            this.showLoading();
            this.updateLoading(30); // 30% - Début du processus

            try {
                console.log('🔄 Synchronisation en cours...');
                this.updateLoading(40); // 40% - Récupération des images
                const newImages = await this.fetchImagesFromAPI();

                if (newImages.length > 0) {
                    console.log('🆕 Nouvelles images détectées !');
                    this.updateLoading(50); // 50% - Ouverture DB
                    const db = await this.openDBgalleryDB();

                    let progress = 60;
                    const progressIncrement = 30 / newImages.length;

                    for (const image of newImages) {
                        const imageExists = await this.checkImageInDB(db, image.url);
                        if (!imageExists) {
                            this.updateLoading(progress);
                            const base64Data = await this.convertImageToBase64(image.url);
                            await this.storeImageInDB(image.url, base64Data, image.name, image.date);
                        }
                        progress += progressIncrement;
                    }

                    this.updateLoading(90); // 90% - Mise à jour de la galerie
                    await this.updateGallery();
                } else {
                    console.log('✅ Aucune nouvelle image trouvée.');
                }

                this.updateLoading(100); // 100% - Terminé
            } catch (error) {
                console.error('❌ Erreur de synchronisation :', error);
                // Change la couleur en rouge en cas d'erreur
                document.getElementById('loading-bar').style.backgroundColor = '#f44336';
            } finally {
                this.hideLoading();
            }
        };

        await syncImages(); // Premier appel immédiat
        setInterval(syncImages, 60000); // Puis toutes les 60s
    };

    // 🔢 Fonction pour mettre à jour le compteur de photos
    async updatePhotoCount() {
        const totalPhotos = this.imagesList.length; // Récupérer le nombre total de photos
        this.photoCountElement.textContent = totalPhotos; // Mettre à jour l'élément du compteur de photos

        this.photoCountElement.textContent =
            totalPhotos === 0 ? "Aucune photo" :
                totalPhotos === 1 ? "1 photo" :
                    totalPhotos + ' photos';

        console.log(`Nombre total de photos : ${totalPhotos}`);
    };

    // ------------------------------------------------------------------------------------------------------
    //  LECTURE DES INFORMATIONS LIEES A L EVENEMENT
    // ------------------------------------------------------------------------------------------------------

    async displayEventInfo() {
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"));

        if (eventData) {
            document.getElementById('eventName').textContent = eventData.nom;

            // Formater la date (supposons que eventData.date est au format YYYY-MM-DD)
            const dateObj = new Date(eventData.date);
            const options = { day: 'numeric', month: 'long', year: 'numeric' };

            // Vous pouvez toujours accéder à l'ID si besoin
            // console.log("ID de l'événement:", eventData.id);
        } else {
            document.getElementById('eventName').textContent = "Événement non spécifié";
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  AFFICHAGE DE LA PHOTO SELECTIONNEE DANS UNE MODALE
    // ------------------------------------------------------------------------------------------------------

    // 🖼️ Fonction pour ouvrir le modal avec l'image sélectionnée
    async openModal(imageSrc, index, images) {
        this.currentImageIndex = index; // Mettre à jour l'index de l'image actuelle
        this.imagesList = images; // Mettre à jour la liste des images
        this.currentImageToDownload = imageSrc; // Mettre à jour l'image à télécharger

        const modalImage = document.getElementById("modalImage"); // Récupérer l'élément image du modal
        modalImage.src = imageSrc.data; // Définir la source de l'image dans le modal

        const modal = new bootstrap.Modal(document.getElementById("imageModal")); // Créer une instance du modal
        this.modal.show(); // Afficher le modal
    };

    // ⬅️ Fonction pour afficher l'image précédente dans le modal
    async showPreviousImage() {

        try {
            // 1. Exécuter la logique existante de navigation
            if (this.currentImageIndex > 0) {
                this.currentImageIndex--;
                this.updateModalImage();
            }
        } catch (error) {
            console.error("Erreur lors de la navigation:", error);
        }
    };

    // ➡️ Fonction pour afficher l'image suivante dans le modal
    async showNextImage() {
        if (this.currentImageIndex < imagesList.length - 1) {
            this.currentImageIndex++; // Incrémenter l'index de l'image actuelle
            this.updateModalImage(); // Mettre à jour l'image dans le modal
        }
    };

    // Assignez la fonction à la variable globale
    async initializeApp() {
        try {

            this.observeGalleryScroll = this.observeGalleryScroll.bind(this);
            this.loadImagesBatch = this.loadImagesBatch.bind(this);
            this.createImageCard = this.createImageCard.bind(this)

            this.mainContent.style.display = 'block';

            this.btnRetour.style.display = 'block';

            this.displayEventInfo();

            this.toggleNavBar(true);

            this.showLoading();

            await this.updateGallery();

            await this.startImageWatch();
        } catch (error) {
            console.error("Initialization failed:", error);
            this.showError("Erreur de chargement");
        } finally {
            this.hideLoading();
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  AFFICHAGE DE LA PHOTO SELECTIONNEE DANS UNE MODALE
    // ------------------------------------------------------------------------------------------------------

    async generateQR() {
        const text = 'http://www.so-box.fr/webapp/test2.html'

        const tempDiv = document.createElement('div');

        new QRCode(tempDiv, {
            text: text,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Récupérer l'élément canvas généré
        const canvas = tempDiv.querySelector('canvas');

        // Convertir le canvas en URL de données et l'affecter à l'image
        document.getElementById('qr-code').src = canvas.toDataURL('image/png');

    }

}

// Créer une instance globale de l'application
const app = new App();
