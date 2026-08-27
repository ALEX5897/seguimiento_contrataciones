# 🏗️ ARQUITECTURA DE BASE DE DATOS REFORMADA

**Objetivo:** Diseñar un modelo de BD normalizado que almacene todos los datos de la matriz del POA-PAC  
**Enfoque:** Escalable, mantenible y eficiente  
**Fecha:** 2026-08-26

---

## 📊 DIAGRAMA DE ENTIDADES (ER)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODELO CONCEPTUAL                         │
└─────────────────────────────────────────────────────────────────┘

versiones (Reformas)
    ↓
    ├─→ procesos (procesos principales)
    │       ↓
    │       ├─→ procesos_indicadores (metas y KPIs)
    │       ├─→ procesos_presupuesto (detalles presupuestarios)
    │       ├─→ procesos_financiero (seguimiento de devengos/pagos)
    │       ├─→ procesos_ajustes (cambios mensuales)
    │       ├─→ procesos_etapas (seguimiento de etapas)
    │       └─→ procesos_contexto (información de actividades/tareas)
    │
    └─→ versiones_cambios (auditoría de cambios)

catálogos:
    ├─→ sectores_catalogo
    ├─→ entidades_catalogo
    ├─→ programas_catalogo
    ├─→ tipos_plan_catalogo
    └─→ fuentes_financiamiento_catalogo
