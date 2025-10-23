<?php
// config.php

class DatabaseConfig {
    public static function getPDO() {
        static $pdo = null;
        
        if ($pdo === null) {
            $host = 'db5017517388.hosting-data.io';
            $dbname = 'dbs14042117';
            $username = 'dbu2980432';
            $password = 'Aqwaze123*xxxxxxxxx';
            
            try {
                $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                $pdo = new PDO($dsn, $username, $password, $options);
            } catch (PDOException $e) {
                throw new Exception('Erreur de connexion DB: ' . $e->getMessage());
            }
        }
        
        return $pdo;
    }
}

function sendResponse($success, $data = [], $error = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error,
        'timestamp' => date('c')
    ]);
    exit;
}
?>