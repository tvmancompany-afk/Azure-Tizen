<?php
// Copia "T" de leer.php para Azure Tizen: añade CORS y ejecuta tu leer.php SIN modificarlo.
// Súbelo a la MISMA carpeta donde ya están leer.php, config.php y funciones.php.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/leer.php';
