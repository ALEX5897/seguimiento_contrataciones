-- =====================================================
-- SISTEMA DE VERSIONES Y REFORMAS POA-PAC
-- =====================================================

-- Tabla de versiones del POA
CREATE TABLE IF NOT EXISTS poa_versiones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anio INT NOT NULL,
  numero_reforma INT NOT NULL DEFAULT 0,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_creacion VARCHAR(100),
  fecha_aprobacion DATETIME,
  estado ENUM('borrador', 'aprobado', 'historico') NOT NULL DEFAULT 'borrador',
  observaciones TEXT,
  presupuesto_total DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_version (anio, numero_reforma),
  INDEX idx_anio (anio),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar columna version_id a subtareas
ALTER TABLE subtareas 
ADD COLUMN version_id INT DEFAULT NULL AFTER id,
ADD COLUMN es_version_actual TINYINT(1) DEFAULT 1 AFTER version_id,
ADD COLUMN subtarea_origen_id INT DEFAULT NULL COMMENT 'ID de la subtarea en la versión anterior',
ADD INDEX idx_version (version_id),
ADD INDEX idx_version_actual (version_id, es_version_actual),
ADD FOREIGN KEY (version_id) REFERENCES poa_versiones(id) ON DELETE SET NULL;

-- Tabla de cambios detallados entre versiones
CREATE TABLE IF NOT EXISTS cambios_reforma (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version_origen_id INT NOT NULL,
  version_destino_id INT NOT NULL,
  subtarea_id INT NOT NULL,
  tipo_cambio ENUM('creacion', 'modificacion', 'eliminacion', 'reactivacion') NOT NULL,
  campo_modificado VARCHAR(100),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_cambio VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_version_origen (version_origen_id),
  INDEX idx_version_destino (version_destino_id),
  INDEX idx_subtarea (subtarea_id),
  INDEX idx_tipo_cambio (tipo_cambio),
  FOREIGN KEY (version_origen_id) REFERENCES poa_versiones(id) ON DELETE CASCADE,
  FOREIGN KEY (version_destino_id) REFERENCES poa_versiones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear versión inicial POA-PAC 2026
INSERT INTO poa_versiones (anio, numero_reforma, nombre, descripcion, estado, usuario_creacion)
VALUES (2026, 0, 'POA-PAC 2026', 'Versión original del Plan Operativo Anual 2026', 'aprobado', 'sistema')
ON DUPLICATE KEY UPDATE id=id;

-- Asignar actividades existentes a la versión inicial
UPDATE subtareas 
SET version_id = (SELECT id FROM poa_versiones WHERE anio = 2026 AND numero_reforma = 0),
    es_version_actual = 1
WHERE version_id IS NULL;

-- Actualizar presupuesto total de la versión
UPDATE poa_versiones pv
SET presupuesto_total = (
  SELECT COALESCE(SUM(presupuesto), 0) 
  FROM subtareas 
  WHERE version_id = pv.id AND activo = 1
)
WHERE anio = 2026 AND numero_reforma = 0;

-- Vista para comparación de versiones
CREATE OR REPLACE VIEW v_comparacion_versiones AS
SELECT 
  s.id,
  s.nombre,
  s.codigo_olympo,
  s.presupuesto,
  s.estado,
  s.activo,
  s.version_id,
  pv.nombre AS version_nombre,
  pv.numero_reforma,
  s.subtarea_origen_id,
  -- Cambios respecto a versión anterior
  IF(s.subtarea_origen_id IS NULL, 'NUEVA', 
    IF(s.activo = 0, 'DESHABILITADA', 'MODIFICADA')) AS tipo_operacion
FROM subtareas s
JOIN poa_versiones pv ON s.version_id = pv.id
ORDER BY pv.numero_reforma DESC, s.nombre;

-- Vista resumen por versión
CREATE OR REPLACE VIEW v_resumen_versiones AS
SELECT 
  pv.id,
  pv.anio,
  pv.numero_reforma,
  pv.nombre,
  pv.estado,
  pv.fecha_creacion,
  pv.fecha_aprobacion,
  pv.presupuesto_total,
  COUNT(DISTINCT s.id) AS total_actividades,
  SUM(IF(s.activo = 1, 1, 0)) AS actividades_activas,
  SUM(IF(s.activo = 0, 1, 0)) AS actividades_inactivas,
  SUM(IF(s.subtarea_origen_id IS NULL, 1, 0)) AS actividades_nuevas,
  COUNT(DISTINCT cr.id) AS total_cambios
FROM poa_versiones pv
LEFT JOIN subtareas s ON pv.id = s.version_id
LEFT JOIN cambios_reforma cr ON pv.id = cr.version_destino_id
GROUP BY pv.id
ORDER BY pv.numero_reforma DESC;

-- ==================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ==================================================
-- 
-- FLUJO DE TRABAJO:
-- 1. Crear nueva reforma desde Admin de Versiones
-- 2. Sistema duplica todas las subtareas activas
-- 3. Asigna nuevo version_id a las copias
-- 4. Marca versión anterior como histórica
-- 5. Permite editar nueva versión (borrador)
-- 6. Al aprobar, cambia estado a 'aprobado'
-- 7. Registra cambios en tabla cambios_reforma
--
-- CONSULTAS ÚTILES:
-- Ver versión actual:
--   SELECT * FROM subtareas WHERE es_version_actual = 1
--
-- Ver histórico completo:
--   SELECT * FROM v_comparacion_versiones
--
-- Cambios entre reformas:
--   SELECT * FROM cambios_reforma WHERE version_destino_id = X
--
-- ==================================================
