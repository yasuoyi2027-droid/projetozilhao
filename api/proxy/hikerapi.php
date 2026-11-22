<?php
declare(strict_types=1);

// Proxy para HikerAPI (hikerapi.com).
// Chamado pelo frontend: /api/proxy/hikerapi.php?path=/v2/user/by/username&username=X
// Encaminha para https://api.hikerapi.com{path}?{outros_params} com x-access-key.

require_once __DIR__ . '/../_lib/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Site-Key');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    Config::load();

    $expectedKey = Config::get('SITE_KEY', 'f36ea0b8b6c2a6bbd745bc50e473bfc5b39d0c2a075a38e9');
    $providedKey = $_SERVER['HTTP_X_SITE_KEY'] ?? '';
    if (!hash_equals($expectedKey, $providedKey)) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }

    $accessKey = Config::require('HIKERAPI_ACCESS_KEY');

    $path = $_GET['path'] ?? '';
    if ($path === '' || !is_string($path) || $path[0] !== '/') {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid path']);
        exit;
    }
    // Só permitir caracteres seguros no path
    if (!preg_match('#^/[A-Za-z0-9_\-/]+$#', $path)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid path format']);
        exit;
    }

    $query = $_GET;
    unset($query['path']);

    $url = 'https://api.hikerapi.com' . $path;
    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER     => [
            'x-access-key: ' . $accessKey,
            'accept: application/json',
        ],
    ]);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) {
        http_response_code(502);
        echo json_encode(['error' => 'Upstream error: ' . $err]);
        exit;
    }

    http_response_code($code ?: 502);
    // Corpo já é JSON do HikerAPI; se não for, encapsula.
    $decoded = json_decode($body, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        echo $body;
    } else {
        echo json_encode(['error' => 'Upstream non-JSON', 'raw' => substr($body, 0, 500)]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
