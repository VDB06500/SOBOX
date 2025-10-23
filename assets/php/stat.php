<?php
/**
 * SCRIPT : Récupération des statistiques photos par créneaux de 15 minutes
 * DESCRIPTION : Ce script retourne le nombre de photos par créneau de 15 minutes
 *               pour un événement donné, avec des statistiques globales
 * METHODE : GET
 * PARAMETRE : event_id (obligatoire) - ID de l'événement
 */

// Définition du type de contenu comme JSON
header('Content-Type: application/json');

// Inclusion du fichier de connexion à la base de données
require_once 'connexion.php';

// =============================================================================
// ÉTAPE 1 : RÉCUPÉRATION ET VALIDATION DU PARAMÈTRE EVENT_ID
// =============================================================================

// Récupération de l'ID de l'événement depuis les paramètres GET
$eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : null;

// Vérification que l'ID événement est fourni et valide
if (!$eventId || $eventId <= 0) {
    http_response_code(400); // Bad Request
    die(json_encode(['error' => 'ID événement manquant ou invalide']));
}

// =============================================================================
// ÉTAPE 2 : CONNEXION À LA BASE DE DONNÉES
// =============================================================================

try {
    // Tentative de connexion à la base de données
    try {
        $db = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        // En cas d'échec de connexion, retourne une erreur 500
        http_response_code(500);
        die(json_encode(['error' => 'Erreur de connexion à la base de données']));
    }

    // =========================================================================
    // ÉTAPE 3 : VÉRIFICATION DE L'EXISTENCE DE L'ÉVÉNEMENT
    // =========================================================================
    
    // Préparation et exécution de la requête de vérification
    $stmt = $db->prepare("SELECT id FROM events WHERE id = ?");
    $stmt->execute([$eventId]);
    
    // Si aucun événement n'est trouvé avec cet ID, retourne une erreur 404
    if ($stmt->rowCount() === 0) {
        http_response_code(404); // Not Found
        die(json_encode(['error' => 'Événement non trouvé']));
    }

    // =========================================================================
    // ÉTAPE 4 : RÉCUPÉRATION DE LA PLAGE DE DATES DE L'ÉVÉNEMENT
    // =========================================================================
    
    // Requête pour obtenir la date de début et fin des activités de l'événement
    $stmt = $db->prepare("SELECT 
        MIN(dth_connexion) as min_date, 
        MAX(dth_connexion) as max_date 
        FROM activity_events WHERE id_event = ?");
    $stmt->execute([$eventId]);
    $dateRange = $stmt->fetch(PDO::FETCH_ASSOC);

    // Si aucune activité n'est trouvée, retourne des statistiques vides
    if (!$dateRange['min_date'] || !$dateRange['max_date']) {
        die(json_encode([
            'event_id' => $eventId,
            'time_slots' => [], 
            'stats' => [
                'total_photos' => 0,
                'total_time_slots' => 0,
                'average_per_slot' => 0
            ]
        ]));
    }

    // =========================================================================
    // ÉTAPE 5 : RÉCUPÉRATION DES DONNÉES EXISTANTES PAR CRÉNEAUX DE 15 MIN
    // =========================================================================
    
    /**
     * Requête qui :
     * 1. Formate les dates en créneaux de 15 minutes (ex: 2024-01-01 10:00:00)
     * 2. Arrondit les minutes à 0, 15, 30 ou 45
     * 3. Calcule le total des photos par créneau
     */
    $stmt = $db->prepare("SELECT 
        CONCAT(
            DATE_FORMAT(dth_connexion, '%Y-%m-%d %H:'),
            LPAD(FLOOR(MINUTE(dth_connexion)/15)*15, 2, '0'),
            ':00'
        ) as time_slot,
        SUM(nb_photos) as total_photos
        FROM activity_events
        WHERE id_event = ?
        GROUP BY time_slot
        ORDER BY time_slot");
    $stmt->execute([$eventId]);
    
    // Transformation des résultats en tableau associatif [time_slot => total_photos]
    $existingSlots = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'total_photos', 'time_slot');

    // =========================================================================
    // ÉTAPE 6 : GÉNÉRATION DE TOUS LES CRÉNEAUX SUR LA PLAGE DE TEMPS
    // =========================================================================
    
    // Création des objets DateTime pour le début et la fin
    $start = new DateTime($dateRange['min_date']);
    $end = new DateTime($dateRange['max_date']);
    
    // Arrondir aux quarts d'heure inférieur pour le début et supérieur pour la fin
    $start->setTime($start->format('H'), floor($start->format('i')/15)*15, 0);
    $end->setTime($end->format('H'), ceil($end->format('i')/15)*15, 0);

    // Création d'un intervalle de 15 minutes et période correspondante
    $interval = new DateInterval('PT15M'); // Period Time 15 Minutes
    $period = new DatePeriod($start, $interval, $end);
    
    // Initialisation des variables pour les statistiques
    $timeSlots = [];
    $totalPhotos = 0;
    $slotCount = 0;

    // Parcours de tous les créneaux de 15 minutes dans la période
    foreach ($period as $slot) {
        // Formatage de la clé du créneau (ex: "2024-01-01 10:00:00")
        $slotKey = $slot->format('Y-m-d H:i:00');
        
        // Récupération du nombre de photos pour ce créneau (0 si aucun)
        $photos = $existingSlots[$slotKey] ?? 0;
        
        // Ajout du créneau au tableau de résultats
        $timeSlots[] = [
            'time_slot' => $slotKey,
            'total_photos' => (int)$photos
        ];
        
        // Mise à jour des totaux pour les statistiques
        $totalPhotos += $photos;
        $slotCount++;
    }

    // =========================================================================
    // ÉTAPE 7 : CONSTRUCTION DE LA RÉPONSE FINALE
    // =========================================================================
    
    $response = [
        'event_id' => $eventId,
        'time_slots' => $timeSlots,
        'stats' => [
            'total_photos' => $totalPhotos,           // Total photos sur l'événement
            'total_time_slots' => $slotCount,         // Nombre total de créneaux
            'average_per_slot' => $slotCount ? round($totalPhotos / $slotCount, 2) : 0  // Moyenne photos/créneau
        ]
    ];

    // Encodage et envoi de la réponse JSON
    echo json_encode($response, JSON_NUMERIC_CHECK);

} catch (PDOException $e) {
    // UTILISATION DE sendResponse
    sendResponse(false, [], 'Erreur de base de données. ', 500);
} catch (Exception $e) {
    // UTILISATION DE sendResponse
    sendResponse(false, [], 'Erreur de connexion à la base de données', 500);
}
?>