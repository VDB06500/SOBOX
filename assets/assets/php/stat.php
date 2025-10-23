<?php
header('Content-Type: application/json');

require_once 'connexion.php';

// Récupération de l'ID de l'événement
$eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : null;

if (!$eventId) {
    http_response_code(400);
    die(json_encode(['error' => 'ID événement manquant']));
}

// Connexion à la base de données
try {
    try {
        $db = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // 1. Vérification de l'événement
    $stmt = $db->prepare("SELECT id FROM events WHERE id = ?");
    $stmt->execute([$eventId]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        die(json_encode(['error' => 'Événement non trouvé']));
    }

    // 2. Récupération des dates min/max
    $stmt = $db->prepare("SELECT 
        MIN(dth_connexion) as min_date, 
        MAX(dth_connexion) as max_date 
        FROM activity_events WHERE id_event = ?");
    $stmt->execute([$eventId]);
    $dateRange = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dateRange['min_date'] || !$dateRange['max_date']) {
        die(json_encode(['time_slots' => [], 'stats' => [
            'total_photos' => 0,
            'total_time_slots' => 0,
            'average_per_slot' => 0
        ]]));
    }

    // 3. Récupération des données existantes
    $stmt = $db->prepare("SELECT 
        CONCAT(
            DATE_FORMAT(dth_connexion, '%Y-%m-%d %H:'),
            LPAD(FLOOR(MINUTE(dth_connexion)/15)*15, 2, '0'),
            ':00'
        ) as time_slot,
        SUM(nb_photos) as total_photos
        FROM activity_events
        WHERE id_event = ?
        GROUP BY time_slot");
    $stmt->execute([$eventId]);
    $existingSlots = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'total_photos', 'time_slot');

    // 4. Génération de tous les créneaux
    $start = new DateTime($dateRange['min_date']);
    $end = new DateTime($dateRange['max_date']);
    
    // Arrondir aux quarts d'heure
    $start->setTime($start->format('H'), floor($start->format('i')/15)*15, 0);
    $end->setTime($end->format('H'), ceil($end->format('i')/15)*15, 0);

    $interval = new DateInterval('PT15M');
    $period = new DatePeriod($start, $interval, $end);
    
    $timeSlots = [];
    $totalPhotos = 0;
    $slotCount = 0;

    foreach ($period as $slot) {
        $slotKey = $slot->format('Y-m-d H:i:00');
        $photos = $existingSlots[$slotKey] ?? 0;
        
        $timeSlots[] = [
            'time_slot' => $slotKey,
            'total_photos' => (int)$photos
        ];
        
        $totalPhotos += $photos;
        $slotCount++;
    }

    // 5. Construction de la réponse
    $response = [
        'event_id' => $eventId,
        'time_slots' => $timeSlots,
        'stats' => [
            'total_photos' => $totalPhotos,
            'total_time_slots' => $slotCount,
            'average_per_slot' => $slotCount ? round($totalPhotos / $slotCount, 2) : 0
        ]
    ];

    echo json_encode($response, JSON_NUMERIC_CHECK);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de base de données']);
}