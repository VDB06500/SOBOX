        // 3. Ouverture de la base de données "events"
        const db = await this.openDB();
        const transaction = db.transaction('events', 'readonly');
        const store = transaction.objectStore('events');

        // 3. Chargement des événements
        const request = store.getAll();
        request.onsuccess = (event) => {

            // 3.1 Stockage des événements dans 'events'
            const events = event.target.result;

            // 3.2 Initialisation HTML 'eventList'
            // const eventList = document.getElementById('eventList');
            this.eventList.innerHTML = '';

            // 3.3 Pas d'événement stocké
            if (events.length === 0) {
                this.eventList.innerHTML = '<img src="assets/images/noEvents.png" style="width:80%"></img> <p>Aucun événement enregistré.</p>';
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
                        <div class="event-badges">
                            <span class="badge nbPhotos-badge">
                                <i class="fa-solid fa-images p-1"></i> ${event.nbPhotos || 100}
                            </span>
                            <span class="badge members-badge">
                                <i class="fas fa-users p-1"></i> ${event.membres || 100}
                            </span>
                            <span class="badge connections-badge">
                                <i class="fas fa-wifi p-1"></i> ${event.connexions || 100}
                            </span>
                        </div>
                        <div class="event-info">
                            <div class="event-date">
                                <i class="fa-solid fa-calendar-days"></i>
                                <p>${event.date}</p>
                            </div>
                            <div class="event-location">
                                <i class="fa-solid fa-location-dot"></i>
                                <p>${event.lieu}</p>
                            </div>
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

                    // Appel à la gallerie photo                    
                    this.navigateTo('gallery-page');

                    // Activation du bouton "photobooth"
                    this.initPhotobooth('photobooth-page');
                });

                this.eventList.appendChild(eventCard);
            });
        };

        request.onerror = (event) => {
            console.error('Erreur lors de la lecture des événements :', event.target.errorCode);
        };