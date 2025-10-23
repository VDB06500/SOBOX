<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'connexion.php';

try {
    // 1. Vérification de la méthode HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendResponse(false, [], 'Méthode non autorisée', 405);
    }

    // 2. Récupération et validation des paramètres
    $action = $_GET['action'] ?? null;
    $dataJson = $_GET['data'] ?? null;

    if (!$action) {
        sendResponse(false, [], 'Paramètre "action" manquant', 400);
    }

    if (!$dataJson) {
        sendResponse(false, [], 'Paramètre "data" manquant', 400);
    }

    // 3. Décodage du JSON
    $data = json_decode($dataJson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(false, [], 'JSON malformé: ' . json_last_error_msg(), 400);
    }

    // 4. Validation des données
    $requiredFields = ['id', 'status', 'date_creation', 'profile'];
    $anomalieChamp = 0;
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $anomalieChamp = 1;
        }
    }

    if ($anomalieChamp == 1) {
        sendResponse(false, [], "Anomalie sur les données transmises", 400);
    }

    // 5. Connexion à la base de données via le fichier connexion
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (Exception $e) {
        sendResponse(false, [], $e->getMessage(), 500);
    }

    // 6. Traitement des actions
    switch ($action) {
        case 'create_record':
            // Validation supplémentaire des données
            if (!preg_match('/^SOBOX_[a-f0-9-]{36}$/i', $data['id'])) {
                sendResponse(false, [], 'Format ID invalide', 400);
            }

            // Insertion en base
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO users (id, status, profile, date_creation)
                    VALUES (:id, :status, :profile, :date_creation)
                ");
                
                $stmt->execute([
                    ':id' => $data['id'],
                    ':status' => $data['status'],
                    ':profile' => $data['profile'],
                    ':date_creation' => $data['date_creation']
                ]);

                sendResponse(true, ['id' => $data['id']]);
                
            } catch (PDOException $e) {
                // Gestion des erreurs SQL spécifiques
                if ($e->errorInfo[1] == 1062) {
                    sendResponse(false, [], 'ID déjà existant', 409);
                } else {
                    sendResponse(false, [], 'Erreur DB: ' . $e->getMessage(), 500);
                }
            }
            break;

        default:
            sendResponse(false, [], 'Action non supportée', 400);
    }

} catch (Throwable $e) {
    // Capture toutes les exceptions et erreurs non attrapées
    error_log('Erreur non gérée: ' . $e->getMessage());
    sendResponse(false, [], 'Erreur interne du serveur : ' + $e->getMessage(), 500);
}