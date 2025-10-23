<?php
/**
 * SCRIPT : Création d'un nouvel événement
 * DESCRIPTION : Ce script permet de créer un nouvel événement avec validation des données,
 *               vérification d'unicité du code, création des répertoires et gestion transactionnelle
 * METHODE : POST
 * DONNEES ATTENDUES : JSON avec nom, dateDebut, lieu, code
 */

declare(strict_types=1);
ob_start();

// =============================================================================
// CONFIGURATION INITIALE
// =============================================================================

// Définition du type de contenu comme JSON
header('Content-Type: application/json; charset=utf-8');

// Définition de l'environnement (développement ou production)
define('ENV_DEV', in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1']));

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Nettoie tous les tampons de sortie
 */
function clean_output(): void {
    $ob_level = ob_get_level();
    while ($ob_level-- > 0) @ob_end_clean();
}

/**
 * Envoie une réponse JSON standardisée et termine le script
 * @param bool $success Statut de l'opération
 * @param array $data Données à retourner
 * @param string $message Message descriptif
 * @param int $code Code HTTP de réponse
 */
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

// =============================================================================
// ÉTAPE 1 : CONNEXION À LA BASE DE DONNÉES
// =============================================================================

// Inclusion du fichier de connexion à la base de données
require_once 'connexion.php';

// =============================================================================
// ÉTAPE 2 : VÉRIFICATION DE L'ENVIRONNEMENT (PRODUCTION UNIQUEMENT)
// =============================================================================

// En production, exige une connexion HTTPS sécurisée
if (!ENV_DEV && !isset($_SERVER['HTTPS'])) {
    send_response(false, [], 'Connexion HTTPS requise pour la sécurité', 403);
}

// =============================================================================
// ÉTAPE 3 : TRAITEMENT PRINCIPAL
// =============================================================================

try {
    // -------------------------------------------------------------------------
    // ÉTAPE 3.1 : VÉRIFICATION DE LA MÉTHODE HTTP
    // -------------------------------------------------------------------------
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        send_response(false, [], 'Méthode non autorisée - Utilisez POST', 405);
    }

    // -------------------------------------------------------------------------
    // ÉTAPE 3.2 : LECTURE ET VALIDATION DU JSON D'ENTRÉE
    // -------------------------------------------------------------------------
    
    $json_input = file_get_contents('php://input');
    if ($json_input === false || empty($json_input)) {
        send_response(false, [], 'Données JSON manquantes', 400);
    }

    // Décodage du JSON avec gestion d'erreurs stricte
    $data = json_decode($json_input, true, 512, JSON_THROW_ON_ERROR);

    // -------------------------------------------------------------------------
    // ÉTAPE 3.3 : VALIDATION DES CHAMPS OBLIGATOIRES
    // -------------------------------------------------------------------------
    
    $required = ['nom', 'dateDebut', 'lieu', 'code'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            send_response(false, [], "Champ '$field' requis", 400);
        }
    }

    // -------------------------------------------------------------------------
    // ÉTAPE 3.4 : NETTOYAGE ET FILTRAGE DES DONNÉES
    // -------------------------------------------------------------------------
    
    $nom = htmlspecialchars(trim($data['nom']));
    $lieu = htmlspecialchars(trim($data['lieu']));
    $code = trim($data['code']);

    // -------------------------------------------------------------------------
    // ÉTAPE 3.5 : VALIDATION DU CODE (LONGUEUR MAXIMUM)
    // -------------------------------------------------------------------------
    
    if (strlen($code) > 10) {
        send_response(false, [], 'Le code est limité à 10 caractères maximum', 400);
    }

    // -------------------------------------------------------------------------
    // ÉTAPE 3.6 : CONNEXION À LA BASE DE DONNÉES
    // -------------------------------------------------------------------------
    
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // -------------------------------------------------------------------------
    // ÉTAPE 3.7 : VÉRIFICATION DE L'UNICITÉ DU CODE
    // -------------------------------------------------------------------------
    
    // Récupérer tous les hashs de mots de passe existants pour vérification
    $stmt = $pdo->prepare("SELECT password FROM events");
    $stmt->execute();
    $existingPasswords = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Vérifier si le code existe déjà (en comparant les hashs)
    foreach ($existingPasswords as $existingPassword) {
        if (password_verify($code, $existingPassword)) {
            send_response(false, [], "Le code de l événement $code est déjà réservé", 409);
        }
    }

    // -------------------------------------------------------------------------
    // ÉTAPE 3.8 : VALIDATION ET FORMATAGE DES DATES
    // -------------------------------------------------------------------------
    
    $dateDebut = DateTime::createFromFormat('Y-m-d', $data['dateDebut']);
    if ($dateDebut === false) {
        send_response(false, [], 'Format de date invalide (YYYY-MM-DD attendu)', 400);
    }
    
    // Calcul de la date de fin (60 jours après la date de début)
    $dateFin = $dateDebut->modify('+60 days')->format('Y-m-d');

    // -------------------------------------------------------------------------
    // ÉTAPE 3.9 : CRÉATION DE L'ÉVÉNEMENT (TRANSACTION)
    // -------------------------------------------------------------------------
    
    // Début de la transaction pour assurer l'intégrité des données
    $pdo->beginTransaction();
    
    try {
        // Insertion de l'événement dans la base de données
        $stmt = $pdo->prepare(
            "INSERT INTO events (nom, dateDebut, dateFin, lieu, password)
             VALUES (:nom, :dateDebut, :dateFin, :lieu, :password)"
        );

        $stmt->execute([
            ':nom' => $nom,
            ':dateDebut' => $data['dateDebut'],
            ':dateFin' => $dateFin,
            ':lieu' => $lieu,
            ':password' => password_hash($code, PASSWORD_BCRYPT)
        ]);

        // Récupération de l'ID de l'événement créé
        $eventId = $pdo->lastInsertId();

        // ---------------------------------------------------------------------
        // ÉTAPE 3.10 : CRÉATION DES RÉPERTOIRES PHYSIQUES
        // ---------------------------------------------------------------------
        
        $basePath = '../../api/';
        $dirs = ['SD', 'HD']; // Répertoires pour différentes qualités
        
        foreach ($dirs as $dir) {
            $path = $basePath . $dir . '/' . $eventId;
            if (!file_exists($path) && !mkdir($path, 0755, true)) {
                throw new RuntimeException("Échec création du répertoire $dir");
            }
        }

        // Validation de la transaction
        $pdo->commit();

        // ---------------------------------------------------------------------
        // ÉTAPE 3.11 : RÉCUPÉRATION ET RETOUR DE L'ÉVÉNEMENT CRÉÉ
        // ---------------------------------------------------------------------
        
        $stmt = $pdo->prepare("SELECT * FROM events WHERE id = ?");
        $stmt->execute([$eventId]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        // Succès - retourne l'événement créé
        send_response(true, $event, 'Événement créé avec succès', 201);

    } catch (Exception $e) {
        // En cas d'erreur, annulation de la transaction
        $pdo->rollBack();
        send_response(false, [], 'La création de l\'événement a échoué en raison d\'un problème technique. Merci de contacter notre support à l\'adresse : contact@so-box.fr', 500);
    }

} catch (JsonException $e) {
    // -------------------------------------------------------------------------
    // ÉTAPE 4 : GESTION DES ERREURS SPÉCIFIQUES
    // -------------------------------------------------------------------------
    
    // Erreur de décodage JSON
    send_response(false, [], 'Format JSON invalide', 400);
    
} catch (Throwable $e) {
    // Erreur générale (toutes les exceptions et erreurs)
    $message = ENV_DEV ? $e->getMessage() : 'Erreur interne du serveur';
    send_response(false, [], 'Erreur serveur: ' . $message, 500);
}
?>