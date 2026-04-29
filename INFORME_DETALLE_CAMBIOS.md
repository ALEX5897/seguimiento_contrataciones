# 📋 Informe 2: Detalle de Cambios y Actividad por Dirección

## 📌 Descripción

El **Informe de Detalle de Cambios** proporciona un análisis línea por línea de todas las actividades ocurridas en el período seleccionado, organizadas por dirección y proceso. Es ideal para:

- ✅ **Auditoría detallada** de cambios registrados
- ✅ **Rastreo de actividad** por dirección
- ✅ **Verificación de cumplimiento** de etapas
- ✅ **Documentación de comentarios** y observaciones
- ✅ **Historial de cambios** de estado

---

## 🎯 Estructura del Informe

### 1. **Portada**

```
╔════════════════════════════════════╗
║   DETALLE DE CAMBIOS Y ACTIVIDAD   ║
║   Análisis por Dirección y Proceso ║
║                                    ║
║ Período: DD/MM/AAAA - DD/MM/AAAA   ║
║                                    ║
║ Direcciones analizadas: 5          ║
║ Procesos con cambios: 23           ║
╚════════════════════════════════════╝
```

### 2. **Resumen de Actividad**

- **Total de cambios**: Número de cambios de estado registrados
- **Total de comentarios**: Cantidad de observaciones agregadas
- **Período**: Rango de fechas analizado
- **Última actualización**: Cuándo se registró el cambio más reciente

### 3. **Tabla de Últimos Ingresos por Dirección**

```
┌─────────────────────────────────────────┐
│ Dirección              │ Última actualización │
├─────────────────────────────────────────┤
│ Asesoría Jurídica      │ 15/04/2026         │
│ DAF - TICS             │ 14/04/2026         │
│ Talento Humano         │ 10/04/2026         │
└─────────────────────────────────────────┘
```

---

## 📑 Detalle por Dirección

Para **cada dirección**, el informe incluye:

### A. **Encabezado de Dirección**

```
┌─ DIRECCIÓN DE ASESORÍA JURÍDICA ──────────────────┐
│ Última actualización: 15/04/2026                   │
│ Cambios registrados: 8 | Comentarios: 12          │
└─────────────────────────────────────────────────────┘
```

### B. **Por cada Proceso en la Dirección**

```
📋 CONTRATO: Servicios Legales (CÓDIGO: CON-2026-001)
   Monto: $125,000

   ✅ Cambios de Estado:
      ✅ Etapa: "Presentación de propuesta"
         Cambio: PENDIENTE → COMPLETADO
         Fecha: 10/04/2026 | Por: Juan Pérez

      ⏳ Etapa: "Evaluación de propuestas"
         Cambio: PENDIENTE → EN_PROCESO
         Fecha: 12/04/2026 | Por: María García

   💬 Comentarios Agregados:
      "Se requiere documentación adicional para completar la
       evaluación. El proveedor tiene 5 días para enviar."
      Etapa: Evaluación de propuestas | 12/04/2026

      "Documentación recibida correctamente. Procesando..."
      Etapa: Evaluación de propuestas | 14/04/2026
```

---

## 🔄 Información Incluida por Cambio

### Cambios de Estado

```
Icono: ✅ (Completado) | ⏳ (En proceso) | ⏹ (Pendiente)
├─ Nombre de la etapa
├─ Estado anterior → Estado nuevo
├─ Fecha del cambio (DD/MM/AAAA)
└─ Usuario responsable del cambio
```

### Comentarios/Observaciones

```
Icono: 💬
├─ Texto del comentario (entrecomillado)
├─ Etapa asociada
└─ Fecha del comentario
```

---

## 📊 Datos que Incluye

### De las Etapas/Verificables
- ✅ Nombre de la etapa
- ✅ Estado registrado (Pendiente, En proceso, Completado)
- ✅ Fecha de cambio de estado
- ✅ Observaciones/comentarios agregados
- ✅ Usuario responsable

### Por Proceso
- ✅ Código Olimpo
- ✅ Nombre del proceso
- ✅ Monto presupuestado
- ✅ Cronología de cambios
- ✅ Historial completo de comentarios

### Por Dirección
- ✅ Nombre de la dirección
- ✅ Total de cambios registrados
- ✅ Total de comentarios
- ✅ Fecha de última actualización
- ✅ Todos los procesos con actividad

---

## 🚀 Cómo Usar

### Paso 1: Acceder al Módulo
```
Menú → Informes Gerenciales
o directo: /#/informes
```

### Paso 2: Seleccionar Tipo de Informe
```
┌─────────────────┐
│ 📊 Resumen      │ (predeterminado)
│ 📋 Detalle      │ ← SELECCIONAR ESTE
└─────────────────┘
```

### Paso 3: Elegir Rango de Fechas
```
Fecha de inicio: [YYYY-MM-DD]
Fecha de fin:    [YYYY-MM-DD]
```

### Paso 4: Generar
```
[PDF] Generar Detalle
```

El PDF se descarga como: `informe_detalle_YYYY-MM-DD.pdf`

---

## 💡 Casos de Uso

### Caso 1: Auditoría de Actividad
**Objetivo**: Verificar qué cambios se hicieron en el período

```
Período: 01/04/2026 - 30/04/2026
Propósito: Auditoría mensual de actividad
Audiencia: Gerencia de Auditoría
Resultado: Reporte de 25 páginas detallando cada cambio
```

### Caso 2: Investigación de Retraso
**Objetivo**: Entender por qué un proceso se atrasó

