// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Gestionnaire d'application
class App {
    constructor() {

        // Variables globales

        // -------------------------------------------------------- 
        // ---------------------- Utilisateur --------------------- 
        // -------------------------------------------------------- 

        // Logo
        this.profileUser = null;

        this.tabListeEvents = [];
        this.imagesList = []; // Liste des images
        this.batchSize = 10; // Taille du lot d'images à charger
        this.currentBatchIndex = 0; // Index du lot actuel
        this.currentImageIndex = 0; // Index de l'image actuellement affichée
        this.currentImageToDownload = null; // Image actuellement sélectionnée pour le téléchargement
        this.nomPhotoSelected = null; // Nom de la photo sélectionnée
        this.observers = []; // Pour stocker les instances d'observers
        this.isLoadingBatch = false; // Pour éviter les chargements multiples
        this.scrollObserver = null; // Ajoutez cette ligne
        this.nbFavori = 0; // Nombre de favori
        this.user = null; // Mémorisation des données utilisateur
        this.syncInterval = null;
        this.syncController = null;
        this.isSyncing = false;
        this.urlProjet = "https://www.so-box.fr/webapp";

        this._initialized = false;

        // Remplacer les écouteurs existants par :
        window.addEventListener('orientationchange', () => this.checkOrientation());
        window.addEventListener('resize', () => this.checkOrientation());

        // ------------------------------------------------------------------------------------------------------
        // GESTION DE L ORIENTATION DU SUPPORT ET DETECTION MODE STANDALONE
        // ------------------------------------------------------------------------------------------------------

        this.initFullscreen();

        // ------------------------------------------------------------------------------------------------------
        // LANCEMENT DU PROJET ( Des la fin du chargement du DOM )
        // ------------------------------------------------------------------------------------------------------

        document.addEventListener('DOMContentLoaded', () => {

            // Chargements variables d'événements
            this.initializeDOMReferences();

            // Lancement de l'application
            this.lancementApp();
        });
    }

    // ------------------------------------------------------------------------------------------------------
    // GESTION DE L ORIENTATION DU SUPPORT ET DETECTION MODE STANDALONE
    // ------------------------------------------------------------------------------------------------------

    initFullscreen() {
        // Détection du mode standalone
        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.documentElement.classList.add('standalone');
        }

