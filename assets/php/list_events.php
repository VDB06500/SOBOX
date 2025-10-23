<?php
/**
 * SCRIPT : Récupération de la liste des événements actifs
 * DESCRIPTION : Ce script retourne tous les événements actifs de la plateforme
 *               avec leurs informations principales (id, nom, dates, lieu)
 * METHODE : GET
 * PARAMETRES : Aucun
 * URL : /api/get_events.php
 */

// =============================================================================
// CONFIGURATION INITIALE
// =============================================================================

// Définition du type de contenu comme JSON
header('Content-Type: application/json');

// =============================================================================
// ÉTAPE 1 : INCLUSION DE LA CONFIGURATION DE LA BASE DE DONNÉES
// =============================================================================

// Inclusion du fichier de connexion à la base de données
require_once 'connexion.php';

// =============================================================================
// ÉTAPE 2 : VÉRIFICATION DE LA MÉTHODE HTTP
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
// ÉTAPE 3 : TRAITEMENT PRINCIPAL
// =============================================================================

try {
    
    // Initialisation de la structure de réponse standardisée
    $response = [
        "status" => "ERREUR",     // Statut initial de la réponse
        "message" => "",          // Message descriptif du résultat
        "data" => []              // Données des événements (tableau vide par défaut)
    ];

    // =========================================================================
    // ÉTAPE 3.1 : CONNEXION À LA BASE DE DONNÉES
    // =========================================================================
    
    try {
        $pdo = DatabaseConfig::getPDO();
    } catch (Exception $e) {
        $response["status"] = "ERREUR";
        $response["message"] = "Erreur de connexion à la base de données. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr";
        $response["data"] = [];
        http_response_code(500);
        echo json_encode($response);
        exit;
    }
    
    // =========================================================================
    // ÉTAPE 3.2 : EXÉCUTION DE LA REQUÊTE POUR RÉCUPÉRER LES ÉVÉNEMENTS
    // =========================================================================
    
    /**
     * Requête SQL pour récupérer :
     * - id : Identifiant unique de l'événement
     * - nom : Nom de l'événement
     * - dateDebut : Date de début de l'événement
     * - dateFin : Date de fin de l'événement  
     * - lieu : Lieu où se déroule l'événement
     * 
     * Conditions :
     * - actif = true : Seulement les événements actifs
     * - ORDER BY dateDebut DESC : Tri du plus récent au plus ancien
     */
    $query = "SELECT id, nom, dateDebut, dateFin, lieu 
              FROM events 
              WHERE actif = true 
              ORDER BY dateDebut DESC";
    
    // Exécution de la requête (pas de paramètres donc utilisation de query())
    $stmt = $pdo->query($query);
    
    // Récupération de tous les résultats sous forme de tableau associatif
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // =========================================================================
    // ÉTAPE 3.3 : TRAITEMENT DES RÉSULTATS
    // =========================================================================
    
    // Cas 1 : Aucun événement trouvé
    if (empty($events)) {
        $response["status"] = "SUCCES"; // Succès car la requête s'est bien exécutée
        $response["message"] = "Aucun événement actif trouvé";
        http_response_code(200); // OK - La requête a réussi mais pas de données
        
    } 
    // Cas 2 : Événements trouvés
    else {
        $response["status"] = "SUCCES";
        $response["message"] = count($events) . " événement(s) trouvé(s)";
        $response["data"] = $events; // Injection des événements dans la réponse
        http_response_code(200); // OK - Requête réussie avec données
    }

    // =========================================================================
    // ÉTAPE 3.4 : ENVOI DE LA RÉPONSE JSON
    // =========================================================================
    
    // Encodage et envoi de la réponse avec support des caractères Unicode
    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    // =========================================================================
    // ÉTAPE 4 : GESTION DES ERREURS PDO (BASE DE DONNÉES)
    // =========================================================================
    
    // Journalisation de l'erreur complète pour le débogage
    error_log("Erreur PDO dans get_events.php: " . $e->getMessage());
    
    // Construction du message d'erreur pour l'utilisateur
    $response["status"] = "ERREUR";
    $response["message"] = "Erreur de connexion à la base de données. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr";
    $response["data"] = [];
    
    http_response_code(500); // Internal Server Error
    echo json_encode($response);
    
} catch (Exception $e) {
    // =========================================================================
    // ÉTAPE 5 : GESTION DES ERREURS GÉNÉRALES
    // =========================================================================
    
    // Journalisation de l'erreur
    error_log("Erreur générale dans get_events.php: " . $e->getMessage());
    
    // Réponse d'erreur générique
    $response["status"] = "ERREUR";
    $response["message"] = "Erreur interne du serveur. Veuillez réessayer plus tard ou contacter le support technique par email : contact@sobox.fr";
    $response["data"] = [];
    
    http_response_code(500); // Internal Server Error
    echo json_encode($response);
}
?>