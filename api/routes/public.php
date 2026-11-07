<?php
/**
 * api/routes/public.php — public reads, no auth.
 *
 * Receives $params and $route from the front controller (api/index.php).
 * All endpoints here are GET only.
 *
 * Endpoints:
 *   GET /api/config         → the full site settings object
 *   GET /api/deals          → active special deals, sort_order ASC
 *   GET /api/umrah-packages → active Umrah packages, sort_order ASC
 *   GET /api/visas          → active visa services, sort_order ASC
 *   GET /api/work-permits   → active work permits, sort_order ASC
 *   GET /api/programmes     → active work-permit programmes, sort_order ASC
 *
 * Each record is the full object the site uses today: the stored `data`
 * JSON with `id` (string), `sortOrder` (int) and `isActive` (bool) set
 * from the typed mirrors, plus `isPrimary` (deals) / `isFeatured`
 * (packages). Field names stay camelCase, exactly as the site uses them.
 */

declare(strict_types=1);

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET') {
    json_error(405, 'method_not_allowed', 'This endpoint only accepts GET requests.');
}

/** Public resource map: route → table + single-flag field (if any). */
$publicResources = [
    'deals' => ['table' => 'special_deals', 'flag' => 'isPrimary', 'flagColumn' => 'is_primary'],
    'umrah-packages' => ['table' => 'umrah_packages', 'flag' => 'isFeatured', 'flagColumn' => 'is_featured'],
    'visas' => ['table' => 'visa_services', 'flag' => null, 'flagColumn' => null],
    'work-permits' => ['table' => 'work_permits', 'flag' => null, 'flagColumn' => null],
    'programmes' => ['table' => 'work_permit_programmes', 'flag' => null, 'flagColumn' => null],
];

switch ($route ?? '') {
    case 'config':
        public_get_config();
        break;

    case 'deals':
    case 'umrah-packages':
    case 'visas':
    case 'work-permits':
    case 'programmes':
        public_list_records($publicResources[$route]);
        break;

    default:
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
}

/**
 * GET /api/config — the full site settings object (site_config row 'main').
 */
function public_get_config(): void
{
    try {
        $stmt = db()->prepare('SELECT settings FROM site_config WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => 'main']);
        $row = $stmt->fetch();
    } catch (Throwable $e) {
        error_log('Public config read failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    if ($row === false) {
        json_error(404, 'not_found', 'Site settings not found.');
    }
    $settings = json_decode((string) $row['settings'], true);
    if (!is_array($settings)) {
        error_log('Public config read failed: settings JSON is not an object.');
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok($settings);
}

/**
 * GET /api/<resource> — active records only, ordered by sort_order ASC.
 */
function public_list_records(array $res): void
{
    try {
        $stmt = db()->prepare(
            'SELECT id, data, sort_order, is_active'
            . ($res['flagColumn'] !== null ? ', ' . $res['flagColumn'] : '')
            . ' FROM `' . $res['table'] . '`'
            . ' WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        $stmt->execute();
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('Public list read failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    $records = [];
    foreach ($rows as $row) {
        $records[] = public_record_from_row($row, $res);
    }
    json_ok($records);
}

/**
 * Map a content-table row to the record object the site uses today:
 * start from the stored `data` JSON, then set id / sortOrder / isActive
 * (and the single-flag field) from the typed mirrors.
 */
function public_record_from_row(array $row, array $res): array
{
    $data = json_decode((string) ($row['data'] ?? '{}'), true);
    if (!is_array($data)) {
        $data = [];
    }
    $data['id'] = (string) $row['id'];
    $data['sortOrder'] = (int) ($row['sort_order'] ?? ($data['sortOrder'] ?? 0));
    $data['isActive'] = (int) ($row['is_active'] ?? 1) === 1;
    if ($res['flag'] !== null) {
        $data[$res['flag']] = (int) ($row[$res['flagColumn']] ?? 0) === 1;
    }
    return $data;
}
