-- QR Card Studio — schema del database MySQL 8 (utf8mb4 / utf8mb4_unicode_ci)
-- Generato da: mysqldump --no-data. La fonte autorevole sono le migrazioni in
-- server/migrations/ (eseguite con `npm run migrate`, tracciate in schema_migrations).
-- Uso manuale:  mysql -u <utente> -p <database> < db/schema.sql

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `cards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `public_id` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitle` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `price` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `sku` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `hero_media_id` int unsigned DEFAULT NULL,
  `content_html` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `style_json` json NOT NULL,
  `custom_qr_url` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cards_public_id` (`public_id`),
  KEY `ix_cards_category` (`category`),
  KEY `ix_cards_updated` (`updated_at`),
  KEY `fk_cards_hero` (`hero_media_id`),
  CONSTRAINT `fk_cards_hero` FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `media` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `card_id` int unsigned DEFAULT NULL,
  `filename` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `width` int unsigned NOT NULL,
  `height` int unsigned NOT NULL,
  `size_bytes` int unsigned NOT NULL,
  `path_relative` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_media_path` (`path_relative`),
  KEY `ix_media_card` (`card_id`),
  CONSTRAINT `fk_media_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `schema_migrations` (
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `settings` (
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valore iniziale delle impostazioni (vuoto = URL pubblico automatico)
INSERT INTO `settings` (`key`, `value`) VALUES ('public_base_url', '');

-- Le migrazioni incluse in questo schema risultano già applicate
INSERT INTO `schema_migrations` (`name`) VALUES ('001_init.sql');

SET FOREIGN_KEY_CHECKS = 1;
