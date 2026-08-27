# 📊 ANÁLISIS: CAMPOS DEL EXCEL NO ALMACENADOS EN LA BD

**Fecha:** 2026-08-26  
**Archivo analizado:** Matriz_Base_POA_2026_1.xlsx  
**Base de datos:** poa_pac  

---

## 📈 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Campos en Excel** | 89 |
| **Campos almacenados en BD** | 24 |
| **Campos faltantes** | 82 |
| **Cobertura actual** | 23% |

---

## 🔍 ANÁLISIS POR CATEGORÍA

### 1. ⚠️ CRÍTICOS - Indicadores y Metas (15 campos)

**Importancia:** 🔴 ALTA  
**Razón:** Necesarios para seguimiento de cumplimiento de objetivos

```
meta_indicador              → Nombre del indicador
meta_valor_2026            → Valor esperado para 2026
meta_formula_calculo       → Fórmula para calcular el indicador
meta_tipo                  → Tipo de meta (acumulativa, anual, etc.)
meta_cal_feb a meta_cal_dic → Metas por mes (12 campos)
```

**Impacto si falta:** No se puede evaluar cumplimiento de metas  
**Solución:** Crear tabla `procesos_indicadores` o agregar a `subtareas_versiones`

---

### 2. 🔴 IMPORTANTE - Presupuesto y Reformas (12 campos)

**Importancia:** 🔴 ALTA  
**Razón:** Control de reformas, reprogramaciones y trazabilidad presupuestaria

```
presupuesto_grupo          → Grupo presupuestario
fuente_financiamiento      → Fondos propios, crédito, etc.
reforma_9                  → Presupuesto de reforma 9
presupuesto_con_reformas   → Presupuesto total con reformas
reprogramacion_ago/sep/oct/nov/dic → Reprogramaciones mensuales
planificacion_acumulada    → Acumulado de planificación
diferencia                 → Diferencia entre planeado y real
```

**Impacto si falta:** No hay trazabilidad de cambios presupuestarios  
**Solución:** Agregar campos a `subtareas_versiones` o crear tabla `presupuesto_cambios`

---

### 3. 🟡 IMPORTANTE - Seguimiento Financiero (15 campos)

**Importancia:** 🟡 MEDIA-ALTA  
**Razón:** Auditoría y trazabilidad financiera

```
devengo_* (meses)          → Devengos por mes
compromiso_*               → Compromisos
certificado_julio          → Certificación
codificado_devengado       → Codificado y devengado
pagado                     → Monto pagado
```

**Impacto si falta:** Pérdida de trazabilidad financiera  
**Solución:** Crear tabla `seguimiento_financiero` o tabla `flujo_financiero`

---

### 4. 🟡 CONTEXTUAL - Actividad y Tarea (9 campos)

**Importancia:** 🟡 MEDIA  
**Razón:** Enriquecen la información, facilitan análisis

```
actividad_nombre           → Nombre de la actividad
actividad_composicion_gasto → Nuevo/Mantenimiento
actividad_enfoque_genero   → Incluye enfoque de género
actividad_tipo_obra        → Tipo de obra
actividad_fecha_inicio/fin → Fechas de actividad
tarea_nombre               → Nombre de la tarea
tarea_fecha_inicio/fin     → Fechas de la tarea
```

**Impacto si falta:** Información contextual incompleta  
**Solución:** Agregar a `subtareas_versiones`

---

### 5. 🟢 CLASIFICADORES - Planificación y Estructura (6 campos)

**Importancia:** 🟢 BAJA-MEDIA  
**Razón:** Útiles para reportes, clasificación y análisis

```
sector                     → Sector económico
entidad_responsable        → Entidad responsable
entidad_ejecutora          → Entidad ejecutora
tipo_plan                  → Tipo de plan
programa                   → Programa
gestion_gasto_o_proyecto   → Clasificación
```

**Impacto si falta:** Reportes limitados por clasificación  
**Solución:** Crear tablas de catálogo o agregar a `subtareas_versiones`

---

### 6. 🔵 ALINEAMIENTO - PMDOT (3 campos)

**Importancia:** 🔵 MEDIA  
**Razón:** Alineamiento con Plan Metropolitano

```
objetivo_operativo_pmdot   → Objetivo del PMDOT
meta_pmdot_2033            → Meta PMDOT 2033
valor_meta_pmdot_2025      → Valor meta 2025
```

