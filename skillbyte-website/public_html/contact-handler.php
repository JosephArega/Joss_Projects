<?php
/**
 * SkillByte contact form handler
 * -----------------------------------------------------------------------
 * Plain PHP using mail(), which cPanel/Apache hosting supports natively.
 * No dependencies, no Composer, nothing to install.
 *
 * EDIT THE CONFIG BLOCK BELOW before going live — particularly $TO and
 * $FROM. Everything else has a sensible default.
 *
 * Responds with JSON when called by the site's JavaScript, and with a
 * normal redirect when the form is posted without JavaScript.
 */

declare(strict_types=1);

// =======================================================================
// CONFIG — edit these
// =======================================================================

/** Where enquiries are delivered. Add more addresses separated by commas. */
$TO = 'hello@connectskillbyte.com';

/**
 * The envelope sender. This MUST be an address on connectskillbyte.com —
 * shared hosts reject or spam-bin mail claiming to be from a domain they
 * do not control. Never put the visitor's address here: their address goes
 * in Reply-To, so hitting reply still works.
 */
$FROM = 'website@connectskillbyte.com';

/** Prefix on the email subject line, so enquiries filter easily. */
$SUBJECT_PREFIX = '[SkillByte enquiry] ';

/** Where no-JavaScript visitors land after a successful send. */
$SUCCESS_URL = 'thank-you.html';

/** Where no-JavaScript visitors land if something failed. */
$ERROR_URL = 'contact.html?status=error#contact-form';

/** Max submissions allowed from one IP address per hour. */
$RATE_LIMIT = 5;

/** Set to true to also append every enquiry to a local log file. */
$KEEP_LOG = false;
$LOG_FILE = __DIR__ . '/../skillbyte-enquiries.log'; // outside public_html

// =======================================================================
// Nothing below here normally needs editing
// =======================================================================

/** Wants JSON back, or a redirect? */
function wants_json(): bool
{
    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if (strtolower($xhr) === 'xmlhttprequest') {
        return true;
    }
    return strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
}

/**
 * Send the response and stop.
 *
 * @param bool   $ok      Did the enquiry go through?
 * @param string $message Human-readable result.
 * @param int    $status  HTTP status code.
 */
function respond(bool $ok, string $message, int $status = 200): void
{
    global $SUCCESS_URL, $ERROR_URL;

    if (wants_json()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message]);
        exit;
    }

    // No JavaScript: fall back to a plain redirect.
    header('Location: ' . ($ok ? $SUCCESS_URL : $ERROR_URL), true, 303);
    exit;
}

/**
 * Strip CR/LF from any value destined for a mail header.
 *
 * Without this, a visitor could put "\r\nBcc: everyone@example.com" in the
 * name field and use the form to send mail to anyone — the classic email
 * header injection. Applied to every header value, no exceptions.
 */
function header_safe(string $value): string
{
    $value = str_replace(["\r", "\n", "%0a", "%0d", "%0A", "%0D"], ' ', $value);
    // Drop any remaining control characters, then collapse runs of spaces.
    $value = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '';
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return trim($value);
}

/**
 * Build a display name that is safe to place before an <address>.
 *
 * Beyond stripping CR/LF, this removes the characters that would let a
 * value break out of its quoted string or terminate the address, then
 * quotes the result. A name is decorative here — the address is what
 * matters — so being aggressive costs nothing.
 */
function display_name(string $value): string
{
    $value = header_safe($value);
    $value = str_replace(['"', '\\', '<', '>', ',', ';', ':', '@'], ' ', $value);
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    $value = mb_substr($value, 0, 78);

    if ($value === '') {
        return 'Website enquiry';
    }
    return '"' . $value . '"';
}

/** Collapse a single-line field so it cannot break the message layout. */
function one_line(string $value): string
{
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return trim($value);
}

/** Read a POST field as a trimmed string. */
function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) {
        return '';
    }
    return trim($value);
}

// -----------------------------------------------------------------------
// Only accept POST
// -----------------------------------------------------------------------

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'This endpoint only accepts form submissions.', 405);
}

// -----------------------------------------------------------------------
// Spam gates
// -----------------------------------------------------------------------

// 1. Honeypot. The field is hidden from humans and left empty; bots that
//    fill in every input give themselves away. Answer with a success
//    message so the bot has no signal to adapt to.
if (field('website') !== '') {
    respond(true, 'Thank you — your message has been sent.');
}

