<?php
/**
 * api/config.php — environment configuration.
 *
 * Loads settings from a `.env` file at the repo root (simple KEY=VALUE
 * parser: ignores blank lines and lines starting with `#`, strips matching
 * single/double quotes around values) and falls back to real environment
 * variables when `.env` is missing or a key is absent. Never fails hard
 * when `.env` is missing — the site must still boot from real env vars
 * (e.g. Hostinger's PHP environment).
 *
 * No secrets live in this file or anywhere in code. `.env` itself is
 * git-ignored (see `.gitignore`); `.env.example` documents the keys.
 *
 * Usage: config('DB_HOST', '127.0.0.1')
 *
 * Keys:
 *   DB_HOST        default '127.0.0.1'
 *   DB_PORT        default 3306
 *   DB_NAME        (no default — DB connection fails clearly without it)
 *   DB_USER        (no default)
 *   DB_PASSWORD    (no default)
 *   SESSION_SECRET required in production (see config() below)
 *   APP_ENV        default 'production'
 *   APP_URL        (no default)
 */

declare(strict_types=1);

/**
 * Parse the repo-root .env file once and cache the result.
 *
 * @return array<string,string>
 */
function load_dotenv(): array
{
    static $env = null;
    if ($env !== null) {
        return $env;
    }
    $env = [];
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    if (!is_readable($path)) {
        return $env;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return $env;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        // Allow an optional leading "export ".
        if (str_starts_with($line, 'export ')) {
            $line = trim(substr($line, 7));
        }
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }
        $key = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));
        // Strip one pair of matching quotes.
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }
        if ($key !== '') {
            $env[$key] = $value;
        }
    }
    return $env;
}

/**
 * Read one configuration value.
 *
 * Precedence: .env file, then the real process environment
 * (getenv / $_SERVER / $_ENV), then $default.
 *
 * SESSION_SECRET is required when APP_ENV=production: requesting it
 * with no value set throws a RuntimeException with a clear message
 * (caught by the front controller's global handler and logged, never
 * shown to the client). In non-production environments an empty
 * SESSION_SECRET is allowed so local development can boot without one.
 *
 * @param string $key     Config key, e.g. 'DB_HOST'.
 * @param mixed  $default Value returned when the key is unset.
 * @return mixed
 */
function config(string $key, $default = null)
{
    $env = load_dotenv();
    if (array_key_exists($key, $env)) {
        $value = $env[$key];
    } else {
        $value = getenv($key);
        if ($value === false) {
            $value = $_SERVER[$key] ?? $_ENV[$key] ?? null;
        }
    }
    if ($value === null || $value === '') {
        if ($key === 'SESSION_SECRET') {
            $appEnv = strtolower((string) (config('APP_ENV', 'production') ?? 'production'));
            if ($appEnv === 'production') {
                throw new RuntimeException(
                    'SESSION_SECRET is not set. Add SESSION_SECRET to .env (or the server environment) before running in production.'
                );
            }
        }
        return $default;
    }
    return $value;
}
