<?php
// Loader de .env simples (sem dependências externas).
// Lê o .env na raiz do projeto (dois níveis acima: api/_lib/ -> api -> raiz).

declare(strict_types=1);

final class Config
{
    /** @var array<string,string> */
    private static array $env = [];
    private static bool $loaded = false;

    public static function load(?string $path = null): void
    {
        if (self::$loaded) return;
        $path = $path ?? dirname(__DIR__, 2) . '/.env';
        if (!is_file($path)) {
            throw new RuntimeException('Missing .env at ' . $path);
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $trim = ltrim($line);
            if ($trim === '' || $trim[0] === '#') continue;
            if (!str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v);
            // Remover aspas opcionais
            if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && $v[0] === $v[strlen($v) - 1]) {
                $v = substr($v, 1, -1);
            }
            self::$env[$k] = $v;
        }
        self::$loaded = true;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        if (!self::$loaded) self::load();
        return self::$env[$key] ?? $default;
    }

    public static function require(string $key): string
    {
        $v = self::get($key);
        if ($v === null || $v === '') {
            throw new RuntimeException('Missing required config: ' . $key);
        }
        return $v;
    }
}
