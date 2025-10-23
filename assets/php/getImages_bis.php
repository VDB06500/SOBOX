<?php
/**
 * API de gestion des images - Version SD uniquement
 * 
 * Ce script permet de lister les images d'un répertoire SD spécifique
 * tout en garantissant une sécurité optimale et des performances stables.
 */

// 1. CONFIGURATION DES EN-TÊTES ET PARAMÈTRES INITIAUX
// ---------------------------------------------------
header('Content-Type: application/json'); // Format de sortie JSON
header('X-Content-Type-Options: nosniff'); // Protection contre le MIME-sniffing
date_default_timezone_set('Europe/Paris'); // Fuseau horaire

// 2. CONSTANTES DE CONFIGURATION
// ------------------------------
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'webp']); // Types d'images autorisés
define('MAX_ID_LENGTH', 32); // Longueur maximale de l'ID
define('BASE_URL', 'https://www.so-box.fr/webapp/api/'); // URL de base pour les images

// Chemin absolu vers le répertoire API (2 niveaux au-dessus du script courant)
define('BASE_API_PATH', realpath(__DIR__ . '/../../api'));

// 3. VALIDATION DES PARAMÈTRES D'ENTRÉE
// -------------------------------------
/**
 * Valide et nettoie l'ID du répertoire
 * @param string $id Identifiant à valider
 * @return string|false Retourne l'ID nettoyé ou false si invalide
 */
function validateId($id) {
    // Expression régulière : seulement alphanumérique, tirets et underscores
    if (!preg_match('/^[a-zA-Z0-9_-]{1,' . MAX_ID_LENGTH . '}$/', $id)) {
        return false;
    }
    // Nettoyage contre les attaques XSS
    return htmlspecialchars($id, ENT_QUOTES, 'UTF-8');
}

/**
 * Valide le format de date
 * @param string $dateString Date à valider
 * @return bool True si la date est valide
 */
function validateDateTime($dateString) {
    return DateTime::createFromFormat('Y-m-d H:i:s', $dateString) !== false;
}

// Récupération et validation de l'ID
$id = validateId($_GET['id'] ?? '');
if (!$id) {
    http_response_code(400); // Bad Request
    die(json_encode(['error' => 'ID de répertoire invalide']));
}

// Récupération et validation de la date de synchronisation
$lastSync = urldecode($_GET['lastSync']) ?? '2000-01-01 00:00:00';
if (!validateDateTime($lastSync)) {
    http_response_code(400);
    die(json_encode(['error' => 'Format de date de synchronisation invalide']));
}

// 4. CONSTRUCTION DES CHEMINS
// ---------------------------
$imageDirSD = BASE_API_PATH . '/SD/' . $id;

// 5. CRÉATION DU RÉPERTOIRE SI INEXISTANT
// ---------------------------------------
if (!is_dir($imageDirSD)) {
    try {
        // Crée le répertoire avec permissions restrictives
        if (!mkdir($imageDirSD, 0755, true)) {
            throw new Exception('Échec de création du répertoire');
        }
        
        // Ajoute un fichier index.html vide pour empêcher le listage
        file_put_contents($imageDirSD . '/index.html', '');
        
    } catch (Exception $e) {
        http_response_code(500); // Internal Server Error
        die(json_encode(['error' => 'Impossible de créer le répertoire SD']));
    }
}

// 6. SCAN DU RÉPERTOIRE SD
// ------------------------
$images = [];

try {
    // Ouvre le répertoire en mode sécurisé
    if (!is_dir($imageDirSD)) {
        throw new Exception('Répertoire SD inaccessible');
    }
    
    $files = scandir($imageDirSD);
    if ($files === false) {
        throw new Exception('Échec de lecture du répertoire');
    }
    
    foreach ($files as $file) {
        // Ignore les entrées spéciales . et ..
        if ($file === '.' || $file === '..') continue;
        
        // Obtient le chemin absolu sécurisé
        $filePath = realpath($imageDirSD . '/' . $file);
        
        // Vérification de sécurité contre les attaques par traversal
        if (strpos($filePath, BASE_API_PATH) !== 0) {
            continue;
        }
        
        // Extraction de l'extension en minuscules
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        
        // Vérifie que c'est un fichier image valide
        if (is_file($filePath) && in_array($extension, ALLOWED_IMAGE_TYPES)) {
            // Récupère la date de modification
            $fileModTime = date("Y-m-d H:i:s", filemtime($filePath));
            
            // Filtre par date de synchronisation
            if ($fileModTime > $lastSync) {
                $images[] = [
                    "id" => $id,
                    "url" => BASE_URL . 'SD/' . rawurlencode($id) . '/' . rawurlencode($file),
                    "name" => pathinfo($file, PATHINFO_FILENAME),
                    "date" => $fileModTime,
                    "size" => filesize($filePath),
                    "type" => pathinfo($file, PATHINFO_EXTENSION)
                ];
            }
        }
    }
} catch (Exception $e) {
    // Journalisation de l'erreur
    error_log('Erreur API: ' . $e->getMessage());
    http_response_code(500);
    die(json_encode(['error' => 'Erreur de traitement du répertoire']));
}

// 7. PRÉPARATION DE LA RÉPONSE
// ---------------------------
// Limite le nombre de résultats pour éviter les surcharges
$maxResults = 1000;
if (count($images) > $maxResults) {
    $images = array_slice($images, 0, $maxResults);
}

// En-têtes de sécurité supplémentaires
header('X-Frame-Options: DENY'); // Protection contre le clickjacking
header('X-XSS-Protection: 1; mode=block'); // Protection XSS

// 8. ENVOI DE LA RÉPONSE
// ----------------------
echo json_encode([
    'status' => 'success',
    'count' => count($images),
    'images' => $images,
    'generated_at' => date('Y-m-d H:i:s') // Horodatage de la réponse
], JSON_PRETTY_PRINT | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

// Journalisation de l'accès (pour monitoring)
error_log('API SD accédée - ID: ' . $id . ' - Images: ' . count($images));
?>