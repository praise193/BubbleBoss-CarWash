<?php
require __DIR__ . '/bootstrap.php';
require_method('POST');

$user = require_login();
$id   = (int) (json_body()['id'] ?? 0);

$stmt = db()->prepare(
    "SELECT booking_date, booking_time, status FROM bookings WHERE id = ? AND user_id = ?"
);
$stmt->execute([$id, $user['id']]);
$b = $stmt->fetch();

if (!$b) {
    fail('Booking not found.', 404);
}
if ($b['status'] !== 'confirmed') {
    fail('That booking is already cancelled.', 409);
}
if (slot_has_passed($b['booking_date'], $b['booking_time'])) {
    fail('Past bookings cannot be cancelled.', 409);
}

$up = db()->prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = ? AND user_id = ?");
$up->execute([$id, $user['id']]);

respond();
