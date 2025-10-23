<?php
// config.php - Fichier de configuration sécurisé

// 1. Définir les constantes pour la connexion DB
define('DB_HOST', 'db5017517388.hosting-data.io');
define('DB_NAME', 'dbs14042117');
define('DB_USER', 'dbu2980432');
define('DB_PASS', 'Aqwaze123*');
define('DB_CHARSET', 'utf8mb4');

// 2. Paramètres de sécurité supplémentaires
define('ENVIRONMENT', 'production'); // 'development' ou 'production'
define('SITE_ROOT', realpath(dirname(__FILE__) . '/../'));
define('LOG_DIR', SITE_ROOT . '/logs/');

// 3. Configuration des erreurs selon l'environnement
if (defined('ENVIRONMENT')) {
    switch (ENVIRONMENT) {
        case 'development':
            error_reporting(E_ALL);
            ini_set('display_errors', 1);
            break;
        case 'production':
            error_reporting(0);
            ini_set('display_errors', 0);
            break;
        default:
            exit('L\'environnement d\'application n\'est pas défini correctement.');
    }
}

// 4. Fonctions utilitaires de sécurité
function secure_input($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

// 5. Vérification de l'accès direct
if (basename($_SERVER['PHP_SELF']) == basename(__FILE__)) {
    header('HTTP/1.0 403 Forbidden');
    exit('Accès direct non autorisé');
}

// 6. Configuration PDO
$pdo_options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
];