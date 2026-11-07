<?php
/**
 * api/routes/content.php — admin content CRUD, site config, admin enquiries.
 *
 * Receives $params and $route from the front controller (api/index.php).
 * All endpoints here require a logged-in admin session (require_auth).
 *
 * Resource map (URL segment → table → id prefix → label field for "(Copy)"):
 *   deals         → special_deals,          deal_, copy suffix on monthLabel
 *   umrah-packages→ umrah_packages,         pkg_,  copy suffix on title
 *   visas         → visa_services,          visa_, copy suffix on countryName
 *   work-permits  → work_permits,           wp_,   copy suffix on countryName
 *   programmes    → work_permit_programmes, wpp_,  copy suffix on countryName
 *                     (+ shieldCountry with " (COPY)" suffix, as today)
 *
 * For each resource:
 *   GET    /api/admin/<res>                 all rows incl. inactive, sort_order ASC
 *   GET    /api/admin/<res>/:id             one row (404 when missing)
 *   POST   /api/admin/<res>                 create (id optional → server generates)
 *   PUT    /api/admin/<res>/:id             update (merge: missing fields keep old values)
 *   DELETE /api/admin/<res>/:id             delete (refuses when it would leave
 *                                            zero deals or zero programmes)
 *   POST   /api/admin/<res>/:id/reorder     {direction:"up"|"down"}
 *   POST   /api/admin/<res>/:id/duplicate   copy with new id, "(Copy)" suffix
 *
 * Site config:
 *   PUT  /api/admin/config         merge exactly like updateSiteConfig
 *   POST /api/admin/quick-update   {startingPrice, departureDate, monthLabel}
 *   POST /api/admin/reset-defaults restore all 6 tables + site_config from
 *                                  api/seed_defaults.php, preserving teamPhotos
 *                                  and never touching enquiries
 *
 * Admin enquiries (routed here by api/index.php):
 *   GET    /api/admin/enquiries?status=&service=&q=   newest first, limit 500
 *   PATCH  /api/admin/enquiries/:id
 *   DELETE /api/admin/enquiries/:id
 *
 * Validation messages, defaults and guards match js/firebase-db.js exactly.
 * All writes use prepared statements; multi-row changes run in transactions.
 * SQL errors are logged, never exposed.
 */

declare(strict_types=1);

/** Site-config size cap: 900,000 bytes on the merged JSON (as today). */
const CONTENT_CONFIG_MAX_BYTES = 900000;

/**
 * Resource definitions. `priceField`/`priceColumn` = the price validated
 * on save; `countryMessage` = the required-name message; `singleFlag` /
 * `singleColumn` = the exactly-one flag (primary deal / featured package);
 * `minGuard` = the "at least one must remain" delete guard message.
 */
function content_resources(): array
{
    return [
        'deals' => [
            'table' => 'special_deals',
            'prefix' => 'deal_',
            'label' => 'monthLabel',
            'notFound' => 'Special deal not found.',
            'priceField' => 'startingPrice',
            'priceColumn' => 'starting_price',
            'priceMessage' => 'Special deal starting price must be greater than 0 PKR.',
            'singleFlag' => 'isPrimary',
            'singleColumn' => 'is_primary',
            'minGuard' => 'At least one Special Flyer Deal must remain. You can edit or hide it instead.',
        ],
        'umrah-packages' => [
            'table' => 'umrah_packages',
            'prefix' => 'pkg_',
            'label' => 'title',
            'notFound' => 'Umrah package not found.',
            'priceField' => 'price',
            'priceColumn' => 'price',
            'priceMessage' => 'Package price must be greater than 0 PKR.',
            'singleFlag' => 'isFeatured',
            'singleColumn' => 'is_featured',
        ],
        'visas' => [
            'table' => 'visa_services',
            'prefix' => 'visa_',
            'label' => 'countryName',
            'notFound' => 'Visa service not found.',
            'priceField' => 'pricePKR',
            'priceColumn' => 'price_pkr',
            'priceMessage' => 'Visa price must be greater than 0 PKR.',
        ],
        'work-permits' => [
            'table' => 'work_permits',
            'prefix' => 'wp_',
            'label' => 'countryName',
            'notFound' => 'Work permit not found.',
            'countryMessage' => 'Work permit needs a country name.',
        ],
        'programmes' => [
            'table' => 'work_permit_programmes',
            'prefix' => 'wpp_',
            'label' => 'countryName',
            'notFound' => 'Work permit programme not found.',
            'countryMessage' => 'Featured programme needs a country name.',
            'minGuard' => 'At least one Featured Work Permit Programme must remain. You can edit or hide it instead.',
        ],
    ];
}

/**
 * Find a resource definition by its table name (used by reset-defaults).
 */
function content_resource_by_table(string $table): ?array
{
    foreach (content_resources() as $res) {
        if ($res['table'] === $table) {
            return $res;
        }
    }
    return null;
}

/**
 * Map a content-table row to the record object the site uses today:
 * start from the stored `data` JSON, then set id / sortOrder / isActive
 * (and the single-flag field) from the typed mirrors.
 */
function content_record_from_row(array $row, array $res): array
{
    $data = json_decode((string) ($row['data'] ?? '{}'), true);
    if (!is_array($data)) {
        $data = [];
    }
    $data['id'] = (string) $row['id'];
    $data['sortOrder'] = (int) ($row['sort_order'] ?? ($data['sortOrder'] ?? 0));
    $data['isActive'] = (int) ($row['is_active'] ?? 1) === 1;
    if (isset($res['singleColumn'])) {
        $data[$res['singleFlag']] = (int) ($row[$res['singleColumn']] ?? 0) === 1;
    }
    return $data;
}

/**
 * Typed mirrors for a record (kept in sync on every write, per the spec).
 * Column names come from our own resource map, never from user input.
 */
function content_mirrors(array $record, array $res, PDO $pdo): array
{
    $mirrors = [
        'sort_order' => (int) ($record['sortOrder'] ?? 0),
        'is_active' => !empty($record['isActive']) ? 1 : 0,
    ];
    if (isset($res['priceColumn'])) {
        $field = $res['priceField'];
        $mirrors[$res['priceColumn']] = isset($record[$field]) && is_numeric($record[$field])
            ? $record[$field] + 0
            : null;
    }
    if (isset($res['singleColumn'])) {
        $mirrors[$res['singleColumn']] = !empty($record[$res['singleFlag']]) ? 1 : 0;
    }
    if ($res['table'] === 'work_permit_programmes') {
        $mirrors['work_permit_id'] = content_resolve_work_permit_id(
            (string) ($record['countryName'] ?? ''),
            $pdo
        );
    }
    return $mirrors;
}