```
Período: 01/03/2026 - 15/04/2026
Propósito: Investigar atraso en "Contratación de Servicios"
Audiencia: Dirección responsable + Gerencia
Resultado: Cronología clara de dónde se estancó
```

### Caso 3: Validación de Conformidad
**Objetivo**: Confirmar que se siguieron los procedimientos

```
Período: 01/01/2026 - 31/12/2026
Propósito: Validación anual de conformidad
Audiencia: Directiva + Órgano de Control
Resultado: Trazabilidad completa de todos los cambios
```

---

## 🎨 Diseño Visual

- **Portada**: Fondo verde (corporativo)
- **Encabezados**: Color verde oscuro (#165e4e)
- **Iconos**: Emojis para claridad visual
- **Tablas**: Alternancia de colores para legibilidad
- **Pies de página**: Numeración automática
- **Respaldo**: Papel blanco para impresión

---

## 📈 Volumen de Datos

El tamaño del informe depende de la actividad:

| Período | Procesos | Cambios | Páginas Aprox. |
|---------|----------|---------|-----------------|
| 1 semana | 5-10 | 10-30 | 2-4 |
| 1 mes | 10-30 | 30-100 | 5-15 |
| 1 trimestre | 20-50 | 100-300 | 15-40 |
| 1 año | 40-100 | 300-1000 | 40-100+ |

---

## 🔒 Seguridad y Permisos

- **Módulo requerido**: `reportes` (lectura)
- **Acceso**: Admin, Dirección, Reportería
- **Scope**: 
  - Admin/Reportería: Todas las direcciones
  - Dirección: Solo su dirección
- **Datos sensibles**: NO se incluyen contraseñas ni datos personales adicionales

---

## ⚠️ Consideraciones

### Volumen Grande de Datos
Si el período es **muy amplio** (>1 año) con **>100 procesos**, el PDF puede ser:
- Lento de generar (hasta 1 minuto)
- Muy grande (>50 MB)
- Difícil de navegar

**Solución**: Usar períodos más cortos o filtrar por dirección

### Sin Cambios
Si una dirección no tiene cambios en el período:
- No aparece en el informe
- Se minimiza el ruido en el documento

### Cambios Incompletos
Si un proceso no tiene etapas con estado definido:
- Se omite de la sección de cambios
- Solo aparece si tiene comentarios

---

## 🔍 Diferencias vs. Informe de Resumen

| Aspecto | Resumen | Detalle |
|---------|---------|---------|
| **Enfoque** | Visión general | Línea por línea |
| **Granularidad** | Por dirección | Por proceso |
| **Información** | KPIs + Rankings | Cambios + Comentarios |
| **Usuarios** | Gerencia | Auditores |
| **Extensión** | 5-8 páginas | 20-100+ páginas |
| **Uso** | Estratégico | Operacional |

---

## 📞 Troubleshooting

### El PDF está vacío
**Causa**: No hay cambios registrados en el período

**Solución**:
- Ampliar el rango de fechas
- Verificar que los procesos tienen etapas
- Asegurarse que hay cambios de estado registrados

### El PDF es muy grande
**Causa**: Período amplio con muchos procesos

**Solución**:
- Reducir el rango de fechas
- Generar por dirección separately
- Usar filtros más específicos

### Los comentarios no aparecen
**Causa**: Los comentarios se guardan en el campo "observaciones" de las etapas

**Solución**:
- Verificar que los usuarios agregaron observaciones
- Revisar en la vista de proceso si hay comentarios

---

## ✅ Checklist de Validación

Antes de generar un informe:

- [ ] He seleccionado ambas fechas
- [ ] La fecha de inicio ≤ fecha de fin
- [ ] Tengo permisos de lectura en "reportes"
- [ ] Conozco el período de datos que espero ver
- [ ] Tengo espacio disponible en descargas

---

## 🎓 Ejemplo Completo

```
PERÍODO: 01/04/2026 - 30/04/2026

PORTADA
├─ Período: 01/04/2026 - 30/04/2026
├─ Direcciones analizadas: 3
└─ Procesos con cambios: 12

RESUMEN
├─ Total cambios: 45
├─ Total comentarios: 78
└─ Última actualización: 29/04/2026

ÚLTIMOS INGRESOS
├─ DAF/TICS: 29/04/2026
├─ Asesoría Jurídica: 27/04/2026
└─ Talento Humano: 22/04/2026

DETALLE POR DIRECCIÓN

DIRECCIÓN: DAF/TICS
├─ Cambios: 18 | Comentarios: 35
├─ 
├─ PROCESO: Contratación de Software
│  ├─ Cambios:
│  │  ├─ Etapa "Definición de requisitos": COMPLETADO (15/04)
│  │  ├─ Etapa "Evaluación": EN_PROCESO (20/04)
│  │  └─ Etapa "Adjudicación": PENDIENTE
│  │
│  └─ Comentarios:
│     ├─ "Requisitos revisados por CTO" (15/04)
│     └─ "Tres propuestas recibidas, evaluando..." (21/04)
│
└─ PROCESO: Servicio de Hosting
   ├─ Cambios:
   │  └─ Etapa "Contratación": COMPLETADO (25/04)
   │
   └─ Comentarios:
      └─ "Servidor activo, migración en curso" (26/04)

[Continúa para otras direcciones...]
```

---

## 📝 Notas Finales

- Este informe es **ideal para auditoría** y **trazabilidad**
- Proporciona **transparencia total** de la actividad
- Complementa al Informe de Resumen para **análisis completo**
- Se actualiza **en tiempo real** con los datos de la base de datos

**Ideal para:** Auditorías, investigaciones, documentación de cambios, cumplimiento normativo.
