<?php
header('Content-Type: application/json');

// Connexion à la base de données MySQL
require_once 'connexion_bad.php';

// Vérification de la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(["status" => "ERREUR", "message" => "Méthode non autorisée"]);
    exit;
}

try {

    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (Exception $e) {
        sendResponse(false, [], $e->getMessage(), 500);
    }

    // if (!isset($input['event_id'])) {
    //     throw new Exception('ID événement manquant');
    // }

    // Récupération et validation du mot de passe
    // $event_id = isset($_GET['event_id']) ? strtoupper(trim($_GET['event_id'])) : null;

    // Requête pour compter les utilisateurs
    $query = "SELECT COUNT(*) AS NB_EVENEMENTS FROM events WHERE ACTIF = 1";
    $stmt = $pdo->prepare($query);
    $stmt->execute(); // Pas besoin de paramètres ici
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $nb_evenements = $result['NB_EVENEMENTS'];

    // Requête pour compter les utilisateurs
    $query = "SELECT COUNT(*) AS NB_UTILISATEURS FROM users";
    $stmt = $pdo->prepare($query);
    $stmt->execute(); // Pas besoin de paramètres ici
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $nb_utilisateurs = $result['NB_UTILISATEURS'];

    // Générer des données aléatoires (remplacer par votre logique réelle)
    $data = [
        'status' => 'SUCCES',
        'events' => (int)$nb_evenements,
        'users' => (int)$nb_utilisateurs,
        'total_connections' => rand(150, 300),
        'total_shares' => rand(50, 150),
        'total_anomalies' => rand(0, 20),
        'connections_by_quarter_hour' => [],
        'shares_by_day' => []
    ];

    // Générer des données pour les graphiques
    for ($i = 0; $i < 96; $i++) {
        $hour = floor($i/4);
        $minute = ($i%4)*15;
        $data['connections_by_quarter_hour'][sprintf("%02d:%02d", $hour, $minute)] = rand(0, 50);
    }

    $days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    foreach ($days as $day) {
        $data['shares_by_day'][$day] = rand(5, 30);
    }

    echo json_encode($data);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'ERROR',
        'message' => 'Erreur de connexion à la base de données. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr'
    ]);
}
?>