<?php
header('Content-Type: application/json');

// Connexion à la base de données MySQL
require_once 'connexion_bad.php';

// Vérification de la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "ERREUR", "message" => "Méthode non autorisée"]);
    exit;
}

try {
 
    // Structure de la réponse
    $response = [
        "status" => "ERREUR",
        "message" => "",
        "data" => []
    ];

    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (Exception $e) {
        $response["status"] = "ERREUR";
        $response["message"] = "Erreur de connexion à la base de données. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr";
        $response["data"] = [];
        http_response_code(509);
        echo json_encode($response);
        exit;
    }
    
    // Requête SQL pour obtenir TOUS les événements
    $query = "SELECT id, nom, dateDebut, dateFin, lieu FROM events WHERE actif = true ORDER BY dateDebut DESC";
    $stmt = $pdo->query($query);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($events)) {
        $response["status"] = "SUCCES"; // Même s'il n'y a pas d'événements, c'est un succès
        $response["message"] = "Aucun événement trouvé";
        http_response_code(200);
    } else {
        $response["status"] = "SUCCES";
        $response["message"] = count($events) . " événement(s) trouvé(s)";
        $response["data"] = $events;
        http_response_code(200);
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    // =========================================================================
    // ÉTAPE 4 : GESTION DES ERREURS PDO (BASE DE DONNÉES)
    // =========================================================================
    
    // Journalisation de l'erreur complète pour le débogage
    error_log("Erreur PDO dans get_events.php: " . $e->getMessage());
    
    // Construction du message d'erreur pour l'utilisateur
    $response["status"] = "ERREUR";
    $response["message"] = "Erreur de connexion à la base de données. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr";
    $response["data"] = [];
    
    http_response_code(500); // Internal Server Error
    echo json_encode($response);
    
} catch (Exception $e) {
    // =========================================================================
    // ÉTAPE 5 : GESTION DES ERREURS GÉNÉRALES
    // =========================================================================
    
    // Journalisation de l'erreur
    error_log("Erreur générale dans get_events.php: " . $e->getMessage());
    
    // Réponse d'erreur générique
    $response["status"] = "ERREUR";
    $response["message"] = "Erreur interne du serveur. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr";
    $response["data"] = [];
    
    http_response_code(500); // Internal Server Error
    echo json_encode($response);
}
?>