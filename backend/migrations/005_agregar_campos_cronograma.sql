-- Agregar campos de cronograma faltantes a la tabla subtareas
ALTER TABLE `subtareas`
ADD COLUMN `fecha_inicio` DATE NULL DEFAULT NULL AFTER `plazo_contrato`,
ADD COLUMN `fecha_fin` DATE NULL DEFAULT NULL AFTER `fecha_inicio`,
ADD COLUMN `avance_general` INT NULL DEFAULT 0 AFTER `fecha_fin`;

-- Crear índices para mejor rendimiento de búsquedas
ALTER TABLE `subtareas`
ADD INDEX `idx_fecha_inicio` (`fecha_inicio`),
ADD INDEX `idx_fecha_fin` (`fecha_fin`);

-- Si la tabla subtareas_etapas no tiene fecha_reforma, agregarla también
ALTER TABLE `subtareas_etapas`
ADD COLUMN IF NOT EXISTS `fecha_reforma` DATE NULL DEFAULT NULL AFTER `fecha_tentativa`;
