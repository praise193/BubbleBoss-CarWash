<?php

const DB_HOST = '127.0.0.1';
const DB_PORT = 8889;
const DB_NAME = 'bubbleboss';
const DB_USER = 'root';
const DB_PASS = 'root';

const DEBUG = true;

const APP_TIMEZONE   = 'Africa/Johannesburg';
const SLOT_CAPACITY  = 4;     
const OPEN_HOUR      = 8;     
const CLOSE_HOUR     = 21;    
const MAX_DAYS_AHEAD = 60;    

const SERVICES = [
    'basic'   => ['name' => 'Basic Cleaning',   'price' => 250.99],
    'premium' => ['name' => 'Premium Cleaning', 'price' => 350.99],
    'complex' => ['name' => 'Complex Cleaning', 'price' => 490.99],
];
