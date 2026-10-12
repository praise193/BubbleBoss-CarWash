<?php
require __DIR__ . '/bootstrap.php';
require_method('GET');

$user = require_login();

$stmt = db()->prepare(
    "SELECT id, booking_date, TIME_FORMAT(booking_time, '%H:%i') AS booking_time,
            service_name, price, car_make_model, car_plate, status
       FROM bookings
      WHERE user_id = ?
      ORDER BY booking_date, booking_time"
);
$stmt->execute([$user['id']]);

$upcoming = [];
$past     = [];
$now      = new DateTime('now');

foreach ($stmt->fetchAll() as $r) {
    $item = [
        'id'           => (int) $r['id'],
        'date'         => $r['booking_date'],
        'time'         => $r['booking_time'],
        'service'      => $r['service_name'],
        'price'        => (float) $r['price'],
        'carMakeModel' => $r['car_make_model'],
        'plate'        => $r['car_plate'],
        'status'       => $r['status'],
    ];
    $isFuture = new DateTime($r['booking_date'] . ' ' . $r['booking_time']) > $now;
    if ($r['status'] === 'confirmed' && $isFuture) {
        $upcoming[] = $item;
    } else {
        $past[] = $item;
    }
}
$past = array_reverse($past);

respond(['upcoming' => $upcoming, 'past' => $past]);