**Impacto si falta:** Pérdida de trazabilidad con planificación metropolitana  
**Solución:** Agregar a `subtareas_versiones`

---

### 7. 🔵 INFORMACIÓN - Datos de Proyecto (6 campos)

**Importancia:** 🔵 BAJA (solo si aplica)  
**Razón:** Aplica solo para ciertos procesos de inversión

```
proyecto_tipo              → Tipo de proyecto
proyecto_vigencia          → Vigencia del proyecto
proyecto_temporalidad      → Temporalidad
proyecto_prioridad         → Prioridad
proyecto_objetivo_general  → Objetivo general
proyecto_componentes       → Componentes
```

**Impacto si falta:** Información incompleta para proyectos de inversión  
**Solución:** Agregar a `subtareas_versiones` (algunos vacíos es normal)

---

### 8. 📋 ADMINISTRATIVOS - Procesos y Contratación (3 campos)

**Importancia:** 🟡 MEDIA  
**Razón:** Seguimiento de procesos de contratación

```
tipo_contratacion          → Tipo de contratación
cpc                        → Código de bien/servicio
codigo_unico_proceso       → ID único del proceso
```

**Impacto si falta:** No hay seguimiento de procesos de compra  
**Solución:** Agregar a `subtareas_versiones`

---

### 9. 📊 AJUSTES - Ajustes Mensuales (13 campos)

**Importancia:** 🟡 MEDIA  
**Razón:** Historial de cambios mensuales

```
ajuste_ene a ajuste_dic    → Ajustes por mes (12 campos)
ajuste_comprobacion        → Ajuste de comprobación
```

**Impacto si falta:** Sin historial de ajustes  
**Solución:** Crear tabla `historial_ajustes` o agregar a `subtareas_versiones`

---

## 🛠️ OPCIONES DE SOLUCIÓN

### OPCIÓN A: Agregar todo a `subtareas_versiones` (Tabla Horizontal)
**Ventajas:**
- ✅ Simple, un solo JOIN
- ✅ Rápido para queries
- ✅ Fácil de cargar

**Desventajas:**
- ❌ Tabla muy ancha (100+ columnas)
- ❌ Datos redundantes
- ❌ Difícil de mantener

**Recomendación:** Para fase inicial, solo campos más críticos

---

### OPCIÓN B: Crear tablas separadas (Normalizado)
**Ventajas:**
- ✅ Estructura limpia
- ✅ Evita redundancia
- ✅ Mantenible

**Desventajas:**
- ❌ Más JOINs en queries
- ❌ Más complejo
- ❌ Más lentos

**Recomendación:** Para arquitectura a largo plazo

---

## 📋 PLAN RECOMENDADO

### FASE 1 (Inmediato): Campos Críticos
Agregar a `subtareas_versiones`:
- meta_indicador
- meta_valor_2026
- fuente_financiamiento
- presupuesto_con_reformas
- tipo_contratacion
- codigo_unico_proceso

### FASE 2 (Semana 2): Datos de Contexto
Agregar a `subtareas_versiones`:
- actividad_nombre
- tarea_nombre
- sector
- programa

### FASE 3 (Semana 3): Historial Financiero
Crear tabla `seguimiento_financiero` con:
- procesos_id
- mes
- devengo
- compromiso
- pagado

### FASE 4 (Semana 4): Ajustes y Cambios
Crear tabla `presupuesto_ajustes` con:
- procesos_id
- mes
- monto_ajuste
- concepto

---

## 📊 IMPACTO DE NO CAPTURAR ESTOS DATOS

| Categoría | Sin datos | Riesgo |
|-----------|-----------|--------|
| Indicadores | No se evalúa cumplimiento | Alto |
| Presupuesto | Pérdida de trazabilidad | Alto |
| Financiero | Sin auditoría | Alto |
| Actividades | Contexto incompleto | Medio |
| Clasificadores | Reportes limitados | Bajo |

---

## ✅ SIGUIENTE PASO

¿Cuál es tu prioridad?

1. **Máxima cobertura:** Agregar todos los campos críticos a `subtareas_versiones`
2. **Paso a paso:** Comenzar con Fase 1 e ir iterando
3. **Arquitectura limpia:** Diseñar tablas normalizadas desde el inicio

**Recomendación:** Opción 2 (Paso a paso) - Permite avanzar rápido sin comprometer la arquitectura.