/**
 * Resolve a programme's work_permit_id from its countryName, matching a
 * work_permits row case-insensitively, else NULL (per the spec).
 */
function content_resolve_work_permit_id(string $countryName, PDO $pdo): ?string
{
    $wanted = mb_strtolower(trim($countryName), 'UTF-8');
    if ($wanted === '') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, data FROM work_permits');
    $stmt->execute();
    while ($row = $stmt->fetch()) {
        $data = json_decode((string) ($row['data'] ?? '{}'), true);
        if (!is_array($data)) {
            continue;
        }
        if (mb_strtolower(trim((string) ($data['countryName'] ?? '')), 'UTF-8') === $wanted) {
            return (string) $row['id'];
        }
    }
    return null;
}

/**
 * Tier auto-scaling math, exactly like calculateScaledTiers in
 * js/firebase-db.js: sharing=base, quad=base+16000, triple=base+36000,
 * double=base+63000. A missing/invalid base falls back to 232000.
 */
function content_scaled_tiers($baseStartingPrice): array
{
    $base = is_numeric($baseStartingPrice) ? $baseStartingPrice + 0 : 232000;
    $base = max(0, $base);
    // Keep whole-number prices as ints (matches the seed data and what
    // the site's JSON carries today); fractional bases stay floats.
    if (is_float($base) && floor($base) === $base) {
        $base = (int) $base;
    }
    return [
        'sharingPrice' => $base,
        'quadPrice' => $base + 16000,
        'triplePrice' => $base + 36000,
        'doublePrice' => $base + 63000,
    ];
}

/**
 * Normalise a work-permit `ticks` value: array stays an array; a string
 * splits on newlines or `|`; anything else becomes []. (As today.)
 */
function content_normalise_ticks($value): array
{
    if (is_array($value)) {
        $ticks = array_map(static fn($t) => trim((string) $t), $value);
    } else {
        $text = trim((string) ($value ?? ''));
        $ticks = $text === '' ? [] : preg_split('/\r?\n|\|/', $text);
        $ticks = array_map('trim', $ticks === false ? [] : $ticks);
    }
    return array_values(array_filter($ticks, static fn($t) => $t !== ''));
}

/**
 * Normalise a package `services` value: array stays an array; a string
 * splits on commas; anything else becomes []. (As today.)
 */
function content_normalise_services($value): array
{
    if (is_array($value)) {
        $services = array_map(static fn($s) => trim((string) $s), $value);
    } else {
        $text = trim((string) ($value ?? ''));
        $services = $text === '' ? [] : explode(',', $text);
        $services = array_map('trim', $services);
    }
    return array_values(array_filter($services, static fn($s) => $s !== ''));
}

/**
 * Load the seed defaults (api/seed_defaults.php returns FLYER_DEFAULTS).
 * Returns null when the file is missing or does not return an array.
 */
function content_load_seed_defaults(): ?array
{
    $file = __DIR__ . '/../seed_defaults.php';
    if (!is_file($file)) {
        return null;
    }
    $data = require $file;
    return is_array($data) ? $data : null;
}

/**
 * The seed settings object: FLYER_DEFAULTS['site_config']['main_settings']
 * (with a fallback for a seed that stores the settings directly).
 */
function content_seed_settings(array $seed): array
{
    $settings = $seed['site_config']['main_settings'] ?? $seed['site_config'] ?? [];
    return is_array($settings) ? $settings : [];
}

/**
 * Today's defaults for a brand-new record (js/firebase-db.js save*
 * methods). The caller's fields are merged over these by the save
 * handler; only the fields listed here are defaulted.
 */
function content_default_record(array $res, array $input, PDO $pdo): array
{
    switch ($res['table']) {
        case 'special_deals':
            // DEFAULT_PRIMARY_DEAL from js/firebase-db.js.
            return [
                'monthLabel' => 'January & Upcoming',
                'title' => 'UMRAH PACKAGE',
                'subtitle' => 'Complete spiritual peace of mind with our all-inclusive featured Umrah package. Everything handled from Islamabad to Haramain.',
                'badgeTag' => 'All-Inclusive Deal',
                'priceUnit' => 'PER PERSON (SHARING)',
                'departureDate' => 'Jan 26, 2026',
                'departureSubtext' => '(Weekly Batches)',
                'returnDate' => 'Feb 09, 2026',
                'duration' => '14 Nights',
                'leftFrameTitle' => 'Madinah Munawwarah',
                'leftFrameBadge' => 'Ziyarat & Stay',
                'madinahHotel' => 'Al Eiman Taibah / Similar (Near Markazia)',
                'madinahImageUrl' => 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=900&q=80',
                'rightFrameTitle' => 'Makkah Mukarramah',
                'rightFrameBadge' => 'Haram View Options',
                'makkahHotel' => 'Emaar Al Khalil / Similar (Shuttle / Walk)',
                'makkahImageUrl' => 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=900&q=80',
                'promotionalFlyerUrl' => '',
                'showFlyerOnHomepage' => true,
                'servicesIncluded' => [
                    'roundTrip' => true,
                    'visa' => true,
                    'hotel' => true,
                    'transport' => true,
                ],
            ];

        case 'umrah_packages':
            return [
                'title' => 'Umrah Package',
                'badgeText' => 'Special Offer',
                'roomType' => 'Sharing (Quad)',
                'departureDate' => 'Upcoming Batch',
                'returnDate' => 'Flexible',
                'duration' => '14 Nights',
                'makkahHotelDist' => '500m from Haram',
                'madinahHotelDist' => '350m from Masjid Nabawi',
                'services' => ['Return Air Ticket', 'Umrah Visa', 'Hotel Stay', 'Transport'],
            ];

        case 'visa_services':
            return [
                'countryName' => 'Country Name',
                'flagEmoji' => '🌍',
                'flagUrl' => '',
                'visaType' => 'Tourist / Visit Visa',
                'processingTime' => '3-5 Working Days',
                'requirementsSummary' => 'Passport Scan, Photo & CNIC Copy',
                'imageUrl' => 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80',
            ];

        case 'work_permits':
            $country = trim((string) ($input['countryName'] ?? ''));
            return [
                'countryName' => $country !== '' ? $country : 'Country Name',
                'cardTitle' => ($country !== '' ? $country : 'Country') . ' Work Permit',
                'flagClass' => 'flag-eu',
                'flagUrl' => '',
                'tagText' => 'Applications Open',
                'tagStyle' => 'sky',
                'timeline' => '3-6 Months',
                'permitType' => 'Work Permit',
                'visaCode' => 'D-Visa',
                'contract' => '1 Year, Renewable',
                'residence' => 'Residence Permit',
                'sectors' => 'General Labour',
                'ticks' => [],
                'isFeatured' => false,
            ];

        case 'work_permit_programmes': {
            // New programmes inherit the seed programme's fields (as
            // today), with Poland's image fallbacks cleared unless the
            // admin supplied their own.
            $seed = content_load_seed_defaults();
            $template = [];
            if ($seed !== null && !empty($seed['work_permit_programmes'][0])
                && is_array($seed['work_permit_programmes'][0])) {
                $template = $seed['work_permit_programmes'][0];
            }
            unset($template['id'], $template['sortOrder'], $template['isActive']);
            $template['leftImageFallback'] = '';
            $template['rightImageFallback'] = '';
            return $template;
        }

        default:
            return [];
    }
}

