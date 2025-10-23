// gallery-manager.js
class GalleryManager {
    static async initialize() {
        if (!this.initialized) {
            await this.setup();
            this.initialized = true;
        }
        return this._initializeApp();
    }

    static async setup() {
        // Toutes vos fonctions (openDB, getAllImagesFromDB, etc.)
    }

    static async _initializeApp() {
        try {
            this.displayEventInfo();
            await this.updateGallery();
            this.startImageWatch().catch(console.error);
        } catch (error) {
            console.error("Initialization failed:", error);
            alert("Le chargement des photos a échoué. Veuillez rafraîchir la page.");
        }
    }
}

// Dans votre gestionnaire d'événements :
document.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', async (e) => {
        const galleryId = card.getAttribute('data-gallery');
        if (galleryId) {
            this.navigateTo('gallery-page');
            await GalleryManager.initialize();
        }
    });
});