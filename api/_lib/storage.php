<?php
// Armazenamento simples de pagamentos em JSON (um ficheiro por pagamento).
// Seguro: diretório ***FORA*** do document root; nunca servido publicamente.

declare(strict_types=1);

require_once __DIR__ . '/config.php';

final class PaymentStorage
{
    private string $dir;

    public function __construct()
    {
        Config::load();
        $dir = Config::require('STORAGE_DIR');
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        if (!is_writable($dir)) {
            throw new RuntimeException('STORAGE_DIR not writable: ' . $dir);
        }
        $this->dir = rtrim($dir, '/');
    }

    public function save(string $paymentId, array $data): void
    {
        if (!preg_match('/^[0-9a-f-]{32,}$/i', $paymentId)) {
            throw new InvalidArgumentException('Invalid payment id');
        }
        $file = $this->dir . '/' . $paymentId . '.json';
        $tmp = $file . '.tmp';
        file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        rename($tmp, $file);
    }

    public function load(string $paymentId): ?array
    {
        if (!preg_match('/^[0-9a-f-]{32,}$/i', $paymentId)) return null;
        $file = $this->dir . '/' . $paymentId . '.json';
        if (!is_file($file)) return null;
        $json = file_get_contents($file);
        $decoded = json_decode((string) $json, true);
        return is_array($decoded) ? $decoded : null;
    }

    public function appendEvent(string $paymentId, string $event, array $payload): void
    {
        $existing = $this->load($paymentId) ?? ['id' => $paymentId, 'events' => []];
        $existing['events'][] = [
            'event' => $event,
            'at' => gmdate('c'),
            'payload' => $payload,
        ];
        $existing['status'] = $payload['status'] ?? ($existing['status'] ?? null);
        $this->save($paymentId, $existing);
    }
}
