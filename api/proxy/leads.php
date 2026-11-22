<?php
declare(strict_types=1);

// Endpoint de rastreio de leads. No funil original guarda em BD; aqui mantemos
// um comportamento permissivo (não bloqueia pesquisa) e opcionalmente grava um
// JSON por IP em STORAGE_DIR/leads/ para fins de auditoria. O frontend tolera
// respostas vazias, então o mínimo que precisamos é retornar JSON com success:true
// e os defaults que o frontend usa quando a resposta falta.

require_once __DIR__ . '/../_lib/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Site-Key, CF-Turnstile-Token');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    Config::load();
    $action = $_GET['action'] ?? '';

    if ($action === 'check_status') {
        echo json_encode([
            'success'     => true,
            'exists'      => false,
            'searchCount' => 0,
            'canSearch'   => true,
        ]);
        exit;
    }

    if ($action === 'check_status_by_ip') {
        echo json_encode([
            'success'              => true,
            'exists'               => false,
            'searchCount'          => 0,
            'canSearch'            => true,
            'blockReason'          => null,
            'gracePeriodExpired'   => false,
            'gracePeriodRemaining' => 0,
            'gracePeriodMinutes'   => 15,
            'previousUsername'     => null,
        ]);
        exit;
    }

    if ($action === 'save_search') {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid payload']);
            exit;
        }

        $dir = Config::get('STORAGE_DIR');
        if ($dir && is_dir($dir)) {
            $leadsDir = rtrim($dir, '/') . '/leads';
            if (!is_dir($leadsDir)) @mkdir($leadsDir, 0750, true);
            if (is_writable($leadsDir)) {
                $key  = $data['leadId'] ?? bin2hex(random_bytes(8));
                $safe = preg_replace('/[^A-Za-z0-9_\-]/', '_', (string) $key);
                $file = $leadsDir . '/' . $safe . '.json';
                $data['_savedAt'] = gmdate('c');
                $data['_ip']      = $_SERVER['REMOTE_ADDR'] ?? '';
                @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }
        }

        echo json_encode(['success' => true, 'saved' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unknown action']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
