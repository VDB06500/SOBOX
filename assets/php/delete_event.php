<?php
declare(strict_types=1);
ob_start();

// Configuration
header('Content-Type: application/json; charset=utf-8');
define('ENV_DEV', in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1']));

// Fonctions utilitaires
function clean_output(): void {
    $ob_level = ob_get_level();
    while ($ob_level-- > 0) @ob_end_clean();
}

function send_response(bool $success, array $data = [], string $message = '', int $code = 200): never {
    clean_output();
    
    $response = [
        'status' => $success ? 'success' : 'error',
        'message' => $message,
        'data' => $data
    ];

    http_response_code($code);
    exit(json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// Connexion sécurisée à la BDD
require_once 'connexion.php';

// Vérification de l'environnement
if (!ENV_DEV && !isset($_SERVER['HTTPS'])) {
    send_response(false, [], 'HTTPS requis', 403);
}

try {
    // 1. Vérification méthode HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response(false, [], 'Méthode non autorisée', 405);
    }

    // 2. Lecture et validation du JSON
    $json_input = file_get_contents('php://input');
    echo '*' . $json_input;

    // if ($json_input === false || empty($json_input)) {
    //     send_response(false, [], 'Données JSON manquantes', 400);
    // }

    $data = json_decode($json_input, true, 512, JSON_THROW_ON_ERROR);

    // 3. Validation des champs
    $required = ['id'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            send_response(false, [], "Champ $field requis", 400);
        }
    }

    // 4. Nettoyage et validation des données
    $id = (int)$data['id'];
    if ($id <= 0) {
        send_response(false, [], "ID d'événement invalide", 400);
    }

    // 5. Connexion BDD
    try {
        $pdo = DatabaseConfig::getPDO();
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // 6. Désactivation de l'événement et suppression des fichiers
    $pdo->beginTransaction();
    
    try {
        // Désactivation de l'événement
        $stmt = $pdo->prepare("UPDATE events SET actif = false WHERE id = :id");
        $stmt->execute([':id' => $id]);
    
        if ($stmt->rowCount() === 0) {
            throw new RuntimeException("Aucun événement trouvé avec l'ID: $id");
        }

        $pdo->commit();
        send_response(true, [], 'Événement désactivé et fichiers supprimés avec succès');

    } catch (Exception $e) {
        $pdo->rollBack();
        send_response(false, [], 'Erreur lors de la désactivation : ' . ($ENV_DEV ? $e->getMessage() : 'Erreur interne'), 500);
    }

} catch (JsonException $e) {
    send_response(false, [], 'Format JSON invalide', 400);
} catch (Throwable $e) {
    send_response(false, [], 'Erreur serveur: ' . ($ENV_DEV ? $e->getMessage() : ''), 500);
}