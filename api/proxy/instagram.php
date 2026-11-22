<?php
declare(strict_types=1);

// Proxy "legado" que o frontend chama como fonte "proxy" (primária).
// Internamente delega ao HikerAPI, reformatando a resposta para o shape
// que o frontend espera.
//
// Suporta:
//   ?tipo=perfil&username=X
//   ?tipo=busca_completa&username=X&is_private=(true|false)
//   ?tipo=all&username=X
//
// Observação: o frontend tem fallback para hikerapi.php; se qualquer coisa
// aqui der ruim, retornamos JSON com erro e o frontend recupera via fallback.

require_once __DIR__ . '/../_lib/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Site-Key, CF-Turnstile-Token');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function hiker_call(string $path, array $query): array {
    $accessKey = Config::require('HIKERAPI_ACCESS_KEY');
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
        throw new RuntimeException('Upstream error: ' . $err);
    }
    $decoded = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new RuntimeException('Upstream non-JSON (HTTP ' . $code . ')');
    }
    if ($code >= 400) {
        $msg = $decoded['detail'] ?? $decoded['error'] ?? ('HTTP ' . $code);
        throw new RuntimeException(is_string($msg) ? $msg : 'HTTP ' . $code);
    }
    return $decoded;
}

function proxy_url(?string $url): ?string {
    if (!$url || !is_string($url)) return $url;
    if (str_contains($url, 'cdninstagram.com') || str_contains($url, 'fbcdn.net')) {
        return '/api/proxy/image-proxy.php?url=' . rawurlencode($url);
    }
    return $url;
}

function normalize_profile(array $user, string $fallbackUsername): array {
    return [
        'pk'              => (string) ($user['pk'] ?? $user['id'] ?? ''),
        'user_id'         => (string) ($user['pk'] ?? $user['id'] ?? ''),
        'username'        => $user['username'] ?? $fallbackUsername,
        'full_name'       => $user['full_name'] ?? '',
        'biography'       => $user['biography'] ?? '',
        'profile_pic_url' => proxy_url($user['profile_pic_url'] ?? ($user['hd_profile_pic_url_info']['url'] ?? null))
                             ?: '/images/avatars/perfil-sem-foto.jpeg',
        'profile_pic_url_hd' => proxy_url($user['hd_profile_pic_url_info']['url'] ?? ($user['profile_pic_url_hd'] ?? null)),
        'is_private'      => (bool) ($user['is_private'] ?? false),
        'is_verified'     => (bool) ($user['is_verified'] ?? false),
        'is_business'     => (bool) ($user['is_business'] ?? false),
        'media_count'     => (int) ($user['media_count'] ?? 0),
        'follower_count'  => (int) ($user['follower_count'] ?? 0),
        'following_count' => (int) ($user['following_count'] ?? 0),
    ];
}

function map_users(array $list): array {
    return array_map(static function ($u) {
        if (!is_array($u)) return $u;
        if (isset($u['profile_pic_url'])) {
            $u['profile_pic_url'] = proxy_url($u['profile_pic_url']);
        }
        return $u;
    }, $list);
}

try {
    Config::load();

    $tipo     = $_GET['tipo'] ?? '';
    $username = trim((string) ($_GET['username'] ?? ''));
    $username = preg_replace('/^@+/', '', $username) ?? '';

    if ($username === '' || !preg_match('/^[A-Za-z0-9._]{1,30}$/', $username)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid username']);
        exit;
    }

    if ($tipo === 'perfil') {
        $resp = hiker_call('/v2/user/by/username', ['username' => $username]);
        $user = $resp['user'] ?? null;
        if (!is_array($user)) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }
        echo json_encode(normalize_profile($user, $username));
        exit;
    }

    if ($tipo === 'busca_completa' || $tipo === 'all') {
        $resp = hiker_call('/v2/user/by/username', ['username' => $username]);
        $user = $resp['user'] ?? null;
        if (!is_array($user)) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }
        $profile = normalize_profile($user, $username);

        $followers = [];
        try {
            $follow = hiker_call('/v2/user/following', [
                'user_id' => $user['pk'] ?? $user['id'] ?? '',
                'page_id' => '1',
            ]);
            $followers = map_users($follow['response']['users'] ?? $follow['users'] ?? []);
        } catch (Throwable $e) {
            // tolerável — perfis privados ou limites
        }

        $posts = [];
        try {
            $medias = hiker_call('/g2/user/medias', [
                'user_id' => $user['pk'] ?? $user['id'] ?? '',
                'flat'    => 'true',
            ]);
            $items = $medias['response']['items'] ?? $medias['items'] ?? [];
            foreach ($items as &$it) {
                if (!is_array($it)) continue;
                if (isset($it['user']['profile_pic_url'])) {
                    $it['user']['profile_pic_url'] = proxy_url($it['user']['profile_pic_url']);
                }
                if (isset($it['owner']['profile_pic_url'])) {
                    $it['owner']['profile_pic_url'] = proxy_url($it['owner']['profile_pic_url']);
                }
            }
            unset($it);
            $posts = $items;
        } catch (Throwable $e) {
            // tolerável
        }

        $out = $profile + [
            'lista_perfis_publicos' => $followers,
            'followers'             => $followers,
            'chaining_results'      => $followers,
            'posts'                 => $posts,
            'followers_posts'       => $posts,
            'feed_posts'            => $posts,
            'error_count'           => 0,
            'results'               => [['source' => 'proxy']],
        ];
        echo json_encode($out);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Unknown tipo']);
} catch (Throwable $e) {
    http_response_code(502);
    echo json_encode(['error' => $e->getMessage()]);
}
