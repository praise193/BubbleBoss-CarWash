
CREATE DATABASE IF NOT EXISTS bubbleboss
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bubbleboss;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(60)   NOT NULL,
  surname       VARCHAR(60)   NOT NULL,
  email         VARCHAR(120)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,           
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS bookings (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED  NOT NULL,
  booking_date   DATE          NOT NULL,
  booking_time   TIME          NOT NULL,
  service_key    VARCHAR(20)   NOT NULL,
  service_name   VARCHAR(50)   NOT NULL,
  price          DECIMAL(8,2)  NOT NULL,
  car_make_model VARCHAR(60)   NOT NULL,
  car_plate      VARCHAR(12)   NOT NULL,
  status         ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at   DATETIME      NULL,
 
  active_plate   VARCHAR(12) GENERATED ALWAYS AS (IF(status = 'confirmed', car_plate, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_car (booking_date, booking_time, active_plate),
  KEY idx_slot (booking_date, booking_time, status),
  KEY idx_user (user_id, booking_date),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NULL,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(120)  NOT NULL,
  subject    VARCHAR(150)  NOT NULL,
  message    TEXT          NOT NULL,
  is_read    TINYINT(1)    NOT NULL DEFAULT 0,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_created (created_at),
  CONSTRAINT fk_messages_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS closed_dates (
  closed_on DATE         NOT NULL,
  reason    VARCHAR(100) NULL,
  PRIMARY KEY (closed_on)
) ENGINE=InnoDB;

INSERT IGNORE INTO closed_dates (closed_on, reason) VALUES
  ('2026-12-16', 'Day of Reconciliation'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Day of Goodwill'),
  ('2027-01-01', 'New Year''s Day');