```

---

## 🗂️ ESTRUCTURA DE TABLAS

### TABLA 1: `procesos` (Renombrada de subtareas_versiones)

**Propósito:** Almacenar datos principales de cada proceso/subtarea

```sql
CREATE TABLE procesos (
  -- Identificadores
  id INT PRIMARY KEY AUTO_INCREMENT,
  version_id INT NOT NULL,
  subtarea_id_original INT,  -- Referencia a tabla antigua para compatibilidad
  codigo_olympo VARCHAR(50) UNIQUE NOT NULL,
  codigo_unico_proceso VARCHAR(50),
  
  -- Identificación
  subtarea VARCHAR(255) NOT NULL,
  responsable VARCHAR(100),
  responsable_id INT,
  
  -- Clasificación de Estructura
  sector_id INT,  -- FK a sectores_catalogo
  entidad_responsable_id INT,  -- FK a entidades_catalogo
  entidad_ejecutora_id INT,  -- FK a entidades_catalogo
  programa_id INT,  -- FK a programas_catalogo
  tipo_plan_id INT,  -- FK a tipos_plan_catalogo
  gestion_gasto_o_proyecto VARCHAR(50),  -- 'Gasto Permanente' o 'Proyecto'
  
  -- Fechas
  fecha_inicio DATE,
  fecha_fin DATE,
  plazo_contrato INT,
  
  -- Presupuesto Base
  presupuesto_2026_inicial DECIMAL(15,2),
  costo_2026 DECIMAL(15,2),
  partida_presupuestaria VARCHAR(50),
  presupuesto_grupo VARCHAR(50),
  
  -- Clasificación
  pac_no_pac VARCHAR(20),  -- 'PAC' o 'No PAC'
  procedimiento_sugerido VARCHAR(100),
  tipo_contratacion VARCHAR(100),
  
  -- Estado
  estado VARCHAR(50),  -- 'Precontractual', 'Contractual', etc.
  activo TINYINT DEFAULT 1,
  proceso_en_riesgo TINYINT DEFAULT 0,
  riesgo_comentario TEXT,
  
  -- Observaciones y Auditoría
  observaciones TEXT,
  estado_carga VARCHAR(50),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_version_id (version_id),
  INDEX idx_codigo_olympo (codigo_olympo),
  INDEX idx_estado (estado),
  FOREIGN KEY (version_id) REFERENCES versiones(id),
  FOREIGN KEY (sector_id) REFERENCES sectores_catalogo(id),
  FOREIGN KEY (entidad_responsable_id) REFERENCES entidades_catalogo(id),
  FOREIGN KEY (entidad_ejecutora_id) REFERENCES entidades_catalogo(id),
  FOREIGN KEY (programa_id) REFERENCES programas_catalogo(id),
  FOREIGN KEY (tipo_plan_id) REFERENCES tipos_plan_catalogo(id)
);
```

---

### TABLA 2: `procesos_indicadores` (NUEVA)

**Propósito:** Almacenar metas e indicadores de cumplimiento

```sql
CREATE TABLE procesos_indicadores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proceso_id INT NOT NULL,
  
  -- Meta/Indicador
  meta_indicador VARCHAR(255),  -- Nombre del indicador
  meta_valor_2026 VARCHAR(255),  -- Descripción del valor esperado
  meta_formula_calculo VARCHAR(255),  -- Fórmula para calcular
  meta_tipo VARCHAR(50),  -- 'Acumulativa', 'Anual', 'Trimestral'
  
  -- Metas por mes (12 campos)
  meta_cal_enero DECIMAL(15,4),
  meta_cal_febrero DECIMAL(15,4),
  meta_cal_marzo DECIMAL(15,4),
  meta_cal_abril DECIMAL(15,4),
  meta_cal_mayo DECIMAL(15,4),
  meta_cal_junio DECIMAL(15,4),
  meta_cal_julio DECIMAL(15,4),
  meta_cal_agosto DECIMAL(15,4),
  meta_cal_septiembre DECIMAL(15,4),
  meta_cal_octubre DECIMAL(15,4),
  meta_cal_noviembre DECIMAL(15,4),
  meta_cal_diciembre DECIMAL(15,4),
  
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (proceso_id) REFERENCES procesos(id),
  UNIQUE KEY unique_proceso_meta (proceso_id, meta_indicador)
);
```

---

### TABLA 3: `procesos_presupuesto` (NUEVA)

**Propósito:** Historial de presupuesto y reformas

```sql
CREATE TABLE procesos_presupuesto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proceso_id INT NOT NULL,
  
  -- Presupuesto Base y Fuente
  presupuesto_original DECIMAL(15,2),
  fuente_financiamiento_id INT,  -- FK a fuentes_catalogo
  
  -- Reformas
  reforma_9 DECIMAL(15,2),  -- Presupuesto reforma 9
  presupuesto_con_reformas DECIMAL(15,2),  -- Total con reformas
  
  -- Reprogramaciones
  reprogramacion_agosto DECIMAL(15,2),
  reprogramacion_septiembre DECIMAL(15,2),
  reprogramacion_octubre DECIMAL(15,2),
  reprogramacion_noviembre DECIMAL(15,2),
  reprogramacion_diciembre DECIMAL(15,2),
  reprogramacion_comprobacion DECIMAL(15,2),
  
  -- Acumulados
  planificacion_acumulada DECIMAL(15,2),
  diferencia DECIMAL(15,2),
  
  fecha_calculo DATE,
  vigencia INT,  -- Año vigente
  
  FOREIGN KEY (proceso_id) REFERENCES procesos(id),
  FOREIGN KEY (fuente_financiamiento_id) REFERENCES fuentes_financiamiento_catalogo(id),
  INDEX idx_proceso_vigencia (proceso_id, vigencia)
);
```

---

### TABLA 4: `procesos_financiero` (NUEVA)

**Propósito:** Seguimiento detallado de devengos, compromisos y pagos

```sql
CREATE TABLE procesos_financiero (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proceso_id INT NOT NULL,
  mes INT,  -- 1-12 (Enero-Diciembre)
  anio INT,
  
  -- Devengos
  devengo DECIMAL(15,2),
  certificado DECIMAL(15,2),
  
  -- Compromisos
  compromiso DECIMAL(15,2),
  
  -- Pagos
  pagado DECIMAL(15,2),
  
  -- Códigos
  codificado_devengado DECIMAL(15,2),
  
  -- Observaciones
  observaciones TEXT,
  
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (proceso_id) REFERENCES procesos(id),
  UNIQUE KEY unique_proceso_mes (proceso_id, mes, anio),
  INDEX idx_proceso_anio (proceso_id, anio)
);
```

---

### TABLA 5: `procesos_ajustes` (NUEVA)

**Propósito:** Historial de ajustes mensuales

```sql
CREATE TABLE procesos_ajustes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proceso_id INT NOT NULL,
  mes INT,  -- 1-12
  anio INT,
  
  -- Ajuste
  monto_ajuste DECIMAL(15,2),
  concepto VARCHAR(255),  -- Concepto del ajuste
  descripcion TEXT,
  
  usuario_registro VARCHAR(100),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (proceso_id) REFERENCES procesos(id),
  INDEX idx_proceso_mes (proceso_id, mes, anio)
);
```

---

### TABLA 6: `procesos_contexto` (NUEVA)

**Propósito:** Información de actividades y tareas relacionadas

```sql
CREATE TABLE procesos_contexto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proceso_id INT NOT NULL,
  
  -- Actividad
  actividad_nombre VARCHAR(255),
  actividad_composicion_gasto VARCHAR(100),  -- 'Nuevo', 'Mantenimiento'
  actividad_enfoque_genero VARCHAR(50),  -- 'Si', 'No'
  actividad_tipo_obra VARCHAR(100),  -- 'Si', 'No'
  actividad_fecha_inicio DATE,
  actividad_fecha_fin DATE,
  
  -- Tarea
  tarea_nombre VARCHAR(255),
  tarea_fecha_inicio DATE,
  tarea_fecha_fin DATE,
  
  -- Alineamiento PMDOT
  objetivo_operativo_pmdot VARCHAR(255),
  meta_pmdot_2033 VARCHAR(255),
  valor_meta_pmdot_2025 VARCHAR(100),
  
  -- Proyecto (si aplica)
  proyecto_tipo VARCHAR(100),
  proyecto_vigencia VARCHAR(50),
  proyecto_temporalidad VARCHAR(50),
  proyecto_prioridad VARCHAR(50),
  proyecto_objetivo_general TEXT,
  proyecto_componentes TEXT,
  
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (proceso_id) REFERENCES procesos(id)
);
```

---

### TABLA 7: `procesos_seguimiento_etapas` (Renombrada)

```sql
-- Esta tabla ya existe como "seguimiento_etapas"
-- Renombrar para claridad y agregar campos

