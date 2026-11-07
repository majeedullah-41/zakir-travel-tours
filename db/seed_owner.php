<?php
/**
 * Zakir Travel & Tours — one-time owner account seed (CLI ONLY).
 *
 * Creates the FIRST (owner) admin account in the `admin_users` table.
 *
 * Usage (from the project root, after importing db/schema.sql):
 *
 *     OWNER_EMAIL=you@example.com OWNER_PASSWORD='a-strong-password' php db/seed_owner.php
 *
 * Or put OWNER_EMAIL / OWNER_PASSWORD (plus the DB_* settings) in a `.env`
 * file at the project root and run:
 *
 *     php db/seed_owner.php
 *
 * Environment variables take precedence over `.env`.
 *
 * Rules:
 *  - CLI only. If this file is ever reached through a web server it refuses
 *    to run (HTTP 403) — the owner seed must never be web-accessible.
 *  - Validates the email and requires a password of at least 8 characters.
 *  - Refuses if an active owner already exists (run it exactly once).
 *  - Refuses if the email is already registered.
 *  - Stores only a bcrypt hash (password_hash / PASSWORD_DEFAULT). The
 *    password is NEVER printed, logged, or written to any file.
 *  - Exits 0 on success, 1 on any failure, with a clear message on STDERR.
 *
 * SECURITY: delete this file (or move it out of the web root) after the owner
 * account has been created. See api/README.md.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1. CLI only.
// ---------------------------------------------------------------------------
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "Forbidden: db/seed_owner.php is CLI-only. Run it over SSH, never via the web.\n";
    exit(1);
}

fwrite(STDERR, "Zakir Travel & Tours — owner seed\n");

// ---------------------------------------------------------------------------
// 2. Load .env (project root) if present, then let real env vars override it.
//    Minimal parser: KEY=VALUE lines, '#' comments, optional single/double
//    quotes around the value. No variable expansion, no exports.
// ---------------------------------------------------------------------------
function loadDotEnv(string $path): array
{
    $values = [];
    if (!is_readable($path)) {
        return $values;
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        if (strpos($line, 'export ') === 0) {
            $line = trim(substr($line, 7));
        }
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }
        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));
        if (strlen($val) >= 2) {
            $first = $val[0];
            $last = $val[strlen($val) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $val = substr($val, 1, -1);
            }
        }
        $values[$key] = $val;
    }
    return $values;
}

$envFile = loadDotEnv(__DIR__ . '/../.env');

/** Read a setting: real environment first, then .env, then a default. */
function env(string $key, array $envFile, ?string $default = null): ?string
{
    $v = getenv($key);
    if ($v !== false && $v !== '') {
        return $v;
    }
    if (array_key_exists($key, $envFile) && $envFile[$key] !== '') {
        return $envFile[$key];
    }
    return $default;
}

// ---------------------------------------------------------------------------
// 3. Validate the owner credentials.
// ---------------------------------------------------------------------------
$email = env('OWNER_EMAIL', $envFile);
$password = env('OWNER_PASSWORD', $envFile);

if ($email === null || $email === '') {
    fwrite(STDERR, "ERROR: OWNER_EMAIL is not set. Set it in the environment or in .env (see .env.example).\n");
    exit(1);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "ERROR: OWNER_EMAIL '{$email}' is not a valid email address.\n");
    exit(1);
}
if ($password === null || $password === '') {
    fwrite(STDERR, "ERROR: OWNER_PASSWORD is not set. Set it in the environment or in .env (see .env.example).\n");
    exit(1);
}
if (strlen($password) < 8) {
    fwrite(STDERR, "ERROR: OWNER_PASSWORD must be at least 8 characters long.\n");
    exit(1);
}

// ---------------------------------------------------------------------------
// 4. Connect to MySQL (same settings the API uses).
// ---------------------------------------------------------------------------
$dbHost = env('DB_HOST', $envFile, 'localhost');
$dbPort = env('DB_PORT', $envFile, '3306');
$dbName = env('DB_NAME', $envFile);
$dbUser = env('DB_USER', $envFile);
$dbPass = env('DB_PASSWORD', $envFile, '');

if ($dbName === null || $dbName === '' || $dbUser === null || $dbUser === '') {
    fwrite(STDERR, "ERROR: DB_NAME and DB_USER must be set (environment or .env) before seeding.\n");
    exit(1);
}

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "ERROR: could not connect to MySQL ({$dbHost}:{$dbPort}, database '{$dbName}'). Check DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD. (" . $e->getMessage() . ")\n");
    exit(1);
}

// ---------------------------------------------------------------------------
// 5. Refuse if an owner already exists; refuse if the email is taken.
// ---------------------------------------------------------------------------
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users WHERE role = 'owner' AND is_active = 1");
    $ownerCount = (int) $stmt->fetchColumn();
    if ($ownerCount > 0) {
        fwrite(STDERR, "ERROR: an active owner account already exists ({$ownerCount}). This script runs only once — use the Admin Access tab in the admin portal to add further admins.\n");
        exit(1);
    }

    $stmt = $pdo->prepare('SELECT id, role FROM admin_users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($existing !== false) {
        fwrite(STDERR, "ERROR: an account with email '{$email}' already exists (role: {$existing['role']}). Choose a different OWNER_EMAIL.\n");
        exit(1);
    }

    // -----------------------------------------------------------------------
    // 6. Insert the owner. Password is hashed with bcrypt; the plain text is
    //    never printed, logged, or stored anywhere.
    // -----------------------------------------------------------------------
    $hash = password_hash($password, PASSWORD_DEFAULT);
    if ($hash === false) {
        fwrite(STDERR, "ERROR: failed to hash the password.\n");
        exit(1);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO admin_users (email, password_hash, role, is_active) VALUES (?, ?, 'owner', 1)"
    );
    $stmt->execute([$email, $hash]);
    $id = (int) $pdo->lastInsertId();
} catch (PDOException $e) {
    fwrite(STDERR, "ERROR: database operation failed (" . $e->getMessage() . "). Did you import db/schema.sql first?\n");
    exit(1);
}

echo "OK: owner account created.\n";
echo "  id:    {$id}\n";
echo "  email: {$email}\n";
echo "  role:  owner\n";
echo "You can now log in to the admin portal with this email and password.\n";
echo "SECURITY: delete db/seed_owner.php (or move it out of the web root) now — it must not stay on the live server.\n";
exit(0);
