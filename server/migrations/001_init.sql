-- 001 — schema iniziale: media, cards, settings

CREATE TABLE media (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  card_id INT UNSIGNED NULL,
  filename VARCHAR(80) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime VARCHAR(40) NOT NULL,
  width INT UNSIGNED NOT NULL,
  height INT UNSIGNED NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  path_relative VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_media_path (path_relative),
  KEY ix_media_card (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cards (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(10) NOT NULL,
  title VARCHAR(200) NOT NULL,
  subtitle VARCHAR(300) NOT NULL DEFAULT '',
  price VARCHAR(60) NOT NULL DEFAULT '',
  sku VARCHAR(80) NOT NULL DEFAULT '',
  category VARCHAR(100) NOT NULL DEFAULT '',
  hero_media_id INT UNSIGNED NULL,
  content_html MEDIUMTEXT NOT NULL,
  style_json JSON NOT NULL,
  custom_qr_url VARCHAR(2000) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_cards_public_id (public_id),
  KEY ix_cards_category (category),
  KEY ix_cards_updated (updated_at),
  CONSTRAINT fk_cards_hero FOREIGN KEY (hero_media_id) REFERENCES media (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE media
  ADD CONSTRAINT fk_media_card FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE SET NULL;

CREATE TABLE settings (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES ('public_base_url', '');