ALTER TABLE seguimiento_etapas RENAME TO procesos_seguimiento_etapas;

-- Agregar campos si faltan
ALTER TABLE procesos_seguimiento_etapas ADD COLUMN IF NOT EXISTS
  proceso_id INT AFTER subtarea_id;
  
-- Crear índice
CREATE INDEX idx_proceso_id ON procesos_seguimiento_etapas(proceso_id);
```

---

## 📚 TABLAS DE CATÁLOGO (NUEVAS)

### Catálogo de Sectores
```sql
CREATE TABLE IF NOT EXISTS sectores_catalogo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  activo TINYINT DEFAULT 1,
  INDEX idx_nombre (nombre)
);
```

### Catálogo de Entidades
```sql
CREATE TABLE IF NOT EXISTS entidades_catalogo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  sigla VARCHAR(50),
  tipo VARCHAR(50),  -- 'Responsable', 'Ejecutora'
  descripcion TEXT,
  activo TINYINT DEFAULT 1,
  INDEX idx_nombre (nombre)
);
```

### Catálogo de Programas
```sql
CREATE TABLE IF NOT EXISTS programas_catalogo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  activo TINYINT DEFAULT 1,
  INDEX idx_nombre (nombre)
);
```

### Catálogo de Tipos de Plan
```sql
CREATE TABLE IF NOT EXISTS tipos_plan_catalogo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  activo TINYINT DEFAULT 1
);
```

### Catálogo de Fuentes de Financiamiento
```sql
CREATE TABLE IF NOT EXISTS fuentes_financiamiento_catalogo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  activo TINYINT DEFAULT 1,
  INDEX idx_nombre (nombre)
);
```

---

## 🔄 FLUJO DE CARGA DE DATOS

```
┌─────────────────────────────────────────────────────┐
│ 1. Cargar Excel (Matriz_Base_POA_2026_1.xlsx)      │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 2. Parsear y validar datos                         │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 3. Poblar catálogos (si no existen)                │
│    - sectores_catalogo                             │
│    - entidades_catalogo                            │
│    - programas_catalogo                            │
│    - fuentes_financiamiento_catalogo               │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 4. Insertar en tabla procesos (datos principales)  │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 5. Insertar en tablas específicas:                  │
│    - procesos_indicadores                          │
│    - procesos_presupuesto                          │
│    - procesos_financiero                           │
│    - procesos_contexto                             │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│ 6. Registrar cambios en versiones_cambios           │
└─────────────────────────────────────────────────────┘
```

---

## 📈 QUERIES DE CONSULTA COMÚN

### Query 1: Obtener proceso completo con todos sus datos
```sql
SELECT 
  p.*,
  pi.meta_indicador, pi.meta_valor_2026,
  pp.presupuesto_con_reformas, pp.fuente_financiamiento_id,
  pc.actividad_nombre, pc.tarea_nombre,
  s.nombre AS sector,
  e.nombre AS entidad_responsable
