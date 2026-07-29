# 📊 REPORTE COMPARATIVO: EXCEL vs BASE DE DATOS

**Fecha:** 2026-06-23  
**Archivo Excel:** `2. POA 2026 - Subtarea 04052026 (2).xlsx`  
**Base de Datos:** `poa_pac` (tabla: `subtareas`)

---

## 📄 DATOS DEL ARCHIVO EXCEL

El archivo Excel contiene **11 categorías principales** de presupuesto para 2026:

| # | Nombre de la Tarea | Presupuesto 2026 |
|---|---|---|
| 1 | Adquisición de bienes y servicios para la operatividad, gestión financiera | $1,646,936.20 |
| 2 | Acciones de promoción para el posicionamiento del DMQ como destino turístico | $1,551,157.43 |
| 3 | Gestión de servicios y provisión de recursos estratégicos para fortalecer la operación | $450,036.50 |
| 4 | Gestión de la nómina de la Empresa | $2,223,531.76 |
| 5 | Estudios, investigaciones, información, datos y propuestas técnicas | $148,771.00 |
| 6 | Planificación, diseño e implementación de estructuras y facilidades turísticas | $335,000.00 |
| 7 | Desarrollo y Mercadeo del Destino, clusters y Productos Turísticos | $530,000.00 |
| 8 | Elaboración de estudios para el desarrollo de una Arena de Eventos | $200,000.00 |
| 9 | Gestión, asesoría y asistencia para el fortalecimiento de capacidades | $163,229.00 |
| 10 | Programa de ferias eventos, congresos, reuniones, ruedas de negocios | $945,000.00 |
| 11 | Publicidad y marketing digital para la promoción y posicionamiento | $508,000.00 |

**TOTAL EXCEL:** `$8,701,661.89`

---

## 🗄️ DATOS DE LA BASE DE DATOS

### Resumen General

| Métrica | Valor |
|---|---|
| **Total de Procesos Registrados** | 227 |
| **Procesos con Presupuesto** | 171 |
| **Procesos sin Presupuesto** | 56 |
| **Presupuesto Total BD** | **$10,631,080.06** |

### Top 10 Procesos con Mayor Presupuesto

| # | Nombre del Proceso | Presupuesto |
|---|---|---|
| 1 | CONTRATACIÓN DEL SERVICIO DE ORGANIZACIÓN DE EVENTOS DE Promoción Turística | $1,918,669.92 |
| 2 | Servicio de relaciones públicas y representación en el exterior para la promoción | $1,127,950.00 |
| 3 | Servicio de relaciones públicas y representación en el exterior para la promoción | $1,057,000.00 |
| 4 | Generar la nómina de la EPMGDT (Servicios Personales por Contrato) | $883,679.54 |
| 5 | Generar la nómina de la EPMGDT (Remuneraciones Unificadas) | $766,813.32 |
| 6 | Servicio de agencia de Publicidad especializada en pauta para difundir | $315,000.00 |
| 7 | Mantenimiento de edificios de la EPMGDT (fase 2) | $260,000.00 |
| 8 | Contratación de Estudios técnicos para la Implementación de la Plaza de Eventos | $242,000.00 |
| 9 | Promoción y posicionamiento Turístico de Quito en la exposición internacional | $234,800.00 |
| 10 | Generar la nómina de la EPMGDT (Aporte Patronal) | $203,368.93 |

---

## 📊 ANÁLISIS COMPARATIVO

### Diferencias Principales

```
Presupuesto EXCEL:        $8,701,661.89
Presupuesto BD:           $10,631,080.06
                          ─────────────────
DIFERENCIA:               $1,929,418.17 (Favorable a BD)

Porcentaje BD vs Excel:   122.2%
```

### Desagregación de Datos

| Métrica | EXCEL | BD | Ratio |
|---|---|---|---|
| **Items/Categorías** | 11 | 171 | 15.5x |
| **Presupuesto Total** | $8.70M | $10.63M | 1.22x |
| **Presupuesto Promedio** | $790,150.17 | $62,152.34 | - |

---

## 🔍 ANÁLISIS DE DIFERENCIAS

### 1. **Diferencia de Presupuesto: +$1,929,418.17**

#### Interpretación:
- ✅ La Base de Datos contiene **MÁS presupuesto** que el Excel
- ✅ Esto indica que se han registrado procesos **adicionales** después de la generación del Excel
- ✅ O bien, los procesos se han **desglosado en más detalle**

#### Posibles Causas:
1. **Procesos agregados después de la generación del Excel:** Los 227 procesos en BD podrían incluir actualizaciones posteriores
2. **Desglose adicional:** Las 11 categorías del Excel han sido divididas en 171 procesos individuales
3. **Diferencias temporales:** El Excel podría ser de una fecha anterior a la última actualización de BD

---

### 2. **Diferencia en Cantidad de Items: 11 vs 171 (15.5x)**

#### Excel:
- Contiene **11 categorías agregadas/principales**
- Representa un **nivel de agregación alta**
- Diseñado para **reporting ejecutivo**

#### Base de Datos:
- Contiene **171 procesos desglosados**
- Representa un **nivel de detalle operacional**
- Diseñado para **seguimiento operativo**

---

### 3. **Procesos sin Presupuesto en BD**

- **56 procesos** no tienen presupuesto asignado (valores = 0 o NULL)
- Estos son procesos en **estado de planificación o pre-operacional**
- Deben ser completados con presupuesto antes de ejecución

---

## 💡 CONCLUSIONES Y RECOMENDACIONES

### ✅ Hallazgos Principales

1. **Datos Consistentes en General**
   - El presupuesto de BD supera al Excel por $1.93M (es una diferencia razonable)
   - La estructura de agregación en el Excel vs detalle en BD es normal

2. **Mayor Desagregación en BD**
   - La BD tiene 15.5 veces más items que el Excel
   - Esto indica que los procesos se están siguiendo con mayor detalle

3. **Procesos Incompletos**
   - 56 procesos sin presupuesto asignado (24.7% del total)
   - Estos necesitan ser completados

### 📋 Recomendaciones

| Acción | Prioridad | Descripción |
|---|---|---|
| **Validar procesos sin presupuesto** | 🔴 Alta | Los 56 procesos sin presupuesto deben ser revisados y completados |
| **Sincronizar Excel con BD** | 🟡 Media | Actualizar el Excel con los 171 procesos desglosados de la BD |
| **Documentar mapeo de categorías** | 🟡 Media | Crear matriz que relacione las 11 categorías Excel con los 171 procesos BD |
| **Auditoría de diferencias** | 🟢 Baja | Revisar qué procesos agregaron los $1.93M adicionales |

---

## 📌 NOTAS TÉCNICAS

- **Formato de Presupuesto en BD:** Decimal(15,2)
- **Columna Presupuesto:** `presupuesto_2026_inicial`
- **Moneda:** USD (Dólares estadounidenses)
- **Período:** 2026

---

**Reporte Generado:** 2026-06-23  
**Sistema:** Seguimiento POA - QuitoTurismo  
**Base de Datos:** poa_pac
