CREATE DATABASE IF NOT EXISTS portifolio_love
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE portifolio_love;

CREATE TABLE IF NOT EXISTS memories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  content_type ENUM('photo', 'carousel', 'text') NOT NULL,
  author VARCHAR(100) NOT NULL,
  location VARCHAR(160) NOT NULL DEFAULT 'Nosso cantinho',
  memory_date VARCHAR(40) NOT NULL,
  memory_time VARCHAR(20) NULL,
  image_urls JSON NOT NULL,
  title VARCHAR(60) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  tags JSON NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  private_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX memories_created_at_idx (created_at)
);

CREATE TABLE IF NOT EXISTS love_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author VARCHAR(100) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX love_notes_created_at_idx (created_at)
);

CREATE TABLE IF NOT EXISTS couple_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX couple_events_date_idx (event_date)
);

CREATE TABLE IF NOT EXISTS couple_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  person_one VARCHAR(80) NOT NULL,
  person_two VARCHAR(80) NOT NULL,
  relationship_start_date DATE NOT NULL,
  joao_avatar_url VARCHAR(2048) NULL,
  caio_avatar_url VARCHAR(2048) NULL
);

INSERT IGNORE INTO couple_settings (id, person_one, person_two, relationship_start_date)
VALUES (1, 'Você', 'Seu amor', '2026-08-16');
