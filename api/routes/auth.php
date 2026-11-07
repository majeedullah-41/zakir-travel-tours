<?php
/**
 * api/routes/auth.php — login / logout / me.
 *
 * Receives $params and $route from the front controller (api/index.php)
 * and switches on $_SERVER['REQUEST_METHOD']. Any method not listed for
 * the matched route answers 405 json_error('method_not_allowed').
 *
 * Endpoints:
 *   POST /api/auth/login  {email, password} → {user}
 *   POST /api/auth/logout → {ok:true}
 *   GET  /api/auth/me     → {user} (401 when logged out)
 *
 * Login failures always return the same generic message, whether the
 * email is unknown, the account is inactive, or the password is wrong.
 * Failed attempts are rate-limited: max 5 per IP per 15 minutes
 * (rate_limits table, key "login:<ip>"); over the limit → 429.
 * Passwords are verified with password_verify() against the bcrypt
 * hash in admin_users.password_hash. Passwords are never logged.
 */

declare(strict_types=1);

/** Login rate limit: max failures per IP per window. */
const LOGIN_RATE_LIMIT_MAX = 5;
/** Login rate limit window in seconds (15 minutes). */
const LOGIN_RATE_LIMIT_WINDOW = 900;

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

switch ($route ?? '') {
    case 'auth/login':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        auth_login();
        break;

    case 'auth/logout':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        auth_logout();
        break;

    case 'auth/me':
        if ($method !== 'GET') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts GET requests.');
        }
        auth_me();
        break;

    default:
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
}

/**
 * POST /api/auth/login
 */
function auth_login(): void
{
    $body = read_json_body();
    $email = strtolower(clean_str($body['email'] ?? '', 255));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        json_error(400, 'invalid_request', 'Email and password are required.');
    }

    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $rateKey = 'login:' . $ip;

    if (!rate_limit_check($rateKey, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW)) {
        json_error(429, 'too_many_requests', 'Too many login attempts. Please try again later.');
    }

    // One generic message for every failure — never reveal whether the
    // email exists, the account is inactive, or the password was wrong.
    $genericFailure = static function () use ($rateKey): void {
        rate_limit_hit($rateKey, LOGIN_RATE_LIMIT_WINDOW);
        json_error(401, 'invalid_credentials', 'Email or password is incorrect.');
    };

    try {
        $stmt = db()->prepare(
            'SELECT id, email, password_hash, role, is_active FROM admin_users WHERE email = :email LIMIT 1'
        );
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        error_log('Login lookup failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    if ($row === false || (int) $row['is_active'] !== 1) {
        $genericFailure();
    }
    if (!password_verify($password, (string) $row['password_hash'])) {
        $genericFailure();
    }

    $user = login_session([
        'id' => $row['id'],
        'email' => $row['email'],
        'displayName' => $row['email'],
        'role' => $row['role'],
    ]);

    try {
        $update = db()->prepare(
            'UPDATE admin_users SET last_login_at = NOW() WHERE id = :id'
        );
        $update->execute([':id' => $row['id']]);
    } catch (Throwable $e) {
        // Login already succeeded; a stale last_login_at is not fatal.
        error_log('Login last_login_at update failed: ' . $e->getMessage());
    }

    json_ok(['user' => $user]);
}

/**
 * POST /api/auth/logout
 */
function auth_logout(): void
{
    logout_session();
    json_ok(['ok' => true]);
}

/**
 * GET /api/auth/me
 */
function auth_me(): void
{
    $user = require_auth();
    json_ok(['user' => $user]);
}