FROM procesos p
LEFT JOIN procesos_indicadores pi ON p.id = pi.proceso_id
LEFT JOIN procesos_presupuesto pp ON p.id = pp.proceso_id
LEFT JOIN procesos_contexto pc ON p.id = pc.proceso_id
LEFT JOIN sectores_catalogo s ON p.sector_id = s.id
LEFT JOIN entidades_catalogo e ON p.entidad_responsable_id = e.id
WHERE p.version_id = ? AND p.codigo_olympo = ?;
```

### Query 2: Obtener seguimiento financiero por mes
```sql
SELECT 
  p.codigo_olympo, p.subtarea,
  pf.mes, pf.anio,
  pf.devengo, pf.compromiso, pf.pagado
FROM procesos p
JOIN procesos_financiero pf ON p.id = pf.proceso_id
WHERE p.version_id = ? AND pf.anio = YEAR(NOW())
ORDER BY p.codigo_olympo, pf.mes;
```

### Query 3: Resumen presupuestario por sector
```sql
SELECT 
  s.nombre AS sector,
  COUNT(p.id) AS total_procesos,
  SUM(p.presupuesto_2026_inicial) AS presupuesto_inicial,
  SUM(pp.presupuesto_con_reformas) AS presupuesto_con_reformas
FROM procesos p
JOIN sectores_catalogo s ON p.sector_id = s.id
LEFT JOIN procesos_presupuesto pp ON p.id = pp.proceso_id
WHERE p.version_id = ?
GROUP BY s.id, s.nombre;
```

---

## 🎯 VENTAJAS DE ESTA ARQUITECTURA

✅ **Normalización:** Evita redundancia de datos  
✅ **Escalabilidad:** Fácil de agregar nuevos campos  
✅ **Mantenibilidad:** Tablas pequeñas y especializadas  
✅ **Flexibilidad:** Cada tabla con su propósito  
✅ **Performance:** Índices estratégicos  
✅ **Historial:** Facilita auditoría y seguimiento  
✅ **Reutilización:** Catálogos compartidos  

---

## 📋 MIGRACIÓN DE DATOS

### Paso 1: Crear nuevas tablas (sin afectar existentes)
- Crear tablas paralelas
- No eliminar tablas antiguas

### Paso 2: Copiar datos existentes
- Migrar datos de subtareas_versiones a procesos
- Mantener compatibilidad

### Paso 3: Validar datos
- Verificar integridad
- Comparar con fuente

### Paso 4: Transicionar aplicación
- Actualizar queries en backend
- Agregar validaciones

### Paso 5: Deprecar tablas antiguas
- Mantener 30 días como backup
- Luego archivar

---

## ✅ SIGUIENTE PASO

¿Apruebas este diseño? Si sí:

1. ✅ Crear las tablas
2. ✅ Crear los catálogos
3. ✅ Migrar datos existentes
4. ✅ Crear funciones de carga desde Excel

¿Cambios o ajustes necesarios?

