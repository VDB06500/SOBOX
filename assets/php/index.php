<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galerie Photos</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
    <div class="container">
        <h1 class="text-center my-5">Galerie Photos</h1>
        <div class="row" id="gallery">
            <?php
            // Dossier contenant les images
            $imageFolder = 'assets/images/';

            $imagesPerPage = 6; // Nombre d'images par page
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $offset = ($page - 1) * $imagesPerPage;

            $images = glob($imageFolder . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE);
            $totalImages = count($images);
            $paginatedImages = array_slice($images, $offset, $imagesPerPage);

            foreach ($paginatedImages as $image) {
                echo '
                <div class="col-md-4 mb-4">
                    <div class="card">
                        <img src="' . $image . '" class="card-img-top" alt="' . basename($image) . '">
                        <div class="card-body">
                            <p class="card-text">' . basename($image) . '</p>
                             <!-- Icône de téléchargement -->
                            <a href="' . $image . '" download="' . $imageName . '" class="btn btn-link"><i class="fas fa-download"></i></a>
                        </div>
                    </div>
                </div>';
            }

            // Pagination
            $totalPages = ceil($totalImages / $imagesPerPage);
            echo '<nav><ul class="pagination justify-content-center">';
            for ($i = 1; $i <= $totalPages; $i++) {
                echo '<li class="page-item ' . ($page === $i ? 'active' : '') . '"><a class="page-link" href="?page=' . $i . '">' . $i . '</a></li>';
            }
            echo '</ul></nav>';
            ?>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>