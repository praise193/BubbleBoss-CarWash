<?php
require __DIR__ . '/bootstrap.php';
require_method('GET');

$date    = clean($_GET['date'] ?? '');
$problem = date_problem($date);
if ($problem) {
    respond(['open' => false, 'reason' => $problem, 'slots' => []]);
}

$stmt = db()->prepare(
    "SELECT TIME_FORMAT(booking_time, '%H:%i') AS t, COUNT(*) AS c
       FROM bookings
      WHERE booking_date = ? AND status = 'confirmed'
      GROUP BY booking_time"
);
$stmt->execute([$date]);
$taken = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$slots = [];
foreach (slot_times() as $time) {
    $count     = (int) ($taken[$time] ?? 0);
    $remaining = max(0, SLOT_CAPACITY - $count);
    $past      = slot_has_passed($date, $time);
    $slots[] = [
        'time'      => $time,
        'remaining' => $remaining,
        'full'      => $remaining === 0,
        'past'      => $past,
        'available' => !$past && $remaining > 0,
    ];
}

respond(['open' => true, 'capacity' => SLOT_CAPACITY, 'slots' => $slots]);
