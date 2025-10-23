<?php
header('Content-Type: application/json');

// Activation du reporting d'erreurs (à désactiver en production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Connexion à la base de données MySQL
require_once 'connexion.php';
    
try {
    
    // 1. Connexion BDD
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // 2. Vérification de la méthode HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception("Méthode non autorisée", 405);
    }

    // 3. Initialisation de la structure de la réponse
    $response = [
        "status" => "info",
        "message" => "",
        "data" => null
    ];

    // 4. Récupération et validation du mot de passe
    $inputPassword = isset($_GET['password']) ? trim($_GET['password']) : null;

    // 5. Vérification du mot de passe
    if (empty($inputPassword)) {
        $response["status"] = "warning";
        $response["message"] = "Le code de l'événement saisi est invalide !";
        http_response_code(200);     
    } else {
        // 6. Requête SQL pour récupérer tous les événements (nous vérifierons le mot de passe après)
        $query = "SELECT id, nom, dateDebut, dateFin, lieu, password FROM events";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 7. Parcours et vérification l'existence du mot de passe
        $eventFound = null;
        foreach ($events as $event) {
            if (password_verify($inputPassword, $event['password'])) {
                $eventFound = $event;
                break;
            }
        }

        // 7.1 Le mot de passe n'existe pas
        if (!$eventFound) {
            $response["status"] = "warning";
            $response["message"] = "L'événement saisi n'existe pas !";
            http_response_code(200);
        } else {
            // 7.2 Le mot de passe existe
            unset($eventFound['password']);
            
            $response["status"] = "succes";
            $response["message"] = "Événement trouvé";
            $response["data"] = $eventFound;
            http_response_code(200);
        }
    }

} catch (PDOException $e) {
    // 8. Interception de l'erreur à l'accès à la BDD
    error_log("PDOException: " . $e->getMessage());
    
    $response["status"] = "error";
    $response["message"] = "Une erreur technique est survenue [001]";
    http_response_code(500);
 } catch (Exception $e) {
    // 9. Interception des autres erreurs
    $response["status"] = "error";
    $response["message"] = $e->getMessage();
    http_response_code($e->getCode() ?: 500);
 }

// 10. Envoi de la réponse
echo json_encode($response, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
exit;