<?php
/**
 * api/routes/uploads.php — admin photo uploads to Hostinger disk.
 *
 * Receives $params and $route from the front controller (api/index.php).
 *
 * Endpoint:
 *   POST /api/uploads — require_auth. Multipart `file` + `folder`
 *     (one of zakir_media [default], zakir_team, zakir_work_permits;
 *     anything else is rejected).
 *     Validates with getimagesize() — never trusts the client MIME:
 *     only image/jpeg, image/png, image/webp, image/gif; max 8 MB;
 *     no SVG. Random name `<epoch>_<16 random hex>.<ext>` where the
 *     extension comes from the DETECTED type. Saved under
 *     `uploads/<folder>/` (created when missing, 0755).
 *     Returns {"ok":true,"data":{"url":"/uploads/<folder>/<name>"}}.
 *     On any failure a clear json_error — there is NO DataURL fallback
 *     (gone by design: uploads either land on disk or return an error).
 */

declare(strict_types=1);

/** Max upload size: 8 MB (same limit as the Firebase Storage flow). */
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/** Allowed folders (Storage folder names, kept for compatibility). */
const UPLOAD_ALLOWED_FOLDERS = ['zakir_media', 'zakir_team', 'zakir_work_permits'];

/** Detected MIME type → file extension (extension always from detection). */
const UPLOAD_MIME_TO_EXT = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

switch ($route ?? '') {
    case 'uploads':
        if ($method !== 'POST') {
            json_error(405, 'method_not_allowed', 'This endpoint only accepts POST requests.');
        }
        uploads_handle();
        break;

    default:
        json_error(404, 'not_found', 'The requested endpoint does not exist.');
}

/**
 * POST /api/uploads
 */
function uploads_handle(): void
{
    require_auth();

    $folder = (string) ($_POST['folder'] ?? 'zakir_media');
    if (!in_array($folder, UPLOAD_ALLOWED_FOLDERS, true)) {
        json_error(400, 'invalid_folder', 'Upload folder must be zakir_media, zakir_team or zakir_work_permits.');
    }

    $file = $_FILES['file'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        json_error(400, 'validation_error', 'No file selected.');
    }
    if (($file['error'] ?? UPLOAD_ERR_OK) === UPLOAD_ERR_INI_SIZE
        || ($file['error'] ?? UPLOAD_ERR_OK) === UPLOAD_ERR_FORM_SIZE) {
        json_error(400, 'file_too_large', 'Image must be 8 MB or smaller.');
    }
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        json_error(400, 'upload_error', 'The file could not be uploaded. Please try again.');
    }
    if (!is_uploaded_file((string) ($file['tmp_name'] ?? ''))) {
        json_error(400, 'upload_error', 'The file could not be uploaded. Please try again.');
    }
    if ((int) ($file['size'] ?? 0) > UPLOAD_MAX_BYTES) {
        json_error(400, 'file_too_large', 'Image must be 8 MB or smaller.');
    }

    // Detect the real image type — never trust the client-supplied MIME
    // or extension. getimagesize() returns false for SVG (and for
    // non-images), so SVG is rejected here by design.
    $info = @getimagesize((string) $file['tmp_name']);
    if ($info === false || !isset($info['mime'])) {
        json_error(400, 'invalid_image', 'That file is not a valid image.');
    }
    $mime = (string) $info['mime'];
    if (!isset(UPLOAD_MIME_TO_EXT[$mime])) {
        json_error(400, 'invalid_image', 'Only JPEG, PNG, WebP and GIF images are allowed. SVG files are not allowed.');
    }
    $ext = UPLOAD_MIME_TO_EXT[$mime];

    $name = time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $dir = dirname(__DIR__, 2) . '/uploads/' . $folder;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        error_log('Upload failed: could not create directory ' . $folder);
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    $dest = $dir . '/' . $name;
    if (!move_uploaded_file((string) $file['tmp_name'], $dest)) {
        error_log('Upload failed: could not move uploaded file into ' . $folder);
        json_error(500, 'internal_error', 'Something went wrong. Please try again.');
    }

    json_ok(['url' => '/uploads/' . $folder . '/' . $name], 201);
}
