<?php
/**
 * api/routes/enquiries.php — public enquiry intake.
 *
 * Receives $params and $route from the front controller (api/index.php).
 *
 * Endpoint:
 *   POST /api/enquiries — public, rate-limited to 20 per IP per hour.
 *     Body: {name, phone, service?, source?, details?, whatsappNumber?,
 *            whatsappSent?}
 *     Requires name + phone (same message as today). Length caps match
 *     today's saveEnquiry (name 100, phone 30, service 120, source 50,
 *     details 1000, whatsappNumber 20). Server id is `enq_<epoch>_<rand6>`,
 *     status is 'new'. Returns the record with `synced:true`.
 *
 * NOTE: the admin enquiry endpoints (GET /api/admin/enquiries,
 * PATCH/DELETE /api/admin/enquiries/:id) are routed by api/index.php to
 * api/routes/content.php, so they live there, not in this file.
 */

declare(strict_types=1);

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

switch ($route ?? '') {
    case 'enquiries':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        enquiries_create();
        break;

    default:
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
}

/**
 * POST /api/enquiries
 */
function enquiries_create(): void
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $rateKey = 'enquiry:' . $ip;

    if (!rate_limit_check($rateKey, 20, 3600)) {
        json_error(429, 'too_many_requests', 'Too many enquiries. Please try again later.');
    }
    rate_limit_hit($rateKey, 3600);

    $body = read_json_body();

    // Same cleaning + caps as today's saveEnquiry in js/firebase-db.js.
    $name = clean_str($body['name'] ?? '', 100);
    $phone = clean_str($body['phone'] ?? '', 30);
    if ($name === '' || $phone === '') {
        json_error(400, 'validation_error', 'Enquiry needs a name and a phone number.');
    }

    $record = [
        'id' => 'enq_' . time() . '_' . enquiries_random_suffix(6),
        'createdAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'status' => 'new',
        'source' => clean_str($body['source'] ?? '', 50) ?: 'website',
        'service' => clean_str($body['service'] ?? '', 120) ?: 'General enquiry',
        'name' => $name,
        'phone' => $phone,
        'details' => clean_str($body['details'] ?? '', 1000),
        'whatsappNumber' => clean_str($body['whatsappNumber'] ?? '', 20),
        'whatsappSent' => !empty($body['whatsappSent']),
    ];

    try {
        $stmt = db()->prepare(
            'INSERT INTO enquiries'
            . ' (id, name, phone, service, source, details, whatsapp_number, whatsapp_sent, status, created_at)'
            . ' VALUES (:id, :name, :phone, :service, :source, :details, :whatsapp_number, :whatsapp_sent, :status, :created_at)'
        );
        $stmt->execute([
            ':id' => $record['id'],
            ':name' => $record['name'],
            ':phone' => $record['phone'],
            ':service' => $record['service'],
            ':source' => $record['source'],
            ':details' => $record['details'],
            ':whatsapp_number' => $record['whatsappNumber'],
            ':whatsapp_sent' => $record['whatsappSent'] ? 1 : 0,
            ':status' => $record['status'],
            ':created_at' => gmdate('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $e) {
        error_log('Enquiry insert failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    $record['synced'] = true;
    json_ok($record, 201);
}

/**
 * Random lowercase-alphanumeric suffix, same shape as today's
 * Math.random().toString(36).slice(2, 8) (6 base-36 chars).
 */
function enquiries_random_suffix(int $length): string
{
    $chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    $suffix = '';
    for ($i = 0; $i < $length; $i++) {
        $suffix .= $chars[random_int(0, 35)];
    }
    return $suffix;
}
