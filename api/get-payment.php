<?php
// GET /api/get-payment.php?id=<uuid>
// Usado pelo frontend para fazer polling do status do pagamento.
//
// Estratégia: 1) tenta ler do storage local (atualizado pelo webhook),
//             2) se o status for pending, consulta o gateway em tempo real.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/alfaiaboemia-client.php';
require_once __DIR__ . '/_lib/storage.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$id = (string) ($_GET['id'] ?? '');
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_id']);
    exit;
}

try {
    $storage = new PaymentStorage();
    $local = $storage->load($id);

    // Se já foi marcado como paid/expired/refunded localmente, devolver direto.
    $terminal = ['paid', 'expired', 'refunded'];
    if ($local && in_array($local['status'] ?? '', $terminal, true)) {
        echo json_encode([
            'id' => $id,
            'status' => $local['status'],
            'source' => 'webhook',
            'data' => $local,
        ]);
        exit;
    }

    // Caso contrário, consultar o gateway.
    $client = new AlfaiaboemiaClient();
    $result = $client->getPayment($id);

    if ($result['status'] === 404) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    if ($result['status'] >= 400) {
        http_response_code($result['status']);
        echo json_encode(['error' => 'gateway_error', 'status' => $result['status']]);
        exit;
    }

    $data = $result['body']['data'] ?? null;
    $status = is_array($data) ? ($data['status'] ?? 'unknown') : 'unknown';

    // Atualizar storage se necessário.
    if (is_array($data)) {
        try {
            // BUG FIX: preserva sku, parent_id, user_context do save inicial do create-payment.
            // Sem isto, o webhook não encontra os campos e o Meta CAPI fica sem fbp/fbc/ip/ua
            // (match quality despenca e o Meta descarta ou mescla eventos).
            $merged = [
                'id' => $id,
                'status' => $status,
                'created' => $local['created'] ?? $data,
                'latest' => $data,
                'events' => $local['events'] ?? [],
            ];
            if (!empty($local['sku']))          $merged['sku']          = $local['sku'];
            if (!empty($local['parent_id']))    $merged['parent_id']    = $local['parent_id'];
            if (!empty($local['user_context'])) $merged['user_context'] = $local['user_context'];
            $storage->save($id, $merged);
        } catch (Throwable $e) {
            error_log('storage update failed: ' . $e->getMessage());
        }
    }

    echo json_encode([
        'id' => $id,
        'status' => $status,
        'source' => 'gateway',
        'data' => $data,
    ]);
} catch (Throwable $e) {
    error_log('get-payment error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'internal_error']);
}
