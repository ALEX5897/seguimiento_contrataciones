# Matriz de Proceso de Prueba - Seguimiento Contrataciones

## Proceso: Contratación de Servicios de Consultoría

| Campo | Tipo | Valor Ejemplo | Descripción |
|-------|------|---------------|-------------|
| **id** | INT | 1 | Identificador único del proceso |
| **activo** | TINYINT | 1 | Estado: 1=Activo, 0=Inactivo, 2=Especial |
| **nombre** | VARCHAR(255) | Contratación de Servicios de Consultoría en Gestión Turística | Nombre descriptivo del proceso |
| **codigo_olympo** | VARCHAR(50) | OLY-2026-001 | Código del sistema Olympo |
| **direccion_encargada** | VARCHAR(100) | Dirección de Planificación | Dirección responsable |
| **responsable** | VARCHAR(100) | Juan Pérez García | Nombre del responsable |
| **responsable_id** | INT | 5 | ID del usuario responsable |
| **fecha_inicio** | DATE | 2026-01-15 | Fecha de inicio del proceso |
| **fecha_fin** | DATE | 2026-12-31 | Fecha estimada de finalización |
| **plazo_contrato** | INT | 365 | Duración en días |
| **pac_no_pac** | VARCHAR(10) | PAC | Tipo: PAC o NO PAC |
| **procedimiento_sugerido** | VARCHAR(100) | Licitación Pública | Tipo de procedimiento |
| **presupuesto_2026_inicial** | DECIMAL(15,2) | 125,500.00 | Presupuesto inicial asignado |
| **costo_2026** | DECIMAL(15,2) | 89,750.50 | Costo actual registrado |
| **partida_presupuestaria** | VARCHAR(50) | 03.04.01.01 | Código de partida presupuestaria |
| **cuatrimestre** | VARCHAR(20) | Cuatrimestre I | Período de ejecución |
| **proceso_en_riesgo** | TINYINT | 0 | Flag: 1=En riesgo, 0=Normal |
| **riesgo_comentario** | TEXT | Evaluación de riesgos... | Comentarios sobre riesgos identificados |
| **observaciones** | TEXT | Proceso en etapa inicial de planificación. Aguardando aprobación de directivos... | Notas y observaciones generales |
| **created_at** | TIMESTAMP | 2026-01-10 10:30:00 | Fecha de creación del registro |
| **updated_at** | TIMESTAMP | 2026-08-20 15:45:00 | Última actualización del registro |

## Relaciones con Otras Tablas

### Etapas Asociadas (SEGUIMIENTO_ETAPAS)
Cada proceso tiene múltiples etapas. Ejemplo de 3 etapas típicas:

| ID Etapa | Tipo Etapa | Estado | Fecha Planificada | Fecha Real | Responsable | % Avance |
|----------|-----------|--------|-------------------|-----------|------------|----------|
| 1 | Elaboración de Términos de Referencia | Completado | 2026-02-15 | 2026-02-14 | Juan Pérez | 100% |
| 2 | Revisión y Aprobación | En Progreso | 2026-03-15 | - | María López | 60% |
| 3 | Publicación y Convocatoria | Pendiente | 2026-04-01 | - | Juan Pérez | 0% |

### Usuarios Relacionados
- **Responsable Principal**: Juan Pérez García (ID: 5)
- **Dirección**: Dirección de Planificación

## Distribución de Datos por Categoría

### Información Administrativa
- id, nombre, codigo_olympo, created_at, updated_at

### Responsabilidad
- responsable, responsable_id, direccion_encargada

### Planificación
- fecha_inicio, fecha_fin, plazo_contrato, cuatrimestre

### Clasificación
- pac_no_pac, procedimiento_sugerido, partida_presupuestaria

### Financiera
- presupuesto_2026_inicial, costo_2026

### Seguimiento
- activo, proceso_en_riesgo, riesgo_comentario, observaciones

## Totales del Sistema (Estado Actual)
- **Procesos Totales**: 227
- **Procesos Activos**: 81 (35.7%)
- **Procesos Inactivos**: 145 (63.9%)
- **Presupuesto Total**: $10,631,080.06
- **Costo Total Registrado**: $3,503,838.39
- **Porcentaje de Ejecución**: 32.9%
