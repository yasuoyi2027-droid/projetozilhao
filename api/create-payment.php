<?php
// POST /api/create-payment.php
// Body JSON:
// {
//   "sku": "core" | "core_bump" | "upsell_blindagem" | "upsell_descoberta"  (opcional, default "core")
//   "phone": "912345678",
//   "country_code": "351",
//   "payer": { "name": "...", "email": "...", "document": "...", "phone": "..." },
//   "tracking": { "utm_source": "...", ... },
//   "fbp": "...", "fbc": "...",
//   "parent_id": "<payment_id_do_core>"   (so em upsells — para auditoria + lookup de telefone)
// }
//
// MB WAY. Resposta: payload integral do gateway (data.id, data.status, data.mbway, ...).

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/alfaiaboemia-client.php';
require_once __DIR__ . '/_lib/storage.php';
require_once __DIR__ . '/_lib/utmify-client.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

// Catálogo de SKUs — fonte única da verdade dos precos (server-side).
// Nunca aceitar amount do cliente.
$SKUS = [
    'core' => [
        'id'    => 'ghostspy-vip',
        'name'  => 'GhostSpy Acesso VIP',
        'price' => 9.90,
    ],
    'core_bump' => [
        'id'    => 'ghostspy-vip-multi',
        'name'  => 'GhostSpy VIP + Multi-Perfil (3 extras)',
        'price' => 24.80,  // 9.90 + 14.90
    ],
    'core_discount' => [
        'id'    => 'ghostspy-vip-discount',
        'name'  => 'GhostSpy VIP (Oferta Especial)',
        'price' => 9.90,
    ],
    'upsell_blindagem' => [
        'id'    => 'ghostspy-blindagem',
        'name'  => 'GhostSpy — Blindagem de Confidencialidade',
        'price' => 17.90,
    ],
    'upsell_blindagem_discount' => [
        'id'    => 'ghostspy-blindagem-discount',
        'name'  => 'GhostSpy — Blindagem (Última Oferta)',
        'price' => 12.90,
    ],
    'upsell_descoberta' => [
        'id'    => 'ghostspy-descoberta',
        'name'  => 'GhostSpy — Relatório de Evento Suspeito',
        'price' => 12.90,
    ],
    'upsell_descoberta_discount' => [
        'id'    => 'ghostspy-descoberta-discount',
        'name'  => 'GhostSpy — Evento Suspeito (Última Oferta)',
        'price' => 9.90,
    ],
    'upsell_taxa_seguranca' => [
        'id'    => 'ghostspy-taxa-seguranca',
        'name'  => 'GhostSpy — Taxa de Confidencialidade',
        'price' => 19.90,
    ],
    'upsell_taxa_seguranca_discount' => [
        'id'    => 'ghostspy-taxa-seguranca-discount',
        'name'  => 'GhostSpy — Taxa (Ultima Oferta)',
        'price' => 14.90,
    ],
    'upsell_alertas_vitalicio' => [
        'id'    => 'ghostspy-alertas-vitalicio',
        'name'  => 'GhostSpy — Alertas Vitalicios',
        'price' => 27.90,
    ],
    'upsell_alertas_vitalicio_discount' => [
        'id'    => 'ghostspy-alertas-vitalicio-discount',
        'name'  => 'GhostSpy — Alertas Vitalicios (Ultima Oferta)',
        'price' => 19.90,
    ],
];

