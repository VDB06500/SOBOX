// Attendre que le DOM soit entièrement chargé avant d'exécuter le script
document.addEventListener('DOMContentLoaded', async () => {

    // Récupérer les éléments du DOM
    const gallery = document.getElementById('gallery'); // Conteneur de la galerie
    const photoCountElement = document.getElementById('photoCount'); // Élément pour afficher le nombre de photos
    const nextImageButton = document.getElementById('nextImage'); // Bouton pour l'image suivante
    const prevImageButton = document.getElementById('prevImage'); // Bouton pour l'image précédente
    const downloadButton = document.getElementById("downloadButton"); // Bouton pour télécharger l'image

    // Variables globales
    let imagesList = []; // Liste des images
    let batchSize = 10; // Taille du lot d'images à charger
    let currentBatchIndex = 0; // Index du lot actuel
    let currentImageIndex = 0; // Index de l'image actuellement affichée
    let currentImageToDownload = null; // Image actuellement sélectionnée pour le téléchargement

    // Récupérer les éléments du DOM pour l'en-tête
    const eventNameElement = document.getElementById('eventName');
    const eventDateElement = document.getElementById('eventDate');

    const eventsElement = document.getElementById('events');

    function showLoading() {
        const container = document.getElementById('loading-bar-container');
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');

        container.style.display = 'block';
        text.style.display = 'block';
        bar.style.width = '30%'; // Progression initiale
    }

    function updateLoading(percent) {
        const bar = document.getElementById('loading-bar');
        bar.style.width = percent + '%';
    }

    function hideLoading() {
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

    // ------------------------------------------------------------------------------------------------------
    //  BOUTON RETOUR LISTE DES EVENEMENTS
    // ------------------------------------------------------------------------------------------------------

    eventsElement.addEventListener('click', handleEventsClick);

    async function handleEventsClick() {
        try {
            window.location.href = "events.html";
        } catch (error) {
            console.error("Erreur lors de la navigation:", error);
        }
    };

    // ------------------------------------------------------------------------------------------------------
    //  AFFICHAGE DE LA PHOTO SELECTIONNEE DANS UNE MODALE
    // ------------------------------------------------------------------------------------------------------

    // 📦 Fonction pour ouvrir la base de données IndexedDB
    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('GalleryDB', 2); // Ouvrir la base de données

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('photos')) {
                    const store = db.createObjectStore('photos', { keyPath: 'url' }); // Créer un object store pour les photos
                    store.createIndex('name', 'name', { unique: false }); // Créer un index sur le nom des photos
                }
            };

            request.onsuccess = (event) => resolve(event.target.result); // Résoudre la promesse avec la base de données
            request.onerror = (event) => reject('Erreur d\'ouverture de la base de données : ' + event.target.errorCode); // Rejeter la promesse en cas d'erreur
        });
    };

    // 🖼️ Fonction pour ouvrir le modal avec l'image sélectionnée
    const openModal = (imageSrc, index, images) => {
        currentImageIndex = index; // Mettre à jour l'index de l'image actuelle
        imagesList = images; // Mettre à jour la liste des images
        currentImageToDownload = imageSrc; // Mettre à jour l'image à télécharger

        const modalImage = document.getElementById("modalImage"); // Récupérer l'élément image du modal
        modalImage.src = imageSrc.data; // Définir la source de l'image dans le modal

        const modal = new bootstrap.Modal(document.getElementById("imageModal")); // Créer une instance du modal
        modal.show(); // Afficher le modal
    };

    // ⬅️ Fonction pour afficher l'image précédente dans le modal
    const showPreviousImage = () => {

        try {
            // 1. Exécuter la logique existante de navigation
            if (currentImageIndex > 0) {
                currentImageIndex--;
                updateModalImage();
            }
        } catch (error) {
            console.error("Erreur lors de la navigation:", error);
        }
    };

    // ➡️ Fonction pour afficher l'image suivante dans le modal
    const showNextImage = () => {
        if (currentImageIndex < imagesList.length - 1) {
            currentImageIndex++; // Incrémenter l'index de l'image actuelle
            updateModalImage(); // Mettre à jour l'image dans le modal
        }
    };

    // 📷 Fonction pour mettre à jour l'image affichée dans le modal
    const updateModalImage = () => {
        const modalImage = document.getElementById("modalImage"); // Récupérer l'élément image du modal
        modalImage.src = imagesList[currentImageIndex].data; // Mettre à jour la source de l'image
        currentImageToDownload = imagesList[currentImageIndex]; // Mettre à jour l'image à télécharger
    };

    // 🔗 Lier les boutons "Précédent" et "Suivant" à leurs fonctions respectives
    prevImageButton.addEventListener("click", showPreviousImage);
    nextImageButton.addEventListener("click", showNextImage);


    // Fonction pour télécharger l'image
    const downloadImage = async () => {
        if (!currentImageToDownload) {
            alert("Aucune image sélectionnée."); // Afficher une alerte si aucune image n'est sélectionnée
            return;
        }

        const baseURL = "http://www.so-box.fr/webapp/api/images/"; // URL de base pour les images
        const imageName = currentImageToDownload.name; // Nom de l'image
        const imageURL = `${baseURL}${encodeURIComponent(imageName)}.jpg`; // Encoder l'URL pour éviter les erreurs

        const fileExists = await checkFileExistence(imageURL); // Vérifier si le fichier existe

        if (fileExists) {
            // Rediriger vers une nouvelle page avec l'URL de l'image comme paramètre
            window.location.href = `displayImage.html?imageUrl=${encodeURIComponent(imageURL)}`;
        } else {
            alert("Le fichier n'existe pas ou a été supprimé."); // Afficher une alerte si le fichier n'existe pas
        }
    };

    // Ajouter un écouteur d'événement pour le bouton de téléchargement
    downloadButton.addEventListener("click", downloadImage);

    // Fonction pour vérifier si un fichier existe à une URL donnée
    const checkFileExistence = async (url) => {
        try {
            const response = await fetch(url, { method: 'HEAD' }); // Faire une requête HEAD pour vérifier l'existence du fichier
            return response.ok; // Retourner true si le fichier existe
        } catch (error) {
            console.error("Erreur lors de la vérification du fichier :", error); // Afficher une erreur en cas de problème
            return false;
        }
    };

    // ------------------------------------------------------------------------------------------------------
    //   
    // ------------------------------------------------------------------------------------------------------

    // 🔄 Fonction pour trier les images du plus récent au plus ancien
    const sortImagesByDate = (images) => images.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 📂 Fonction pour récupérer toutes les images depuis IndexedDB
    const getAllImagesFromDB = (db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('photos', 'readonly'); // Créer une transaction en lecture seule
            const store = transaction.objectStore('photos'); // Accéder à l'object store des photos
            const request = store.getAll(); // Récupérer toutes les images

            request.onsuccess = () => resolve(sortImagesByDate(request.result)); // Résoudre la promesse avec les images triées
            request.onerror = (event) => reject('Erreur lors de la récupération des images : ' + event.target.errorCode); // Rejeter la promesse en cas d'erreur
        });
    };

    // 🔍 Fonction pour observer les images et les charger uniquement lorsqu'elles deviennent visibles
    const observeImage = (col, img) => {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    img.src = img.dataset.src; // Charger l'image lorsque celle-ci devient visible
                    col.style.opacity = '1'; // Rendre la colonne visible
                    observer.unobserve(img); // Arrêter d'observer l'image une fois qu'elle est chargée
                }
            });
        }, { rootMargin: '100px' }); // Marge pour déclencher le chargement avant que l'image ne soit visible

        observer.observe(img); // Commencer à observer l'image
    };

    // 🎞️ Fonction pour observer le défilement de la galerie et charger les images par lots
    const observeGalleryScroll = () => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                console.log('Chargement du prochain lot d\'images...');
                loadImagesBatch(); // Charger le prochain lot d'images lorsque le sentinelle devient visible
            }
        }, { rootMargin: '100px' });

        const sentinel = document.getElementById('galleryEnd'); // Récupérer le sentinelle
        if (sentinel) {
            observer.observe(sentinel); // Commencer à observer le sentinelle
        } else {
            console.error('Sentinel not found in DOM!'); // Afficher une erreur si le sentinelle n'est pas trouvé
        }
    };

    // 📸 Fonction pour charger les images par lots
    const loadImagesBatch = () => {

        // Vérifier s'il reste des images à charger
        if (currentBatchIndex >= imagesList.length) {
            console.log('✅ Toutes les images ont été chargées.');
            return; // Sortir de la fonction pour arrêter la boucle
        }

        const nextBatch = imagesList.slice(currentBatchIndex, currentBatchIndex + batchSize); // Récupérer le prochain lot d'images
        nextBatch.forEach((image, index) => {
            createImageCard(image, currentBatchIndex + index); // Créer une carte pour chaque image du lot
        });
        currentBatchIndex += batchSize; // Mettre à jour l'index du lot actuel

        // Si toutes les images ont été chargées, ne pas recréer de sentinel
        if (currentBatchIndex >= imagesList.length) {
            console.log('✅ Toutes les images ont été chargées, plus de sentinel nécessaire.');
            return;
        }

        // Supprimer le sentinel existant s'il y en a un
        const existingSentinel = document.getElementById('galleryEnd');
        if (existingSentinel) {
            existingSentinel.remove();
        }

        // Créer un nouveau sentinel pour charger le lot suivant
        const sentinel = document.createElement('div');
        sentinel.id = 'galleryEnd';
        gallery.appendChild(sentinel);

        console.log('🔍 Nouveau sentinel ajouté au DOM :', sentinel);

        observeGalleryScroll(); // Observer le défilement de la galerie

        updatePhotoCount(); // Mettre à jour le compteur de photos
    };


    // 📷 Fonction pour créer une carte d'image avec lazy loading
    const createImageCard = (image, index) => {
        // const lastSync = localStorage.getItem("lastSync"); // Récupérer la date de la dernière synchronisation

        // const parts = lastSync.split("_"); // Sépare en deux parties
        // const projectId = parts[0];        // Première partie : ID du projet
        // const syncDate = parts[1];

        const col = document.createElement('div'); // Créer une colonne pour la carte
        col.className = 'col-4 col-md-4 mb-4 position-relative';
        col.style.opacity = '0'; // Rendre la colonne invisible initialement

        const card = document.createElement('div'); // Créer une carte pour l'image
        card.className = 'card';

        const img = document.createElement('img'); // Créer un élément image
        img.dataset.src = image.data; // Définir la source de l'image à charger
        img.className = 'card-img-top lazy-image';
        img.alt = image.name;

        img.addEventListener("click", () => openModal(image, index, imagesList)); // Ajouter un écouteur d'événement pour ouvrir le modal

        // if (new Date(image.date) >= new Date(syncDate)) {
        //     const icon = document.createElement("i"); // Créer une icône pour les nouvelles images
        //     icon.className = "fa-solid fa-circle new-icon";
        //     col.appendChild(icon); // Ajouter l'icône à la colonne
        // }

        card.appendChild(img); // Ajouter l'image à la carte
        col.appendChild(card); // Ajouter la carte à la colonne
        gallery.appendChild(col); // Ajouter la colonne à la galerie

        observeImage(col, img); // Observer l'image pour le lazy loading
    };

    // 🏁 Fonction pour initialiser la galerie
    const updateGallery = async () => {
        const db = await openDB(); // Ouvrir la base de données
        imagesList = await getAllImagesFromDB(db); // Récupérer toutes les images depuis la base de données
        currentBatchIndex = 0; // Réinitialiser l'index du lot actuel

        gallery.innerHTML = ''; // Vider la galerie
        loadImagesBatch(); // Charger le premier lot d'images

        updatePhotoCount(); // Mettre à jour le compteur de photos
    };

    // Fonction pour vérifier si une image est déjà dans IndexedDB
    const checkImageInDB = (db, url) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('photos', 'readonly');
            const store = transaction.objectStore('photos');
            const request = store.get(url);

            request.onsuccess = () => resolve(request.result !== undefined);
            request.onerror = () => reject('Erreur lors de la vérification de l\'image dans la base de données.');
        });
    };

    async function updateSyncDate(eventId, newSyncDate) {
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

    async function getEventById(eventId) {
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
    const fetchImagesFromAPI = async () => {
        // 1. Récupération de l'ID depuis le localStorage
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours")) || {};
        const { id: eventId } = eventData;

        if (!eventId) {
            console.error("Aucun ID d'événement trouvé");
            return [];
        }

        try {
            // 2. Récupération de la date de synchro depuis IndexedDB
            const eventFromDB = await getEventById(eventId);
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
            await updateSyncDate(eventId, lastImageDate);

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
    const convertImageToBase64 = async (imageUrl) => {
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
    async function storeImageInDB(imageUrl, imageBase64, imageName, imageDate) {
        try {
            // Ouvrir la base de données IndexedDB
            const db = await openDB();

            if (!db) {
                console.error("La base de données n'est pas ouverte !");
                return;
            }

            // Vérifier si l'image existe déjà
            const imageInDB = await checkImageInDB(db, imageUrl);
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
    const startImageWatch = async () => {
        const syncImages = async () => {
            showLoading();
            updateLoading(30); // 30% - Début du processus

            try {
                console.log('🔄 Synchronisation en cours...');
                updateLoading(40); // 40% - Récupération des images
                const newImages = await fetchImagesFromAPI();

                if (newImages.length > 0) {
                    console.log('🆕 Nouvelles images détectées !');
                    updateLoading(50); // 50% - Ouverture DB
                    const db = await openDB();

                    let progress = 60;
                    const progressIncrement = 30 / newImages.length;

                    for (const image of newImages) {
                        const imageExists = await checkImageInDB(db, image.url);
                        if (!imageExists) {
                            updateLoading(progress);
                            const base64Data = await convertImageToBase64(image.url);
                            await storeImageInDB(image.url, base64Data, image.name, image.date);
                        }
                        progress += progressIncrement;
                    }

                    updateLoading(90); // 90% - Mise à jour de la galerie
                    await updateGallery();
                } else {
                    console.log('✅ Aucune nouvelle image trouvée.');
                }

                updateLoading(100); // 100% - Terminé
            } catch (error) {
                console.error('❌ Erreur de synchronisation :', error);
                // Change la couleur en rouge en cas d'erreur
                document.getElementById('loading-bar').style.backgroundColor = '#f44336';
            } finally {
                hideLoading();
            }
        };

        await syncImages(); // Premier appel immédiat
        setInterval(syncImages, 60000); // Puis toutes les 60s
    };

    // 🔢 Fonction pour mettre à jour le compteur de photos
    const updatePhotoCount = () => {
        const totalPhotos = imagesList.length; // Récupérer le nombre total de photos
        photoCountElement.textContent = totalPhotos; // Mettre à jour l'élément du compteur de photos
        console.log(`Nombre total de photos : ${totalPhotos}`);
    };

    // ------------------------------------------------------------------------------------------------------
    //  LECTURE DES INFORMATIONS LIEES A L EVENEMENT
    // ------------------------------------------------------------------------------------------------------

    function displayEventInfo() {
        const eventData = JSON.parse(localStorage.getItem("Evenement_En_Cours"));

        if (eventData) {
            document.getElementById('eventName').textContent = eventData.nom;

            // Formater la date (supposons que eventData.date est au format YYYY-MM-DD)
            const dateObj = new Date(eventData.date);
            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            document.getElementById('eventDate').textContent = dateObj.toLocaleDateString('fr-FR', options);

            // Vous pouvez toujours accéder à l'ID si besoin
            // console.log("ID de l'événement:", eventData.id);
        } else {
            document.getElementById('eventName').textContent = "Événement non spécifié";
            document.getElementById('eventDate').textContent = "";
        }
    }

    // 🔥 Lancer l'initialisation de la galerie et la surveillance des nouvelles images
    async function initializeApp() {
        try {
            // 1. Afficher les infos de l'événement (synchrone)
            console.log('1. Afficher les infos de l événement (synchrone)');
            displayEventInfo();

            // 2. Charger la galerie (attendre le chargement)
            console.log('2. Charger la galerie (attendre le chargement)');
            await updateGallery();

            // 3. Démarrer la surveillance en arrière-plan (sans attendre)
            console.log('3. Démarrer la surveillance en arrière-plan (sans attendre)');
            startImageWatch().catch(error => {
                console.error("Monitoring error:", error);
            });

        } catch (error) {
            console.error("Initialization failed:", error);
            // Afficher un message à l'utilisateur
            alert("Le chargement des photos a échoué. Veuillez rafraîchir la page.");
        }
    }


    // Au chargement de la page
    initializeApp();

});