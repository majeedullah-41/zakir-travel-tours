<?php
/**
 * api/auth.php — session handling and access guards.
 *
 * PHP native sessions only; no token in LocalStorage. Session cookie:
 * name `zakir_admin`, HttpOnly, SameSite=Lax, Secure when the request
 * is HTTPS, lifetime 8 hours (cookie params + gc_maxlifetime).
 * The session id is regenerated on login (login_session()).
 *
 * The session user array is:
 *   ['id', 'email', 'displayName', 'role', 'loggedInAt']
 * where id is the string admin_users row id and role is 'owner'|'admin'.
 *
 * NOTE on SESSION_SECRET: PHP native sessions are server-side, so no
 * secret is used to sign anything. start_secure_session() still calls
 * config('SESSION_SECRET') so a production deploy without it fails
 * loudly (see config.php) instead of silently running unconfigured.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

/** Session lifetime in seconds (8 hours). */
const ADMIN_SESSION_LIFETIME = 8 * 3600;

/**
 * Start the admin session with hardened cookie settings.
 * Safe to call repeatedly; does nothing when a session is active.
 */
function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    // Fail loudly in production when the environment is not configured.
    config('SESSION_SECRET');

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO'])
            && strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');

    ini_set('session.gc_maxlifetime', (string) ADMIN_SESSION_LIFETIME);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');

    session_name('zakir_admin');
    session_set_cookie_params([
        'lifetime' => ADMIN_SESSION_LIFETIME,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/**
 * Log a user in: regenerate the session id (prevents fixation) and
 * store the session user array.
 *
 * @param array{id:int|string,email:string,displayName?:string,role:string} $user
 * @return array The stored session user array.
 */
function login_session(array $user): array
{
    start_secure_session();
    session_regenerate_id(true);
    $sessionUser = [
        'id' => (string) $user['id'],
        'email' => (string) $user['email'],
        'displayName' => (string) ($user['displayName'] ?? $user['email']),
        'role' => (string) $user['role'],
        'loggedInAt' => gmdate('Y-m-d\TH:i:s\Z'),
    ];
    $_SESSION['user'] = $sessionUser;
    return $sessionUser;
}

/**
 * Log the current user out: clear the session data, destroy the
 * session and expire the cookie.
 */
function logout_session(): void
{
    start_secure_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'] ?? '/',
            $params['domain'] ?? '',
            (bool) ($params['secure'] ?? false),
            (bool) ($params['httponly'] ?? true)
        );
    }
    session_destroy();
}

/**
 * Return the session user array, or null when nobody is logged in.
 */
function current_user(): ?array
{
    start_secure_session();
    $user = $_SESSION['user'] ?? null;
    if (!is_array($user) || empty($user['id']) || empty($user['email']) || empty($user['role'])) {
        return null;
    }
    return [
        'id' => (string) $user['id'],
        'email' => (string) $user['email'],
        'displayName' => (string) ($user['displayName'] ?? $user['email']),
        'role' => (string) $user['role'],
        'loggedInAt' => (string) ($user['loggedInAt'] ?? ''),
    ];
}

/**
 * Require a logged-in session. Sends 401 json_error('unauthenticated')
 * and exits when there is none. Returns the session user otherwise.
 */
function require_auth(): array
{
    $user = current_user();
    if ($user === null) {
        json_error(401, 'unauthenticated', 'Please log in to continue.');
    }
    return $user;
}

/**
 * Require the logged-in user to be the owner. Sends 401 when not
 * logged in and 403 json_error('forbidden') for non-owner admins.
 * Returns the session user otherwise.
 */
function require_owner(): array
{
    $user = require_auth();
    if ($user['role'] !== 'owner') {
        json_error(403, 'forbidden', 'Only the owner can do this.');
    }
    return $user;
}
