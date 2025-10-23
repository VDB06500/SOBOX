<?php
header('Content-Type: application/json');

// Activation du reporting d'erreurs (à désactiver en production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

    // Connexion à la base de données MySQL
    require_once 'connexion.php';
    
try {
    
        // 6. Connexion BDD
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // Vérification de la méthode HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception("Méthode non autorisée", 405);
    }

    // Structure de la réponse
    $response = [
        "status" => "info",
        "message" => "",
        "data" => null
    ];

    // Récupération et validation du mot de passe
    $inputPassword = isset($_GET['password']) ? trim($_GET['password']) : null;

    // Vérification du mot de passe
    if (empty($inputPassword)) {
        $response["status"] = "warning";
        $response["message"] = "Le code de l'événement saisi est invalide !";
        http_response_code(200);
        echo json_encode($response);
        exit;
    }

    // Requête SQL pour récupérer tous les événements (nous vérifierons le mot de passe après)
    $query = "SELECT id, nom, dateDebut, dateFin, lieu, password FROM events";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $eventFound = null;
    foreach ($events as $event) {
        if (password_verify($inputPassword, $event['password'])) {
            $eventFound = $event;
            break;
        }
    }

    if (!$eventFound) {
        $response["status"] = "warning";
        $response["message"] = "L'événement saisi n'existe pas !";
        http_response_code(200);
    } else {
        // Ne pas renvoyer le mot de passe dans la réponse
        unset($eventFound['password']);
        
        $response["status"] = "succes";
        $response["message"] = "Événement trouvé";
        $response["data"] = $eventFound;
        http_response_code(200);
    }

    echo json_encode($response);

} catch (PDOException $e) {
    // Journaliser l'erreur en production
    error_log("PDOException: " . $e->getMessage());
    
    $response["status"] = "error";
    $response["message"] = "Une erreur technique est survenue [001]";
    http_response_code(500);
    echo json_encode($response);
} catch (Exception $e) {
    $response["status"] = "error";
    $response["message"] = $e->getMessage();
    http_response_code($e->getCode() ?: 500);
    echo json_encode($response);
}