try {
    Config::load();

    $raw = file_get_contents('php://input') ?: '';
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_json']);
        exit;
    }

    $sku = (string) ($input['sku'] ?? 'core');
    if (!isset($SKUS[$sku])) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_sku']);
        exit;
    }
    $skuData = $SKUS[$sku];
    $amount  = (float) $skuData['price'];

    $method   = 'mbway';
    $siteUrl  = Config::require('SITE_URL');
    $callback = rtrim($siteUrl, '/') . '/api/webhook.php';

    $payer    = $input['payer'] ?? [];
    $tracking = $input['tracking'] ?? [];
    $parentId = (string) ($input['parent_id'] ?? '');

    $body = [
        'amount'       => $amount,
        'currency'     => 'EUR',
        'method'       => $method,
        'callback_url' => $callback,
    ];

    // Payer.
    $payerFields = ['name', 'email', 'document', 'phone'];
    $payerOut = [];
    foreach ($payerFields as $f) {
        if (!empty($payer[$f]) && is_string($payer[$f])) {
            $payerOut[$f] = trim($payer[$f]);
        }
    }

    // Em upsells, se não veio payer, carregar do pagamento parent (reutiliza nome/email/phone).
    if ($parentId && (empty($payerOut['email']) || empty($payerOut['name']))) {
        try {
            $storage = new PaymentStorage();
            $local   = $storage->load($parentId);
            $parentData = $local['created'] ?? [];
            $parentPayer = $parentData['payer'] ?? [];
            foreach ($payerFields as $f) {
                if (empty($payerOut[$f]) && !empty($parentPayer[$f])) {
                    $payerOut[$f] = $parentPayer[$f];
                }
            }
        } catch (Throwable $e) {
            error_log('parent lookup failed: ' . $e->getMessage());
        }
    }

    if ($payerOut) $body['payer'] = $payerOut;

    // Tracking — em upsells, se vier vazio, herda do parent (UTMs + src/sck).
    $trackFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
    $trackOut = [];
    foreach ($trackFields as $f) {
        if (!empty($tracking[$f]) && is_string($tracking[$f])) {
            $trackOut[$f] = trim($tracking[$f]);
        }
    }
    if (empty($trackOut) && $parentId) {
        try {
            $storage = $storage ?? new PaymentStorage();
            $local   = $local   ?? $storage->load($parentId);
            $parentTracking = $local['created']['tracking'] ?? [];
            if (is_array($parentTracking)) {
                foreach ($trackFields as $f) {
                    if (!empty($parentTracking[$f]) && is_string($parentTracking[$f])) {
                        $trackOut[$f] = $parentTracking[$f];
                    }
                }
            }
        } catch (Throwable $e) {}
    }
    if ($trackOut) $body['tracking'] = $trackOut;

    $body['product'] = [
        'id'   => $skuData['id'],
        'name' => $skuData['name'],
    ];

    // Telefone: prioridade (1) body do request, (2) payer do request, (3) phone do parent.
    $phone = preg_replace('/\D+/', '', (string) ($input['phone'] ?? ''));
    if (!$phone && !empty($payerOut['phone'])) {
        $phone = preg_replace('/\D+/', '', $payerOut['phone']);
    }
    if (!$phone && $parentId) {
        try {
            $storage = $storage ?? new PaymentStorage();
            $local   = $local   ?? $storage->load($parentId);
            $parentCreated = $local['created'] ?? [];
            $parentPhoneRaw = $parentCreated['phone'] ?? ($parentCreated['payer']['phone'] ?? '');
            $phone = preg_replace('/\D+/', '', (string) $parentPhoneRaw);
            // Remover indicativo se vier junto (ex: 351912345678 -> 912345678)
            if (strlen($phone) > 9 && str_starts_with($phone, '351')) {
                $phone = substr($phone, 3);
            }
        } catch (Throwable $e) {}
    }
    if (!$phone || strlen($phone) < 9) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_phone', 'message' => 'Número MB WAY inválido']);
        exit;
    }
    $body['country_code'] = (string) ($input['country_code'] ?? '351');
    $body['phone']        = $phone;

    $client = new AlfaiaboemiaClient();
    $result = $client->createPayment($body);

    if ($result['status'] >= 400) {
        http_response_code($result['status']);
        echo json_encode([
            'error'   => 'gateway_error',
            'status'  => $result['status'],
            'gateway' => $result['body'],
        ]);
        exit;
    }

    // Guardar no storage.
    $data = $result['body']['data'] ?? null;
    if (is_array($data) && !empty($data['id'])) {
        try {
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
                ?? $_SERVER['HTTP_X_FORWARDED_FOR']
                ?? $_SERVER['REMOTE_ADDR']
                ?? null;
            if ($ip && strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }
            $userContext = [
                'ip'         => $ip,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'fbp'        => $input['fbp'] ?? ($_COOKIE['_fbp'] ?? null),
                'fbc'        => $input['fbc'] ?? ($_COOKIE['_fbc'] ?? null),
                'source_url' => $_SERVER['HTTP_REFERER'] ?? null,
            ];

            $storage = $storage ?? new PaymentStorage();
            $storage->save($data['id'], [
                'id'           => $data['id'],
                'status'       => $data['status'] ?? 'pending',
                'sku'          => $sku,
                'parent_id'    => $parentId ?: null,
                'created'      => array_merge($data, ['tracking' => $trackOut, 'phone' => $phone]),
                'user_context' => $userContext,
                'events'       => [],
            ]);
        } catch (Throwable $e) {
            error_log('storage save failed: ' . $e->getMessage());
        }

        // UTMify — notifica pedido com status "waiting_payment".
        try {
            $utmify = new UtmifyClient();
            if ($utmify->isConfigured()) {
                $customer = [
                    'name'     => $payerOut['name']  ?? ('Cliente ' . substr($phone, 0, 3) . '***'),
                    'email'    => $payerOut['email'] ?? '',
                    'phone'    => '+' . ($body['country_code'] ?? '351') . $phone,
                    'document' => $payerOut['document'] ?? null,
                    'ip'       => $userContext['ip'] ?? null,
                ];
                $r = $utmify->sendOrder([
                    'orderId'      => (string) $data['id'],
                    'status'       => 'waiting_payment',
                    'priceInCents' => (int) round($amount * 100),
                    'productId'    => $skuData['id'],
                    'productName'  => $skuData['name'],
                    'customer'     => $customer,
                    'tracking'     => $trackOut,
                ]);
                error_log('UTMify waiting_payment status=' . $r['status'] . ' body=' . substr($r['raw'], 0, 300));
            }
        } catch (Throwable $e) {
            error_log('UTMify create failed: ' . $e->getMessage());
        }
    }

    http_response_code(201);
    echo json_encode($result['body']);
} catch (Throwable $e) {
    error_log('create-payment error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'internal_error']);
}