// 2. Time trap. JavaScript stamps the render time into a hidden field;
//    anything submitted within two seconds was not typed by a person.
//    Skipped entirely when the field is absent, so no-JS visitors are
//    never blocked by it.
$elapsed = field('elapsed');
if ($elapsed !== '' && ctype_digit($elapsed) && (int) $elapsed < 2) {
    respond(true, 'Thank you — your message has been sent.');
}

// 3. Rate limit per IP, in a temp file. Crude but effective against the
//    volume of drive-by form spam a small site actually sees.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$bucket = sys_get_temp_dir() . '/skillbyte_rl_' . md5($ip);
$now = time();
$hits = [];

if (is_readable($bucket)) {
    $raw = @file_get_contents($bucket);
    if ($raw !== false) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            // Keep only hits from the last hour
            $hits = array_values(array_filter($decoded, static function ($t) use ($now) {
                return is_int($t) && ($now - $t) < 3600;
            }));
        }
    }
}

if (count($hits) >= $RATE_LIMIT) {
    respond(false, 'You have sent several messages recently. Please email us directly at ' . $TO . '.', 429);
}

$hits[] = $now;
@file_put_contents($bucket, json_encode($hits), LOCK_EX);

// -----------------------------------------------------------------------
// Validation — server side, because client-side validation is a courtesy
// to the visitor, not a control.
// -----------------------------------------------------------------------

$name    = field('name');
$email   = field('email');
$phone   = field('phone');
$company = field('company');
$service = field('service');
$budget  = field('budget');
$message = field('message');

$errors = [];

if ($name === '') {
    $errors[] = 'Please tell us your name.';
} elseif (mb_strlen($name) > 100) {
    $errors[] = 'That name is longer than we can accept.';
}

if ($email === '') {
    $errors[] = 'Please enter your email address.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    $errors[] = 'Please enter a valid email address.';
}

if ($message === '') {
    $errors[] = 'Please tell us a little about your project.';
} elseif (mb_strlen($message) < 10) {
    $errors[] = 'A little more detail helps us give you a useful reply.';
} elseif (mb_strlen($message) > 5000) {
    $errors[] = 'That message is too long. Please email us directly instead.';
}

if (mb_strlen($phone) > 40 || mb_strlen($company) > 120) {
    $errors[] = 'One of the fields is longer than we can accept.';
}

// A message that is mostly links is almost always spam.
if (substr_count(strtolower($message), 'http') > 4) {
    respond(true, 'Thank you — your message has been sent.');
}

if ($errors) {
    respond(false, implode(' ', $errors), 422);
}

// -----------------------------------------------------------------------
// Compose
// -----------------------------------------------------------------------

$safeEmail = header_safe($email);

$subject = $SUBJECT_PREFIX . ($service !== '' ? $service : 'New enquiry') . ' — ' . one_line($name);
$subject = header_safe($subject);

$lines = [
    'New enquiry from the connectskillbyte.com contact form.',
    '',
    'Name:     ' . one_line($name),
    'Email:    ' . one_line($email),
    'Phone:    ' . ($phone !== '' ? one_line($phone) : '—'),
    'Company:  ' . ($company !== '' ? one_line($company) : '—'),
    'Service:  ' . ($service !== '' ? one_line($service) : '—'),
    'Budget:   ' . ($budget !== '' ? one_line($budget) : '—'),
    '',
    'Message',
    '-------',
    $message,
    '',
    '---',
    'Sent: ' . date('Y-m-d H:i:s T'),
    'IP:   ' . $ip,
];

$body = implode("\r\n", $lines);
// mail() expects lines no longer than 70 characters for maximum
// compatibility with older MTAs.
$body = wordwrap($body, 70, "\r\n", true);

$headers = [
    'From: SkillByte Website <' . header_safe($FROM) . '>',
    'Reply-To: ' . display_name($name) . ' <' . $safeEmail . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: SkillByte-Contact-Form',
];

// -----------------------------------------------------------------------
// Send
// -----------------------------------------------------------------------

$sent = @mail(
    $TO,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . header_safe($FROM)
);

if ($KEEP_LOG) {
    @file_put_contents(
        $LOG_FILE,
        date('c') . ' ' . ($sent ? 'SENT' : 'FAILED') . ' ' . $email . ' ' . str_replace("\n", ' ', $message) . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}

if (!$sent) {
    respond(
        false,
        'We could not send your message just now. Please email us directly at ' . $TO . '.',
        500
    );
}

respond(true, 'Thank you — your message is on its way. We reply within one business day.');
