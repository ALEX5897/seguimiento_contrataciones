-- ============================================
-- CONSULTAS ÚTILES DEL CATÁLOGO DE ETAPAS
-- ============================================

-- 1. Ver todas las etapas con su clasificación
SELECT
  id,
  nombre,
  clasificacion,
  orden
FROM etapas_catalogo
ORDER BY clasificacion, orden;

-- 2. Ver etapas por fase
SELECT
  nombre,
  COUNT(*) as cantidad
FROM etapas_catalogo
GROUP BY clasificacion
ORDER BY FIELD(clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar');

-- 3. Ver etapas de la fase preparatoria
SELECT
  id,
  nombre,
  orden
FROM etapas_catalogo
WHERE clasificacion = 'preparatoria'
ORDER BY orden;

-- 4. Ver etapas de la fase precontractual
SELECT
  id,
  nombre,
  orden
FROM etapas_catalogo
WHERE clasificacion = 'precontractual'
ORDER BY orden;

-- 5. Ver etapas de la fase contractual
SELECT
  id,
  nombre,
  orden
FROM etapas_catalogo
WHERE clasificacion = 'contractual'
ORDER BY orden;

-- 6. Ver etapas sin clasificar
SELECT
  id,
  nombre
FROM etapas_catalogo
WHERE clasificacion = 'sin_clasificar'
ORDER BY id;

-- 7. Obtener la clasificación de una etapa específica
SELECT
  id,
  nombre,
  clasificacion,
  orden
FROM etapas_catalogo
WHERE id = ? OR nombre LIKE ?;

-- 8. Contar etapas por clasificación con estadísticas
SELECT
  clasificacion,
  COUNT(*) as cantidad,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM etapas_catalogo), 2) as porcentaje
FROM etapas_catalogo
GROUP BY clasificacion
ORDER BY FIELD(clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar');

-- 9. Ver el progreso de un proceso (qué fase está en)
SELECT
  se.subtarea_id,
  se.etapa_id,
  ep.nombre,
  ec.clasificacion,
  ec.orden,
  se.fecha_reforma,
  seg.estado
FROM subtareas_etapas se
LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
LEFT JOIN etapas_catalogo ec ON se.etapa_id = ec.id
LEFT JOIN seguimiento_etapas seg ON se.subtarea_id = seg.subtarea_id AND se.etapa_id = seg.etapa_id
WHERE se.subtarea_id = ? AND se.aplica = 1
ORDER BY
  FIELD(ec.clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar'),
  ec.orden;

-- 10. Resumen de cambios realizados en el catálogo
SELECT
  id,
  nombre,
  clasificacion,
  updated_at
FROM etapas_catalogo
WHERE updated_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY updated_at DESC;

-- 11. Actualizar clasificación de una etapa específica
-- EJEMPLO: Cambiar etapa 6 (MESA TECNICA) a clasificación 'precontractual' con orden 25
/*
UPDATE etapas_catalogo
SET clasificacion = 'precontractual', orden = 25
WHERE id = 6;
*/

-- 12. Consulta JOIN con seguimiento para ver progreso real
SELECT
  s.id as subtarea_id,
  s.nombre as proceso,
  ep.nombre as etapa,
  ec.clasificacion,
  seg.estado,
  se.fecha_reforma,
  COUNT(CASE WHEN seg.estado = 'completada' THEN 1 END) OVER (PARTITION BY s.id) as etapas_completadas,
  COUNT(*) OVER (PARTITION BY s.id) as total_etapas
FROM subtareas s
INNER JOIN subtareas_etapas se ON s.id = se.subtarea_id
LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
LEFT JOIN etapas_catalogo ec ON se.etapa_id = ec.id
LEFT JOIN seguimiento_etapas seg ON se.subtarea_id = seg.subtarea_id AND se.etapa_id = seg.etapa_id
WHERE se.aplica = 1
ORDER BY s.id, FIELD(ec.clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar'), ec.orden;

-- 13. Etapas críticas (ajudicación y contrato)
SELECT
  s.id,
  s.nombre,
  MAX(CASE WHEN ep.nombre = 'ADJUDICACION' THEN seg.estado END) as estado_adjudicacion,
  MAX(CASE WHEN ep.nombre = 'CONTRATO' THEN seg.estado END) as estado_contrato
FROM subtareas s
INNER JOIN subtareas_etapas se ON s.id = se.subtarea_id
LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
LEFT JOIN seguimiento_etapas seg ON se.subtarea_id = seg.subtarea_id AND se.etapa_id = seg.etapa_id
WHERE se.aplica = 1
GROUP BY s.id, s.nombre;

-- 14. Buscar etapas por palabra clave
SELECT
  id,
  nombre,
  clasificacion
FROM etapas_catalogo
WHERE nombre LIKE CONCAT('%', ?, '%')
ORDER BY clasificacion, orden;

-- 15. Crear VIEW para facilitar consultas frecuentes
/*
CREATE VIEW v_etapas_clasificadas AS
SELECT
  ec.id,
  ec.nombre,
  ec.clasificacion,
  ec.orden,
  CASE
    WHEN ec.clasificacion = 'preparatoria' THEN '🔵'
    WHEN ec.clasificacion = 'precontractual' THEN '🟢'
    WHEN ec.clasificacion = 'contractual' THEN '🔴'
    ELSE '⚪'
  END as icono
FROM etapas_catalogo ec
ORDER BY FIELD(ec.clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar'), ec.orden;
*/
