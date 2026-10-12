<?php

require __DIR__ . '/bootstrap.php';
require_method('GET');

$closed = db()->query(
    'SELECT closed_on FROM closed_dates WHERE closed_on >= CURDATE()'
)->fetchAll(PDO::FETCH_COLUMN);

$services = [];
foreach (SERVICES as $key => $s) {
    $services[] = ['key' => $key, 'name' => $s['name'], 'price' => $s['price']];
}

respond([
    'capacity'     => SLOT_CAPACITY,
    'maxDaysAhead' => MAX_DAYS_AHEAD,
    'today'        => date('Y-m-d'),
    'closedDates'  => $closed,
    'services'     => $services,
]);
