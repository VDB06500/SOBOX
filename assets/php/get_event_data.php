<?php
/**
 * SCRIPT : Récupération des statistiques globales de la plateforme
 * DESCRIPTION : Ce script retourne les statistiques générales (événements, utilisateurs, connexions)
 *               pour le tableau de bord administratif
 * METHODE : GET
 * PARAMETRES : Aucun
 */

// Définition du type de contenu comme JSON
header('Content-Type: application/json');

// =============================================================================
// ÉTAPE 1 : VÉRIFICATION DE LA MÉTHODE GET
// =============================================================================

// Vérification que la méthode utilisée est bien GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        "status" => "ERREUR", 
        "message" => "Méthode non autorisée - Utilisez GET"
    ]);
    exit;
}

// =============================================================================
// ÉTAPE 2 : CONNEXION À LA BASE DE DONNÉES
// =============================================================================

try {
    // Inclusion du fichier de connexion à la base de données
    require_once 'connexion.php';

    // Tentative de connexion à la base de données
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (Exception $e) {
        // En cas d'échec de connexion, retourne une erreur 500
        http_response_code(500);
        echo json_encode([
            "status" => "ERREUR",
            "message" => "Erreur de connexion à la base de données"
        ]);
        exit;
    }

    // =========================================================================
    // ÉTAPE 3 : COMPTAGE DES ÉVÉNEMENTS ACTIFS
    // =========================================================================
    
    // Requête pour compter le nombre d'événements actifs
    $query = "SELECT COUNT(*) AS NB_EVENEMENTS FROM events WHERE ACTIF = 1";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $nb_evenements = (int)$result['NB_EVENEMENTS'];

    // =========================================================================
    // ÉTAPE 4 : COMPTAGE DU NOMBRE TOTAL D'UTILISATEURS
    // =========================================================================
    
    // Requête pour compter le nombre total d'utilisateurs inscrits
    $query = "SELECT COUNT(*) AS NB_UTILISATEURS FROM users";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $nb_utilisateurs = (int)$result['NB_UTILISATEURS'];

    // =========================================================================
    // ÉTAPE 5 : COMPTAGE DU NOMBRE TOTAL DE CONNEXIONS
    // =========================================================================
    
    // Requête pour compter le nombre total de connexions enregistrées
    $query = "SELECT COUNT(*) AS NB_CONNEXIONS FROM horodatage";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $nb_connexions = (int)$result['NB_CONNEXIONS'];

    // =========================================================================
    // ÉTAPE 6 : STATISTIQUES SUPPLÉMENTAIRES (À COMPLÉTER)
    // =========================================================================
    
    // TODO: Implémenter le comptage des partages
    $nb_shares = 0;

    // TODO: Implémenter le comptage des anomalies
    $nb_anomalie = 0;

    // =========================================================================
    // ÉTAPE 7 : CONSTRUCTION DE LA RÉPONSE FINALE
    // =========================================================================
    
    // Structure principale des données de statistiques
    $data = [
        'status' => 'SUCCES',
        'events' => $nb_evenements,           // Nombre d'événements actifs
        'users' => $nb_utilisateurs,          // Nombre total d'utilisateurs
        'total_connections' => $nb_connexions, // Nombre total de connexions
        'total_shares' => $nb_shares,         // Nombre de partages (à implémenter)
        'total_anomalies' => $nb_anomalie,    // Nombre d'anomalies (à implémenter)
        'connections_by_quarter_hour' => [],  // Données pour graphique quart d'heure
        'shares_by_day' => []                 // Données pour graphique par jour
    ];

    // =========================================================================
    // ÉTAPE 8 : GÉNÉRATION DES DONNÉES POUR GRAPHIQUES (OPTIONNEL)
    // =========================================================================
    
    /*
    // Exemple de génération de données pour graphique des connexions par quart d'heure
    for ($i = 0; $i < 96; $i++) { // 96 quarts d'heure dans 24h
        $hour = floor($i/4);      // Heure (0-23)
        $minute = ($i%4)*15;      // Minute (0, 15, 30, 45)
        $data['connections_by_quarter_hour'][sprintf("%02d:%02d", $hour, $minute)] = rand(0, 50);
    }

    // Exemple de génération de données pour graphique des partages par jour
    $days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    foreach ($days as $day) {
        $data['shares_by_day'][$day] = rand(5, 30);
    }
    */

    // =========================================================================
    // ÉTAPE 9 : ENVOI DE LA RÉPONSE JSON
    // =========================================================================
    
    // Encodage et envoi des données au format JSON
    echo json_encode($data, JSON_NUMERIC_CHECK);
    
} catch (Exception $e) {
    // =========================================================================
    // ÉTAPE 10 : GESTION DES ERREURS GÉNÉRALES
    // =========================================================================
    
    http_response_code(500); // Internal Server Error
    error_log("Erreur dans stats_globales.php: " . $e->getMessage());
    
    echo json_encode([
        'status' => 'ERROR',
        'message' => 'Erreur de connexion à la base de données. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr'
    ]);
}
?>