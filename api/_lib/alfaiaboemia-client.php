<?php
// HTTP client para a API CHECKOUT ALFAIABOEMIA (EuronPay).
// Base URL, client_id e client_secret vêm do Config (.env).

declare(strict_types=1);

require_once __DIR__ . '/config.php';

final class AlfaiaboemiaClient
{
    private string $baseUrl;
    private string $clientId;
    private string $clientSecret;

    public function __construct()
    {
        Config::load();
        $this->baseUrl = rtrim(Config::require('ALFAIABOEMIA_BASE_URL'), '/');
        $this->clientId = Config::require('ALFAIABOEMIA_CLIENT_ID');
        $this->clientSecret = Config::require('ALFAIABOEMIA_CLIENT_SECRET');
    }

    /**
     * @param array<string,mixed> $body
     * @return array{status:int, body:array<string,mixed>, raw:string}
     */
    public function createPayment(array $body): array
    {
        return $this->request('POST', '/payments', $body);
    }

    /**
     * @return array{status:int, body:array<string,mixed>, raw:string}
     */
    public function getPayment(string $paymentId): array
    {
        // UUID simples — aceitar formato canónico.
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $paymentId)) {
            throw new InvalidArgumentException('Invalid payment id');
        }
        return $this->request('GET', '/payments/' . $paymentId);
    }

    public function clientSecret(): string
    {
        return $this->clientSecret;
    }

    /**
     * @param array<string,mixed>|null $body
     * @return array{status:int, body:array<string,mixed>, raw:string}
     */
    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);
        $headers = [
            'X-Client-Id: ' . $this->clientId,
            'X-Client-Secret: ' . $this->clientSecret,
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'GhostSpyPT/1.0',
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        }

        $raw = curl_exec($ch);
        if ($raw === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException('curl error: ' . $err);
        }
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) $decoded = ['_raw' => $raw];

        return ['status' => $status, 'body' => $decoded, 'raw' => (string) $raw];
    }
}
