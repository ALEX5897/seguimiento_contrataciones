# Diagrama de Relaciones - Base de Datos

## 📊 Flujo de Datos de un Proceso

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUBTAREAS (Procesos)                        │
│                                                                 │
│  • id (PK)                                                      │
│  • codigo_olympo (UNIQUE) ← Identificador principal            │
│  • nombre, presupuesto, costo                                  │
│  • responsable_id → FK responsables_catalogo                   │
│  • responsable → REDUNDANTE (copiar del catalogo)              │
│  • direccion_encargada → TEXTO (debería ser FK)                │
│                                                                 │
│  Ejemplo Proceso ID 130:                                       │
│  - Codigo: 01.01.001.055.530702.000.009                        │
│  - Presupuesto: $7,000 | Costo: $7,000 (100%)                  │
│  - Responsable ID: 6 (Javier Pacha) → Actual: Fabricio Medina  │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    (50 etapas)  (1 dirección) (1 responsable)
        │            │            │
   ┌────┴────┐  ┌────┴────┐  ┌───┴───────┐
   │          │  │         │  │           │
   ▼          ▼  ▼         ▼  ▼           ▼

┌──────────────────────┐  ┌─────────────────────────────────────┐
│  SUBTAREAS_ETAPAS    │  │  RESPONSABLES_CATALOGO              │
│                      │  │                                     │
│  • id (PK)           │  │  • id (PK)                          │
│  • subtarea_id (FK)  │  │  • nombre (UNICO)                   │
│  • etapa_id (FK)     │  │  • email                            │
│  • aplica (bool)     │  │  • direccion_id (FK)                │
│  • fecha_tentativa   │  │  • activo                           │
│  • fecha_reforma     │  │                                     │
│  • fecha_reforma_3   │  │  50 registros para proceso 130       │
│                      │  │                                     │
│  50 registros para   │  └─────────────┬───────────────────────┘
│  proceso 130         │                │
└────────┬─────────────┘                │ (responsable_id)
         │                             │
         │ (etapa_id)          ┌───────┴────────┐
         │                     │                │
         ▼                     ▼                ▼
      ┌──────────────┐   ┌─────────────────────────────────┐
      │ ETAPAS_PAC   │   │ DIRECCIONES_CATALOGO            │
      │              │   │                                 │
      │ • id (PK)    │   │ • id (PK)                       │
      │ • nombre     │   │ • nombre (UNIQUE)               │
      │ • orden      │   │ • activo                        │
      │              │   │                                 │
      │ Catálogo de  │   │ Ej: DPEI/Jefatura TICS          │
      │ etapas PAC   │   │     DAF/Jefatura Admin          │
      └──────┬───────┘   │     etc.                        │
             │           │                                 │
             │           └─────────────────────────────────┘
             │
             │ (etapa_id)
             │
             ▼
┌──────────────────────────────────────────────┐
│    SEGUIMIENTO_ETAPAS (50 registros)         │
│                                              │
│  • id (PK)                                   │
│  • subtarea_id (FK)                          │
│  • etapa_id (FK)                             │
│  • estado: [pendiente|en_progreso|completado]
│  • fecha_planificada                         │
│  • fecha_real                                │
│  • responsable_id (FK) ← REDUNDANTE          │
│  • responsable (text) ← REDUNDANTE           │
│  • observaciones                             │
│                                              │
│  Estado para proceso 130:                    │
│  - 50 etapas pendientes                      │
│  - 0 completadas                             │
│  - % Avance: 0%                              │
└────────────┬─────────────────────────────────┘
             │
             │ (subtarea_id, etapa_id)
             │
             ▼
┌──────────────────────────────────────────────┐
│  SEGUIMIENTOS_DIARIOS (Registros variables)  │
│                                              │
│  • id (PK)                                   │
│  • subtarea_id (FK)                          │
│  • etapa_id (FK)                             │
│  • fecha (date)                              │
│  • comentario (text)                         │
│  • tiene_alerta (bool)                       │
│  • responsable_id (FK) ← REDUNDANTE          │
│  • responsable (text) ← REDUNDANTE           │
│  • created_at, updated_at                    │
│                                              │
│  Seguimiento diario/real de progreso         │
└──────────────────────────────────────────────┘
```

---

## 🔴 CAMPOS REDUNDANTES IDENTIFICADOS

### 1. Campo `responsable` (STRING)
**Ubicaciones:**
- `subtareas.responsable`
- `seguimiento_etapas.responsable`
- `seguimientos_diarios.responsable`

**Problema:**
```
FK correcto:  responsable_id → responsables_catalogo.id
Redundante:   responsable    → copia de texto
```

**Impacto:** Si cambia el nombre del responsable en el catálogo, no se actualiza en los registros históricos. Pero los textos en las tablas de auditoría pueden quedar desincronizados.

**Solución:** 
- Eliminar estos campos y siempre leer desde el catalogo usando `responsable_id`
- O guardar solo en auditoría, no en datos operacionales

### 2. Campo `direccion_encargada` (STRING)
**Ubicación:** 
- `subtareas.direccion_encargada`

**Problema:**
```
Correcto sería:  direccion_id → direcciones_catalogo.id
Actual:          direccion_encargada → VARCHAR(255) texto libre
```

**Impacto:** 
- No hay integridad referencial
- Pueden existir nombres de direcciones inconsistentes
- Difícil hacer reportes agrupados por dirección

**Solución:** Agregar columna `direccion_id` y migrar datos

### 3. Múltiples campos de FECHA
**Ubicación:** `subtareas_etapas`

```
• fecha_tentativa   ← Fecha inicial propuesta?
• fecha_reforma     ← Cambio en reforma?
• fecha_reforma_3   ← Otra reforma?
```

**Problema:** No está documentado qué significa cada fecha

**Solución:** Documentar o consolidar en un solo campo con tipo de cambio

---

## 📋 Mapa de Relaciones por Campo

```
TABLA PRINCIPAL: subtareas
│
├─ responsable_id (FK) ────────────────→ responsables_catalogo.id
│  └─ REDUNDANTE: responsable (string)
│
├─ direccion_id (FALTA) ───────────────→ direcciones_catalogo.id
│  └─ ACTUAL: direccion_encargada (string)
│
└─ Etapas relacionadas:
   │
   ├─ subtareas_etapas (50 registros)
   │  ├─ etapa_id ──────────────────────→ etapas_pac.id
   │  └─ fecha_tentativa, fecha_reforma, fecha_reforma_3
   │
   ├─ seguimiento_etapas (50 registros)
   │  ├─ etapa_id ──────────────────────→ etapas_pac.id
   │  ├─ responsable_id ────────────────→ responsables_catalogo.id
   │  │  └─ REDUNDANTE: responsable (string)
   │  ├─ estado (pendiente/en_progreso/completado)
   │  ├─ fecha_planificada
   │  └─ fecha_real
   │
   └─ seguimientos_diarios
      ├─ etapa_id ──────────────────────→ etapas_pac.id
      ├─ responsable_id ────────────────→ responsables_catalogo.id
      │  └─ REDUNDANTE: responsable (string)
      ├─ fecha (date)
      └─ comentario (text)
