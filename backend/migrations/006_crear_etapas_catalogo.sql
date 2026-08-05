-- Crear tabla de catálogo de etapas
CREATE TABLE IF NOT EXISTS `etapas_catalogo` (
  `id` INT NOT NULL PRIMARY KEY,
  `nombre` VARCHAR(255) NOT NULL UNIQUE,
  `clasificacion` VARCHAR(50) NOT NULL DEFAULT 'sin_clasificar',
  `orden` INT NULL DEFAULT NULL,
  `descripcion` TEXT NULL DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_clasificacion` (`clasificacion`),
  INDEX `idx_orden` (`orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
