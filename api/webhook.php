<?php
// POST /api/webhook.php
// Recebe eventos payment.paid / payment.expired / payment.refunded da CHECKOUT ALFAIABOEMIA.
//
// Segurança:
//  - Verifica X-Webhook-Signature (HMAC-SHA256 sobre `{timestamp}.{raw_body}` com client_secret)
//  - Rejeita timestamps com mais de 5 minutos
//  - Responde 2xx apenas quando o processamento interno não lança
//  - Idempotente: regravar o mesmo evento é inócuo

declare(strict_types=1);

require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/alfaiaboemia-client.php';
require_once __DIR__ . '/_lib/storage.php';
require_once __DIR__ . '/_lib/meta-capi.php';
require_once __DIR__ . '/_lib/utmify-client.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$rawBody = file_get_contents('php://input') ?: '';
$event = $_SERVER['HTTP_X_WEBHOOK_EVENT'] ?? '';
$timestamp = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

if ($event === '' || $timestamp === '' || $signature === '') {
    http_response_code(400);
    echo json_encode(['error' => 'missing_headers']);
    exit;
}

// Freshness: timestamp em segundos, janela de 5 minutos.
$now = time();
$ts = (int) $timestamp;
if ($ts <= 0 || abs($now - $ts) > 300) {
    http_response_code(400);
    echo json_encode(['error' => 'stale_timestamp']);
    exit;
}

try {
    Config::load();
    $secret = Config::require('ALFAIABOEMIA_CLIENT_SECRET');

    // Signature verification (constant-time).
    $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
    if (!hash_equals($expected, $signature)) {
        error_log('webhook bad signature; event=' . $event);
        http_response_code(401);
        echo json_encode(['error' => 'invalid_signature']);
        exit;
    }

    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_json']);
        exit;
    }

    $data = $payload['data'] ?? [];
    $paymentId = (string) ($data['id'] ?? '');
    if ($paymentId === '') {
        http_response_code(400);
        echo json_encode(['error' => 'missing_payment_id']);
        exit;
    }

    // Guardar o evento (idempotente).
    try {
        $storage = new PaymentStorage();
        $storage->appendEvent($paymentId, $event, $data);
    } catch (Throwable $e) {
        error_log('webhook storage failed: ' . $e->getMessage());
    }

    // Processar por tipo de evento.
    switch ($event) {
        case 'payment.paid':
            onPaymentPaid($data);
            break;
        case 'payment.expired':
            // Opcional: notificar o cliente que o pagamento expirou.
            break;
        case 'payment.refunded':
            // Opcional: revogar acesso se estava concedido.
            break;
        default:
            // Evento desconhecido — ignorar mas responder 2xx para não causar retries.
            break;
    }

    http_response_code(200);
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    error_log('webhook error: ' . $e->getMessage());
    // Devolver 500 faz o gateway tentar outra vez.
    http_response_code(500);
    echo json_encode(['error' => 'internal_error']);
}

/**
 * Entrega do produto + envio de eventos de conversão (Meta CAPI) após pagamento confirmado.
 */
