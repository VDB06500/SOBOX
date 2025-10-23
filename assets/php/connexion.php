<?php
/**
 * FICHIER : config.php
 * DESCRIPTION : Configuration de la base de données et fonctions utilitaires
 * FONCTIONNALITÉS :
 *   - Connexion PDO singleton à la base MySQL
 *   - Fonction de réponse JSON standardisée
 *   - Gestion centralisée des paramètres de connexion
 */

// =============================================================================
// CLASE DATABASECONFIG : GESTION DE LA CONNEXION À LA BASE DE DONNÉES
// =============================================================================

class DatabaseConfig {
    
    /**
     * Instance singleton de PDO
     * @var PDO|null
     */
    private static $pdo = null;
    
    /**
     * Obtient une instance PDO de connexion à la base de données
     * Implémente le pattern Singleton pour éviter les connexions multiples
     * 
     * @return PDO Instance de connexion PDO
     * @throws Exception Si la connexion à la base de données échoue
     */
    public static function getPDO(): PDO {
        // Vérifie si une instance existe déjà
        if (self::$pdo === null) {
            // =================================================================
            // CONFIGURATION DES PARAMÈTRES DE CONNEXION
            // =================================================================
            $host = 'db5017517388.hosting-data.io';    // Serveur de base de données
            $dbname = 'dbs14042117';                   // Nom de la base de données
            $username = 'dbu2980432';                  // Nom d'utilisateur MySQL
            $password = 'Aqwaze123*';                  // Mot de passe MySQL
            
            try {
                // Construction du DSN (Data Source Name)
                $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
                
                // =============================================================
                // OPTIONS DE CONFIGURATION PDO
                // =============================================================
                $options = [
                    // Active le mode exception pour les erreurs PDO
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    
                    // Retourne les résultats sous forme de tableau associatif
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    
                    // Désactive l'émulation des requêtes préparées (plus sécurisé)
                    PDO::ATTR_EMULATE_PREPARES => false,
                    
                    // Options supplémentaires pour la stabilité
                    PDO::ATTR_PERSISTENT => false,
                    PDO::ATTR_TIMEOUT => 30
                ];
                
                // Création de l'instance PDO
                self::$pdo = new PDO($dsn, $username, $password, $options);
                
            } catch (PDOException $e) {
                // Log l'erreur complète en environnement de développement
                error_log("Erreur connexion DB - DSN: $dsn - Message: " . $e->getMessage());
                
                // Lance une exception avec un message générique pour la sécurité
                throw new Exception('Erreur de connexion à la base de données');
            }
        }
        
        return self::$pdo;
    }
    
    /**
     * Ferme la connexion à la base de données
     * Utile pour les tests ou la gestion mémoire
     */
    public static function closeConnection(): void {
        self::$pdo = null;
    }
}

// =============================================================================
// FONCTION SENDRESPONSE : RÉPONSE JSON STANDARDISÉE
// =============================================================================

/**
 * Envoie une réponse JSON standardisée et termine l'exécution du script
 * 
 * @param bool $success Statut de l'opération (true = succès, false = erreur)
 * @param array $data Données à retourner (tableau associatif)
 * @param string|null $error Message d'erreur (null si succès)
 * @param int $code Code HTTP de réponse (200 par défaut)
 * @return never
 */
function sendResponse(bool $success, array $data = [], ?string $error = null, int $code = 200): never {
    // Définition du code HTTP
    http_response_code($code);
    
    // =========================================================================
    // CONSTRUCTION DE LA RÉPONSE STANDARDISÉE
    // =========================================================================
    $response = [
        'success' => $success,        // Statut booléen de l'opération
        'data' => $data,              // Données principales de la réponse
        'error' => $error,            // Message d'erreur (null si succès)
        'timestamp' => date('c'),     // Horodatage ISO 8601
        'version' => '1.0'            // Version de l'API
    ];
    
    // En-têtes pour prévenir la mise en cache
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Encodage et envoi de la réponse JSON
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
    // Arrêt de l'exécution du script
    exit;
}

// =============================================================================
// FONCTIONS UTILITAIRES SUPPLÉMENTAIRES
// =============================================================================

/**
 * Valide et nettoie une chaîne de caractères
 * 
 * @param string $input Chaîne à nettoyer
 * @param int $maxLength Longueur maximale autorisée
 * @return string Chaîne nettoyée
 */
function sanitizeString(string $input, int $maxLength = 255): string {
    $cleaned = trim($input);
    $cleaned = htmlspecialchars($cleaned, ENT_QUOTES, 'UTF-8');
    
    if (strlen($cleaned) > $maxLength) {
        $cleaned = substr($cleaned, 0, $maxLength);
    }
    
    return $cleaned;
}

/**
 * Log une action ou une erreur dans un fichier de log
 * 
 * @param string $message Message à logger
 * @param string $level Niveau de log (INFO, WARNING, ERROR)
 */
function logMessage(string $message, string $level = 'INFO'): void {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    
    // Chemin du fichier de log (à adapter selon l'environnement)
    $logFile = __DIR__ . '/../logs/app_' . date('Y-m-d') . '.log';
    
    // Création du répertoire de logs si nécessaire
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    // Écriture dans le fichier de log
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

?>