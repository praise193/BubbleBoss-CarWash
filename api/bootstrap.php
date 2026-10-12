<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

date_default_timezone_set(APP_TIMEZONE);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

set_exception_handler(function (Throwable $e): void {
    error_log((string) $e);
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode([
        'ok'    => false,
        'error' => DEBUG ? $e->getMessage() : 'Server error. Please try again.',
    ]);
});

session_name('bubbleboss');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_start();

// responses 
function respond(array $data = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['ok' => true] + $data);
    exit;
}

function fail(string $message, int $code = 400, array $fields = []): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message, 'fields' => (object) $fields]);
    exit;
}

// request helpers 
function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        fail('Method not allowed.', 405);
    }
    
    if ($method === 'POST' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') {
        fail('Invalid request.', 400);
    }
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : [];
}

function clean(mixed $value): string
{
    return trim(is_string($value) ? $value : '');
}

function length(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s) : strlen($s);
}

//  database
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec("SET time_zone = '+02:00'");
    }
    return $pdo;
}

// users
function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $stmt = db()->prepare(
        'SELECT id, name, surname, email, phone, created_at FROM users WHERE id = ?'
    );
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        fail('Please log in first.', 401);
    }
    return $user;
}

function public_user(array $u): array
{
    return [
        'id'      => (int) $u['id'],
        'name'    => $u['name'],
        'surname' => $u['surname'],
        'email'   => $u['email'],
        'phone'   => $u['phone'],
        'since'   => substr((string) $u['created_at'], 0, 10),
    ];
}

// booking rules 
function slot_times(): array
{
    $times = [];
    for ($h = OPEN_HOUR; $h < CLOSE_HOUR; $h++) {
        $times[] = sprintf('%02d:00', $h);
    }
    return $times;
}

function date_problem(string $date): ?string
{
    $d = DateTime::createFromFormat('!Y-m-d', $date);
    if (!$d || $d->format('Y-m-d') !== $date) {
        return 'Please choose a valid date.';
    }
    $today = new DateTime('today');
    if ($d < $today) {
        return 'That date has already passed.';
    }
    if ($d > (clone $today)->modify('+' . MAX_DAYS_AHEAD . ' days')) {
        return 'Bookings open up to ' . MAX_DAYS_AHEAD . ' days ahead.';
    }
    if ((int) $d->format('N') >= 6) {
        return 'We are closed on Saturdays and Sundays.';
    }
    $stmt = db()->prepare('SELECT reason FROM closed_dates WHERE closed_on = ?');
    $stmt->execute([$date]);
    $row = $stmt->fetch();
    if ($row) {
        return 'We are closed on that date' . ($row['reason'] ? ' (' . $row['reason'] . ')' : '') . '.';
    }
    return null;
}

function slot_has_passed(string $date, string $time): bool
{
    return new DateTime("$date $time") <= new DateTime('now');
}

function normalise_plate(string $plate): string
{
    return strtoupper(preg_replace('/[\s\-]+/', '', $plate) ?? '');
}
