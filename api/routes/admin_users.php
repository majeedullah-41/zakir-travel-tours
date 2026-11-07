<?php
/**
 * api/routes/admin_users.php — owner-only admin account management.
 *
 * Receives $params and $route from the front controller (api/index.php)
 * and switches on $_SERVER['REQUEST_METHOD']. Any method not listed for
 * the matched route answers 405 json_error('method_not_allowed').
 *
 * Every endpoint here calls require_owner() first: 401 when not logged
 * in, 403 json_error('forbidden') for non-owner admins.
 *
 * Endpoints:
 *   GET    /api/admin/admins                 → {emails, updatedAt, updatedBy}
 *   POST   /api/admin/admins                 {email, tempPassword} → {email, uid}
 *   PUT    /api/admin/admins/sync            {emails, ownerEmail} → {synced:true}
 *   DELETE /api/admin/admins/:id             → {synced:true}
 *   POST   /api/admin/admins/:id/reset-password {tempPassword} → {synced:true}
 *
 * Accounts are never DELETE-d from the table: removal means
 * is_active = 0 (login revoked, row kept). The owner row can never be
 * deactivated. Temporary passwords are hashed with password_hash()
 * (bcrypt) and never logged; the owner shares them directly, as today
 * (no email service exists yet).
 *
 * NOTE on updatedBy: the admin_users schema has no updated_by column,
 * so GET returns updatedBy: null. updatedAt comes from the most
 * recently updated active row, or null when no admins exist.
 */

declare(strict_types=1);

require_owner();

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

switch ($route ?? '') {
    case 'admin/admins':
        if ($method === 'GET') {
            admin_list();
        } elseif ($method === 'POST') {
            admin_create();
        } else {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts GET and POST requests.');
        }
        break;

    case 'admin/admins/sync':
        if ($method !== 'PUT') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts PUT requests.');
        }
        admin_sync();
        break;

    case 'admin/admins/{id}':
        if ($method !== 'DELETE') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts DELETE requests.');
        }
        admin_delete((string) ($params['id'] ?? ''));
        break;

    case 'admin/admins/{id}/reset-password':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        admin_reset_password((string) ($params['id'] ?? ''));
        break;

    default:
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
}

/**
 * Load one admin row by its numeric id, or 404.
 *
 * @return array<string,mixed>
 */