/**
 * Generate a new server id `<prefix><epoch>`; if that id already exists
 * (two creates in the same second) a short random suffix is appended.
 */
function content_generate_id(PDO $pdo, string $table, string $prefix): string
{
    $id = $prefix . time();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM `' . $table . '` WHERE id = ?');
    $stmt->execute([$id]);
    if ((int) $stmt->fetchColumn() === 0) {
        return $id;
    }
    return $prefix . time() . '_' . bin2hex(random_bytes(2));
}

/**
 * Validate a record exactly like today. Today's save* methods validate
 * the CALLER-SUPPLIED values before defaults are applied (a work permit
 * with no countryName throws even though the default would fill in
 * "Country Name"), so validation reads $input, not the merged record.
 * On create the price / country name must be present and valid; on
 * update they are re-validated only when the caller supplied them
 * (merge semantics). Sends a 400 json_error with today's message.
 */
function content_validate_record(array $res, array $record, bool $isUpdate, array $input): void
{
    if (isset($res['priceField'])) {
        $field = $res['priceField'];
        $check = !$isUpdate || array_key_exists($field, $input);
        if ($check) {
            $price = isset($input[$field]) && is_numeric($input[$field])
                ? $input[$field] + 0
                : 0;
            if (!$price || $price <= 0) {
                json_error(400, 'validation_error', $res['priceMessage']);
            }
        }
    }
    if (isset($res['countryMessage'])) {
        $check = !$isUpdate || array_key_exists('countryName', $input);
        if ($check && trim((string) ($input['countryName'] ?? '')) === '') {
            json_error(400, 'validation_error', $res['countryMessage']);
        }
    }
}

/**
 * Insert one record row (data JSON + typed mirrors).
 */
function content_insert_row(PDO $pdo, array $res, array $record): void
{
    $mirrors = content_mirrors($record, $res, $pdo);
    $columns = ['id', 'data'];
    $placeholders = [':id', ':data'];
    $values = [
        ':id' => (string) $record['id'],
        ':data' => json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ];
    foreach ($mirrors as $col => $val) {
        $columns[] = '`' . $col . '`';
        $placeholders[] = ':' . $col;
        $values[':' . $col] = $val;
    }
    $sql = 'INSERT INTO `' . $res['table'] . '` (' . implode(', ', $columns) . ', created_at, updated_at)'
        . ' VALUES (' . implode(', ', $placeholders) . ', NOW(), NOW())';
    $pdo->prepare($sql)->execute($values);
}

/**
 * Update one record row (data JSON + typed mirrors).
 */
function content_update_row(PDO $pdo, array $res, array $record): void
{
    $mirrors = content_mirrors($record, $res, $pdo);
    $sets = ['data = :data'];
    $values = [
        ':data' => json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':id' => (string) $record['id'],
    ];
    foreach ($mirrors as $col => $val) {
        $sets[] = '`' . $col . '` = :' . $col;
        $values[':' . $col] = $val;
    }
    $sql = 'UPDATE `' . $res['table'] . '` SET ' . implode(', ', $sets)
        . ', updated_at = NOW() WHERE id = :id';
    $pdo->prepare($sql)->execute($values);
}

/**
 * Fetch one row by id, mapped to a record, or null when missing.
 */
function content_fetch_record(PDO $pdo, array $res, string $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM `' . $res['table'] . '` WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row === false ? null : content_record_from_row($row, $res);
}

/**
 * Fetch all rows of a resource, mapped to records, sort_order ASC.
 */
function content_fetch_all(PDO $pdo, array $res): array
{
    $stmt = $pdo->prepare('SELECT * FROM `' . $res['table'] . '` ORDER BY sort_order ASC, id ASC');
    $stmt->execute();
    $records = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $records[] = content_record_from_row($row, $res);
    }
    return $records;
}

/**
 * Single-primary (deals) / single-featured (packages) rule, as today.
 * When the saved record carries the flag, clear it on every other row
 * (data JSON + mirror). When a deal is saved without the flag and no
 * deal is primary, the first deal becomes primary.
 * Must be called inside the save transaction.
 */
function content_enforce_single_flag(PDO $pdo, array $res, array $record): void
{
    if (!isset($res['singleColumn'])) {
        return;
    }
    $flag = $res['singleFlag'];
    $col = $res['singleColumn'];

    if (!empty($record[$flag])) {
        $stmt = $pdo->prepare('SELECT * FROM `' . $res['table'] . '` WHERE id != ?');
        $stmt->execute([(string) $record['id']]);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $other = content_record_from_row($row, $res);
            if (!empty($other[$flag])) {
                $other[$flag] = false;
                content_update_row($pdo, $res, $other);
            }
        }
        return;
    }

    if ($res['table'] === 'special_deals') {
        $all = content_fetch_all($pdo, $res);
        $anyPrimary = false;
        foreach ($all as $deal) {
            if (!empty($deal['isPrimary'])) {
                $anyPrimary = true;
                break;
            }
        }
        if (!$anyPrimary && count($all) > 0) {
            $first = $all[0];
            $first['isPrimary'] = true;
            content_update_row($pdo, $res, $first);
        }
    }
}

