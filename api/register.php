<?php
require __DIR__ . '/bootstrap.php';
require_method('POST');

$in      = json_body();
$name    = clean($in['name'] ?? '');
$surname = clean($in['surname'] ?? '');
$email   = strtolower(clean($in['email'] ?? ''));
$phone   = clean($in['phone'] ?? '');
$pass    = is_string($in['password'] ?? null) ? $in['password'] : '';
$confirm = is_string($in['confirm'] ?? null) ? $in['confirm'] : '';

$errors = [];
if ($name === '' || length($name) > 60)       $errors['name'] = 'Enter your first name.';
if ($surname === '' || length($surname) > 60) $errors['surname'] = 'Enter your surname.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || length($email) > 120) {
    $errors['email'] = 'Enter a valid email address.';
}
if (!preg_match('/^\+?[0-9\s()\-]{7,20}$/', $phone)) {
    $errors['phone'] = 'Enter a valid phone number.';
}
if (strlen($pass) < 8)        $errors['password'] = 'Use at least 8 characters.';
elseif (strlen($pass) > 200)  $errors['password'] = 'That password is too long.';
if ($pass !== $confirm)       $errors['confirm'] = 'Passwords do not match.';

if ($errors) {
    fail('Please fix the highlighted fields.', 422, $errors);
}

$pdo  = db();
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    fail('An account with this email already exists. Try logging in.', 409, ['email' => 'Email already registered.']);
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO users (name, surname, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$name, $surname, $email, $phone, password_hash($pass, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') { 
        fail('An account with this email already exists. Try logging in.', 409, ['email' => 'Email already registered.']);
    }
    throw $e;
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $pdo->lastInsertId();

respond(['user' => public_user(current_user())], 201);
