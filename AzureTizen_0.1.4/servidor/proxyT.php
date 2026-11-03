<?php
// Proxy de respaldo para Azure Tizen. La app lo usa SOLO cuando una petición directa falla por CORS
// (listas M3U, JSON de Xtream, subtítulos). Los videos NO pasan por aquí: se reproducen directo.
//
// Uso:  proxyT.php?k=CLAVE&u=URL_CODIFICADA
// 1) Cambia CLAVE_PROXY por una clave tuya (la misma que pondrás en Azure Tizen > Configuración > Red).
// 2) Súbelo a cualquier carpeta de tu hosting (no necesita config.php ni listas/).
//
// Qué hace para no ser un proxy abierto: exige la clave, solo http/https, bloquea direcciones privadas
// o internas (192.168.x.x, 10.x.x.x, 127.x.x.x, etc.), revisa cada redirección y corta a 5 MB.

const CLAVE_PROXY = 'CAMBIA_ESTA_CLAVE';
const MAX_BYTES = 5000000;       // tope de lo que se descarga
const MAX_REDIRECCIONES = 5;
const TIMEOUT_SEG = 20;
const VERIFICAR_SSL = false;     // muchos servidores IPTV tienen certificados malos; aquí solo se leen datos

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Expose-Headers: X-Proxy-Url, X-Proxy-Truncado');

function fallo($codigo, $mensaje) {
    http_response_code($codigo);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'ERROR_PROXY: ' . $mensaje;
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (!function_exists('curl_init')) fallo(500, 'Este hosting no tiene cURL.');
if (CLAVE_PROXY === '' || CLAVE_PROXY === 'CAMBIA_ESTA_CLAVE') fallo(500, 'Falta poner tu clave en CLAVE_PROXY dentro de proxyT.php.');
if (!hash_equals(CLAVE_PROXY, (string)($_GET['k'] ?? ''))) fallo(403, 'Clave incorrecta.');

$url = trim((string)($_GET['u'] ?? ''));
if ($url === '') fallo(400, 'Falta el parámetro u (la URL).');

function ipPublica($ip) {
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
}

// Devuelve [host, puerto, ip] o corta con error si el destino no es público.
function validarDestino($url) {
    $p = parse_url($url);
    if (!$p || empty($p['scheme']) || empty($p['host'])) fallo(400, 'URL inválida.');
    $esquema = strtolower($p['scheme']);
    if ($esquema !== 'http' && $esquema !== 'https') fallo(400, 'Solo http o https.');
    $host = trim($p['host'], '[]');
    $puerto = isset($p['port']) ? (int)$p['port'] : ($esquema === 'https' ? 443 : 80);
    if ($puerto < 1 || $puerto > 65535) fallo(400, 'Puerto inválido.');
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        $ips = array($host);
    } else {
        $ips = gethostbynamel($host);
        if (!$ips) fallo(502, 'No se pudo resolver el servidor: ' . $host);
    }
    foreach ($ips as $ip) {
        if (!ipPublica($ip)) fallo(403, 'Destino no permitido (dirección privada o interna).');
    }
    return array($host, $puerto, $ips[0], $esquema);
}

function resolverRelativa($base, $loc) {
    if (preg_match('#^https?://#i', $loc)) return $loc;
    $p = parse_url($base);
    $origen = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    if (strpos($loc, '//') === 0) return $p['scheme'] . ':' . $loc;
    if (strpos($loc, '/') === 0) return $origen . $loc;
    $ruta = isset($p['path']) ? $p['path'] : '/';
    $dir = substr($ruta, 0, strrpos($ruta, '/') + 1);
    return $origen . $dir . $loc;
}

$actual = $url;
$cuerpo = '';
$estado = 0;
$tipo = '';
$truncado = false;

for ($i = 0; $i <= MAX_REDIRECCIONES; $i++) {
    list($host, $puerto, $ip, $esquema) = validarDestino($actual);
    $cuerpo = '';
    $truncado = false;
    $location = '';
    $tipo = '';

    $ch = curl_init($actual);
    curl_setopt_array($ch, array(
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_RESOLVE => array($host . ':' . $puerto . ':' . $ip), // fija la IP ya validada (evita cambios de DNS)
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => TIMEOUT_SEG,
        CURLOPT_SSL_VERIFYPEER => VERIFICAR_SSL,
        CURLOPT_SSL_VERIFYHOST => VERIFICAR_SSL ? 2 : 0,
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => isset($_SERVER['HTTP_USER_AGENT']) && $_SERVER['HTTP_USER_AGENT'] !== '' ? $_SERVER['HTTP_USER_AGENT'] : 'Mozilla/5.0',
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_HEADERFUNCTION => function ($c, $linea) use (&$location, &$tipo) {
            if (stripos($linea, 'location:') === 0) $location = trim(substr($linea, 9));
            elseif (stripos($linea, 'content-type:') === 0) $tipo = trim(substr($linea, 13));
            return strlen($linea);
        },
        CURLOPT_WRITEFUNCTION => function ($c, $datos) use (&$cuerpo, &$truncado) {
            $cuerpo .= $datos;
            if (strlen($cuerpo) >= MAX_BYTES) { $truncado = true; return -1; } // corta la descarga
            return strlen($datos);
        },
    ));
    $ok = curl_exec($ch);
    $estado = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if (!$ok && !$truncado) fallo(502, 'No se pudo descargar: ' . ($err !== '' ? $err : 'sin respuesta'));
    if ($estado >= 300 && $estado < 400 && $location !== '') {
        if ($i === MAX_REDIRECCIONES) fallo(508, 'Demasiadas redirecciones.');
        $actual = resolverRelativa($actual, $location);
        continue;
    }
    break;
}

http_response_code($estado > 0 ? $estado : 200);
header('Content-Type: ' . ($tipo !== '' ? $tipo : 'text/plain; charset=utf-8'));
header('X-Proxy-Url: ' . $actual);
if ($truncado) header('X-Proxy-Truncado: 1');
echo $cuerpo;
