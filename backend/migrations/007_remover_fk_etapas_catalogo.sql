-- Remover restricción de clave foránea para permitir crear nuevas etapas independientes
ALTER TABLE `etapas_catalogo`
DROP FOREIGN KEY `etapas_catalogo_ibfk_1`;

-- Ahora la tabla etapas_catalogo es independiente de etapas_pac
-- Se puede crear nuevas etapas sin que existan en etapas_pac
