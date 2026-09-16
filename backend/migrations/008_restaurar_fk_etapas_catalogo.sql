-- Restaurar restricción de clave foránea para mantener integridad entre etapas_pac y etapas_catalogo
ALTER TABLE `etapas_catalogo`
ADD CONSTRAINT `etapas_catalogo_ibfk_1`
FOREIGN KEY (`id`) REFERENCES `etapas_pac` (`id`) ON DELETE CASCADE;

-- Ahora el catálogo está vinculado directamente a etapas_pac
-- Las etapas deben existir en ambas tablas de forma sincronizada
