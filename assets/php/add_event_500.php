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
    exit(json_encode($response, JSON_UNESCAPED_UNICODE));
}

// Connexion sécurisée à la BDD
require_once 'connexion.php';

// Vérification de l'environnement
if (!ENV_DEV && !isset($_SERVER['HTTPS'])) {
    send_response(false, [], 'HTTPS requis', 403);
}

try {
    // 1. Vérification méthode POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response(false, [], 'Méthode non autorisée', 405);
    }

    // 2. Lecture et validation du JSON
    $json_input = file_get_contents('php://input');
    if ($json_input === false || empty($json_input)) {
        send_response(false, [], 'Données JSON manquantes', 400);
    }

    $data = json_decode($json_input, true, 512, JSON_THROW_ON_ERROR);

    // 3. Validation des champs
    $required = ['nom', 'dateDebut', 'lieu', 'code'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            send_response(false, [], "Champ $field requis", 400);
        }
    }

    // 4. Nettoyage des données
    $nom = htmlspecialchars(trim($data['nom']));
    $lieu = htmlspecialchars(trim($data['lieu']));
    $code = trim($data['code']);

    // 5. Validation du code (8 caractères minimum)
    if (strlen($code) > 10) {
        send_response(false, [], 'Le code est limité à 10 caractères maximum', 400);
    }

    // 6. Connexion BDD
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // 7. Vérification unicité du code (CORRIGÉ)
    // Récupérer tous les hashs existants pour vérification
    $stmt = $pdo->prepare("SELECT password FROM events");
    $stmt->execute();
    $existingPasswords = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($existingPasswords as $existingPassword) {
        if (password_verify($code, $existingPassword)) {
            send_response(false, [], 'Ce code est déjà utilisé', 409);
        }
    }

    // 8. Validation de la date
    $dateDebut = DateTime::createFromFormat('Y-m-d', $data['dateDebut']);
    if ($dateDebut === false) {
        send_response(false, [], 'Format de date invalide (YYYY-MM-DD attendu)', 400);
    }
    $dateFin = $dateDebut->modify('+60 days')->format('Y-m-d');

    // 9. Création de l'événement
    $pdo->beginTransaction();
    
    try {
        // Insertion événement
        $stmt = $pdo->prepare(
            "INSERT INTO eventsXX (nom, dateDebut, dateFin, lieu, password)
             VALUES (:nom, :dateDebut, :dateFin, :lieu, :password)"
        );

        $stmt->execute([
            ':nom' => $nom,
            ':dateDebut' => $data['dateDebut'],
            ':dateFin' => $dateFin,
            ':lieu' => $lieu,
            ':password' => password_hash($code, PASSWORD_BCRYPT)
        ]);

        $eventId = $pdo->lastInsertId();

        // Création des répertoires
        $basePath = '../../api/';
        $dirs = ['SD', 'HD'];
        
        foreach ($dirs as $dir) {
            $path = $basePath . $dir . '/' . $eventId;
            if (!file_exists($path) && !mkdir($path, 0755, true)) {
                throw new RuntimeException("Échec création du répertoire $dir");
            }
        }

        $pdo->commit();

        // Récupération de l'événement créé
        $stmt = $pdo->prepare("SELECT * FROM events WHERE id = ?");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        send_response(true, $event, 'Événement créé avec succès', 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        send_response(false, [], 'La création de l événement a échoué en raison d un problème technique. Merci de contacter notre support à l adresse : contact@so-box.fr', 500);
    }

} catch (JsonException $e) {
    send_response(false, [], 'Format JSON invalide', 400);
} catch (Throwable $e) {
    send_response(false, [], 'Erreur serveur: ' . ($ENV_DEV ? $e->getMessage() : ''), 500);
}