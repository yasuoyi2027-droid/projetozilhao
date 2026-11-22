<?php
// Cliente UTMify (api.utmify.com.br).
// Envia ORDEM ao criar pagamento (waiting_payment) e ao confirmar (paid)
// para que o painel UTMify mostre vendas pendentes e convertidas.

declare(strict_types=1);

require_once __DIR__ . '/config.php';

final class UtmifyClient
{
    private string $token;

    public function __construct()
    {
        Config::load();
        $this->token = Config::get('UTMIFY_API_TOKEN', '') ?: '';
    }

    public function isConfigured(): bool
    {
        return $this->token !== '';
    }

    /**
     * Envia uma ordem para a UTMify.
     *
     * @param array{
     *   orderId: string,
     *   status: 'waiting_payment'|'paid'|'refunded',
     *   priceInCents: int,
     *   productId: string,
     *   productName: string,
     *   customer: array{name?:string,email?:string,phone?:string,document?:?string,ip?:?string},
     *   tracking: array<string,string>,
     *   createdAt?: string,
     *   approvedAt?: ?string
     * } $order
     * @return array{status:int, body:array<string,mixed>|null, raw:string}
     */
    public function sendOrder(array $order): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 0, 'body' => ['skipped' => 'not_configured'], 'raw' => ''];
        }

        $createdAt  = $order['createdAt']  ?? gmdate('Y-m-d H:i:s');
        $approvedAt = $order['approvedAt'] ?? null;
        $price      = (int) ($order['priceInCents'] ?? 0);
        $tracking   = $order['tracking'] ?? [];
        $customer   = $order['customer'] ?? [];

        $payload = [
            'orderId'       => (string) $order['orderId'],
            'platform'      => 'AlfaiaBoemia',
            'currency'      => 'EUR',
            'paymentMethod' => 'pix', // UTMify requer um dos: pix/credit_card/boleto. MBWay nao mapeia; 'pix' eh o mais proximo.
            'status'        => (string) $order['status'],
            'createdAt'     => $createdAt,
            'approvedDate'  => $order['status'] === 'paid' ? ($approvedAt ?: gmdate('Y-m-d H:i:s')) : null,
            'refundedAt'    => $order['status'] === 'refunded' ? gmdate('Y-m-d H:i:s') : null,
            'customer' => [
                'name'     => $customer['name']     ?? 'Cliente MB WAY',
                'email'    => $customer['email']    ?? '',
                'phone'    => $customer['phone']    ?? '',
                'document' => $customer['document'] ?? null,
                'country'  => 'PT',
                'ip'       => $customer['ip']       ?: '0.0.0.0',
            ],
            'products' => [[
                'id'        => (string) ($order['productId']   ?? 'ghostspy-vip'),
                'name'      => (string) ($order['productName'] ?? 'GhostSpy VIP'),
                'planId'    => null,
                'planName'  => null,
                'quantity'  => 1,
                'priceInCents' => $price,
                'currency'  => 'EUR',
            ]],
            'trackingParameters' => [
                'src'          => $tracking['src']          ?? null,
                'sck'          => $tracking['sck']          ?? null,
                'utm_source'   => $tracking['utm_source']   ?? null,
                'utm_campaign' => $tracking['utm_campaign'] ?? null,
                'utm_medium'   => $tracking['utm_medium']   ?? null,
                'utm_content'  => $tracking['utm_content']  ?? null,
                'utm_term'     => $tracking['utm_term']     ?? null,
            ],
            'commission' => [
                'totalPriceInCents'    => $price,
                'gatewayFeeInCents'    => 0,
                'userCommissionInCents'=> $price,
                'currency'             => 'EUR',
            ],
            'isTest' => false,
        ];

        $ch = curl_init('https://api.utmify.com.br/api-credentials/orders');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-token: ' . $this->token,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT    => 8,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        // DEBUG: salva payload e resposta
        @file_put_contents(
            '/var/www/ghostspy-pt-storage/debug/utmify-' . date('Ymd-His') . '-' . ((int) round(microtime(true)*1000)%1000) . '.log',
            'PAYLOAD: ' . json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT) . PHP_EOL
        );
        $raw = curl_exec($ch);
        if ($raw === false) {
            $err = curl_error($ch);
            curl_close($ch);
            return ['status' => 0, 'body' => ['error' => 'curl_error', 'detail' => $err], 'raw' => ''];
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        $decoded = json_decode((string) $raw, true);
        return ['status' => $status, 'body' => is_array($decoded) ? $decoded : null, 'raw' => (string) $raw];
    }
}