        // Gestion de l'orientation
        this.checkOrientation();
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkOrientation(), 200);
        });
        window.addEventListener('resize', () => this.checkOrientation());
    }

    // ------------------------------------------------------------------------------------------------------
    //  DETECTION MODE PAYSAGE
    // ------------------------------------------------------------------------------------------------------

    async checkOrientation() {
        // Méthode plus fiable pour détecter le mode paysage
        const isLandscape = window.innerWidth > window.innerHeight;
        console.log('Orientation check - Landscape:', isLandscape);

        const existingOverlay = document.getElementById('orientation-overlay');

        if (isLandscape && !existingOverlay) {
            console.log('Creating landscape overlay');
            const overlay = document.createElement('div');
            overlay.id = 'orientation-overlay';
            overlay.className = 'orientation-overlay';

            overlay.innerHTML = `
            <h2 style="margin-bottom: 20px; text-align: center;">🔄 Mode paysage détecté</h2>
            <p style="text-align: center; max-width: 80%; margin-bottom: 30px;">
                Pour une meilleure expérience, utilisez l'application en mode portrait.
            </p>
        `;

            document.body.appendChild(overlay);

        } else if (!isLandscape && existingOverlay) {
            console.log('Removing landscape overlay');
            existingOverlay.remove();
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  INITIALISATION DES VARIABLES D EVENEMENTS
    // ------------------------------------------------------------------------------------------------------

    initializeDOMReferences() {
        this.splashscreen = document.getElementById('splash-screen');

        // -------------------------------------------------------- 
        // ------------------------ Header ------------------------ 
        // -------------------------------------------------------- 

        // Logo
        this.logoSobox = document.getElementById('logoSobox');

        // Bouton Retour
        this.btnRetour = document.getElementById('btnRetour');

        // Titre 
        this.titreHeader = document.getElementById('eventName');

        // Bouton "Close"
        this.btnClose = document.getElementById('btnClose');

        // Gestion de l'événement : Fermeture de la fenêtre "Zoom"
        this.btnClose.addEventListener('click', (e) => {
            this.zoomClose();
        });

        // Administrateur
        this.btnAdm = document.getElementById('btnAdm');

        // Gestion de l'événement : Accès à la page "Administrateur"
        this.btnAdm.addEventListener('click', (e) => {
            alert(this.user[0].id);
        });

        // -------------------------------------------------------- 
        // ------------------------ Footer ------------------------ 
        // -------------------------------------------------------- 

        // Initialiser la navigation du Footer
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.getAttribute('data-page');
                if (pageId !== this.currentPage) {
                    this.navigateTo(pageId);
                }
            });
        });

        this.modal = document.getElementById('messageModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalIcon = document.querySelector('.modal-icon');
        this.modal = document.getElementById('messageModal');
        this.modalCloseBtn = document.querySelector('.modal-close');

        this.mainContent = document.getElementById('mainContent');
        this.gallery = document.getElementById('gallery');
        this.photoCountElement = document.querySelector('#main-nav [data-page="photobooth-page"] span');

        this.downloadButton = document.getElementById('downloadButton');
        this.smsButton = document.getElementById('smsButton');

        this.partageAccesSms = document.getElementById('partageAccesSms');
        this.partageAccesMail = document.getElementById('partageAccesMail');

        this.emailButton = document.getElementById('emailButton');

        this.eventList = document.getElementById('eventList');
        this.eventCodeModal = document.getElementById('eventCodeModal');

        // INPUT du formulaire "Rejoindre un événement"
        this.eventCodeInput = document.getElementById('eventCodeInput');
        document.getElementById('eventCodeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventCodeSubmission(this.eventCodeInput.value);
        });

        this.nextImage = document.getElementById('nextImage');
        this.previousImage = document.getElementById('previousImage');

        this.pasFavori = document.getElementById('pasFavori');
        this.lib_nb_favori = document.getElementById('lib_nb_favori');
        this.galleryFavori = document.getElementById('galleryFavori');

        this.btnParam = document.getElementById('btnParam');

        this.pasPhotoGalerie = document.getElementById('pasPhotoGalerie');

        // Gestion de l'événement : Rejoindre un événement
        document.getElementById('joinEventButton').addEventListener('click', () => {
            this.navigateTo('rejoindre-event-page');
        });

        document.getElementById('btnParam').addEventListener('click', () => {
            this.navigateTo('parametres-page');
        });

        const deleteToggle = document.getElementById('option_delete_galerie');

        document.getElementById('option_delete_galerie').addEventListener('click', () => {
            this.purgeAllData();
        });

        // Écouter les changements
        deleteToggle.addEventListener('change', function () {
            const isEnabled = this.checked;

            // Sauvegarder dans localStorage
            localStorage.setItem('deleteGalleryEnabled', isEnabled.toString());

            // Feedback utilisateur
            if (isEnabled) {
                console.log('Mode suppression activé');
            } else {
                console.log('Mode suppression désactivé');
            }
        });

        const closeModal = document.getElementById('closeModal');
        const confirmBtn = document.getElementById('confirmBtn');

        // Événements
        closeModal.addEventListener('click', this.hideModal);
        confirmBtn.addEventListener('click', this.hideModal);

        // Cacher la modale avec la touche Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
                this.hideModal();
            }
        });


    }

    // -------------------------------------------------------- 
    // ------------------------- SPINNER ---------------------- 
    // -------------------------------------------------------- 

    showSpinner(show) {
        const spinner = document.getElementById('spinner'); // Assurez-vous d'avoir un élément spinner dans votre HTML
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
    }

    // -------------------------------------------------------- 
    // ------------------------- MODALE ----------------------- 
    // -------------------------------------------------------- 

    // --- Affichage de la modale

    async showModal(titre, message, type = 'info') {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalTitre = document.getElementById('modal-titre');
        const modalMessage = document.getElementById('modal-message');

        // Masquer toutes les icônes : 
        // error
        // warning
        // info
        document.querySelectorAll('.modal-header .icon-container').forEach(icon => {
            icon.classList.add('d-none');
        });

        // Afficher l'icône correspondante
        const icon = document.getElementById(`icon-${type}`);
        if (icon) icon.classList.remove('d-none');

        // Définir le titre et le message
        modalTitre.textContent = titre;
        modalMessage.textContent = message;

        // Afficher la modale
        modalOverlay.classList.add('active');
    }

    // --- Fonction pour cacher la modale

    hideModal() {
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  DEMARRAGE DE L APPLICATION
    // ------------------------------------------------------------------------------------------------------

    async lancementApp() {
        if (this._initialized) return;
        this._initialized = true;

        // this.showModal('titre', 'Bonjour');

        // 1.Afficher le spinner
        console.log('// 1. Afficher le spinner')
        this.showSpinner(true);

        try {

            // 2. Appel de checkUser()
            console.log('// 2. Appel de checkUser()');

            const userId = await this.checkUser();

            if (userId) {
                console.log('// 2.1. Utilisateur vérifié avec ID: ', userId);
            } else {
                console.log('// 2.2. Aucun ID utilisateur valide obtenu ');
            }

            // 3. Chargements des évenements
            console.log('// 3. Chargements des évenements');
            this.tabListeEvents = await this.listeEvents();

            // 4. Affiche la liste des événements
            console.log('// 4. Affiche la liste des événements');
            await this.loadEvents();

            // 5. Cacher le spinner avant la navigation
            console.log('// 5. Cacher le spinner avant la navigation');
            this.showSpinner(false);

            // 6. Désactivation de la page : splash screen
            console.log('// 6. Désactivation de la page : splash screen');
            this.splashscreen.style.display = 'none';

            // 7. Appel de la page : Liste des événements
            console.log('// 7. Appel de la page : Liste des événements');
            this.navigateTo('events-page');

        } catch (error) {
            // 8. "Erreur lors du lancement de l'application:", error
            console.log('// 8. "Erreur lors du lancement de l\'application : ', error);
            this.showSpinner(false);
            this.navigateTo('assistance-page');
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  COMPTAGE DU NOMBRE DE PHOTOS SELON L'ID DE L'ÉVÉNEMENT
    // ------------------------------------------------------------------------------------------------------

    async countPhotos(id) {
        try {

            // Ouverture de la BDD
            const db = await this.openDBgalleryDB();

            // Recherche des images dans la BDD
            const allImages = await this.getAllImagesFromDB(db, id);

            // Filtrage sur l'ID et retourne le nombre
            return allImages.filter(img => img.id === id).length;
        } catch (error) {
            console.error("Erreur lors du comptage sur le nombre de photos :", error);
            return 0;
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  COMPTAGE DU NOMBRE DE MEMBRE
    // ------------------------------------------------------------------------------------------------------

    // async creationUtilisateur(id) {
    //     const apiUrl = `${this.urlProjet}/assets/php/user.php?evt=${encodeURIComponent(id)}&user=${encodeURIComponent(this.user[0].id)}`;

    //     let response;
    //     try {
    //         // Tentative de requête API
    //         response = await fetch(apiUrl, {
    //             method: 'GET',
    //             redirect: 'manual',
    //             headers: { 'Accept': 'application/json' }
    //         });
    //     } catch (networkError) {
    //         // Erreur réseau (ex: pas de connexion, timeout)
    //         return {
    //             status: "ERREUR",
    //             message: "Erreur réseau : impossible de contacter le serveur",
    //             data: null
    //         };
    //     }
    // }

    // ------------------------------------------------------------------------------------------------------
    //  GENERATION DE LA LISTE DES EVENEMENTS
    // ------------------------------------------------------------------------------------------------------

    async loadEvents() {

        console.log('// ----------------------------------------------');
        console.log('// Appel : loadEvents');
        console.log('// ----------------------------------------------');

        // Génération de la liste des évenements
        this.eventList.innerHTML = '';

        console.log('// 1. Affichage des événements.');

        // Si pas d'événement, on affiche une illustration
        if (this.tabListeEvents.length === 0) {
            console.log('// 1.1 Affichage message : Aucun événement enregistré.');
            this.eventList.innerHTML = '<img src="assets/images/noEvents.png" style="width:80%"></img> <p>Aucun événement enregistré.</p>';
        }
        else {
            console.log('// 2.1 Génération de la liste des événements.');
            for (const event of this.tabListeEvents) {

                // Détermination du nombre de photos
                const nbPhotos = await this.countPhotos(String(event.id));
                console.log('// 2.2 Calcul du nombre de photos : ' + nbPhotos);

                // Création d'un élément 'DIV' -> eventCard
                const eventCard = document.createElement('div');

                // Affectation de la classe 'event-card'
                eventCard.className = 'event-card';

                // Formatage HTML lié à l'événement lu

                const joursRestants = this.comparerDates(event.dateDebut);
                console.log('// 2.3 Calcul du jours Restants : ' + joursRestants);

                if (joursRestants <= 0) {

                    console.log('// 2.2.1 joursRestants <= 0 : ' + joursRestants);

                    eventCard.innerHTML = `
                            <h2>${event.nom}</h2>
                            <div class="event-details">
                                <div class="event-badges">
                                    <span class="badge nbPhotos-badge">
                                        <i class="fa-solid fa-images p-1"></i> ${nbPhotos || 0}
                                    </span>
                                   
                                </div>
                                <div class="event-info">
                                    <div class="event-date">
                                        <i class="fa-solid fa-calendar-days"></i>
                                        <p>${event.dateDebut}</p>
                                    </div>
                                    <div class="event-location">
                                        <i class="fa-solid fa-location-dot"></i>
                                        <p>${event.lieu}</p>
                                    </div>
                                </div>
                            </div>
                        `;


                    // Au clic sur l'événement, on mémorise les informations de l'événement
                    eventCard.addEventListener('click', () => {

                        // Vidage des galeries photos
                        this.galleryFavori.innerHTML = '';
                        this.gallery.innerHTML = '';

                        console.log('// 2.2.2. clic sur l\'événement');

                        let statut = 1; // Evénement en cours
                        if (joursRestants <= -60) {
                            statut = 2; // Evénement dépassé ( plus de 60 jours )
                        }

                        console.log('// 2.2.3. Statut de l\'événement : ' + statut);

                        // Stocker l'objet complet de l'événement
                        const eventData = {
                            id: event.id,
                            nom: event.nom,
                            lieu: event.lieu,
                            dateDebut: event.dateDebut,
                            dateFin: event.dateFin,
                            synchro: event.synchro,
                            statut: statut,
                            code: event.code
                        };

                        console.log('// 2.2.4. Stockage de l\'événement dans Evenement_En_Cours.');
                        localStorage.setItem("Evenement_En_Cours", JSON.stringify(eventData));

                        console.log(
                            `ID: ${event.id}\n` +
                            `Nom: ${event.nom}\n` +
                            `Date Début : ${new Date(event.dateDebut).toLocaleDateString('fr-FR')}\n` +
                            `Date Fin : ${new Date(event.dateFin).toLocaleDateString('fr-FR')}\n` +
                            `Lieu: ${event.lieu}\n` +
                            `Synchro: ${new Date(event.synchro).toLocaleString('fr-FR')}\n` +
                            `Statut: ${event.statut}\n` +
                            `Code: ${event.code}\n` +
                            '------------------'
                        );

                        // Appel à la gallerie photos    
                        console.log('// 6. Appel : gallery-page');
                        this.navigateTo('gallery-page');

                        // Activation du bouton "photobooth"
                        console.log('// 7. Appel : initPhotobooth');
                        this.initPhotobooth('photobooth-page');
                    });

                } else {
                    // Mise à jour DBEvents
                    // Statut = 1 => PROCHAINEMENT

                    eventCard.innerHTML = `
                    <h2>${event.nom}</h2>
                    <div class="event-details">
                        <div class="event-badges">
                            <span class="badge nbPhotos-badge">
                                <i class="fa-regular fa-calendar-days p-1"></i> PROCHAINEMENT
                            </span>
                        </div>
                        <div class="event-info">
                            <div class="event-date">
                                <i class="fa-solid fa-calendar-days"></i>
                                <p>${event.dateDebut}</p>
                            </div>
                            <div class="event-location">
                                <i class="fa-solid fa-location-dot"></i>
                                <p>${event.lieu}</p>
                            </div>
                        </div>
                    </div>
                `;
                }

                // Ajout de la carte à la liste
                this.eventList.appendChild(eventCard);
            };
        }
        console.log('// ----------------------------------------------');
        console.log('// 99. Retour loadEvents');
        console.log('// ----------------------------------------------');
    }


    // Supposons que event.date est une chaîne au format "JJ/MM/AAAA"
    comparerDates(eventDateString) {
        try {
            // Date actuelle (sans les heures/minutes/secondes)
            const aujourdHui = new Date();
            aujourdHui.setHours(0, 0, 0, 0);

            // 1. Vérifier d'abord si la date est déjà un objet Date valide
            if (eventDateString instanceof Date && !isNaN(eventDateString)) {
                const dateEvent = new Date(eventDateString);
                dateEvent.setHours(0, 0, 0, 0);
                return Math.round((dateEvent - aujourdHui) / (1000 * 60 * 60 * 24));
            }

            // 2. Gestion des différents formats de date
            let dateEvent;

            // Format YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(eventDateString)) {
                dateEvent = new Date(eventDateString);
            }
            // Format DD-MM-YYYY
            else if (/^\d{2}-\d{2}-\d{4}$/.test(eventDateString)) {
                const [dd, mm, yyyy] = eventDateString.split('-');
                dateEvent = new Date(`${yyyy}-${mm}-${dd}`);
            }
            // Format DD/MM/YYYY
            else if (/^\d{2}\/\d{2}\/\d{4}$/.test(eventDateString)) {
                const [dd, mm, yyyy] = eventDateString.split('/');
                dateEvent = new Date(`${yyyy}-${mm}-${dd}`);
            }
            // Autres formats
            else {
                // Essaye de parser directement (pour les formats ISO, etc.)
                dateEvent = new Date(eventDateString);
            }

            // Vérification que la date est valide
            if (isNaN(dateEvent.getTime())) {
                console.error('Date invalide:', eventDateString);
                return null;
            }

            dateEvent.setHours(0, 0, 0, 0);

            // Calcul de la différence en jours
            const diffJours = Math.round((dateEvent - aujourdHui) / (1000 * 60 * 60 * 24));

            return diffJours;

        } catch (e) {
            console.error('Erreur dans comparerDates:', e);
            return null;
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  OUVERTURE DE LA BDD : EventsDB
    // ------------------------------------------------------------------------------------------------------

    async openDB(maxRetries = 3, timeout = 2000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const dbPromise = new Promise((resolve, reject) => {
                    const request = indexedDB.open('EventsDB', 1);

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;

                        // La base de données n'existe pas 
                        if (!db.objectStoreNames.contains('events')) {
                            const store = db.createObjectStore('events', { keyPath: 'id' });
                            store.createIndex('byDate', 'dateDebut', { unique: false });
                        }
                    };

                    request.onsuccess = () => resolve(request.result);
                    request.onerror = (event) => {
                        reject(new Error(`Impossible d'ouvrir la base de données: ${event.target.error}`));
                    };

                });

                // Timeout pour éviter les blocages
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout dépassé')), timeout)
                );

                return await Promise.race([dbPromise, timeoutPromise]);

            } catch (error) {
                lastError = error;
                console.warn(`Tentative ${attempt} échouée`, error);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }
            }
        }

        throw new Error(`Impossible d'ouvrir la DB après ${maxRetries} tentatives: ${lastError.message}`);
    }

    // ------------------------------------------------------------------------------------------------------
    //  CHARGEMENT DE LA LISTE DES EVENEMENTS
    // ------------------------------------------------------------------------------------------------------

    async listeEvents() {
        let db;
        try {
            // 1. Ouverture de la base de données
            db = await this.openDB();

            // 2. Création de la transaction
            const transaction = db.transaction('events', 'readonly');
            const store = transaction.objectStore('events');

            // 3. Récupération des événements
            const events = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const result = request.result;
                    console.debug(`Nombre d'événements récupérés: ${result.length}`);
                    resolve(result);
                };
                request.onerror = () => {
                    console.error('Erreur lors de la requête:', request.error);
                    reject(new Error("Échec de la lecture des événements"));
                };
            });

            // 4. Formatage des données pour le debug
            if (events.length > 0) {
                console.groupCollapsed('Liste des événements (détails)');
                events.forEach(event => {
                    console.log(
                        `ID: ${event.id}\n` +
                        `Nom: ${event.nom}\n` +
                        `Date Début : ${new Date(event.dateDebut).toLocaleDateString('fr-FR')}\n` +
                        `Date Fin : ${new Date(event.dateFin).toLocaleDateString('fr-FR')}\n` +
                        `Lieu: ${event.lieu}\n` +
                        `Synchro: ${new Date(event.synchro).toLocaleString('fr-FR')}\n` +
                        `Code: ${event.code}\n` +
                        '------------------'
                    );
                });
                console.groupEnd();
            }
            // else {
            //     console.warn('Aucun événement trouvé dans la base');
            // }

            return events;

        } catch (error) {
            // 5. Gestion d'erreur critique
            this.showModal(
                "ERREUR CRITIQUE",
                `Le programme va s'arrêter. Raison : ${error.message}`,
                "error"
            );

            console.error("Erreur fatale:", error);

            // 6. Arrêt complet de l'application
            setTimeout(() => {
                throw new FatalError(error.message); // Créez une classe FatalError si nécessaire
                // Alternative pour les navigateurs :
                // window.stop(); // Arrête le chargement de la page
            }, 3000); // Délai pour permettre à l'utilisateur de voir le message

            return []; // Retourne un tableau vide (exécuté avant le throw)

        } finally {
            // 7. Nettoyage des ressources
            if (db) db.close();
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  ...
    // ------------------------------------------------------------------------------------------------------

    // Fonction pour télécharger l'image
    async downloadImage() {
        // if (!this.currentImageToDownload) {
        //     this.showError("Aucune image sélectionnée", 'toast');
        //     return;
        // }

        try {
            // 1. Récupération des données de l'événement
            const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours")) || {};
            const { id: eventId } = eventData;

            if (!eventId) {
                throw new Error("Aucun événement sélectionné");
            }

            // 2. Construction de l'URL
            const baseURL = `${this.urlProjet}/api/HD/` + eventId + "/";
            const imageName = this.currentImageToDownload.name;
            const imageURL = `${baseURL}${encodeURIComponent(imageName)}.jpg`;

            // 3. Vérification de l'existence du fichier
            const fileExists = await this.checkFileExistence(imageURL);
            if (!fileExists) {
                throw new Error("L'image n'est plus disponible");
            }

            // 4. Téléchargement pour mobile et desktop
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                // Méthode pour mobile
                const link = document.createElement('a');
                link.href = imageURL;
                link.download = `sobox_${eventId}_${imageName}.jpg`;
                link.target = '_blank';

                // Créer un événement de clic synthétique pour déclencher le téléchargement
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });

                link.dispatchEvent(clickEvent);

                // Alternative pour certains navigateurs mobiles
                window.open(imageURL, '_blank');
            } else {
                // Méthode pour desktop
                const link = document.createElement('a');
                link.href = imageURL;
                link.download = `sobox_${eventId}_${imageName}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // Suivi du téléchargement
            console.log(`Téléchargement initié: ${imageURL}`);
            this.trackDownload(eventId, imageName);

        } catch (error) {
            // console.error("Erreur lors du téléchargement:", error);
            throw error;
        }
    }

    // Méthode pour vérifier l'existence du fichier
    async checkFileExistence(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error("Erreur de vérification du fichier:", error);
            return false;
        }
    }

    // Méthode pour suivre les téléchargements (optionnelle)
    trackDownload(eventId, imageName) {
        // Implémentez votre logique de suivi ici
        console.log(`Téléchargement suivi: ${eventId} - ${imageName}`);
        // Exemple: envoi à Google Analytics ou votre backend
    }

    // Fonction pour vérifier si un fichier existe à une URL donnée
    async checkFileExistence(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' }); // Faire une requête HEAD pour vérifier l'existence du fichier
            return response.ok; // Retourner true si le fichier existe
        } catch (error) {
            console.error("Erreur lors de la vérification du fichier :", error); // Afficher une erreur en cas de problème
            return false;
        }
    };

    // 📷 Fonction pour mettre à jour l'image affichée dans le modal
    updateModalImage = () => {
        const modalImage = document.getElementById("modalImage"); // Récupérer l'élément image du modal
        modalImage.src = this.imagesList[this.currentImageIndex].data; // Mettre à jour la source de l'image
        this.currentImageToDownload = this.imagesList[this.currentImageIndex]; // Mettre à jour l'image à télécharger
    };

    // ⬅️ Fonction pour afficher l'image précédente dans le modal
    showPreviousImage = () => {
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
    showNextImage = () => {
        console.log('next...' + this.currentImageIndex + " / " + this.imagesList.length);
        if (this.currentImageIndex < this.imagesList.length - 1) {
            this.currentImageIndex++; // Incrémenter l'index de l'image actuelle
            this.updateModalImage(); // Mettre à jour l'image dans le modal
        }
    };

    // ------------------------------------------------------------------------------------------------------
    //  ...
    // ------------------------------------------------------------------------------------------------------

    // showError(message, type = 'alert') {
    //     console.error('Erreur:', message);

    //     // Méthode 1: Alert standard
    //     if (type === 'alert') {
    //         alert(`Erreur: ${message}`);
    //         return;
    //     }

    //     // Méthode 2: Toast notification
    //     if (type === 'toast') {
    //         console.error('Erreur:', message);
    //         return;
    //     }

    //     // Méthode 3: Message inline dans l'UI
    //     const errorContainer = document.getElementById('error-container') || this.createErrorContainer();
    //     errorContainer.textContent = message;
    //     errorContainer.style.display = 'block';

    //     // Masquer après 5 secondes
    //     setTimeout(() => {
    //         errorContainer.style.display = 'none';
    //     }, 5000);
    // }

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

    // ------------------------------------------------------------------------------------------------------
    //  GESTION DE LA NAVIGATION DES PAGES
    // ------------------------------------------------------------------------------------------------------

    async navigateTo(pageId) {

        await this.stopImageWatch();

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

        // Page : Liste des événements
        if (pageId === 'events-page') this.initEvents();

        // Page : Saisi du code événements
        if (pageId === 'rejoindre-event-page') this.rejoindreEvenement();

        // Page : Gallerie
        if (pageId === 'gallery-page') this.galleryPage();

        // Page :  ...
        if (pageId === 'photobooth-page') this.initPhotobooth(pageId);

        // Page : Favoris
        if (pageId === 'favorites-page') this.initFavorites(pageId);

        // Page : QR-CODE
        if (pageId === 'qrcode-page') this.initQrcode(pageId);

        // Page : Zoom photo
        if (pageId === 'zoom-page') this.initZoom(pageId);

        // Page : Zoom photo
        if (pageId === 'parametres-page') this.initParam();

        // Page : Assistance
        if (pageId === 'assistance-page') this.initAssistance();


    }

    // ------------------------------------------------------------------------------------------------------
    //  XX
    // ------------------------------------------------------------------------------------------------------

    // loadgallery(galleryId) {
    //     const gallery = galleries[galleryId];
    //     if (!gallery) return;

    //     // Mettre à jour le titre de la galerie
    //     document.getElementById('gallery-title').textContent = gallery.title;

    //     // Générer le contenu de la galerie
    //     const galleryContent = document.getElementById('gallery-content');
    //     galleryContent.innerHTML = '';

    //     this.gallery.images.forEach(imageUrl => {
    //         const img = document.createElement('img');
    //         img.src = imageUrl;
    //         img.className = 'gallery-item';
    //         galleryContent.appendChild(img);
    //     });
    // }

    // ------------------------------------------------------------------------------------------------------
    //  GESTION AFFCICHAGE DU FOOTER
    // ------------------------------------------------------------------------------------------------------

    toggleNavBar(show) {
        // Cette fonction n'est plus nécessaire si la nav est toujours visible
        // Ou vous pouvez l'utiliser pour changer le contenu/état de la nav
        const navBar = document.getElementById('main-nav');
        navBar.style.display = show ? 'flex' : 'none';
    }

    // ------------------------------------------------------------------------------------------------------
    //  ...
    // ------------------------------------------------------------------------------------------------------

    async initPhotobooth(pageId) {

        // Affichage des éléments du HEADER
        this.displayEventInfo();

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

        // Appel à la gallerie photo                    
        this.navigateTo('gallery-page');

    }

    // ------------------------------------------------------------------------------------------------------
    //  INITIALISATION DE LA PAGE : FAVORIS
    // ------------------------------------------------------------------------------------------------------

    async countFavorites(idEvent) {
        try {

            // Ouverture de la BDD
            const db = await this.openDBgalleryDB();

            // Recherche des images dans la BDD
            const allImages = await this.getAllImagesFromDB(db, idEvent);

            // Filtrage sur le flag "favori" et retourne le nombre
            return allImages.filter(img => img.favori).length;
        } catch (error) {
            console.error("Erreur lors du comptage des favoris:", error);
            return 0;
        }
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

        // Afficher le nombre de favoris
        if (this.nbFavori > 0) {
            // Désactivation de l illustration : pas de favori
            this.pasFavori.style.display = 'none';

            // Affichage du libellé 'nombre de favoris' dans le FOOTER
            this.lib_nb_favori.textContent = this.nbFavori === 1 ? '1 favori' : this.nbFavori + ' favoris';

            // Activation de la gallerie photo Favori
            this.galleryFavori.style.display = 'block';
        } else {
            this.pasFavori.style.display = 'block';
            this.lib_nb_favori.textContent = 'Aucun favori';
            this.galleryFavori.style.display = 'none';
        }

        // Lecture du nom de l'événement
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"))

        // Affichage de la gallerie photo
        await this.updateGallery(true, eventData.id);
    }

    async toggleFavorite(image) {
        try {
            // 1. Ouvrir la base de données
            const db = await this.openDBgalleryDB();

            // 2. Démarrer une transaction en lecture/écriture
            const transaction = db.transaction('photos', 'readwrite');
            const store = transaction.objectStore('photos');

            // 3. Récupérer l'image actuelle
            const request = store.get(image.url);

            request.onsuccess = () => {
                const currentImage = request.result;
                if (!currentImage) return;

                // 4. Inverser l'état favori
                const newFavoriteState = !currentImage.favori;

                // Incrémentation/Décrémentation du nombre de favoris
                if (newFavoriteState) {
                    this.nbFavori++;
                }
                else {
                    this.nbFavori--;
                }

                // Gestion de l'affichage du nombre de favoris
                if (this.nbFavori > 0) {
                    this.pasFavori.style.display = 'none';
                    this.lib_nb_favori.textContent = this.nbFavori === 1 ? '1 favori' : this.nbFavori + ' favoris';
                } else {
                    this.pasFavori.style.display = 'block';
                    this.lib_nb_favori.textContent = 'Aucun favori';
                }

                // 5. Mettre à jour l'image
                const updatedImage = {
                    ...currentImage,
                    favori: newFavoriteState,
                };

                // 6. Enregistrer les modifications
                const updateRequest = store.put(updatedImage);

                updateRequest.onsuccess = () => {
                    console.log(`Image ${image.name} ${newFavoriteState ? 'ajoutée aux' : 'retirée des'} favoris`);

                    // 7. Mettre à jour l'interface si nécessaire
                    this.updateUIAfterFavoriteToggle(image.url, newFavoriteState);
                };

                updateRequest.onerror = (event) => {
                    console.error("Erreur lors de la mise à jour:", event.target.error);
                };
            };

            request.onerror = (event) => {
                console.error("Erreur lors de la récupération:", event.target.error);
            };

        } catch (error) {
            console.error("Erreur dans toggleFavorite:", error);
        }
    }

    updateUIAfterFavoriteToggle(imageUrl, isFavorite) {
        // Mettre à jour l'icône cœur dans la galerie
        document.querySelectorAll(`.gallery-item [data-url="${imageUrl}"] .heart-btn i`).forEach(icon => {
            icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
            icon.style.color = isFavorite ? 'red' : 'white';
        });

        // Si on est sur la page des favoris, mettre à jour l'affichage
        if (document.getElementById('favorites-page').classList.contains('active')) {
            this.initFavorites('favorites-page');
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  INITIALISATION DE LA PAGE : QRCODE
    // ------------------------------------------------------------------------------------------------------

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

        this.partageAccesSms.addEventListener('click', async () => {

            // On donne le Focus à la zone de saisie
            phoneInput.focus();

            // Pour afficher avec champ téléphone
            const phoneNumber = await this.showModalTelephone("Partage de la galerie photos");

            if (phoneNumber) {

                // Lecture du nom de l'événement
                const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"))

                const url = 'https://www.so-box.fr/webapp/index.html';
                const bodyText = 'Bonjour,\n\nVoici le lien pour accéder à la galerie photos de l\'événement : ' + eventData.nom + '.\n\n' + url + '\n\n' + 'Je vous transmets le code d\'accès : ' + eventData.code;
                const plainTextBody = `${bodyText} \n\n L'équipe So'Box\n www.so-box.fr`;

                // Solution 1 : Lien SMSeba
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    const smsLink = `sms:${phoneNumber}?body=${encodeURIComponent(plainTextBody)}`;
                    window.location.href = smsLink;
                }
                // Solution 2 : Web Share API
                else if (navigator.share) {
                    navigator.share({ text: plainTextBody })
                        .catch(err => console.error("Erreur :", err));
                }
                // Solution 3 : Fallback desktop
                else {
                    alert("Ouvrez manuellement votre appli SMS et copiez ce message :\n\n" + message);
                }
            }
        });

        this.partageAccesMail.addEventListener('click', async () => {

            // On donne le Focus à la zone de saisie
            emailInput.focus();

            // Pour afficher avec champ téléphone
            const Email = await this.showModalEmail("Partage de la galerie photos");

            if (Email) {

                // Lecture de l'événement
                const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"))

                const to = Email;
                const url = `${this.urlProjet}` + '/index.html';
                const subject = 'So\'Box : Lien galerie photo de : ' + eventData.nom;
                const bodyText = 'Bonjour,\n\nVoici le lien pour accéder à la galerie photos de l\'événement : ' + eventData.nom + ".\n\n" + url + ".\n\n" + "Je vous transmets le code d'accès : " + eventData.code;

                // Formatage du texte brut avec URL visible
                const plainTextBody = `${bodyText} \n\n L'équipe So'Box\n www.so-box.fr`;

                // Construction de l'URL mailto
                const params = new URLSearchParams({
                    to: to,
                    subject: subject,
                    body: plainTextBody,
                });

                // Remplacer les '+' par '%20' dans la chaîne encodée
                const mailtoUrl = `mailto:?${params.toString().replace(/\+/g, '%20')}`;

                window.location.href = mailtoUrl;
            }
        });

    }

    // ------------------------------------------------------------------------------------------------------
    //  INITIALISATION DE LA PAGE : QRCODE
    // ------------------------------------------------------------------------------------------------------

    async initParam() {
        // Désactivation du menu Footer
        this.toggleNavBar(false);

        // Activation du bouton "Retour"
        this.btnRetour.style.display = 'block';

        // Activation du bouton "Close"
        this.btnClose.style.display = 'none';

        // Gestion de l'activitaion de l'accès adm 
        if (this.user.profile == 'adm') {
            this.btnAdm.style.display = 'block';
        } else {
            this.btnAdm.style.display = 'none';
        }

        // Activation du logo SoBox
        this.logoSobox.style.display = 'none';

        // Activation du bouton "Paramètres"
        this.btnParam.style.display = 'none';

        // Mise à jour du titre de la photo
        this.titreHeader.textContent = 'Paramétrages';
    }

    // ------------------------------------------------------------------------------------------------------
    //  INITIALISATION DE LA PAGE : QRCODE
    // ------------------------------------------------------------------------------------------------------

    async initAssistance() {
        // Désactivation du menu Footer
        this.toggleNavBar(false);
    }

    // ------------------------------------------------------------------------------------------------------
    //  INITIALISATION DE LA PAGE : ZOOM
    // ------------------------------------------------------------------------------------------------------

    async initZoom() {
        // Désactivation du menu Footer
        this.toggleNavBar(false);

        // Désactivation du bouton "Retour"
        this.btnRetour.style.display = 'none';

        // Activation du bouton "Close"
        this.btnClose.style.display = 'block';

        // Activation du bouton "Adm"
        // this.btnAdm.style.display = 'none';

        // Mise à jour du titre de la photo
        this.titreHeader.textContent = 'Sélection d\'une photo';

        // this.nextImage.addEventListener('click', (e) => {
        //     this.showNextImage();
        // });

        // this.previousImage.addEventListener('click', (e) => {
        //     this.showPreviousImage();
        // });

        this.downloadButton.addEventListener('click', (e) => {
            try {
                this.downloadImage();
            } catch (error) {
                alert(error.message);
            }
        });

        this.emailButton.addEventListener('click', async () => {

            // Pour afficher avec champ téléphone
            const Email = await this.showModalEmail("Partage de la photo par email");

            if (Email) {

                // Lecture du nom de l'événement
                const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"))

                // 2. Construction de l'URL
                const baseURL = `${this.urlProjet}/api/HD/` + eventData.id + "/";
                const imageName = this.currentImageToDownload.name;
                const imageURL = `${baseURL}${encodeURIComponent(imageName)}.jpg`;

                const to = Email;
                const subject = 'So\'Box : Une photo envoyée  de ' + eventData.nom;
                const bodyText = 'Bonjour,\n\nVoici le lien pour accéder à la photo de l\'événement : ' + eventData.nom;;
                const linkUrl = `${imageURL}`;

                // Formatage du texte brut avec URL visible
                const plainTextBody = `${bodyText}\n\n  ${linkUrl} \n\n L'équipe So'Box\n www.so-box.fr`;

                // Construction de l'URL mailto
                const params = new URLSearchParams({
                    to: to,
                    subject: subject,
                    body: plainTextBody,
                });

                // Remplacer les '+' par '%20' dans la chaîne encodée
                const mailtoUrl = `mailto:?${params.toString().replace(/\+/g, '%20')}`;

                window.location.href = mailtoUrl;
            }

        });

        this.smsButton.addEventListener('click', async () => {

            // Pour afficher avec champ téléphone
            const phoneNumber = await this.showModalTelephone("Partage de la photo par SMS");

            if (phoneNumber) {

                // Lecture du nom de l'événement
                const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"))

                // 
                const url = `${this.urlProjet}` + '/api/HD/' + eventData.id + '/09_10_24__22_40_37_Composition.jpg';
                const message = 'Bonjour, voici le lien pour visualiser la photo en HD de l\'événement de ' + eventData.nom + ': ' + url;

                // Solution 1 : Lien SMS
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    const smsLink = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
                    window.location.href = smsLink;
                }
                // Solution 2 : Web Share API
                else if (navigator.share) {
                    navigator.share({ text: message })
                        .catch(err => console.error("Erreur :", err));
                }
                // Solution 3 : Fallback desktop
                else {
                    alert("Ouvrez manuellement votre appli SMS et copiez ce message :\n\n" + message);
                }
            }
        });
    }

    async zoomClose() {

        // Desactivation de la page "Zoom"
        const desactivePage = document.getElementById('zoom-page');
        desactivePage.classList.remove('active');

        // Activation de la page "Gallerie Photos"
        const activePage = document.getElementById('gallery-page');
        activePage.classList.add('active');

        // Désactivation du bouton "Retour"
        this.btnRetour.style.display = 'block';

        // Activation du bouton "Close"
        this.btnClose.style.display = 'none';

        // Activation du bouton "Adm"
        // this.btnAdm.style.display = 'none';

        // Mise à jour du titre de la photo
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"))
        document.getElementById('eventName').textContent = eventData.nom;

        // Désactivation du menu Footer
        this.toggleNavBar(true);
    }

    // ------------------------------------------------------------------------------------------------------
    //  GESTION DES EVENEMENTS
    // ------------------------------------------------------------------------------------------------------

    async initEvents() {

        console.log('-----------------------------------');
        console.log('Appel : initEvents');
        console.log('-----------------------------------');

        // 1. Mise à jour des paramètres d'affichage de la page
        console.log('1. Mise à jour des paramètres d\'affichage de la page');

        this.mainContent.style.display = 'block';
        this.titreHeader.textContent = 'So Box';
        this.btnRetour.style.display = 'none';
        this.logoSobox.style.display = 'block';
        // Activation du bouton "Paramètres"
        this.btnParam.style.display = 'block';

        // 2. Ré initialisation de l'événement en cours
        console.log('2. Ré initialisation de l\'événement en cours');

        const eventData = {
            id: null,
            nom: null,
            lieu: null,
            date: null,
            synchro: null,
            statut: null,
            code: null
        };
        localStorage.setItem("Evenement_En_Cours", JSON.stringify(eventData));

        // 3. Arrêt de la synchronisation des images
        console.log('3. Arrêt de la synchronisation des images');

        this.stopImageWatch();

        // 4. Réinitialisation 
        console.log('4. Réinitialisation ');
        this._initializedApp = false;

        // Mise à jour de la liste des événements
        console.log('5. Appel : loadEvents()');
        await this.loadEvents();

        console.log('-----------------------------------');
        console.log('Retour : initEvents');
        console.log('-----------------------------------');

    };

    // ------------------------------------------------------------------------------------------------------
    //  REJOINDRE UN EVENEMENT
    // ------------------------------------------------------------------------------------------------------

    // Méthode de saisie du code événement
    async rejoindreEvenement() {

        // Désactivation du menu Footer
        this.toggleNavBar(false);

        // Titre de la fenêtre
        this.titreHeader.textContent = 'Rejoindre un événement';

        // Activation du bouton retour
        this.btnRetour.style.display = 'flex';

        // Désactivation du logo
        this.logoSobox.style.display = 'none';

        // Dés Activation du bouton "Adm"
        // this.btnAdm.style.display = 'none';

        // Activation du bouton "Paramètres"
        this.btnParam.style.display = 'none';

        // Ré initialisation de l'INPUT
        this.eventCodeInput.value = '';

        // On se position sur l'INPUT
        this.eventCodeInput.focus();

        // Filtrage des données : Lettres et chiffres uniquement + Forcing majuscule
        eventCodeInput.addEventListener('input', function () {
            // 1. Sauvegarde la position du curseur
            const start = this.selectionStart;
            const end = this.selectionEnd;

            // 2. Filtre et limite à 10 caractères
            this.value = this.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .substring(0, 10); // ← Limite à 10 caractères

            // 3. Restaure la position du curseur
            if (start > 10) start = 10;
            if (end > 10) end = 10;
            this.setSelectionRange(start, end);

            // 4. Feedback visuel (optionnel)
            if (this.value.length >= 10) {
                this.classList.add('max-length');
            } else {
                this.classList.remove('max-length');
            }
        });
    }

    //  Recherche du code événement
    async handleEventCodeSubmission(code) {
        try {
            // 1. Nettoyage du code et validation minimale
            const cleanedCode = String(code || "").trim();
            if (!cleanedCode) {
                this.showModal("Erreur", "Veuillez saisir un code valide", "INVALID_CODE");
                return;
            }

            // 2. Appel API avec gestion d'erreur
            const response = await this.fetchEvent(cleanedCode);

            // 3. Traitement de la réponse
            switch (response?.status) {  // Utilisation de ?. pour éviter les erreurs si response est undefined
                case "succes":

                    // Chargements des évenements
                    this.tabListeEvents = await this.listeEvents();

                    // Mise à jour de la liste des événements
                    await this.loadEvents();

                    // Redirection vers la page "Liste des événements"
                    await this.navigateTo('events-page');
                    break;

                default:
                    this.showModal(
                        response.title || "Attention",  // Valeur par défaut
                        response.message || "Une erreur est survenue",  // Valeur par défaut
                        response.status || "UNKNOWN_STATUS"  // Valeur par défaut
                    );
            }

        } catch (error) {
            console.error("Erreur lors du traitement:", error);
            this.showModal(
                "Erreur système",
                "Une erreur inattendue est survenue",
                "SYSTEM_ERROR"
            );
        }
    }

    //  Enregistrement d'un événement
    async addEventToDB(event) {

        const db = await this.openDB();
        // Vérifier que `db` est disponible
        if (!db) {
            resolve({
                status: "ECHEC",
                message: "Base de données non initialisée",
                data: null
            });
            return;
        }

        return new Promise((resolve, reject) => {

            const transaction = db.transaction('events', 'readwrite');
            const store = transaction.objectStore('events');

            const checkRequest = store.get(event.id);

            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    resolve({
                        status: "warning",
                        message: "Oups ! L'événement est déjà présent dans votre liste.",
                        data: null
                    });
                    return;
                }

                // 2. Ajout de l'événement
                const addRequest = store.add(event);

                addRequest.onsuccess = () => {
                    console.log('Événement ajouté:', event);
                    resolve({
                        status: "succes",
                        message: "Événement ajouté avec succès.",
                        data: event
                    });
                };

                addRequest.onerror = (e) => {
                    console.error('Erreur IndexedDB:', e.target.error);
                    resolve({
                        status: "error",
                        message: "Erreur technique lors de l'ajout",
                        data: null
                    });
                };
            };

            checkRequest.onerror = (e) => {
                console.error('Erreur vérification existance:', e.target.error);
                resolve({
                    status: "error",
                    message: "Erreur lors de la vérification",
                    data: null
                });
            };
        });
    };

    //  Appel API : Recherche et ajour du code événement
    async fetchEvent(eventCode) {
        const apiUrl = `${this.urlProjet}/assets/php/get_events.php?password=${encodeURIComponent(eventCode)}`;

        let response;
        try {
            // Tentative de requête API
            response = await fetch(apiUrl, {
                method: 'GET',
                redirect: 'manual',
                headers: { 'Accept': 'application/json' }
            });
        } catch (networkError) {
            // Erreur réseau (ex: pas de connexion, timeout)
            return {
                status: "error",
                message: "Erreur réseau : impossible de contacter le serveur",
                data: null
            };
        }

        // Gestion des redirections
        if (response.status === 301 || response.status === 302) {
            const redirectedURL = response.headers.get('Location');
            response = await fetch(redirectedURL);
        }

        // Erreurs HTTP (4xx/5xx)
        if (!response.ok) {
            return {
                status: "error",
                message: `Erreur HTTP ${response.status}`,
                data: null
            };
        }

        // Décodage JSON
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            return {
                status: "error",
                message: "Réponse API invalide (format JSON attendu)",
                data: null
            };
        }

        // Erreur métier (ex: mot de passe incorrect)
        if (result.status != "succes") {
            return result; // On retourne tel quel le message d'erreur de l'API
        }

        // Succès → Mise à jour de la base locale
        result = await this.addEventToDB({
            id: result.data.id,
            nom: result.data.nom,
            dateDebut: result.data.dateDebut,
            dateFin: result.data.dateFin,
            lieu: result.data.lieu,
            synchro: '2000-01-01 00:00:00',
            code: eventCode
        });

        if (result.status != "succes") {
            return result; // On retourne tel quel le message d'erreur de l'API
        }

        // Retour à la liste des événements
        await this.initEvents();

        return result;
    };

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
                    photosStore.createIndex('id', 'id', { unique: false });

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
    getAllImagesFromDB(db, idEvent) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('photos', 'readonly');
            const store = transaction.objectStore('photos');

            // Vérifie si l'index existe
            if (!store.indexNames.contains('id')) {
                console.error("L'index 'idEvent' n'existe pas dans le store 'photos'");
                reject("Index non trouvé");
                return;
            }

            // Créez un index sur la propriété idEvent (supposons qu'elle existe)
            const index = store.index('id'); // Assurez-vous que cet index existe dans votre base de données

            // Faites une requête pour obtenir seulement les images avec cet idEvent

            const id = idEvent.toString();
            const request = index.getAll(id);

            request.onsuccess = () => {
                const images = request.result;

                // console.log("Nombre d'images trouvées :", images.length);
                // console.log("Images trouvées :", images);

                // if (images.length === 0) {
                //     console.warn("Aucune image trouvée pour idEvent =", idEvent);
                // }

                // Normalisation des données
                const normalizedImages = images.map(img => ({
                    id: img.id,
                    data: img.data || img.url,
                    name: img.name,
                    date: img.date,
                    favori: img.favori,
                    url: img.url
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
                            alert(img.dataset.src);
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
    async loadImagesBatch(flag_favori = false) {
        if (this.isLoadingBatch || !this.imagesList) return;
        this.isLoadingBatch = true;

        try {
            const startIdx = this.currentBatchIndex;
            const endIdx = Math.min(startIdx + this.batchSize, this.imagesList.length);

            // Utilisez requestAnimationFrame pour un chargement plus fluide
            await new Promise(resolve => requestAnimationFrame(() => {
                for (let i = startIdx; i < endIdx; i++) {

                    console.log('***' + this.imagesList[i]);

                    const card = this.createImageCard(this.imagesList[i], i);
                    if (flag_favori) {
                        this.galleryFavori.appendChild(card);
                    } else {
                        this.gallery.appendChild(card);
                    }

                }
                resolve();
            }));

            if (!flag_favori) {
                this.currentBatchIndex = endIdx;
                this.updatePhotoCount();

                // Configurez le sentinel seulement si nécessaire
                if (this.currentBatchIndex < this.imagesList.length) {
                    this.setupNewSentinel();
                }
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

        // Créez l'élément img
        const img = document.createElement('img');
        img.dataset.src = image.data || image.url;
        img.className = 'gallery-img';
        img.alt = image.name || 'Photo événement';
        img.loading = 'lazy';

        // Style initial pour l'animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        // Création du bouton cœur
        const heartBtn = document.createElement('button');
        heartBtn.className = 'heart-btn';
        heartBtn.innerHTML = '<i class="far fa-heart"></i>'; // Cœur vide par défaut
        heartBtn.style.position = 'absolute';
        heartBtn.style.top = '10px';
        heartBtn.style.right = '10px';
        heartBtn.style.background = 'rgba(0,0,0,0.5)';
        heartBtn.style.border = 'none';
        heartBtn.style.borderRadius = '50%';
        heartBtn.style.width = '30px';
        heartBtn.style.height = '30px';
        heartBtn.style.color = 'white';
        heartBtn.style.cursor = 'pointer';
        heartBtn.style.display = 'flex';
        heartBtn.style.alignItems = 'center';
        heartBtn.style.justifyContent = 'center';
        heartBtn.style.zIndex = '10';

        if (image.favori) {
            heartBtn.innerHTML = '<i class="fas fa-heart" style="color: red;"></i>'
        }
        // Gestion du clic sur le cœur
        heartBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche le déclenchement du clic sur la carte
            heartBtn.innerHTML = heartBtn.innerHTML.includes('far')
                ? '<i class="fas fa-heart" style="color: red;"></i>'
                : '<i class="far fa-heart"></i>';

            // Ici vous pouvez ajouter la logique pour sauvegarder en favoris
            this.toggleFavorite(image);
        });

        // Conteneur pour l'image et le bouton
        const imgContainer = document.createElement('div');
        imgContainer.style.position = 'relative';
        imgContainer.appendChild(img);
        imgContainer.appendChild(heartBtn);

        // Ajoutez le conteneur à la carte
        card.appendChild(imgContainer);

        // Gestion du clic sur la carte
        card.addEventListener('click', () => {
            // alert('*' + image.name);
            this.currentImageIndex = index;
            this.currentImageToDownload = image;
            this.navigateTo('zoom-page');
            this.openModal(image, index, this.imagesList, image.name);
        });

        // Observez la carte
        this.observeImage(card, img);

        return card;
    }

    //  ---- CHARGEMENT DE LA GALERIE PHOTO A PARTIR DE LA BDD LOCALE

    async updateGallery(flag_favori = false, idEvent) {
        try {

            // Connexion à la bas de données
            const db = await this.openDBgalleryDB();

            // Recherche des images dans la BDD
            let images = await this.getAllImagesFromDB(db, idEvent);

            // Gestion de l'affichage de l'information si pas de photo dans la galerie
            if (images.length > 0) {
                this.pasPhotoGalerie.style.display = 'none';
            } else {
                this.pasPhotoGalerie.style.display = 'block';
            }

            // Filtrer les favoris si flag_favori est true
            if (flag_favori) {
                images = images.filter(img => img.favori);
                console.log('Filtrage des favoris activé. Images:', images.length);
                console.log('**' + this.nbFavori);

                this.galleryFavori.innerHTML = '';
            } else {
                this.gallery.innerHTML = '';
            }

            // DEBUG : Affichez les premières images
            // console.log('Exemple de données image:', images.slice(0, 3));

            // Réinitialiser complètement
            this.imagesList = this.sortImagesByDate(images);
            this.currentBatchIndex = 0;

            // La page Favori est sélectionné
            // if (flag_favori) {
            //     this.galleryFavori.innerHTML = '';
            // } else {
            //     this.gallery.innerHTML = '';
            // }

            this.cleanupScrollObserver();

            // Charger le premier lot seulement si on a des images
            if (this.imagesList.length > 0) {
                await this.loadImagesBatch(flag_favori);
            }
            // } else {
            //     if (!flag_favori) {
            //         this.gallery.innerHTML = '<img style="width:100%" src="assets/images/pas-de-photo.jpg" />';
            //     }

        } catch (error) {
            console.error("Erreur dans updateGallery:", error);
            this.gallery.innerHTML = `<p class="error">Erreur de chargement: ${error.message}</p>`;
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

    //  ---- APPEL DE L API "getImages" POUR RECHERCHER LES NOUVELLES PHOTO EN FONCTION DE LA DATE DE SYNCHRONISATION

    async fetchImagesFromAPI(signal) {

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

            // console.log(`Utilisation de la date de synchro: ${synchro}`);

            // 3. Construction de l'URL
            const apiUrl = new URL(`${this.urlProjet}/assets/php/getImages.php`);
            apiUrl.searchParams.append('id', eventId);
            apiUrl.searchParams.append('lastSync', encodeURIComponent(synchro));

            // 4. Requête API avec signal d'abandon
            const response = await fetch(apiUrl.toString(), {
                signal // Ici on utilise le signal
            });

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

            return sortedImages.map(({ id, url, name, date }) => ({
                id,
                url,
                name,
                date,
                timestamp: new Date(date).getTime()
            }));

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Synchronisation annulée');
                return [];
            }

            console.error("Erreur lors de la récupération des images:", error);

            if (error.message.includes('Failed to fetch')) {
                alert("Problème de connexion réseau");
            }

            return [];
        }
    }

    // Fonction pour convertir une image en base64
    async convertImageToBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Erreur lors du téléchargement de l'image : ${imageUrl} - ${response.statusText}`);
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
    async storeImageInDB(id, imageUrl, imageBase64, imageName, imageDate) {
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
                id: id,
                url: imageUrl,
                data: `data:image/jpeg;base64,${imageBase64}`,
                name: imageName,
                favori: 0,
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

        // 1. On enlève temporairement l'illustration "PAS DE PHOTO"
        this.pasPhotoGalerie.style.display = 'none';

        // 2. Arrêter toute synchronisation en cours
        await this.stopImageWatch();

        // 3. Créer un nouveau AbortController et son signal
        this.syncController = new AbortController();
        const signal = this.syncController.signal;

        const syncImages = async () => {

            // Affichage du Loader à 30%
            // this.updateLoading(30);

            try {

                // 3. Passer le signal à fetchImagesFromAPI
                const newImages = await this.fetchImagesFromAPI(signal);

                if (newImages.length > 0) { // 4. Test si présence de photo

                    // Affichage du Loader
                    this.showLoading();

                    console.log('🔄 Synchronisation en cours...');
                    this.updateLoading(20);

                    console.log('🆕 Nouvelles images détectées !');

                    // Affichage du Loader à 50%
                    // this.updateLoading(50);

                    // Ouverture de la BDD locale
                    const db = await this.openDBgalleryDB();

                    let progress = 60;

                    // Calcul du pas de progression en fonction du nombre d'images à synchroniser
                    const progressIncrement = 30 / newImages.length;

                    // Parcours de l'ensemble des images à synchroniser
                    for (const image of newImages) {

                        // Vérification si l'image est déjà présent dans la BDD locale : galleryDB
                        const imageExists = await this.checkImageInDB(db, image.url);

                        if (!imageExists) { // L'image n'existe pas 
                            this.updateLoading(progress);

                            // Conversion de l'image en base64
                            const base64Data = await this.convertImageToBase64(image.url);

                            // Stockage de l'image en BDD locale
                            await this.storeImageInDB(image.id, image.url, base64Data, image.name, image.date);
                        }
                        progress += progressIncrement;
                    }

                    // Affichage du Loader à 90%
                    this.updateLoading(90);

                } else { // 4. Pas de photo à synchroniser

                    console.log('✅ Aucune nouvelle image trouvée.');

                    // Lecture des données lié à l'événement en cours
                    const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"));

                    // Détermination du nombre de photos
                    const nbPhotos = await this.countPhotos(String(eventData.id));

                    if (nbPhotos > 0) {
                        this.pasPhotoGalerie.style.display = 'none';
                    } else {
                        this.pasPhotoGalerie.style.display = 'block';
                    }

                }

                this.updateLoading(100);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('❌ Erreur de synchronisation :', error);
                    document.getElementById('loading-bar').style.backgroundColor = '#f44336';
                }
            } finally {
                this.hideLoading();
            }
        };

        // 4. Premier appel immédiat
        await syncImages();

        // 5. Démarrer l'intervalle seulement si pas annulé
        if (!signal.aborted) {
            this.syncInterval = setInterval(syncImages, 60000);
        }
    }

    async stopImageWatch() {
        // Annuler les requêtes en cours
        if (this.syncController) {
            this.syncController.abort();
        }

        // Nettoyer l'intervalle
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        console.log('Synchronisation arrêtée');
    }

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

        // Gestion de l'affichage 
        this.mainContent.style.display = 'block';

        // Activation du bouton RETOUR
        this.btnRetour.style.display = 'block';

        // Masquage du logo
        this.logoSobox.style.display = 'none';

        // Activation du bouton "Paramètres"
        this.btnParam.style.display = 'none';

        // Activation du FOOTER
        this.toggleNavBar(true);

        // Lecture des données lié à l'événement en cours
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"));

        // L'événement est défini
        if (eventData) {
            document.getElementById('eventName').textContent = eventData.nom;
        } else {
            document.getElementById('eventName').textContent = "Événement non spécifié";
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  AFFICHAGE DE LA PHOTO SELECTIONNEE DANS UNE MODALE
    // ------------------------------------------------------------------------------------------------------

    // 🖼️ Fonction pour ouvrir le modal avec l'image sélectionnée
    async openModal(imageSrc, index, images, nomPhoto) {

        this.currentImageIndex = index; // Mettre à jour l'index de l'image actuelle
        this.imagesList = images; // Mettre à jour la liste des images
        this.currentImageToDownload = imageSrc; // Mettre à jour l'image à télécharger
        this.nomPhotoSelected = nomPhoto; // Mettre à jour l'image à télécharger

        const modalImage = document.getElementById("modalImage"); // Récupérer l'élément image du modal
        modalImage.src = imageSrc.data; // Définir la source de l'image dans le modal
    };

    // Assignez la fonction à la variable globale
    async galleryPage() {
        if (this._initializedApp) return; // Protection contre les doubles init
        this._initializedApp = true;

        try {
            this.pasPhotoGalerie.style.display = 'none';
            this.observeGalleryScroll = this.observeGalleryScroll.bind(this);
            this.loadImagesBatch = this.loadImagesBatch.bind(this);
            this.createImageCard = this.createImageCard.bind(this)

            // Lecture des données liés à l'événements
            const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"));

            // Horodatage des accès à la gallerie photos
            const reponse = await this.horodatageAccesUser(eventData.id, this.user);

            // Affichage du nombre de favori de l'événement
            this.nbFavori = await this.countFavorites(String(eventData.id));

            if (this.nbFavori > 0) {
                this.pasFavori.style.display = 'none';
                this.lib_nb_favori.textContent = this.nbFavori === 1 ? '1 favori' : this.nbFavori + ' favoris';
            } else {
                this.pasFavori.style.display = 'block';
                this.lib_nb_favori.textContent = 'Aucun favori';
            }

            // Affichage de la barre de synchronisation
            // this.showLoading();

            // Synchronisation des images
            await this.startImageWatch();

            // Détermination du nombre de photos
            const nbPhotos = await this.countPhotos(String(eventData.id));

            // Vidage des galeries photos
            this.galleryFavori.innerHTML = '';
            this.gallery.innerHTML = '';

            if (nbPhotos > 0) { // Si présence de photo dans la galerie en locale 

                // Désactivation de l'illustration "PAS DE PHOTO"
                this.pasPhotoGalerie.style.display = 'none';

                // Affichage de la galerie photos
                await this.updateGallery(false, String(eventData.id));

            } else {
                // Activation de l'illustration "PAS DE PHOTO"
                this.pasPhotoGalerie.style.display = 'block';

                // Initialisation du nombre de photo
                this.photoCountElement.textContent = "Aucune photo";
            }

        } catch (error) {
            console.error("Initialization failed:", error);
            // this.showError("Erreur de chargement");
        } finally {
            this.hideLoading();
        }
    }

    async horodatageAccesUser(id_evt, $user) {
        try {
            const apiUrl = new URL(`${this.urlProjet}l/assets/php/user_horodatage.php`);
            apiUrl.searchParams.append('user', JSON.stringify($user));
            apiUrl.searchParams.append('evt', id_evt);

            const response = await fetch(apiUrl.toString());

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Sync error:', error);
            throw error;
        }
    }

    // ------------------------------------------------------------------------------------------------------
    //  AFFICHAGE DE LA PHOTO SELECTIONNEE DANS UNE MODALE
    // ------------------------------------------------------------------------------------------------------

    async generateQR() {
        const text = `${this.urlProjet}/test2.html`;

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

    // ------------------------------------------------------------------------------------------------------
    //  GESTION DES MODALES
    // ------------------------------------------------------------------------------------------------------

    // Modale liée aux erreurs

    // showModal_old(title, message, type = "info") {
    //     // Initialisation des éléments (à faire une fois au chargement)
    //     if (!this.modalElementsInitialized) {
    //         this.modal = document.getElementById('messageModal');
    //         this.modalTitle = document.getElementById('modalTitle');
    //         this.modalMessage = document.getElementById('modalMessage');
    //         this.modalIcon = document.querySelector('.modal-icon');
    //         this.modalCloseBtn = document.querySelector('.modal-close');
    //         this.modalElementsInitialized = true;
    //     }

    //     // Vérification des éléments
    //     if (!this.modal || !this.modalCloseBtn) {
    //         console.error("Éléments modaux manquants !");
    //         return false;
    //     }

    //     // Configuration du contenu
    //     let icon;
    //     switch (type.toUpperCase()) { // Plus robuste
    //         case "ECHEC": icon = "⚠️"; break;
    //         case "ERREUR": icon = "❌"; break;
    //         default: icon = "ℹ️";
    //     }

    //     this.modal.className = `modal ${type.toLowerCase()}`;
    //     this.modalTitle.textContent = title;
    //     this.modalMessage.textContent = message;
    //     this.modalIcon.textContent = icon;

    //     // Affichage
    //     this.modal.style.display = "block";
    //     document.body.style.overflow = "hidden";

    //     // Gestion fermeture
    //     const closeModal = () => {
    //         this.modal.classList.add('fade-out');
    //         setTimeout(() => {
    //             this.modal.style.display = "none";
    //             this.modal.classList.remove('fade-out');
    //             document.body.style.overflow = "auto";
    //         }, 300);
    //     };

    //     // Gestion des événements
    //     this.modalCloseBtn.onclick = closeModal;
    //     this.modal.onclick = (e) => e.target === this.modal && closeModal();

    //     // Fermeture auto pour les infos
    //     if (type.toLowerCase() === "info") {
    //         setTimeout(closeModal, 5000);
    //     }

    //     return true;
    // }

    // Modale liée à la saisie du nro de téléphone

    async showModalTelephone(titre) {
        // Récupération des éléments
        const modal = document.getElementById('messageModalTelephone');
        const phoneInput = document.getElementById('phoneInput');
        const titreModalTelephone = document.getElementById('titreModalTelephone');

        phoneInput.value = ''; // Réinitialise le champ

        // Affichage
        modal.style.display = "block";
        titreModalTelephone.innerHTML = titre;
        document.body.style.overflow = "hidden";

        // Gestion de la promesse
        return new Promise((resolve) => {
            const cleanUp = () => {
                modal.style.display = "none";
                document.body.style.overflow = "auto";
            };

            const handleValidate = () => {
                if (/^[0-9]{10}$/.test(phoneInput.value)) {
                    cleanUp();
                    resolve(phoneInput.value);
                } else {
                    alert("Veuillez entrer 10 chiffres");
                    phoneInput.focus();
                }
            };

            // Gestion des événements
            document.getElementById('validateBtn').onclick = handleValidate;
            document.getElementById('cancelBtn').onclick = () => {
                cleanUp();
                resolve(null);
            };
            // document.getElementById('ModaleTelephoneClose').onclick = () => {
            //     cleanUp();
            //     resolve(null);
            // };

            // document.querySelector('.modal-close').onclick = () => {
            //     cleanUp();
            //     resolve(null);
            // };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanUp();
                    resolve(null);
                }
            };

            // Focus automatique sur le champ
            setTimeout(() => phoneInput.focus(), 100);
        });
    }

    async showModalEmail(titre) {
        // Récupération des éléments
        const modal = document.getElementById('messageModalEmail');
        const emailInput = document.getElementById('emailInput');
        const titreModalTelephone = document.getElementById('titreModalEmail');

        emailInput.value = ''; // Réinitialise le champ

        // Affichage
        modal.style.display = "block";
        titreModalEmail.innerHTML = titre;
        document.body.style.overflow = "hidden";

        // Gestion de la promesse
        return new Promise((resolve) => {
            const cleanUp = () => {
                modal.style.display = "none";
                document.body.style.overflow = "auto";
            };

            const handleValidateEmail = () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (emailRegex.test(emailInput.value)) {
                    cleanUp();
                    resolve(emailInput.value);
                } else {
                    alert("Veuillez entrer une adresse email valide (ex: exemple@domaine.com)");
                    emailInput.focus();
                }
            };

            // Gestion des événements
            document.getElementById('validateBtnEmail').onclick = handleValidateEmail;
            document.getElementById('cancelBtnEmail').onclick = () => {
                console.log('xxx');
                cleanUp();
                resolve(null);
            };

            // document.querySelector('.modal-close-email').onclick = () => {
            //     cleanUp();
            //     resolve(null);
            // };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanUp();
                    resolve(null);
                }
            };

            // Focus automatique sur le champ
            setTimeout(() => emailInput.focus(), 100);
        });
    }

    // async generateDatabaseRecord(userId, initialStatus = 'pending') {
    //     // Génère un préfixe aléatoire (2 lettres)
    //     const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    //         String.fromCharCode(65 + Math.floor(Math.random() * 26));

    //     // ID complet
    //     const uniqueId = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    //     return {
    //         id: uniqueId,
    //         id_user: userId,
    //         status: initialStatus,
    //         date_creation: new Date().toISOString()
    //     };
    // }

    // ------------------------------------------------------------------------------------------------------
    //  GESTION DE LA TABLE UTILISATEUR
    // ------------------------------------------------------------------------------------------------------

    // Initialisation de la DB avec vérification
    async openDBUser() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("SoboxDB", 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
                // Vérification que le store existe
                if (!db.objectStoreNames.contains('user')) {
                    reject(new Error("L'object store 'user' n'existe pas"));
                } else {
                    resolve(db);
                }
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Crée le store s'il n'existe pas
                if (!db.objectStoreNames.contains('user')) {
                    const store = db.createObjectStore('user', { keyPath: 'id' });
                    store.createIndex('by_id', 'id', { unique: true });
                }
            };
        });
    }

    // Fonction vérification/création
    async checkUser() {
        console.log('---------------------------------------------');
        console.log('Appel checkUser()');
        console.log('---------------------------------------------');

        const db = await this.openDBUser();

        return new Promise(async (resolve, reject) => {
            try {
                // 1. Accès à la BDD locale : SoboxDB
                console.log('1. checkUser : Accès à la BDD locale : SoboxDB');
                const transaction = db.transaction(['user'], 'readwrite');
                const store = transaction.objectStore('user');

                // 2. Chargement des données de la BDD locale
                console.log('2. checkUser : Chargement des données de la BDD locale');
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = async () => {
                    // 2.1. Mémorisation des données de l'utilisateur
                    console.log('2.1. checkUser : Mémorisation des données de l\'utilisateur');
                    const resultat = getAllRequest.result;
                    this.user = resultat[0];

                    // 2.2. Utilisateur existant

                    if (typeof this.user != 'undefined') {
                        console.log('2.2. checkUser : Utilisateur existant : ');
                        console.log('2.2.1. checkUser : id : ' + this.user.id);
                        console.log('2.2.2. checkUser : status : ' + this.user.status);
                        console.log('2.2.3. checkUser : date_creation : ' + this.user.date_creation);
                        console.log('2.2.4. checkUser : profile : ' + this.user.profile);

                        // 2.3. Pas de création de l'utilisateur / Retourne le user ID
                        console.log('2.3. checkUser : Pas de création de l\'utilisateur / Retourne le user ID', this.user.id);
                        resolve(this.user.id);
                        return;
                    }

                    const newId = 'SOBOX_' + crypto.randomUUID();
                    const newRecord = {
                        id: newId,
                        status: 'active',
                        date_creation: new Date().toISOString(),
                        profile: 'user'
                    };

                    this.user = newRecord;

                    try {
                        // 2.4. Création d'un nouvel utilisateur
                        console.log('2.4. checkUser : Création d\'un nouvel utilisateur');

                        await new Promise((res, rej) => {
                            const addRequest = store.add(newRecord);
                            addRequest.onsuccess = () => {
                                // 2.4.1. Enregistrement de l\'utilisateur dans la BDD locale : SoboxDB
                                console.log('2.4.1. checkUser : Enregistrement de l\'utilisateur dans la BDD locale : SoboxDB');

                                this.user = newRecord;

                                console.log('2.4.1.1. checkUser : id : ' + this.user.id);
                                console.log('2.4.1.2. checkUser : status : ' + this.user.status);
                                console.log('2.4.1.3. checkUser : date_creation : ' + this.user.date_creation);
                                console.log('2.4.1.4. checkUser : profile : ' + this.user.profile);

                                res();
                            };
                            addRequest.onerror = (e) => {
                                // 2.4.2. Erreur lors de l\'enregistrement sur BDD locale : SoboxDB
                                console.log('2.4.2. checkUser : Erreur lors de l\'enregistrement sur BDD locale : SoboxDB');
                                rej(e.target.error);
                            }
                        });

                        // 2.5. Appel syncUserWithServer
                        console.log('2.5. checkUser : Appel syncUserWithServer');

                        try {
                            await this.syncUserWithServer(newRecord);
                            console.log('2.5.1. checkUser : Création utilisateur BDD distante réussie');

                        } catch (syncError) {
                            console.error('2.5.2. checkUser : Echec de la création utilisateur sur BDD distante', {
                                error: syncError.message,
                                stack: syncError.stack,
                                status: syncError.status || 'inconnu'
                            });

                            // Message personnalisé selon le type d'erreur
                            let userMessage = 'Mode hors-ligne activé';
                            if (syncError.status === 400) {
                                userMessage = `Données invalides : ${syncError.message}`;
                            } else if (syncError.status >= 500) {
                                userMessage = 'Problème serveur - Veuillez réessayer plus tard';
                            }

                            this.showModal(
                                'Problème de connexion',
                                userMessage,
                                'warning'
                            );
                        }

                        // 2.6. Retour de l'id de l'utilisateur
                        console.log('2.6. checkUser : Retour de l\'id de l utilisateur : ' + this.user.id);
                        resolve(this.user.id);

                    } catch (localError) {
                        // 2.7. Erreur lors de la création de l\'utilisateur dans la BDD locale : SoboxDB
                        console.log('2.7. checkUser : Erreur lors de la création de l\'utilisateur dans la BDD locale : SoboxDB');

                        this.showModal(
                            'ERREUR CRITIQUE',
                            'Échec de l\'enregistrement de l\'utilisateur en local',
                            'error'
                        );
                        reject(null);
                    }
                };

                getAllRequest.onerror = (e) => {
                    // 3. Erreur d'accès aux données locales SoboxDB
                    console.log('3. checkUser : Erreur d\'accès aux données locales : SoboxDB');

                    this.showModal(
                        'ERREUR CRITIQUE',
                        'Erreur d\'accès aux données locales',
                        'error'
                    );
                    reject(null);
                };

            } catch (dbError) {
                // 4. Erreur de connexion à la base de données
                console.log('4. checkUser : Erreur de connexion à la base de données locales');

                this.showModal(
                    'ERREUR CRITIQUE',
                    'Erreur de connexion à la base de données locales',
                    'error'
                );
                reject(null);
            }
        });
    }

    // Méthode de synchronisation serveur
    async syncUserWithServer(newRecord) {
        // 1. Configuration de la requête
        const apiUrl = new URL(`${this.urlProjet}/assets/php/user.php`);
        apiUrl.searchParams.append('action', 'create_record');
        apiUrl.searchParams.append('data', JSON.stringify(newRecord));

        console.log('[syncUserWithServer] 1. Appel API', {
            url: apiUrl.toString(),
            payload: newRecord
        });

        try {
            // 2. Exécution de la requête
            const response = await fetch(apiUrl.toString());

            // 3. Traitement de la réponse
            if (!response.ok) {
                let errorMessage = `Erreur HTTP ${response.status}`;
                let errorDetails = null;

                try {
                    const errorText = await response.text();
                    if (errorText) {
                        errorDetails = JSON.parse(errorText);
                        errorMessage = errorDetails.error || errorMessage;
                    }
                } catch (parseError) {
                    console.warn('[API] Impossible d\'analyser la réponse d\'erreur', parseError);
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.details = errorDetails;
                console.log('[syncUserWithServer] 1.2 : Echec ');
                throw error;
            }

            // 4. Traitement du succès
            const result = await response.json();
            console.log('[syncUserWithServer] 1.1 : Succès', result);
            return result;

        } catch (error) {
            console.error('[syncUserWithServer] 2 : Échec de la synchronisation', {
                message: error.message,
                url: apiUrl.toString(),
                payload: newRecord,
                stack: error.stack
            });

            // Enrichir l'erreur avec le contexte
            if (!error.status) error.status = 0; // Si ce n'est pas une erreur HTTP
            error.apiContext = {
                action: 'create_record',
                timestamp: new Date().toISOString()
            };

            throw error;
        }
    }

    // -------------------------------------------------------------------- 
    //  REINITIALISATION DE L APPLICATION
    // -------------------------------------------------------------------- 

    //  ----- Purge EventsDB, galleryDB et les locales storages

    async purgeAllData() {
        // Confirmation (optionnel)
        if (!confirm("Voulez-vous vraiment tout réinitialiser?\nToutes les données locales seront effacées.")) {
            return;
        }

        try {
            // 1. Purge localStorage
            localStorage.clear();
            console.log("localStorage purgé");

            // 2. Purge IndexedDB
            await this.purgeIndexedDB('EventsDB');
            await this.purgeIndexedDB('galleryDB');
            // await this.purgeIndexedDB('SoboxDB');
            console.log("Bases IndexedDB purgées");

            // 3. Recharge la page
            setTimeout(() => {
                alert("Réinitialisation terminée. L'application va redémarrer.");
                window.location.href = "https://www.so-box.fr/webapp/index.html";
            }, 500);

        } catch (error) {
            console.error("Erreur lors de la purge:", error);
            alert("Une erreur est survenue lors de la réinitialisation");
        }
    }

    //  ----- Purge d'une BDD locale

    async purgeIndexedDB(dbName) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(dbName);

            req.onsuccess = () => {
                console.log(`${dbName} supprimée (ou inexistante)`);
                resolve(); // Résout même si la BDD n'existait pas
            };

            req.onerror = (e) => {
                // Ne rejette pas si l'erreur est "Database not found" (ex: en Firefox)
                if (e.target.error && e.target.error.name === "NotFoundError") {
                    console.log(`${dbName} n'existe pas, suppression ignorée`);
                    resolve(); // On considère que c'est un succès
                } else {
                    console.error(`Erreur suppression ${dbName}:`, e.target.error);
                    reject(e.target.error);
                }
            };

            req.onblocked = () => {
                console.warn(`${dbName} est bloquée (ouvert ailleurs)`);
                reject(new Error('Base bloquée'));
            };
        });
    }


}

// Créer une instance globale de l'application

const app = new App();


// 2. Exposition sécurisée de la fonction
// window._devtools = window._devtools || {}; // Namespace dédié
// window._devtools.purgeAllData = async () => {
//     try {
//         await app.purgeAllData();
//         console.log('[DEV] Purge complète effectuée');
//         return true;
//     } catch (e) {
//         console.error('[DEV] Erreur purge:', e);
//         return false;
//     }
// };

// 3. Version protégée pour le splash screen
// document.getElementById('splash-screen')?.addEventListener('dblclick', () => {
//     if (confirm('Purge COMPLÈTE des données?\n(localStorage + IndexedDB)')) {
//         window._devtools.purgeAllData()
//             .then(success => success && setTimeout(location.reload, 1000));
//     }
// });
