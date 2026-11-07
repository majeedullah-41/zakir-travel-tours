<?php
/**
 * api/db.php — shared PDO connection.
 *
 * db() returns a single shared PDO instance for the request, configured
 * for MySQL with utf8mb4, exceptions on error, associative-array fetches
 * and real (non-emulated) prepared statements.
 *
 * All SQL anywhere in the API must use prepared statements with bound
 * parameters — never interpolate variables into SQL strings.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

/**
 * Get the shared PDO connection, creating it on first use.
 *
 * @return PDO
 * @throws PDOException when the connection cannot be established.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = (string) config('DB_HOST', '127.0.0.1');
    $port = (int) config('DB_PORT', 3306);
    $name = (string) config('DB_NAME', '');
    $user = (string) config('DB_USER', '');
    $pass = (string) config('DB_PASSWORD', '');

    if ($name === '' || $user === '') {
        throw new RuntimeException(
            'Database is not configured. Set DB_NAME and DB_USER in .env (or the server environment).'
        );
    }

    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
