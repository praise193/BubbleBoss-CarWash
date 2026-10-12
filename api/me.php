<?php
require __DIR__ . '/bootstrap.php';
require_method('GET');

$user = current_user();
respond([
    'loggedIn' => $user !== null,
    'user'     => $user ? public_user($user) : null,
]);