/**
 * Create or update a record (POST with an existing id updates, like
 * today's save* methods). Returns the saved record, re-read from the
 * database so flag enforcement is reflected. Validation runs before
 * the transaction opens; the write + flag enforcement run inside it.
 */
function content_save_record(PDO $pdo, array $res, array $input): array
{
    $table = $res['table'];
    $id = isset($input['id']) ? trim((string) $input['id']) : '';
    $existing = $id !== '' ? content_fetch_record($pdo, $res, $id) : null;

    if ($existing !== null) {
        // Update: merge — missing fields keep old values.
        $record = $existing;
        foreach ($input as $key => $value) {
            if ($key !== 'id') {
                $record[$key] = $value;
            }
        }
        if ($table === 'special_deals' && isset($input['servicesIncluded'])
            && is_array($input['servicesIncluded'])) {
            $record['servicesIncluded'] = array_merge(
                is_array($existing['servicesIncluded'] ?? null) ? $existing['servicesIncluded'] : [],
                $input['servicesIncluded']
            );
        }
        if ($table === 'work_permits' && array_key_exists('ticks', $input)) {
            $record['ticks'] = content_normalise_ticks($input['ticks']);
        }
        if ($table === 'umrah_packages' && array_key_exists('services', $input)) {
            $record['services'] = content_normalise_services($input['services']);
        }
        content_validate_record($res, $record, true, $input);
    } else {
        // Create: today's defaults, caller fields over them.
        $count = (int) $pdo->query('SELECT COUNT(*) FROM `' . $table . '`')->fetchColumn();
        $record = content_default_record($res, $input, $pdo);
        foreach ($input as $key => $value) {
            if ($key !== 'id') {
                $record[$key] = $value;
            }
        }
        // A caller-supplied id is kept verbatim when it does not exist
        // yet; only a missing id is server-generated.
        $record['id'] = $id !== '' ? $id : content_generate_id($pdo, $table, $res['prefix']);
        if ($table === 'special_deals') {
            $record['servicesIncluded'] = array_merge(
                content_default_record($res, $input, $pdo)['servicesIncluded'],
                is_array($input['servicesIncluded'] ?? null) ? $input['servicesIncluded'] : []
            );
            // The first deal is always primary (as today).
            $record['isPrimary'] = $count === 0 ? true : !empty($input['isPrimary']);
        }
        if ($table === 'umrah_packages') {
            $record['services'] = content_normalise_services($input['services'] ?? $record['services'] ?? []);
            $record['isFeatured'] = !empty($input['isFeatured']);
        }
        if ($table === 'work_permits') {
            $record['ticks'] = content_normalise_ticks($input['ticks'] ?? []);
            if (!isset($record['isFeatured'])) {
                $record['isFeatured'] = false;
            }
        }
        if ($table === 'work_permit_programmes') {
            // Seed image fallbacks are cleared unless the admin supplied
            // their own (a new country must never show Poland's photos).
            $record['leftImageFallback'] = $input['leftImageFallback'] ?? '';
            $record['rightImageFallback'] = $input['rightImageFallback'] ?? '';
        }
        $record['isActive'] = isset($input['isActive']) ? (bool) $input['isActive'] : true;
        $record['sortOrder'] = isset($input['sortOrder']) && is_numeric($input['sortOrder'])
            ? (int) $input['sortOrder']
            : $count + 1;
        content_validate_record($res, $record, false, $input);
    }

    // Prices are stored as numbers in the data JSON.
    if (isset($res['priceField'], $record[$res['priceField']])
        && is_numeric($record[$res['priceField']])) {
        $record[$res['priceField']] = $record[$res['priceField']] + 0;
    }
    $record['sortOrder'] = (int) ($record['sortOrder'] ?? 0);
    $record['isActive'] = isset($record['isActive']) ? (bool) $record['isActive'] : true;

    try {
        $pdo->beginTransaction();
        if ($existing !== null) {
            content_update_row($pdo, $res, $record);
        } else {
            content_insert_row($pdo, $res, $record);
        }
        content_enforce_single_flag($pdo, $res, $record);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $saved = content_fetch_record($pdo, $res, (string) $record['id']);
    return $saved !== null ? $saved : $record;
}

/**
 * GET /api/admin/<res> — all rows incl. inactive, sort_order ASC.
 */
function content_list_records(PDO $pdo, array $res): void
{
    try {
        $records = content_fetch_all($pdo, $res);
    } catch (Throwable $e) {
        error_log('Admin list read failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok($records);
}

/**
 * GET /api/admin/<res>/:id — one row; 404 when missing.
 */
function content_get_record(PDO $pdo, array $res, string $id): void
{
    try {
        $record = content_fetch_record($pdo, $res, $id);
    } catch (Throwable $e) {
        error_log('Admin get read failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    if ($record === null) {
        json_error(404, 'not_found', $res['notFound']);
    }
    json_ok($record);
}

/**
 * POST /api/admin/<res> — create (or update when the id already exists,
 * like today's save* methods). Returns {synced:true, <record>} with the
 * singular key today's api-db.js contract uses (deal/package/visa/
 * permit/programme).
 */
function content_create_record(PDO $pdo, array $res): void
{
    $input = read_json_body();
    if (!is_array($input)) {
        json_error(400, 'invalid_request', 'Request body must be a JSON object.');
    }
    try {
        $saved = content_save_record($pdo, $res, $input);
    } catch (Throwable $e) {
        error_log('Admin create failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    $key = content_result_key($res);
    json_ok(['synced' => true, $key => $saved], 201);
}

/**
 * PUT /api/admin/<res>/:id — update (merge semantics). 404 when missing.
 */
function content_update_record(PDO $pdo, array $res, string $id): void
{
    $input = read_json_body();
    if (!is_array($input)) {
        json_error(400, 'invalid_request', 'Request body must be a JSON object.');
    }
    try {
        $existing = content_fetch_record($pdo, $res, $id);
    } catch (Throwable $e) {
        error_log('Admin update read failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    if ($existing === null) {
        json_error(404, 'not_found', $res['notFound']);
    }
    $input['id'] = $id;
    try {
        $saved = content_save_record($pdo, $res, $input);
    } catch (Throwable $e) {
        error_log('Admin update failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    $key = content_result_key($res);
    json_ok(['synced' => true, $key => $saved]);
}

/**
 * Singular result key per resource (today's save* return shapes).
 */
function content_result_key(array $res): string
{
    return match ($res['table']) {
        'special_deals' => 'deal',
        'umrah_packages' => 'package',
        'visa_services' => 'visa',
        'work_permits' => 'permit',
        'work_permit_programmes' => 'programme',
        default => 'record',
    };
}

/**
 * DELETE /api/admin/<res>/:id — refuses when it would leave zero deals
 * or zero programmes (same guard as today). When a deal is deleted the
 * remaining primary deal is re-synced into site_config.spotlight, as
 * today's deleteSpecialDeal does via updateSiteConfig.
 */
function content_delete_record(PDO $pdo, array $res, string $id): void
{
    try {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM `' . $res['table'] . '`')->fetchColumn();
        if (isset($res['minGuard']) && $count <= 1) {
            json_error(400, 'validation_error', $res['minGuard']);
        }
        $record = content_fetch_record($pdo, $res, $id);
        if ($record === null) {
            json_error(404, 'not_found', $res['notFound']);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('DELETE FROM `' . $res['table'] . '` WHERE id = ?');
        $stmt->execute([$id]);

        if ($res['table'] === 'special_deals') {
            $remaining = content_fetch_all($pdo, $res);
            if (count($remaining) > 0) {
                $primary = null;
                foreach ($remaining as $deal) {
                    if (!empty($deal['isPrimary'])) {
                        $primary = $deal;
                        break;
                    }
                }
                if ($primary === null) {
                    $primary = $remaining[0];
                    $primary['isPrimary'] = true;
                    content_update_row($pdo, $res, $primary);
                }
                // Keep the homepage spotlight on the new primary deal.
                $settings = content_load_settings($pdo);
                $merged = content_merge_site_config($settings, ['spotlight' => $primary]);
                content_check_config_size($merged);
                content_save_settings($pdo, $merged);
                content_mirror_spotlight($pdo, $merged['spotlight'] ?? []);
            }
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // json_error() exits, so a validation/404 above never reaches here.
        error_log('Admin delete failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true]);
}

/**
 * POST /api/admin/<res>/:id/reorder {direction:"up"|"down"} — swap
 * sort_order with the neighbour, renumber 1..n in a transaction.
 * A move past the edge is a no-op that still returns {synced:true}
 * (as today). Returns {synced:true}.
 */
function content_reorder_record(PDO $pdo, array $res, string $id): void
{
    $body = read_json_body();
    $direction = (string) ($body['direction'] ?? '');
    if ($direction !== 'up' && $direction !== 'down') {
        json_error(400, 'validation_error', 'Reorder direction must be "up" or "down".');
    }
    try {
        $records = content_fetch_all($pdo, $res);
        $idx = null;
        foreach ($records as $i => $record) {
            if ($record['id'] === $id) {
                $idx = $i;
                break;
            }
        }
        if ($idx === null) {
            json_error(404, 'not_found', $res['notFound']);
        }
        $swapIdx = $direction === 'up' ? $idx - 1 : $idx + 1;
        if ($swapIdx < 0 || $swapIdx >= count($records)) {
            json_ok(['synced' => true]);
        }
        $temp = $records[$idx];
        $records[$idx] = $records[$swapIdx];
        $records[$swapIdx] = $temp;

        $pdo->beginTransaction();
        foreach ($records as $i => $record) {
            $record['sortOrder'] = $i + 1;
            content_update_row($pdo, $res, $record);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Admin reorder failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true]);
}

/**
 * POST /api/admin/<res>/:id/duplicate — copy with a new id, "(Copy)"
 * suffix on the label field, isPrimary/isFeatured false, isActive true,
 * sort_order = last+1. For programmes also copies shieldCountry with
 * " (COPY)" suffix and countryName with " (Copy)" (as today).
 * Returns the new record.
 */
function content_duplicate_record(PDO $pdo, array $res, string $id): void
{
    try {
        $orig = content_fetch_record($pdo, $res, $id);
        if ($orig === null) {
            json_error(404, 'not_found', $res['notFound']);
        }
        $all = content_fetch_all($pdo, $res);
        $maxOrder = 0;
        foreach ($all as $record) {
            $maxOrder = max($maxOrder, (int) ($record['sortOrder'] ?? 0));
        }

        $copy = $orig;
        unset($copy['id']);
        $label = $res['label'];
        $copy[$label] = (string) ($orig[$label] ?? '') . ' (Copy)';
        if ($res['table'] === 'work_permit_programmes'
            && trim((string) ($orig['shieldCountry'] ?? '')) !== '') {
            $copy['shieldCountry'] = (string) $orig['shieldCountry'] . ' (COPY)';
        }
        if (isset($res['singleFlag'])) {
            $copy[$res['singleFlag']] = false;
        }
        $copy['isActive'] = true;
        $copy['sortOrder'] = $maxOrder + 1;

        $saved = content_save_record($pdo, $res, $copy);
    } catch (Throwable $e) {
        error_log('Admin duplicate failed (' . $res['table'] . '): ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    $key = content_result_key($res);
    json_ok(['synced' => true, $key => $saved], 201);
}

// ---------------------------------------------------------------------------
// ADMIN ENQUIRIES
// ---------------------------------------------------------------------------

/** Allowed enquiry statuses (as today). */
const CONTENT_ENQUIRY_STATUSES = ['new', 'contacted', 'booked', 'closed'];

/**
 * Map an enquiries-table row to the record object the site uses today
 * (camelCase fields, ISO createdAt).
 */
function content_enquiry_from_row(array $row): array
{
    $createdAt = (string) ($row['created_at'] ?? '');
    $ts = $createdAt !== '' ? strtotime($createdAt . ' UTC') : false;
    return [
        'id' => (string) $row['id'],
        'createdAt' => $ts !== false ? gmdate('Y-m-d\TH:i:s\Z', $ts) : $createdAt,
        'status' => in_array($row['status'] ?? '', CONTENT_ENQUIRY_STATUSES, true)
            ? (string) $row['status']
            : 'new',
        'source' => (string) ($row['source'] ?? 'website'),
        'service' => (string) ($row['service'] ?? 'General enquiry'),
        'name' => (string) ($row['name'] ?? ''),
        'phone' => (string) ($row['phone'] ?? ''),
        'details' => (string) ($row['details'] ?? ''),
        'whatsappNumber' => (string) ($row['whatsapp_number'] ?? ''),
        'whatsappSent' => (int) ($row['whatsapp_sent'] ?? 0) === 1,
        'synced' => true,
    ];
}

/**
 * GET /api/admin/enquiries?status=&service=&q= — newest first, limit 500.
 * q matches name, phone or service (LIKE, with %/_ escaped).
 */
function content_list_enquiries(PDO $pdo): void
{
    $status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
    $service = isset($_GET['service']) ? trim((string) $_GET['service']) : '';
    $q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';

    $where = [];
    $values = [];
    if ($status !== '') {
        if (!in_array($status, CONTENT_ENQUIRY_STATUSES, true)) {
            json_error(400, 'validation_error', 'Invalid enquiry status.');
        }
        $where[] = 'status = :status';
        $values[':status'] = $status;
    }
    if ($service !== '') {
        $where[] = 'service = :service';
        $values[':service'] = $service;
    }
    if ($q !== '') {
        $like = '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q) . '%';
        $where[] = '(name LIKE :q ESCAPE \'\\\' OR phone LIKE :q ESCAPE \'\\\' OR service LIKE :q ESCAPE \'\\\')';
        $values[':q'] = $like;
    }

    $sql = 'SELECT * FROM enquiries'
        . (count($where) > 0 ? ' WHERE ' . implode(' AND ', $where) : '')
        . ' ORDER BY created_at DESC, id DESC LIMIT 500';
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        error_log('Admin enquiries list failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    $records = [];
    foreach ($rows as $row) {
        $records[] = content_enquiry_from_row($row);
    }
    json_ok($records);
}

/**
 * PATCH /api/admin/enquiries/:id — only status (new|contacted|booked|
 * closed), whatsappSent (bool) and details (≤1000 chars) may change.
 * Returns {synced:true, enquiry}. An empty patch is a no-op that
 * returns the current record (as today, where it returns without error).
 */
function content_patch_enquiry(PDO $pdo, string $id): void
{
    $patch = read_json_body();
    $clean = [];
    if (isset($patch['status']) && in_array($patch['status'], CONTENT_ENQUIRY_STATUSES, true)) {
        $clean['status'] = $patch['status'];
    }
    if (isset($patch['whatsappSent']) && is_bool($patch['whatsappSent'])) {
        $clean['whatsappSent'] = $patch['whatsappSent'];
    }
    if (isset($patch['details']) && is_string($patch['details'])) {
        $clean['details'] = mb_substr($patch['details'], 0, 1000, 'UTF-8');
    }

    try {
        $stmt = $pdo->prepare('SELECT * FROM enquiries WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            json_error(404, 'not_found', 'Enquiry not found.');
        }
        if (count($clean) > 0) {
            $sets = [];
            $values = [':id' => $id];
            if (isset($clean['status'])) {
                $sets[] = 'status = :status';
                $values[':status'] = $clean['status'];
            }
            if (isset($clean['whatsappSent'])) {
                $sets[] = 'whatsapp_sent = :whatsapp_sent';
                $values[':whatsapp_sent'] = $clean['whatsappSent'] ? 1 : 0;
            }
            if (isset($clean['details'])) {
                $sets[] = 'details = :details';
                $values[':details'] = $clean['details'];
            }
            $update = $pdo->prepare('UPDATE enquiries SET ' . implode(', ', $sets) . ' WHERE id = :id');
            $update->execute($values);
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    } catch (Throwable $e) {
        error_log('Admin enquiry patch failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true, 'enquiry' => content_enquiry_from_row($row)]);
}

/**
 * DELETE /api/admin/enquiries/:id → {synced:true}. 404 when missing.
 */
function content_delete_enquiry(PDO $pdo, string $id): void
{
    try {
        $stmt = $pdo->prepare('DELETE FROM enquiries WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            json_error(404, 'not_found', 'Enquiry not found.');
        }
    } catch (Throwable $e) {
        error_log('Admin enquiry delete failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true]);
}

// ---------------------------------------------------------------------------
// SITE CONFIG
// ---------------------------------------------------------------------------

/**
 * Load the current site settings (site_config row 'main'), or [] when
 * the row does not exist yet.
 */
function content_load_settings(PDO $pdo): array
{
    $stmt = $pdo->prepare('SELECT settings FROM site_config WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => 'main']);
    $row = $stmt->fetch();
    if ($row === false) {
        return [];
    }
    $settings = json_decode((string) $row['settings'], true);
    return is_array($settings) ? $settings : [];
}

/**
 * Save the site settings (insert the 'main' row when it does not exist).
 */
function content_save_settings(PDO $pdo, array $settings): void
{
    $json = json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = $pdo->prepare(
        'INSERT INTO site_config (id, settings, updated_at) VALUES (:id, :settings, NOW())'
        . ' ON DUPLICATE KEY UPDATE settings = VALUES(settings), updated_at = NOW()'
    );
    $stmt->execute([':id' => 'main', ':settings' => $json]);
}

/**
 * Merge a partial config exactly like updateSiteConfig in
 * js/firebase-db.js: top-level fields overwrite; spotlight /
 * calculatorRates / contacts merge shallowly (spotlight.servicesIncluded
 * merges too); pageContent merges per section over the stored sections;
 * updatedAt is set. When autoCalculateTiers is on and the partial
 * changes spotlight.startingPrice, the calculator tiers auto-scale.
 */
function content_merge_site_config(array $current, array $partial): array
{
    $updated = $current;
    foreach ($partial as $key => $value) {
        if (in_array($key, ['spotlight', 'calculatorRates', 'contacts', 'pageContent'], true)) {
            continue;
        }
        $updated[$key] = $value;
    }

    $updated['spotlight'] = array_merge(
        is_array($current['spotlight'] ?? null) ? $current['spotlight'] : [],
        is_array($partial['spotlight'] ?? null) ? $partial['spotlight'] : []
    );
    if (isset($current['spotlight']['servicesIncluded']) || isset($partial['spotlight']['servicesIncluded'])) {
        $updated['spotlight']['servicesIncluded'] = array_merge(
            is_array($current['spotlight']['servicesIncluded'] ?? null) ? $current['spotlight']['servicesIncluded'] : [],
            is_array($partial['spotlight']['servicesIncluded'] ?? null) ? $partial['spotlight']['servicesIncluded'] : []
        );
    }
    $updated['calculatorRates'] = array_merge(
        is_array($current['calculatorRates'] ?? null) ? $current['calculatorRates'] : [],
        is_array($partial['calculatorRates'] ?? null) ? $partial['calculatorRates'] : []
    );
    $updated['contacts'] = array_merge(
        is_array($current['contacts'] ?? null) ? $current['contacts'] : [],
        is_array($partial['contacts'] ?? null) ? $partial['contacts'] : []
    );

    // pageContent merges per section (home/umrah/visas/calculator/
    // contact/workPermit) over the stored sections. The seed already
    // holds the full default content, so no backfill is needed here.
    $pageContent = is_array($current['pageContent'] ?? null) ? $current['pageContent'] : [];
    if (isset($partial['pageContent']) && is_array($partial['pageContent'])) {
        foreach ($partial['pageContent'] as $section => $values) {
            if (is_array($values)) {
                $pageContent[$section] = array_merge(
                    is_array($pageContent[$section] ?? null) ? $pageContent[$section] : [],
                    $values
                );
            }
        }
    }
    $updated['pageContent'] = $pageContent;

    $updated['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');

    if (!empty($updated['calculatorRates']['autoCalculateTiers'])
        && isset($partial['spotlight']['startingPrice'])) {
        $updated['calculatorRates'] = array_merge(
            $updated['calculatorRates'],
            content_scaled_tiers($partial['spotlight']['startingPrice'])
        );
    }

    return $updated;
}

/**
 * Enforce the 900,000-byte cap on the merged settings JSON (same
 * message as today). Sends a 400 json_error('config_too_large').
 */
function content_check_config_size(array $settings): void
{
    $bytes = strlen((string) json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    if ($bytes > CONTENT_CONFIG_MAX_BYTES) {
        $kb = (int) round($bytes / 1024);
        json_error(
            400,
            'config_too_large',
            'This page data is too full (' . $kb . ' KB) to save — too many photos are stored in the database. Remove some photos or fix Storage uploads, then save again.'
        );
    }
}

/**
 * Spotlight mirrors, exactly like today: when spotlight changes, mirror
 * it into the primary deal (special_deals row with is_primary=1, merging
 * spotlight fields into its data JSON) AND into the featured Umrah
 * package (price = spotlight.startingPrice, departureDate, duration).
 * Must be called inside the config transaction.
 */
function content_mirror_spotlight(PDO $pdo, array $spotlight): void
{
    if (count($spotlight) === 0) {
        return;
    }
    $deals = content_resources()['deals'];

    $stmt = $pdo->prepare('SELECT * FROM special_deals WHERE is_primary = 1 ORDER BY sort_order ASC LIMIT 1');
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row === false) {
        $stmt = $pdo->prepare('SELECT * FROM special_deals ORDER BY sort_order ASC LIMIT 1');
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    if ($row !== false) {
        $deal = content_record_from_row($row, $deals);
        $merged = array_merge($deal, $spotlight);
        $merged['id'] = $deal['id'];
        $merged['isPrimary'] = true;
        content_update_row($pdo, $deals, $merged);
    }

    $packages = content_resources()['umrah-packages'];
    $stmt = $pdo->prepare('SELECT * FROM umrah_packages WHERE is_featured = 1 ORDER BY sort_order ASC LIMIT 1');
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row !== false) {
        $pkg = content_record_from_row($row, $packages);
        if (isset($spotlight['startingPrice']) && is_numeric($spotlight['startingPrice'])) {
            $pkg['price'] = $spotlight['startingPrice'] + 0;
        }
        if (!empty($spotlight['departureDate'])) {
            $pkg['departureDate'] = $spotlight['departureDate'];
        }
        if (!empty($spotlight['duration'])) {
            $pkg['duration'] = $spotlight['duration'];
        }
        content_update_row($pdo, $packages, $pkg);
    }
}

/**
 * Apply a config update (merge + cap + save + spotlight mirrors) in one
 * transaction. Returns the merged settings. Used by PUT /api/admin/config
 * and POST /api/admin/quick-update.
 */
function content_apply_config_update(PDO $pdo, array $partial): array
{
    $current = content_load_settings($pdo);
    $updated = content_merge_site_config($current, $partial);
    content_check_config_size($updated);
    try {
        $pdo->beginTransaction();
        content_save_settings($pdo, $updated);
        if (isset($partial['spotlight']) && is_array($partial['spotlight'])) {
            content_mirror_spotlight($pdo, $updated['spotlight']);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    return $updated;
}

/**
 * PUT /api/admin/config — body = partial config. Returns
 * {synced:true, config}.
 */
function content_update_config(PDO $pdo): void
{
    $partial = read_json_body();
    if (!is_array($partial)) {
        json_error(400, 'invalid_request', 'Request body must be a JSON object.');
    }
    try {
        $updated = content_apply_config_update($pdo, $partial);
    } catch (Throwable $e) {
        error_log('Admin config update failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true, 'config' => $updated]);
}

/**
 * POST /api/admin/quick-update {startingPrice, departureDate, monthLabel}
 * — same validation as publishQuickUpdate in js/firebase-db.js, then
 * the same config update. Returns {synced:true, config}.
 */
function content_quick_update(PDO $pdo): void
{
    $body = read_json_body();
    $cleanPrice = isset($body['startingPrice']) && is_numeric($body['startingPrice'])
        ? $body['startingPrice'] + 0
        : 0;
    if (!$cleanPrice || $cleanPrice <= 0) {
        json_error(400, 'validation_error', 'Starting price must be a positive amount in PKR.');
    }
    $departureDate = trim((string) ($body['departureDate'] ?? ''));
    if ($departureDate === '') {
        json_error(400, 'validation_error', 'Departure date is required.');
    }
    $monthLabel = trim((string) ($body['monthLabel'] ?? ''));
    if ($monthLabel === '') {
        json_error(400, 'validation_error', 'Package Month Label is required.');
    }

    try {
        $current = content_load_settings($pdo);
        // autoCalculateTiers defaults to true unless explicitly false.
        $autoCalc = ($current['calculatorRates']['autoCalculateTiers'] ?? true) !== false;
        $newRates = $autoCalc
            ? array_merge(
                is_array($current['calculatorRates'] ?? null) ? $current['calculatorRates'] : [],
                content_scaled_tiers($cleanPrice)
            )
            : array_merge(
                is_array($current['calculatorRates'] ?? null) ? $current['calculatorRates'] : [],
                ['sharingPrice' => $cleanPrice]
            );
        $partial = [
            'spotlight' => array_merge(
                is_array($current['spotlight'] ?? null) ? $current['spotlight'] : [],
                [
                    'startingPrice' => $cleanPrice,
                    'departureDate' => $departureDate,
                    'monthLabel' => $monthLabel,
                ]
            ),
            'calculatorRates' => $newRates,
        ];
        $updated = content_apply_config_update($pdo, $partial);
    } catch (Throwable $e) {
        error_log('Admin quick-update failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true, 'config' => $updated]);
}

/**
 * POST /api/admin/reset-defaults — restore all 6 content tables +
 * site_config from api/seed_defaults.php (FLYER_DEFAULTS), PRESERVING
 * the existing teamPhotos from the current site_config and NEVER
 * touching enquiries. One transaction.
 * Returns {synced:true, defaults:{site_config, special_deals,
 * umrah_packages, visa_services, work_permits, work_permit_programmes}}.
 */
function content_reset_defaults(PDO $pdo): void
{
    $seed = content_load_seed_defaults();
    if ($seed === null) {
        json_error(500, 'seed_unavailable', 'Seed defaults are not available on the server yet.');
    }

    $tables = [
        'special_deals' => 'special_deals',
        'umrah_packages' => 'umrah_packages',
        'visa_services' => 'visa_services',
        'work_permits' => 'work_permits',
        'work_permit_programmes' => 'work_permit_programmes',
    ];

    try {
        $current = content_load_settings($pdo);
        $defaultConfig = content_seed_settings($seed);
        // A reset must not wipe the team's photos: the seed has no
        // teamPhotos, so re-apply whatever the admin has already set.
        if (!empty($current['teamPhotos']) && is_array($current['teamPhotos'])) {
            $defaultConfig['teamPhotos'] = $current['teamPhotos'];
        }

        $pdo->beginTransaction();
        content_save_settings($pdo, $defaultConfig);
        foreach ($tables as $table => $seedKey) {
            $res = content_resource_by_table($table);
            $pdo->exec('DELETE FROM `' . $table . '`');
            $rows = isset($seed[$seedKey]) && is_array($seed[$seedKey]) ? $seed[$seedKey] : [];
            foreach ($rows as $record) {
                if (!is_array($record) || empty($record['id'])) {
                    continue;
                }
                $record['sortOrder'] = (int) ($record['sortOrder'] ?? 0);
                $record['isActive'] = isset($record['isActive']) ? (bool) $record['isActive'] : true;
                content_insert_row($pdo, $res, $record);
            }
        }
        $pdo->commit();

        // Return the restored data as stored (canonical re-read).
        $defaults = ['site_config' => content_load_settings($pdo)];
        foreach ($tables as $table => $seedKey) {
            $defaults[$table] = content_fetch_all($pdo, content_resource_by_table($table));
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Admin reset-defaults failed: ' . $e->getMessage());
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }
    json_ok(['synced' => true, 'defaults' => $defaults]);
}

// ---------------------------------------------------------------------------
// DISPATCH
// ---------------------------------------------------------------------------

require_auth();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('Admin content DB connection failed: ' . $e->getMessage());
    json_error(500, 'internal_error', 'Something went wrong. Please try again.');
}

switch ($route ?? '') {
    case 'admin/config':
        if ($method !== 'PUT') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts PUT requests.');
        }
        content_update_config($pdo);
        break;

    case 'admin/quick-update':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        content_quick_update($pdo);
        break;

    case 'admin/reset-defaults':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        content_reset_defaults($pdo);
        break;

    case 'admin/enquiries':
        if ($method === 'GET') {
            content_list_enquiries($pdo);
        }
        json_error(405, 'method_not_allowed', 'This endpoint only accepts GET requests.');
        break;

    case 'admin/enquiries/{id}':
        $enquiryId = (string) ($params['id'] ?? '');
        if ($method === 'PATCH') {
            content_patch_enquiry($pdo, $enquiryId);
        } elseif ($method === 'DELETE') {
            content_delete_enquiry($pdo, $enquiryId);
        }
        json_error(405, 'method_not_allowed', 'This endpoint only accepts PATCH and DELETE requests.');
        break;

    case 'admin/{res}':
    case 'admin/{res}/{id}':
    case 'admin/{res}/{id}/reorder':
    case 'admin/{res}/{id}/duplicate': {
        $resKey = (string) ($params['res'] ?? '');
        $resources = content_resources();
        if (!isset($resources[$resKey])) {
            json_error(404, 'not_found', 'The requested endpoint does not exist.');
        }
        $res = $resources[$resKey];
        $id = (string) ($params['id'] ?? '');

        if ($route === 'admin/{res}') {
            if ($method === 'GET') {
                content_list_records($pdo, $res);
            } elseif ($method === 'POST') {
                content_create_record($pdo, $res);
            }
            json_error(405, 'method_not_allowed', 'This endpoint only accepts GET and POST requests.');
        } elseif ($route === 'admin/{res}/{id}/reorder') {
            if ($method !== 'POST') {
                json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
            }
            content_reorder_record($pdo, $res, $id);
        } elseif ($route === 'admin/{res}/{id}/duplicate') {
            if ($method !== 'POST') {
                json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
            }
            content_duplicate_record($pdo, $res, $id);
        } else { // admin/{res}/{id}
            if ($method === 'GET') {
                content_get_record($pdo, $res, $id);
            } elseif ($method === 'PUT') {
                content_update_record($pdo, $res, $id);
            } elseif ($method === 'DELETE') {
                content_delete_record($pdo, $res, $id);
            }
            json_error(405, 'method_not_allowed', 'This endpoint only accepts GET, PUT and DELETE requests.');
        }
        break;
    }

    default:
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
}
