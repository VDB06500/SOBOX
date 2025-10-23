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
    $user = $_GET['user'] ?? null;
    $evt = $_GET['evt'] ?? null;

    if (!$user) {
        sendResponse(false, [], 'Paramètre "Utilisateur" manquant', 400);
    }

    if (!$evt) {
        sendResponse(false, [], 'Paramètre "Evénement" manquant', 400);
    }

    // 3. Décodage du JSON
    $data = json_decode($user, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(false, [], 'JSON malformé: ' . json_last_error_msg(), 400);
    }

    // 4. Validation des données
    if (empty($evt)) {
        sendResponse(false, [], "Champ événement est manquant", 400);
    }

    $requiredFields = ['id', 'status', 'date_creation', 'profile'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            sendResponse(false, [], "Champ requis manquant: $field", 400);
        }
        if (empty($data[$field])) {
            sendResponse(false, [], "Champ requis vide: $field", 400);
        }
    }

    // 5. Connexion à la base de données via le fichier config
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (Exception $e) {
        sendResponse(false, [], $e->getMessage(), 500);
    }
 
    // 6. Insertion en base
    try {
        $stmt = $pdo->prepare("
            INSERT INTO horodatage (id_user, id_evt)
            VALUES (:id_user, :id_evt)
        ");
        
        $stmt->execute([
            ':id_user' => $data['id'],
            ':id_evt' => $evt
        ]);

        sendResponse(true, ['id_user' => $data['id_user']]);
        
    } catch (PDOException $e) {
        // Gestion des erreurs SQL spécifiques
        sendResponse(false, [], 'Erreur DB: ' . $e->getMessage(), 500);
    }

} catch (Throwable $e) {
    // Capture toutes les exceptions et erreurs non attrapées
    error_log('Erreur non gérée: ' . $e->getMessage());
    sendResponse(false, [], 'Erreur interne du serveur', 500);
}