```

---

## ⚠️ INCONSISTENCIAS DETECTADAS

### Inconsistencia 1: Etapas
```
TIENE 2 TABLAS DE ETAPAS:

✓ etapas_pac (Usada actualmente)
  ├─ id, nombre, orden
  ├─ es_personalizada
  └─ Referenced by: subtareas_etapas, seguimiento_etapas, seguimientos_diarios

✗ etapas_catalogo (Alternativa no clara)
  ├─ id, nombre, orden
  ├─ clasificacion (ENUM: preparatoria, precontractual, contractual)
  ├─ descripcion
  └─ NO REFERENCIADA actualmente

DECISION NECESARIA: ¿Usar solo una tabla?
```

### Inconsistencia 2: Responsables en múltiples lugares
```
DATOS DEL MISMO CONCEPTO EN DIFERENTES TABLAS:

subtareas:
  ├─ responsable_id: 6
  └─ responsable: "Javier Pacha"

seguimiento_etapas:
  ├─ responsable_id: ?
  └─ responsable: "Fabricio Medina"

seguimientos_diarios:
  ├─ responsable_id: ?
  └─ responsable: (varchar)

PROBLEMA: ¿Quién es realmente responsable?
- ¿El asignado en subtareas?
- ¿El asignado en la etapa?
- ¿El que hizo el último seguimiento?
```

### Inconsistencia 3: Estado del Proceso
```
NO HAY CAMPO DE ESTADO GENERAL en subtareas

¿Cómo se determina si un proceso está:
- En riesgo?  ← campo proceso_en_riesgo
- Retrasado?  ← se calcula desde seguimiento_etapas
- Completado? ← se calcula desde etapas

Falta: campo estado general o vista materializada
```

---

## 🔐 Tabla de Permisos

```
USUARIOS
   │
   ├─ roles_modulos ──────────→ [leer, crear, actualizar, borrar]
   │                            por cada módulo del sistema
   │
   ├─ roles_menu ─────────────→ [si/no acceso]
   │                            a cada opción de menú
   │
   └─ roles_campos_etapas ────→ [ver, editar]
                                campos en etapas por rol
```

---

## 📊 Estadísticas del Proceso de Ejemplo (ID 130)

```
Código: 01.01.001.055.530702.000.009

DATOS PRINCIPALES (subtareas):
├─ Presupuesto: $7,000.00
├─ Costo: $7,000.00 (100% ejecutado)
├─ Responsable: Javier Pacha (ID: 6)
├─ Responsable Actual: Fabricio Medina
├─ Tipo: NO PAC
├─ Procedimiento: Ínfimas Cuantías
└─ Estado: Activo

ETAPAS RELACIONADAS (subtareas_etapas):
├─ Total: 50 etapas
├─ Todas con aplica=1
└─ Con fechas tentativas

SEGUIMIENTO (seguimiento_etapas):
├─ Total: 50 registros
├─ Estado: PENDIENTE en todos
├─ Sin fechas reales
├─ Sin responsables asignados por etapa
└─ % Avance: 0%

AUDITORÍA (auditoria_eventos):
└─ 2 registros de cambios registrados
```

---

## ✅ Checklist de Depuración

- [ ] ¿Todos los `responsable_id` están referenciando datos válidos en responsables_catalogo?
- [ ] ¿Hay inconsistencias entre `responsable_id` y campo `responsable` de texto?
- [ ] ¿Todos los `directon_encargada` tienen equivalente en direcciones_catalogo?
- [ ] ¿Se están usando etapas_pac y etapas_catalogo? ¿Por qué existen ambas?
- [ ] ¿Hay registros con estado inválido en seguimiento_etapas.estado?
- [ ] ¿Fecha_reforma_3 es la correcta en subtareas_etapas?
- [ ] ¿Hay procesos sin responsable_id (NULL)?
- [ ] ¿Hay procesos con presupuesto negativo?
- [ ] ¿Hay encoding issues (mojibake) en campos de texto?
- [ ] ¿Se pueden eliminar los campos redundantes `responsable` (string)?

---

**Fin del análisis de relaciones**
