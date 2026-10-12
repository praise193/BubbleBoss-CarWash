<?php
require __DIR__ . '/bootstrap.php';
require_method('POST');

$in = json_body();

if (clean($in['website'] ?? '') !== '') {
    respond(); 
}

$name    = clean($in['name'] ?? '');
$email   = strtolower(clean($in['email'] ?? ''));
$subject = clean($in['subject'] ?? '');
$message = clean($in['message'] ?? '');

$errors = [];
if ($name === '' || length($name) > 100)       $errors['name'] = 'Enter your name.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || length($email) > 120) {
    $errors['email'] = 'Enter a valid email address.';
}
if ($subject === '' || length($subject) > 150) $errors['subject'] = 'Enter a subject (up to 150 characters).';
if (length($message) < 5)                      $errors['message'] = 'Write a short message.';
elseif (length($message) > 2000)               $errors['message'] = 'Keep the message under 2000 characters.';
if ($errors) {
    fail('Please fix the highlighted fields.', 422, $errors);
}

$user = current_user();

$stmt = db()->prepare(
    'INSERT INTO messages (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)'
);
$stmt->execute([$user['id'] ?? null, $name, $email, $subject, $message]);

respond([], 201);
