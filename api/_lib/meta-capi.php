<?php
// Meta Conversions API client (server-side).
// Doc: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// Enviar eventos de conversão diretamente para o Meta (Purchase, etc.) por servidor.
// Isto complementa o fbq do frontend — ambos podem disparar o mesmo evento, desde que
// partilhem `event_id` para o Meta fazer deduplicação. Sem deduplicação, o pixel conta 2x.

declare(strict_types=1);

require_once __DIR__ . '/config.php';

final class MetaCapi
{
    private const API_VERSION = 'v21.0';

    private string $pixelId;
    private string $accessToken;
    private ?string $testEventCode;

    public function __construct()
    {
        Config::load();
        $this->pixelId = Config::get('META_PIXEL_ID', '') ?: '';
        $this->accessToken = Config::get('META_CAPI_ACCESS_TOKEN', '') ?: '';
        $tec = Config::get('META_TEST_EVENT_CODE', '') ?: '';
        $this->testEventCode = $tec !== '' ? $tec : null;
    }

    public function isConfigured(): bool
    {
        return $this->pixelId !== '' && $this->accessToken !== '';
    }

    /**
     * Enviar um ou mais eventos.
     *
     * @param array<int,array<string,mixed>> $events
     * @return array{status:int, body:array<string,mixed>|null, raw:string}
     */
    public function send(array $events): array
    {
        if (!$this->isConfigured()) {
            return ['status' => 0, 'body' => ['skipped' => 'not_configured'], 'raw' => ''];
        }

        $payload = ['data' => $events];
        if ($this->testEventCode !== null) {
            $payload['test_event_code'] = $this->testEventCode;
        }

        $url = sprintf(
            'https://graph.facebook.com/%s/%s/events?access_token=%s',
            self::API_VERSION,
            urlencode($this->pixelId),
            urlencode($this->accessToken)
        );

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        // DEBUG-CAPI
        @file_put_contents(
            '/var/www/ghostspy-pt-storage/debug/capi-' . date('Ymd-His') . '-' . ((int) round(microtime(true)*1000)%1000) . '.log',
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

    /**
     * Normaliza email/phone (lowercase, trim, só dígitos no phone) e aplica SHA256.
     */
    public static function hash(string $kind, string $value): string
    {
        $value = trim($value);
        if ($kind === 'em') {
            $value = strtolower($value);
        } elseif ($kind === 'ph') {
            // Phone: só dígitos, com country code — não mete '+'.
            $value = preg_replace('/\D+/', '', $value) ?? '';
        } else {
            $value = strtolower($value);
        }
        return hash('sha256', $value);
    }

    /**
     * Construtor conveniente de um evento Purchase (payment.paid).
     *
     * @param array<string,string> $tracking Lida com utm_* vindos do create.
     */
    public static function buildPurchase(
        string $eventId,
        float $value,
        string $currency,
        ?string $email,
        ?string $phone,
        ?string $clientIp,
        ?string $userAgent,
        ?string $fbp,
        ?string $fbc,
        ?string $sourceUrl,
        ?string $productName,
        array $tracking = []
    ): array {
        $userData = array_filter([
            'em' => $email ? [self::hash('em', $email)] : null,
            'ph' => $phone ? [self::hash('ph', $phone)] : null,
            'client_ip_address' => $clientIp ?: null,
            'client_user_agent' => $userAgent ?: null,
            'fbp' => $fbp ?: null,
            'fbc' => $fbc ?: null,
        ], static fn($v) => $v !== null);

        $customData = array_filter([
            'value' => number_format($value, 2, '.', ''),
            'currency' => $currency,
            'content_name' => $productName,
            'content_type' => 'product',
            'content_ids' => [$productName ?? 'ghostspy-vip'],
        ], static fn($v) => $v !== null && $v !== '');

        $event = [
            'event_name' => 'Purchase',
            'event_time' => time(),
            'event_id' => $eventId,
            'action_source' => 'website',
            'event_source_url' => $sourceUrl ?: null,
            'user_data' => $userData,
            'custom_data' => $customData,
        ];

        // Enviar UTMs no custom_data para debug/auditoria (não é padrão do Meta).
        foreach ($tracking as $k => $v) {
            if ($v !== '' && str_starts_with($k, 'utm_')) {
                $event['custom_data'][$k] = $v;
            }
        }

        return array_filter($event, static fn($v) => $v !== null);
    }
}
