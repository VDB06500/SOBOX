<?php
header('Content-Type: application/json');

// Connexion à la base de données MySQL
require_once 'connexion.php';

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
        sendResponse(false, [], $e->getMessage(), 500);
    }
    
    // Requête SQL pour obtenir TOUS les événements
    $query = "SELECT id, nom, dateDebut, dateFin, lieu FROM events ORDER BY dateDebut DESC";
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
    // En production, vous pourriez logger cette erreur
    error_log("Erreur PDO: " . $e->getMessage());
    
    $response["status"] = "ERREUR";
    $response["message"] = "Une erreur technique est survenue [001]";
    http_response_code(500); // Internal Server Error
    echo json_encode($response);
}
?>