function onPaymentPaid(array $data): void
{
    $payerEmail = $data['payer']['email'] ?? null;
    $payerPhone = $data['payer']['phone'] ?? null;
    $amount = $data['amount'] ?? null;
    $method = $data['method'] ?? null;
    $paymentId = $data['id'] ?? null;

    error_log(sprintf(
        'payment.paid id=%s amount=%s method=%s email=%s',
        $paymentId, $amount, $method, $payerEmail ?? '(no email)'
    ));

    // ---- Meta CAPI: Purchase event -----------------------------------------
    try {
        $capi = new MetaCapi();
        if ($capi->isConfigured() && $paymentId) {
            $storage = new PaymentStorage();
            $local = $storage->load($paymentId) ?? [];
            $created = $local['created'] ?? [];
            $tracking = $created['tracking'] ?? [];
            // user_data vindo do contexto do create (fbp/fbc/ip/ua foram guardados).
            $ctx = $local['user_context'] ?? [];

            // Mapeia SKU -> product name/id para que o Meta CAPI envie o item certo.
            $sku = (string) ($local['sku'] ?? 'core');
            $skuMap = [
                'core'                       => ['id' => 'ghostspy-vip',                'name' => 'GhostSpy Acesso VIP'],
                'core_bump'                  => ['id' => 'ghostspy-vip-multi',          'name' => 'GhostSpy VIP + Multi-Perfil'],
                'core_discount'              => ['id' => 'ghostspy-vip-discount',       'name' => 'GhostSpy VIP (Oferta Especial)'],
                'upsell_blindagem'           => ['id' => 'ghostspy-blindagem',          'name' => 'GhostSpy Blindagem de Confidencialidade'],
                'upsell_blindagem_discount'  => ['id' => 'ghostspy-blindagem-discount', 'name' => 'GhostSpy Blindagem (Ultima Oferta)'],
                'upsell_descoberta'          => ['id' => 'ghostspy-descoberta',         'name' => 'GhostSpy Relatorio de Evento Suspeito'],
                'upsell_descoberta_discount' => ['id' => 'ghostspy-descoberta-discount','name' => 'GhostSpy Evento Suspeito (Ultima Oferta)'],
                'upsell_taxa_seguranca'              => ['id' => 'ghostspy-taxa-seguranca',            'name' => 'GhostSpy Taxa de Confidencialidade'],
                'upsell_taxa_seguranca_discount'     => ['id' => 'ghostspy-taxa-seguranca-discount',   'name' => 'GhostSpy Taxa (Ultima Oferta)'],
                'upsell_alertas_vitalicio'           => ['id' => 'ghostspy-alertas-vitalicio',         'name' => 'GhostSpy Alertas Vitalicios'],
                'upsell_alertas_vitalicio_discount'  => ['id' => 'ghostspy-alertas-vitalicio-discount','name' => 'GhostSpy Alertas Vitalicios (Ultima Oferta)'],
            ];
            $productName = $skuMap[$sku]['name'] ?? Config::get('PRODUCT_NAME', 'GhostSpy VIP');
            $productId   = $skuMap[$sku]['id']   ?? 'ghostspy-vip';

            $event = MetaCapi::buildPurchase(
                $paymentId,
                (float) ($amount ?? 0),
                (string) ($data['currency'] ?? 'EUR'),
                $payerEmail,
                $payerPhone,
                $ctx['ip'] ?? null,
                $ctx['user_agent'] ?? null,
                $ctx['fbp'] ?? null,
                $ctx['fbc'] ?? null,
                $ctx['source_url'] ?? null,
                $productName,
                is_array($tracking) ? $tracking : []
            );
            if (isset($event['custom_data']) && is_array($event['custom_data'])) {
                $event['custom_data']['content_ids']  = [$productId];
                $event['custom_data']['content_name'] = $productName;
                $event['custom_data']['content_type'] = 'product';
            }

            $res = $capi->send([$event]);
            error_log('Meta CAPI Purchase status=' . $res['status'] . ' body=' . substr($res['raw'], 0, 500));
        }
    } catch (Throwable $e) {
        error_log('Meta CAPI failed: ' . $e->getMessage());
    }

    // UTMify — marca o pedido como paid.
    try {
        $utmify = new UtmifyClient();
        if ($utmify->isConfigured() && $paymentId) {
            $storage2 = $storage ?? new PaymentStorage();
            $local2   = $local   ?? ($storage2->load($paymentId) ?? []);
            $created2 = $local2['created']   ?? [];
            $tracking2 = $created2['tracking'] ?? [];
            $ctx2      = $local2['user_context'] ?? [];
            $sku2      = (string) ($local2['sku'] ?? 'core');
            $skuMap2 = [
                'core'                       => ['id' => 'ghostspy-vip',                'name' => 'GhostSpy Acesso VIP'],
                'core_bump'                  => ['id' => 'ghostspy-vip-multi',          'name' => 'GhostSpy VIP + Multi-Perfil'],
                'core_discount'              => ['id' => 'ghostspy-vip-discount',       'name' => 'GhostSpy VIP (Oferta Especial)'],
                'upsell_blindagem'           => ['id' => 'ghostspy-blindagem',          'name' => 'GhostSpy Blindagem de Confidencialidade'],
                'upsell_blindagem_discount'  => ['id' => 'ghostspy-blindagem-discount', 'name' => 'GhostSpy Blindagem (Ultima Oferta)'],
                'upsell_descoberta'          => ['id' => 'ghostspy-descoberta',         'name' => 'GhostSpy Relatorio de Evento Suspeito'],
                'upsell_descoberta_discount' => ['id' => 'ghostspy-descoberta-discount','name' => 'GhostSpy Evento Suspeito (Ultima Oferta)'],
            ];
            $pid2  = $skuMap2[$sku2]['id']   ?? 'ghostspy-vip';
            $pname2 = $skuMap2[$sku2]['name'] ?? 'GhostSpy VIP';

            $createdAt = isset($created2['created_at'])
                ? gmdate('Y-m-d H:i:s', strtotime((string) $created2['created_at']))
                : gmdate('Y-m-d H:i:s');

            $r = $utmify->sendOrder([
                'orderId'      => (string) $paymentId,
                'status'       => 'paid',
                'priceInCents' => (int) round(((float) ($amount ?? 0)) * 100),
                'productId'    => $pid2,
                'productName'  => $pname2,
                'customer'     => [
                    'name'  => $data['payer']['name']  ?? 'Cliente MB WAY',
                    'email' => $data['payer']['email'] ?? '',
                    'phone' => $data['payer']['phone'] ?? '',
                    'ip'    => $ctx2['ip'] ?? null,
                ],
                'tracking'   => is_array($tracking2) ? $tracking2 : [],
                'createdAt'  => $createdAt,
                'approvedAt' => gmdate('Y-m-d H:i:s'),
            ]);
            error_log('UTMify paid status=' . $r['status'] . ' body=' . substr($r['raw'], 0, 300));
        }
    } catch (Throwable $e) {
        error_log('UTMify paid failed: ' . $e->getMessage());
    }

    // ---- Entrega do acesso VIP (TODO: email com link mágico) ---------------
    // if ($payerEmail) {
    //     $accessLink = Config::require('SITE_URL') . '/membros/?token=' . bin2hex(random_bytes(16));
    //     mail($payerEmail, 'O seu acesso VIP GhostSpy', "Aceda aqui: $accessLink",
    //         "From: noreply@ghostspy.site");
    // }
}
