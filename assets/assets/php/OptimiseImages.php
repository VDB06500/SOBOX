<?php
// Vérification de l'idEvent
if (!isset($_GET['idEvent']) || empty($_GET['idEvent'])) {
    die("❌ Paramètre idEvent manquant");
}

$idEvent = filter_var($_GET['idEvent'], FILTER_VALIDATE_INT);
if ($idEvent === false) {
    die("❌ L'ID de l'événement doit être un nombre entier");
}

// Connexion sécurisée à la BDD
require_once 'connexion.php';

// Connexion à la base de données
try {
    // 6. Connexion BDD
    try {
        $db = DatabaseConfig::getPDO();
    } catch (PDOException $e) {
        send_response(false, [], 'Erreur de connexion à la base de données', 500);
    }

    // Vérification de l'existence de l'événement
    $stmt = $db->prepare("SELECT `id` FROM `events` WHERE `id` = :idEvent");
    $stmt->bindParam(':idEvent', $idEvent, PDO::PARAM_INT);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        die("❌ L'événement spécifié n'existe pas");
    }
    
} catch (PDOException $e) {
    die("❌ Erreur de connexion à la base de données: " . $e->getMessage());
}

// Répertoire source des images
$sourceDir = "../../api/HD/{$idEvent}";
$targetDir = "../../api/SD/{$idEvent}";

// Vérifier si le dossier source existe
if (!is_dir($sourceDir)) {
    die("❌ Le dossier source pour cet événement n'existe pas");
}

// Créer le dossier cible si nécessaire
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0777, true);
}

// Récupérer la date du dernier traitement
$lastProcessDate = null;
try {
    $stmt = $db->prepare("SELECT MAX(dth_connexion) as last_date FROM `activity_events` WHERE id_event = :idEvent");
    $stmt->bindParam(':idEvent', $idEvent, PDO::PARAM_INT);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $lastProcessDate = $result['last_date'] ?? null;
} catch (PDOException $e) {
    echo "⚠️ Impossible de récupérer la date du dernier traitement: " . $e->getMessage() . "\n";
}

// Taille max pour le téléphone
$maxWidth = 800;
$maxHeight = 800;

// Fonction pour redimensionner les images (inchangée)
// Fonction pour redimensionner et enregistrer une image
function resizeImage($sourcePath, $targetPath, $maxWidth, $maxHeight)
{
    // Vérification initiale
    if (!file_exists($sourcePath)) {
        return "Fichier source introuvable";
    }

    $imageInfo = getimagesize($sourcePath);
    if (!$imageInfo) {
        return "Format d'image non reconnu";
    }

    list($origWidth, $origHeight, $imageType) = getimagesize($sourcePath);

    // Calculer les nouvelles dimensions tout en gardant les proportions
    $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight);
    $newWidth = intval($origWidth * $ratio);
    $newHeight = intval($origHeight * $ratio);

    // Créer une image selon le type
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            $image = imagecreatefromjpeg($sourcePath);
            break;
        case IMAGETYPE_PNG:
            $image = imagecreatefrompng($sourcePath);
            break;
        case IMAGETYPE_GIF:
            $image = imagecreatefromgif($sourcePath);
            break;
        default:
            if (!$imageType) {
                return "Échec de création de l'image (type: ".$imageType.")";
            }
            return false; // Type non pris en charge
    }

    // Créer une nouvelle image vide
    $resizedImage = imagecreatetruecolor($newWidth, $newHeight);

    // Conserver la transparence pour PNG et GIF
    if ($imageType == IMAGETYPE_PNG || $imageType == IMAGETYPE_GIF) {
        imagecolortransparent($resizedImage, imagecolorallocatealpha($resizedImage, 0, 0, 0, 127));
        imagealphablending($resizedImage, false);
        imagesavealpha($resizedImage, true);
    }

    // Redimensionner l'image
    imagecopyresampled($resizedImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

    // Sauvegarder l'image dans le dossier SD
    switch ($imageType) {
        case IMAGETYPE_JPEG:
            imagejpeg($resizedImage, $targetPath, 80); // Qualité 80% pour économiser de la place
            break;
        case IMAGETYPE_PNG:
            imagepng($resizedImage, $targetPath, 7); // Compression niveau 7
            break;
        case IMAGETYPE_GIF:
            imagegif($resizedImage, $targetPath);
            break;
    }

    // Libérer la mémoire
    imagedestroy($image);
    imagedestroy($resizedImage);

    return true;
}

// 🔄 Parcourir les fichiers du répertoire
$files = scandir($sourceDir);
$nbPhotosTraitees = 0;
$newImages = [];

foreach ($files as $file) {
    $filePath = "$sourceDir/$file";
    $targetPath = "$targetDir/$file";

    // Vérifier si c'est une image
    if (is_file($filePath) && exif_imagetype($filePath)) {
        // Vérifier si le fichier est nouveau ou modifié depuis le dernier traitement
        $fileTime = filemtime($filePath);
        $shouldProcess = true;
        
        if ($lastProcessDate !== null) {
            $lastProcessTimestamp = strtotime($lastProcessDate);
            $shouldProcess = ($fileTime > $lastProcessTimestamp);
        }
        
        // Vérifier si le fichier de destination n'existe pas ou est plus ancien que la source
        if ($shouldProcess || !file_exists($targetPath) || (filemtime($targetPath) < $fileTime)) {
            echo "🔄 Traitement de : $file... (Event ID: $idEvent)\n";
            
            if (resizeImage($filePath, $targetPath, $maxWidth, $maxHeight)) {
                echo "✅ Image optimisée : $targetPath\n";
                $nbPhotosTraitees++;
                $newImages[] = $file;
            } else {
                echo "❌ Échec pour : $file\n";
            }
        }
    }
}

// Enregistrement dans activity_events seulement si des nouvelles images ont été traitées
if ($nbPhotosTraitees > 0) {
    try {
        $dateNow = date('Y-m-d H:i:s');
        
        $stmt = $db->prepare("INSERT INTO `activity_events` 
                             (`id_event`, `dth_connexion`, `nb_photos`) 
                             VALUES (:idEvent, :dthConnexion, :nbPhotos)");
        
        $stmt->bindParam(':idEvent', $idEvent, PDO::PARAM_INT);
        $stmt->bindParam(':dthConnexion', $dateNow);
        $stmt->bindParam(':nbPhotos', $nbPhotosTraitees, PDO::PARAM_INT);
        
        $stmt->execute();
        
        echo "📝 Activité enregistrée: $nbPhotosTraitees nouvelles photos traitées pour l'événement $idEvent\n";
        echo "📸 Images traitées: " . implode(', ', $newImages) . "\n";
        
    } catch (PDOException $e) {
        echo "⚠️ Erreur lors de l'enregistrement de l'activité: " . $e->getMessage() . "\n";
    }
} else {
    echo "ℹ️ Aucune nouvelle image à traiter pour l'événement $idEvent\n";
}

echo "🚀 Traitement terminé pour l'événement {$idEvent}.\n";
?>

