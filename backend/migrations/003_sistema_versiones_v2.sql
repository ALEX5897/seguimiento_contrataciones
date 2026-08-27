-- ============================================
-- MIGRACIÓN: Sistema de Versiones v2
-- Fecha: 2026-08-24
-- Descripción: Tablas para gestionar reformas y versiones del POA-PAC
-- ============================================

-- 1. Tabla de versiones/reformas
CREATE TABLE IF NOT EXISTS versiones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anio INT NOT NULL,
  numero_reforma INT DEFAULT 0,
  nombre VARCHAR(255),
  descripcion TEXT,
  estado ENUM('borrador', 'aprobado', 'historico') DEFAULT 'borrador',
  activa BOOLEAN DEFAULT 0 COMMENT 'Solo 1 versión puede estar activa',
  usuario_creacion VARCHAR(100),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_aprobacion VARCHAR(100),
  fecha_aprobacion TIMESTAMP NULL,
  usuario_activacion VARCHAR(100),
  fecha_activacion TIMESTAMP NULL,
  presupuesto_total DECIMAL(15,2) DEFAULT 0,
  total_procesos INT DEFAULT 0,
  activos_count INT DEFAULT 0,
  inactivos_count INT DEFAULT 0,

  UNIQUE KEY unique_reforma (anio, numero_reforma),
  INDEX idx_estado (estado),
  INDEX idx_activa (activa),
  INDEX idx_fecha_creacion (fecha_creacion),
  INDEX idx_anio (anio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Versiones y reformas del POA-PAC';

-- 2. Tabla de procesos por versión
CREATE TABLE IF NOT EXISTS subtareas_versiones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version_id INT NOT NULL,
  codigo_olympo VARCHAR(50) NOT NULL,
  subtarea VARCHAR(255) NOT NULL COMMENT 'Nombre del proceso',
  direccion_encargada VARCHAR(100),
  responsable VARCHAR(100),
  responsable_id INT,
  fecha_inicio DATE,
  fecha_fin DATE,
  plazo_contrato INT,
  pac_no_pac VARCHAR(10),
  procedimiento_sugerido VARCHAR(100),
  presupuesto_2026_inicial DECIMAL(15,2) DEFAULT 0,
  costo_2026 DECIMAL(15,2) DEFAULT 0,
  partida_presupuestaria VARCHAR(50),
  cuatrimestre VARCHAR(20),
  activo TINYINT DEFAULT 1,
  proceso_en_riesgo TINYINT DEFAULT 0,
  riesgo_comentario TEXT,
  observaciones TEXT,
  estado_carga VARCHAR(50) DEFAULT 'activo' COMMENT 'activo, eliminado, modificado',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY fk_version (version_id) REFERENCES versiones(id) ON DELETE CASCADE,
  UNIQUE KEY unique_proceso_version (version_id, codigo_olympo),
  INDEX idx_version (version_id),
  INDEX idx_codigo (codigo_olympo),
  INDEX idx_activo (activo),
  INDEX idx_direccion (direccion_encargada),
  INDEX idx_pac_nopac (pac_no_pac)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Procesos/subtareas por versión';

-- 3. Tabla de auditoría de cambios
CREATE TABLE IF NOT EXISTS versiones_cambios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version_id INT NOT NULL,
  tipo_cambio ENUM('crear', 'duplicar', 'excel', 'editar', 'eliminar', 'aprobar', 'activar') NOT NULL,
  usuario VARCHAR(100),
  descripcion TEXT,
  cantidad_registros INT,
  datos_cambio JSON COMMENT 'Datos adicionales en JSON',
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (version_id) REFERENCES versiones(id) ON DELETE CASCADE,
  INDEX idx_version (version_id),
  INDEX idx_fecha (fecha),
  INDEX idx_tipo (tipo_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Auditoría de cambios en versiones';

-- ============================================
-- INSERTAR REFORMA 0 CON DATOS ACTUALES
-- ============================================

INSERT INTO versiones (
  anio, numero_reforma, nombre, descripcion, estado, activa,
  usuario_creacion, fecha_creacion,
  presupuesto_total, total_procesos, activos_count, inactivos_count
) VALUES (
  2026, 0, 'Reforma Base 2026', 'Versión inicial con datos cargados en el sistema',
  'aprobado', 1,
  'SISTEMA', NOW(),
  10631080.06, 227, 81, 145
);

-- Obtener ID de Reforma 0
SET @reforma_id = LAST_INSERT_ID();

-- Insertar todos los procesos actuales en subtareas_versiones
INSERT INTO subtareas_versiones (
  version_id, codigo_olympo, subtarea, direccion_encargada, responsable, responsable_id,
  fecha_inicio, fecha_fin, plazo_contrato, pac_no_pac, procedimiento_sugerido,
  presupuesto_2026_inicial, costo_2026, partida_presupuestaria, cuatrimestre,
  activo, proceso_en_riesgo, riesgo_comentario, observaciones
)
SELECT
  @reforma_id as version_id,
  COALESCE(codigo_olympo, CONCAT('OLY-2026-', id)) as codigo_olympo,
  nombre as subtarea,
  COALESCE(direccion_encargada, 'N/A') as direccion_encargada,
  COALESCE(responsable_directivo, responsable, 'N/A') as responsable,
  responsable_id,
  fecha_inicio,
  fecha_fin,
  plazo_contrato,
  COALESCE(pac_no_pac, tipoPlan, 'PAC') as pac_no_pac,
  COALESCE(procedimiento_sugerido, procedimiento, 'No definido') as procedimiento_sugerido,
  COALESCE(presupuesto_2026_inicial, presupuesto, 0) as presupuesto_2026_inicial,
  COALESCE(costo_2026, 0) as costo_2026,
  partida_presupuestaria,
  COALESCE(cuatrimestre, cuatrimestreNombre, 'Cuatrimestre I') as cuatrimestre,
  CASE WHEN activo IN (0, '0', false) THEN 0 ELSE 1 END as activo,
  CASE WHEN proceso_en_riesgo IN (1, '1', true) THEN 1 ELSE 0 END as proceso_en_riesgo,
  riesgo_comentario,
  observaciones
FROM subtareas
WHERE activo != 0  -- Excluir eliminados lógicamente
ORDER BY id;

-- Registrar migración
INSERT INTO versiones_cambios (
  version_id, tipo_cambio, usuario, descripcion, cantidad_registros
) VALUES (
  @reforma_id, 'crear', 'SISTEMA', 'Migración inicial - Carga de Reforma 0 con datos actuales', 227
);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver Reforma 0
SELECT * FROM versiones WHERE numero_reforma = 0;

-- Contar procesos en Reforma 0
SELECT COUNT(*) as total_procesos FROM subtareas_versiones WHERE version_id = @reforma_id;

-- Ver cambios registrados
SELECT * FROM versiones_cambios WHERE version_id = @reforma_id;

-- Listar algunos procesos de Reforma 0
SELECT codigo_olympo, subtarea, direccion_encargada, presupuesto_2026_inicial, pac_no_pac
FROM subtareas_versiones
WHERE version_id = @reforma_id
LIMIT 10;
