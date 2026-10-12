<?php
require __DIR__ . '/bootstrap.php';
require_method('POST');

$in    = json_body();
$email = strtolower(clean($in['email'] ?? ''));
$pass  = is_string($in['password'] ?? null) ? $in['password'] : '';

if ($email === '' || $pass === '') {
    fail('Enter your email and password.', 422);
}

$stmt = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || !password_verify($pass, $row['password_hash'])) {
    fail('Incorrect email or password.', 401);
}

if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
    $up = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $up->execute([password_hash($pass, PASSWORD_DEFAULT), $row['id']]);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $row['id'];

respond(['user' => public_user(current_user())]);