function admin_find_or_404(string $id): array
{
    if (!ctype_digit($id)) {
        json_error(404, 'not_found', 'Admin not found.');
    }
    $stmt = db()->prepare(
        'SELECT id, email, role, is_active, created_at, updated_at FROM admin_users WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => (int) $id]);
    $row = $stmt->fetch();
    if ($row === false) {
        json_error(404, 'not_found', 'Admin not found.');
    }
    return $row;
}

/**
 * GET /api/admin/admins
 * Same shape as the Firebase getAdminAllowlist(): active admin emails
 * (owner included), updatedAt/updatedBy from the most recently
 * updated row, or null when there is none.
 */
function admin_list(): void
{
    $stmt = db()->query(
        'SELECT email, updated_at FROM admin_users WHERE is_active = 1 ORDER BY id ASC'
    );
    $rows = $stmt->fetchAll();
    $emails = array_map(static fn ($r) => (string) $r['email'], $rows);

    $updatedAt = null;
    if ($rows !== []) {
        $latest = null;
        foreach ($rows as $row) {
            $ts = (string) ($row['updated_at'] ?? '');
            if ($ts !== '' && ($latest === null || $ts > $latest)) {
                $latest = $ts;
            }
        }
        $updatedAt = $latest;
    }

    json_ok([
        'emails' => $emails,
        'updatedAt' => $updatedAt,
        'updatedBy' => null,
    ]);
}

/**
 * POST /api/admin/admins
 * Creates the sign-in account only — it does NOT touch the allowlist;
 * the caller adds the email via PUT /api/admin/admins/sync next
 * (same two-step flow as createAdminAuthUser + saveAdminAllowlist).
 */
function admin_create(): void
{
    $body = read_json_body();
    $email = strtolower(clean_str($body['email'] ?? '', 255));
    $tempPassword = (string) ($body['tempPassword'] ?? '');

    if (!is_valid_email($email)) {
        json_error(400, 'invalid_email', 'Enter a valid email address.');
    }
    if (strlen($tempPassword) < 8) {
        json_error(400, 'invalid_password', 'Temporary password must be at least 8 characters.');
    }

    $existing = db()->prepare(
        'SELECT id FROM admin_users WHERE email = :email LIMIT 1'
    );
    $existing->execute([':email' => $email]);
    if ($existing->fetch() !== false) {
        json_error(409, 'email_exists', 'An admin with this email already exists.');
    }

    $insert = db()->prepare(
        'INSERT INTO admin_users (email, password_hash, role, is_active) ' .
        'VALUES (:email, :hash, :role, 1)'
    );
    $insert->execute([
        ':email' => $email,
        ':hash' => password_hash($tempPassword, PASSWORD_DEFAULT),
        ':role' => 'admin',
    ]);

    json_ok(
        ['email' => $email, 'uid' => (string) db()->lastInsertId()],
        201
    );
}

/**
 * PUT /api/admin/admins/sync
 * Reconciles admin_users to exactly the given email set: the owner
 * email is forced back in, the set can never become empty, rows not
 * in the set are deactivated (never deleted), rows that return are
 * re-activated, and the owner row is never deactivated. Emails in the
 * set with no account row are left alone — accounts are created by
 * POST /api/admin/admins, never implicitly here.
 */
function admin_sync(): void
{
    $body = read_json_body();
    $ownerEmail = strtolower(clean_str($body['ownerEmail'] ?? '', 255));
    $rawEmails = $body['emails'] ?? null;

    if (!is_valid_email($ownerEmail)) {
        json_error(400, 'invalid_email', 'Enter a valid owner email address.');
    }
    if (!is_array($rawEmails)) {
        json_error(400, 'invalid_request', 'emails must be an array of email addresses.');
    }

    $clean = [];
    foreach ($rawEmails as $e) {
        $email = strtolower(clean_str($e, 255));
        if (is_valid_email($email)) {
            $clean[$email] = true;
        }
    }
    $clean[$ownerEmail] = true;
    $emails = array_keys($clean);
    if ($emails === []) {
        json_error(400, 'admin_list_empty', 'The admin list cannot be empty.');
    }

    $pdo = db();
    try {
        $pdo->beginTransaction();

        // Deactivate rows not in the set — never the owner row, and never
        // any row with role 'owner' (belt and braces: the owner row is
        // identified both by email and by role).
        $placeholders = implode(',', array_fill(0, count($emails), '?'));
        $deactivate = $pdo->prepare(
            'UPDATE admin_users SET is_active = 0, updated_at = NOW() ' .
            'WHERE is_active = 1 AND role <> \'owner\' ' .
            'AND LOWER(email) <> ? AND email NOT IN (' . $placeholders . ')'
        );
        $deactivate->execute(array_merge([$ownerEmail], $emails));

        // Re-activate rows that are back in the set.
        $reactivate = $pdo->prepare(
            'UPDATE admin_users SET is_active = 1, updated_at = NOW() ' .
            'WHERE is_active = 0 AND email IN (' . $placeholders . ')'
        );
        $reactivate->execute($emails);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Admin sync failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    json_ok(['synced' => true]);
}

/**
 * DELETE /api/admin/admins/:id
 * Deactivates that admin (login revoked, row kept). Refuses the owner
 * row and refuses if it would leave no active owner.
 */
function admin_delete(string $id): void
{
    $row = admin_find_or_404($id);

    if ((string) $row['role'] === 'owner') {
        json_error(403, 'forbidden', 'The owner account cannot be removed.');
    }

    $owners = db()->prepare(
        'SELECT COUNT(*) AS n FROM admin_users WHERE role = \'owner\' AND is_active = 1 AND id <> :id'
    );
    $owners->execute([':id' => (int) $row['id']]);
    $remaining = (int) ($owners->fetch()['n'] ?? 0);
    if ($remaining < 1) {
        json_error(403, 'forbidden', 'At least one active owner must remain.');
    }

    $stmt = db()->prepare(
        'UPDATE admin_users SET is_active = 0, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([':id' => (int) $row['id']]);

    json_ok(['synced' => true]);
}

/**
 * POST /api/admin/admins/:id/reset-password
 * Owner sets a temporary password for an admin (≥ 8 chars, hashed).
 */
function admin_reset_password(string $id): void
{
    $row = admin_find_or_404($id);
    $body = read_json_body();
    $tempPassword = (string) ($body['tempPassword'] ?? '');

    if (strlen($tempPassword) < 8) {
        json_error(400, 'invalid_password', 'Temporary password must be at least 8 characters.');
    }

    $stmt = db()->prepare(
        'UPDATE admin_users SET password_hash = :hash, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        ':hash' => password_hash($tempPassword, PASSWORD_DEFAULT),
        ':id' => (int) $row['id'],
    ]);

    json_ok(['synced' => true]);
}
