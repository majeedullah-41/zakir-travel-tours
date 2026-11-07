<?php
/**
 * api/index.php — front controller + router for the Zakir Travel & Tours API.
 *
 * =============================================================================
 * ROUTING CONVENTION (for every route-file author — read this first)
 * =============================================================================
 * - This file is the ONLY entry point. The web server rewrites every
 *   /api/* request here (on Hostinger this is a .htaccess rule; locally
 *   any request whose path starts with /api/ or api/ works, and hosts
 *   without URL rewriting can use /api/index.php?route=auth/login).
 * - A route is [METHOD, PATTERN, FILE]. PATTERN is the path after the
 *   leading "api/" with `{name}` placeholders for URL params, e.g.
 *   'admin/admins/{id}/reset-password'. METHOD may be '*' (any method —
 *   the route file then dispatches on $_SERVER['REQUEST_METHOD'] itself
 *   and returns 405 for methods it does not support).
 * - The router sets two variables before requiring the route file:
 *     $params — associative array of URL params, e.g. ['id' => '12']
 *     $route  — the matched pattern string, e.g. 'auth/login'
 *   Route files receive $params and $route, use $_SERVER['REQUEST_METHOD']
 *   to switch on method, and answer with json_ok() / json_error() from
 *   api/helpers.php (both exit, so nothing after the call runs).
 * - config.php, db.php, helpers.php and auth.php are already loaded here;
 *   route files must NOT require them again (require_once guards exist,
 *   but keep route files focused on their endpoints).
 * - Unknown path → 404 json_error('not_found'). A path that matches a
 *   pattern but not the method → the route file is still required and is
 *   responsible for the 405 json_error('method_not_allowed').
 * - Every response is JSON with the fixed envelope
 *   {"ok":true,"data":...} / {"ok":false,"error":{"code":...,"message":...}}
 *   and the security headers set below. Never echo anything else.
 * =============================================================================
 *
 * Route files by owner (see the coordinator spec for the endpoint table):
 *   api/routes/auth.php        — Agent B: login / logout / me
 *   api/routes/admin_users.php — Agent B: owner-only admin management
 *   api/routes/public.php      — Agent C: public reads (config, deals, ...)
 *   api/routes/enquiries.php   — Agent C: public POST /api/enquiries
 *   api/routes/content.php     — Agent C: admin content, config, enquiries
 *   api/routes/uploads.php     — Agent C: POST /api/uploads
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/auth.php';

// --- Security headers (every response) ------------------------------------
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: no-referrer-when-downgrade');
header('Content-Type: application/json');

// --- Route table: [METHOD, PATTERN, FILE] ---------------------------------
// PATTERN is matched against the request path with the leading "api/"
// stripped. '{name}' matches one path segment and lands in $params.
$routes = [
    // Auth (Agent B)
    ['POST', 'auth/login', 'routes/auth.php'],
    ['POST', 'auth/logout', 'routes/auth.php'],
    ['GET', 'auth/me', 'routes/auth.php'],

    // Admin users — owner only (Agent B)
    ['GET', 'admin/admins', 'routes/admin_users.php'],
    ['POST', 'admin/admins', 'routes/admin_users.php'],
    ['PUT', 'admin/admins/sync', 'routes/admin_users.php'],
    ['DELETE', 'admin/admins/{id}', 'routes/admin_users.php'],
    ['POST', 'admin/admins/{id}/reset-password', 'routes/admin_users.php'],

    // Public reads (Agent C)
    ['GET', 'config', 'routes/public.php'],
    ['GET', 'deals', 'routes/public.php'],
    ['GET', 'umrah-packages', 'routes/public.php'],
    ['GET', 'visas', 'routes/public.php'],
    ['GET', 'work-permits', 'routes/public.php'],
    ['GET', 'programmes', 'routes/public.php'],

    // Public enquiry write (Agent C)
    ['POST', 'enquiries', 'routes/enquiries.php'],

    // Admin content (Agent C) — '*' lets content.php dispatch on method
    // (GET/POST/PUT/DELETE per resource, reorder/duplicate, config,
    // quick-update, reset-defaults, admin enquiries list/patch/delete).
    ['*', 'admin/config', 'routes/content.php'],
    ['*', 'admin/quick-update', 'routes/content.php'],
    ['*', 'admin/reset-defaults', 'routes/content.php'],
    ['*', 'admin/enquiries', 'routes/content.php'],
    ['*', 'admin/enquiries/{id}', 'routes/content.php'],
    ['*', 'admin/{res}', 'routes/content.php'],
    ['*', 'admin/{res}/{id}', 'routes/content.php'],
    ['*', 'admin/{res}/{id}/reorder', 'routes/content.php'],
    ['*', 'admin/{res}/{id}/duplicate', 'routes/content.php'],

    // Uploads (Agent C)
    ['POST', 'uploads', 'routes/uploads.php'],
];

// --- Resolve the request path ---------------------------------------------
// Accept /api/auth/login, api/auth/login, and the ?route= fallback
// (e.g. /api/index.php?route=auth/login) for hosts without rewriting.
$requestPath = '';
if (!empty($_GET['route'])) {
    $requestPath = (string) $_GET['route'];
} else {
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    $requestPath = parse_url($uri, PHP_URL_PATH) ?? '/';
}
$requestPath = trim($requestPath, '/');
if (str_starts_with($requestPath, 'api/')) {
    $requestPath = substr($requestPath, 4);
}
$requestPath = trim($requestPath, '/');

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// --- Match -----------------------------------------------------------------
/**
 * Match a route pattern against the request path.
 * Returns the extracted params array, or null when it does not match.
 */
