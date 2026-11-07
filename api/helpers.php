<?php
/**
 * api/helpers.php — shared helpers for every API route file.
 *
 * Exports exactly these functions (other route files depend on them):
 *   json_ok($data, $code = 200)
 *   json_error($httpCode, $code, $message)
 *   read_json_body($maxBytes = 2097152)
 *   rate_limit_check($key, $max, $windowSeconds)
 *   rate_limit_hit($key, $windowSeconds)
 *   clean_str($v, $max)
 *   is_valid_email($email)
 *
 * json_ok / json_error send the response and exit — call them and stop;
 * no code after the call runs.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Send a success response in the fixed envelope and exit.
 *   {"ok":true,"data":<payload>}
 */
function json_ok($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send an error response in the fixed envelope and exit.
 *   {"ok":false,"error":{"code":...,"message":...}}
 *
 * Never pass SQL, stack traces, file paths or exception details as
 * $message — keep messages generic and human-readable. Log the real
 * error with error_log() at the call site instead.
 */
function json_error(int $httpCode, string $code, string $message): void
{
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode(
        ['ok' => false, 'error' => ['code' => $code, 'message' => $message]],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

/**
 * Read and decode the JSON request body.
 *
 * Enforces the $maxBytes limit (default 2 MB, the API-wide body limit)
 * and sends a 400 error on oversize or malformed JSON. An empty body
 * returns an empty array. Always returns an associative array.
 *
 * @return array<string,mixed>
 */
function read_json_body(int $maxBytes = 2097152): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > $maxBytes) {
        json_error(400, 'body_too_large', 'Request body is too large.');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    if (strlen($raw) > $maxBytes) {
        json_error(400, 'body_too_large', 'Request body is too large.');
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        json_error(400, 'invalid_json', 'Request body is not valid JSON.');
    }
    return $data;
}

/**
 * Current rate-limit window start for a key, as 'Y-m-d H:i:s'.
 */
function rate_limit_window_start(int $windowSeconds): string
{
    $start = (int) floor(time() / $windowSeconds) * $windowSeconds;
    return gmdate('Y-m-d H:i:s', $start);
}

/**
 * Check whether $key is still within its rate limit.
 *
 * Uses the `rate_limits` table (rate_key PK, window_start DATETIME,
 * count INT). Returns true when the request is allowed, false when the
 * key has already used $max hits in the current window. Does not
 * create or increment anything — call rate_limit_hit() to record a hit.
 * A missing row, or a row from an older window, counts as allowed.
 */
function rate_limit_check(string $key, int $max, int $windowSeconds): bool
{
    $windowStart = rate_limit_window_start($windowSeconds);
    $stmt = db()->prepare(
        'SELECT `count`, window_start FROM rate_limits WHERE rate_key = :k LIMIT 1'
    );
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch();
    if ($row === false) {
        return true;
    }
    if ((string) $row['window_start'] < $windowStart) {
        return true;
    }
    return (int) $row['count'] < $max;
}

/**
 * Record one hit for $key in the current window.
 *
 * Creates the window row when missing; when the stored window is older
 * than the current one the counter resets to 1 for the new window.
 * Safe under concurrency (single upsert keyed on rate_key).
 */
function rate_limit_hit(string $key, int $windowSeconds): void
{
    $windowStart = rate_limit_window_start($windowSeconds);
    $stmt = db()->prepare(
        'INSERT INTO rate_limits (rate_key, window_start, `count`) VALUES (:k, :ws, 1) ' .
        'ON DUPLICATE KEY UPDATE ' .
        '`count` = IF(window_start = VALUES(window_start), `count` + 1, 1), ' .
        'window_start = VALUES(window_start)'
    );
    $stmt->execute([':k' => $key, ':ws' => $windowStart]);
}

/**
 * Trim a value and slice it to at most $max multibyte characters.
 * Non-string input is cast to string first.
 */
function clean_str($v, int $max): string
{
    $s = trim((string) $v);
    if ($max <= 0) {
        return '';
    }
    return mb_substr($s, 0, $max, 'UTF-8');
}

/**
 * Validate an email address (format + sane length).
 */
function is_valid_email($email): bool
{
    $email = trim((string) $email);
    if ($email === '' || strlen($email) > 255) {
        return false;
    }
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}
