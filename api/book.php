<?php
require __DIR__ . '/bootstrap.php';
require_method('POST');

$user = require_login();
$in   = json_body();

$date       = clean($in['date'] ?? '');
$time       = clean($in['time'] ?? '');
$serviceKey = clean($in['service'] ?? '');
$carModel   = clean($in['carMakeModel'] ?? '');
$plate      = normalise_plate(clean($in['plate'] ?? ''));

$errors = [];
if (!isset(SERVICES[$serviceKey]))                      $errors['service'] = 'Choose a package.';
if (length($carModel) < 2 || length($carModel) > 60)    $errors['carMakeModel'] = 'Enter the car make and model, e.g. Toyota Corolla.';
if (!preg_match('/^[A-Z0-9]{2,12}$/', $plate))          $errors['plate'] = 'Enter a valid number plate.';
if (!in_array($time, slot_times(), true))               $errors['time'] = 'Choose a time slot.';
if ($errors) {
    fail('Please check the booking details.', 422, $errors);
}

if ($problem = date_problem($date)) {
    fail($problem, 422, ['date' => $problem]);
}
if (slot_has_passed($date, $time)) {
    fail('That time has already passed. Please pick a later slot.', 422, ['time' => 'Time has passed.']);
}

$pdo     = db();
$service = SERVICES[$serviceKey];

$lockName = 'bb_slot_' . $date . '_' . $time;
$got = $pdo->prepare('SELECT GET_LOCK(?, 5)');
$got->execute([$lockName]);
if ((int) $got->fetchColumn() !== 1) {
    fail('The system is busy. Please try again in a moment.', 503);
}

try {
    $pdo->beginTransaction();

    $count = $pdo->prepare(
        "SELECT COUNT(*) FROM bookings
          WHERE booking_date = ? AND booking_time = ? AND status = 'confirmed'"
    );
    $count->execute([$date, $time]);
    if ((int) $count->fetchColumn() >= SLOT_CAPACITY) {
        $pdo->rollBack();
        fail('Sorry, that time slot is now full. Please choose another.', 409, ['time' => 'Slot is full.']);
    }

    $same = $pdo->prepare(
        "SELECT id FROM bookings
          WHERE booking_date = ? AND booking_time = ? AND car_plate = ? AND status = 'confirmed'"
    );
    $same->execute([$date, $time, $plate]);
    if ($same->fetch()) {
        $pdo->rollBack();
        fail('That car is already booked for this slot. Pick another time or use a different car.', 409, ['plate' => 'This car is already booked for this slot.']);
    }

    $ins = $pdo->prepare(
        'INSERT INTO bookings
            (user_id, booking_date, booking_time, service_key, service_name, price, car_make_model, car_plate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $user['id'], $date, $time, $serviceKey, $service['name'], $service['price'], $carModel, $plate,
    ]);
    $id = (int) $pdo->lastInsertId();
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23000') { 
        fail('That car is already booked for this slot.', 409, ['plate' => 'This car is already booked for this slot.']);
    }
    throw $e;
} finally {
    $rel = $pdo->prepare('SELECT RELEASE_LOCK(?)');
    $rel->execute([$lockName]);
}

respond([
    'booking' => [
        'id'           => $id,
        'date'         => $date,
        'time'         => $time,
        'service'      => $service['name'],
        'price'        => $service['price'],
        'carMakeModel' => $carModel,
        'plate'        => $plate,
    ],
], 201);