function match_route(string $pattern, string $path): ?array
{
    $patternParts = $pattern === '' ? [] : explode('/', $pattern);
    $pathParts = $path === '' ? [] : explode('/', $path);
    if (count($patternParts) !== count($pathParts)) {
        return null;
    }
    $params = [];
    foreach ($patternParts as $i => $part) {
        if (strlen($part) > 2 && $part[0] === '{' && substr($part, -1) === '}') {
            $params[substr($part, 1, -1)] = urldecode($pathParts[$i]);
        } elseif ($part !== $pathParts[$i]) {
            return null;
        }
    }
    return $params;
}

try {
    $matchedFile = null;
    $matchedRoute = null;
    $params = [];
    $pathMatched = false;

    foreach ($routes as [$routeMethod, $pattern, $file]) {
        $found = match_route($pattern, $requestPath);
        if ($found === null) {
            continue;
        }
        $pathMatched = true;
        if ($routeMethod === '*' || $routeMethod === $method) {
            $matchedFile = $file;
            $matchedRoute = $pattern;
            $params = $found;
            break;
        }
        // Path matches but method does not: remember the first such file
        // so it can answer 405 itself; keep looking for an exact match.
        if ($matchedFile === null) {
            $matchedFile = $file;
            $matchedRoute = $pattern;
            $params = $found;
        }
    }

    if ($matchedFile === null) {
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
    }

    $route = $matchedRoute;
    $routeFile = __DIR__ . '/' . $matchedFile;
    if (!is_file($routeFile)) {
        // A route file that does not exist yet (parallel build in progress):
        // log it and report 404 rather than a PHP fatal.
        error_log('API route file missing: ' . $matchedFile . ' (route: ' . $matchedRoute . ')');
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
    }

    require $routeFile;
} catch (Throwable $e) {
    // Global safety net: log the real error, never expose it.
    // (json_ok/json_error exit via exit, so they never land here.)
    error_log('API error [' . $method . ' /' . $requestPath . ']: ' . $e->getMessage());
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    json_error(500, 'internal_error', 'Something went wrong. Please try again.');
}
