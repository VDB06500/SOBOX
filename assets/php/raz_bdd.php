<?php
/**
 * SCRIPT : Réinitialisation complète de la base de données
 * DESCRIPTION : Ce script vide entièrement toutes les tables de la base de données
 *               en désactivant temporairement les contraintes de clés étrangères
 * AVERTISSEMENT : Opération DANGEREUSE - Supprime toutes les données
 * METHODE : Exécution directe (à protéger par authentification)
 * TABLES TRAITÉES : user_events, activity_events, horodatage, events, users
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
// ÉTAPE 2 : TRAITEMENT PRINCIPAL
// =============================================================================

try {
    // -------------------------------------------------------------------------
    // ÉTAPE 2.1 : CONNEXION À LA BASE DE DONNÉES
    // -------------------------------------------------------------------------
    
    // Obtention de l'instance PDO via le singleton DatabaseConfig
    $pdo = DatabaseConfig::getPDO();
    
    // -------------------------------------------------------------------------
    // ÉTAPE 2.2 : DÉSACTIVATION DES CONTRAINTES DE CLÉS ÉTRANGÈRES
    // -------------------------------------------------------------------------
    
    /**
     * IMPORTANT : Désactive les vérifications de clés étrangères
     * Permet de vider les tables dans n'importe quel ordre
     * sans violations de contraintes référentielles
     */
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // -------------------------------------------------------------------------
    // ÉTAPE 2.3 : DÉFINITION DE L'ORDRE DES TABLES À VIDER
    // -------------------------------------------------------------------------
    
    /**
     * Ordre stratégique des tables :
     * 1. Tables de liaison (user_events)
     * 2. Tables d'activité (activity_events, horodatage) 
     * 3. Tables principales (events, users)
     * 
     * Cet ordre respecte les dépendances entre tables
     */
    $tables = [
        'user_events',      // Table de liaison entre users et events
        'activity_events',  // Activités liées aux événements
        'horodatage',       // Historique des connexions
        'events',           // Événements principaux
        'users'             // Utilisateurs de la plateforme
    ];
    
    // -------------------------------------------------------------------------
    // ÉTAPE 2.4 : VIDAGE SÉQUENTIEL DE CHAQUE TABLE
    // -------------------------------------------------------------------------
    
    // Parcours de chaque table dans l'ordre défini
    foreach ($tables as $table) {
        /**
         * TRUNCATE TABLE vs DELETE :
         * - TRUNCATE réinitialise les auto-incréments
         * - TRUNCATE est plus rapide pour vider complètement une table
         * - TRUNCATE ne peut pas être annulé (pas de ROLLBACK)
         */
        $stmt = $pdo->prepare("TRUNCATE TABLE `$table`");
        $stmt->execute();
        
        // Optionnel : Log du succès pour chaque table
        error_log("Table vidée avec succès: $table");
    }
    
    // -------------------------------------------------------------------------
    // ÉTAPE 2.5 : RÉACTIVATION DES CONTRAINTES DE CLÉS ÉTRANGÈRES
    // -------------------------------------------------------------------------
    
    /**
     * Réactive les vérifications de clés étrangères
     * Essentiel pour maintenir l'intégrité référentielle
     * des futures insertions de données
     */
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    // =========================================================================
    // ÉTAPE 3 : CONSTRUCTION DE LA RÉPONSE DE SUCCÈS
    // =========================================================================
    
    $response = [
        "status" => "SUCCÈS",
        "message" => "Toutes les tables ont été vidées avec succès",
        "data" => [
            "tables_videes" => $tables,          // Liste des tables traitées
            "nombre_tables" => count($tables),   // Nombre total de tables vidées
            "timestamp" => date('Y-m-d H:i:s')   // Horodatage de l'opération
        ]
    ];
    
    // Journalisation de l'opération réussie
    error_log("RAZ_BDD: Réinitialisation complète réussie - " . count($tables) . " tables vidées");
    
    // Encodage et envoi de la réponse avec support des caractères Unicode
    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // =========================================================================
    // ÉTAPE 4 : GESTION DES ERREURS - RESTAURATION DE LA SÉCURITÉ
    // =========================================================================
    
    // -------------------------------------------------------------------------
    // ÉTAPE 4.1 : RÉACTIVATION URGENTE DES CONTRAINTES EN CAS D'ERREUR
    // -------------------------------------------------------------------------
    
    /**
     * CRITIQUE : Réactive les contraintes même en cas d'erreur
     * Évite de laisser la base de données dans un état non sécurisé
     */
    if (isset($pdo)) {
        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            error_log("Contraintes réactivées après erreur");
        } catch (Exception $reactivationError) {
            error_log("ERREUR CRITIQUE: Impossible de réactiver FOREIGN_KEY_CHECKS");
        }
    }
    
    // -------------------------------------------------------------------------
    // ÉTAPE 4.2 : JOURNALISATION DE L'ERREUR DÉTAILLÉE
    // -------------------------------------------------------------------------
    
    error_log("ERREUR RAZ_BDD: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // -------------------------------------------------------------------------
    // ÉTAPE 4.3 : CONSTRUCTION DE LA RÉPONSE D'ERREUR
    // -------------------------------------------------------------------------
    
    http_response_code(500); // Internal Server Error
    
    $errorResponse = [
        "status" => "ERREUR",
        "message" => "Erreur lors du vidage des tables",
        "error_details" => "Une erreur technique s'est produite lors de la réinitialisation",
        "timestamp" => date('Y-m-d H:i:s')
    ];
    
    // En développement, on peut inclure plus de détails
    if (in_array($_SERVER['SERVER_NAME'], ['localhost', '127.0.0.1'])) {
        $errorResponse["debug"] = $e->getMessage();
    }
    
    echo json_encode($errorResponse, JSON_UNESCAPED_UNICODE);
}
?>