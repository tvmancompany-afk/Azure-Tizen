<?php
// Copia "T" de guardar.php para Azure Tizen.
// Solo añade CORS (para que la app de la TV pueda leer la respuesta) y luego ejecuta tu guardar.php SIN modificarlo.
// Mismo config.php, misma carpeta listas/ y mismas contraseñas: lo que guarda Tizen lo lee Azure móvil y al revés.
// Súbelo a la MISMA carpeta donde ya están guardar.php, config.php y funciones.php.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require __DIR__ . '/guardar.php';
