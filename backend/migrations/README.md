# Migraciones de Base de Datos

## Overview

Este directorio contiene migraciones completas de la base de datos del sistema de seguimiento de contrataciones.

## Archivos de Migración

### 2026-09-16T15-55-58_complete_migration.sql
- **Fecha:** 16 de septiembre de 2026
- **Tablas:** 20
- **Tamaño:** 5.1 MB
- **Contenido:** Estructura completa + datos

**Tablas incluidas:**
- `audit_log` - Registro de auditoría
- `catalogo` - Catálogo general
- `comentarios_etapa` - Comentarios en etapas
- `configuracion_notificaciones` - Configuración de notificaciones
- `direcciones_catalogo` - Catálogo de direcciones
- `etapas_catalogo` - Catálogo de etapas
- `etapas_proceso` - Etapas de procesos
- `notificaciones` - Notificaciones enviadas
- `permisos` - Permisos generales
- `permisos_menu_catalogo` - Permisos de menú
- `permisos_modulos_catalogo` - Permisos de módulos
- `permisos_roles_campos_etapas` - Permisos por roles en campos
- `permisos_roles_menu` - Permisos de roles en menú
- `permisos_roles_modulos` - Permisos de roles en módulos
- `procesos` - Procesos principales
- `responsables_catalogo` - Catálogo de responsables
- `seguimiento_etapas` - Seguimiento de etapas
- `usuarios` - Usuarios del sistema
- `usuarios_direcciones` - Asignación usuarios-direcciones
- `versiones` - Historial de versiones

## Cómo Usar

### Exportar Migración Completa

```bash
cd backend
node scripts/export-migration.js
```

Esto creará un nuevo archivo SQL con timestamp en `migrations/`.

### Restaurar Migración

```bash
cd backend
node scripts/restore-migration.js migrations/2026-09-16T15-55-58_complete_migration.sql
```

### Restaurar Manualmente

```bash
# Con MySQL CLI
mysql -h localhost -u root -p < migrations/2026-09-16T15-55-58_complete_migration.sql

# Desde el cliente de Node.js
node scripts/restore-migration.js <ruta_archivo>
```

## Variables de Entorno Requeridas

El script de restauración usa:
- `DB_HOST` - Host de la base de datos (default: localhost)
- `DB_USER` - Usuario de MySQL (default: root)
- `DB_PASSWORD` - Contraseña de MySQL
- `DB_NAME` - Nombre de la base de datos (default: test_migracion)

## Notas Importantes

⚠️ **Precaución:**
- Las migraciones contienen `DROP TABLE IF EXISTS`, lo que eliminará tablas existentes
- Hacer un backup antes de restaurar es altamente recomendado
- Las migraciones con datos también restaurarán todos los registros

## Estructura de Datos

### Procesos
- 227 procesos registrados
- Cada proceso tiene múltiples etapas

### Etapas
- 11.3K etapas en total
- Asociadas a procesos específicos

### Usuarios
- Roles basados en direcciones
- Permisos granulares por módulo y función

## Versionado

Cada migración tiene timestamp para evitar conflictos:
- Formato: `YYYY-MM-DDTHH-MM-SS_complete_migration.sql`
- Permite mantener histórico de cambios

## Support

Para preguntas o problemas:
1. Revisar logs de la aplicación
2. Verificar que las credenciales de BD sean correctas
3. Confirmar que MySQL está ejecutándose
