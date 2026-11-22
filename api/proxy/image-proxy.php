<?php
// image-proxy.php
// Proxy simples para servir imagens externas (ex.: fotos de perfil do Instagram)
// através do próprio domínio — evita bloqueios de CORS/hotlink.
//
// Chamada: /api/proxy/image-proxy.php?url=<url_encoded>

declare(strict_types=1);

$rawUrl = $_GET['url'] ?? '';
if ($rawUrl === '' || !is_string($rawUrl)) {
    http_response_code(400);
    exit('missing url');
}

$url = filter_var($rawUrl, FILTER_VALIDATE_URL);
if ($url === false) {
    http_response_code(400);
    exit('invalid url');
}

// Lista restrita de hosts permitidos (evita SSRF e abuso)
$parsed = parse_url($url);
$allowedHosts = [
    'scontent.cdninstagram.com',
    'instagram.com',
    'cdninstagram.com',
    'fbcdn.net',
];
$host = strtolower($parsed['host'] ?? '');
$ok = false;
foreach ($allowedHosts as $allowed) {
    if ($host === $allowed || str_ends_with($host, '.' . $allowed)) {
        $ok = true;
        break;
    }
}
if (!$ok) {
    http_response_code(403);
    exit('host not allowed');
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 3,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HEADER         => false,
    CURLOPT_USERAGENT      => 'Mozilla/5.0',
    CURLOPT_SSL_VERIFYPEER => true,
]);
$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'image/jpeg';
curl_close($ch);

if (!$body || $status >= 400) {
    http_response_code(502);
    exit('upstream fail');
}

// Só devolver imagens
if (!preg_match('~^image/~', $type)) {
    http_response_code(415);
    exit('not an image');
}

header('Content-Type: ' . $type);
header('Cache-Control: public, max-age=3600');
echo $body;
