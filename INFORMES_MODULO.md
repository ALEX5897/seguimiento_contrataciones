# 📊 Módulo de Informes Gerenciales en PDF

## Descripción General

El módulo de Informes permite generar reportes profesionales en PDF con análisis detallado de actividades por período, diseñados para presentación a la gerencia general. Los informes incluyen:

- ✅ **Resumen Ejecutivo** - Estado general con KPIs principales
- ✅ **Indicadores de Desempeño** - Tabla completa de métricas
- ✅ **Análisis por Dirección** - Desglose con contratos principales
- ✅ **Etapas en Atraso** - Puntos críticos con severidad
- ✅ **Rankings de Actividad** - Direcciones más activas e inactivas
- ✅ **Pie de página** - Numeración y branding profesional

## Acceso al Módulo

### URL de Acceso
```
http://localhost:5173/#/informes
```

### Ubicación en el Menú
- Menú principal → **Informes Gerenciales** (entre Reportes y Notificaciones)

### Permisos Requeridos
- Módulo: `reportes` (read)
- Rol: Admin, Dirección o Reportería

## Cómo Generar un Informe

### Paso 1: Seleccionar Rango de Fechas

```
┌─────────────────────────────────┐
│ Fecha de Inicio   [YYYY-MM-DD]  │
│ Fecha de Fin      [YYYY-MM-DD]  │
└─────────────────────────────────┘
```

- **Valor predeterminado**: Últimos 30 días
- **Validación**: La fecha de inicio debe ser ≤ fecha de fin

### Paso 2: Hacer Clic en "Generar Informe PDF"

```
┌──────────────────────────────────────┐
│  [PDF] Generar Informe PDF           │
│        (n columnas seleccionadas)     │
└──────────────────────────────────────┘
```

El botón se desactiva si:
- No hay fechas seleccionadas
- La fecha de inicio es posterior a la de fin

### Paso 3: Descargar PDF

El PDF se descarga automáticamente con el nombre:
```
informe_AAAA-MM-DD.pdf
```

## Contenido del Informe

### 1️⃣ Portada

```
╔════════════════════════════════════╗
║     INFORME DE ACTIVIDADES         ║
║ Seguimiento de Contrataciones      ║
║  POA/PAC 2026                      ║
║                                    ║
║ Período: DD/MM/AAAA - DD/MM/AAAA   ║
║                                    ║
║ KPIs Principales:                  ║
║  • Procesos: 45                    ║
║  • Cumplimiento: 78%               ║
║  • Presupuesto: $15,250,000        ║
╚════════════════════════════════════╝
```

### 2️⃣ Índice

- Resumen Ejecutivo
- Indicadores Generales
- Análisis por Dirección
- Etapas Tardías
- Direcciones Más Activas
- Detalle de Cambios

### 3️⃣ Resumen Ejecutivo

```
Estado: ✅ EXCELENTE (Cumplimiento ≥ 80%)
        🟠 EN DESARROLLO (60-79%)
        ❌ REQUIERE ATENCIÓN (< 60%)

KPIs en Cajas Destacadas:
┌─────────────────┐
│ 45    │ 324   │
│Procesos│Verif. │
└─────────────────┘
```

### 4️⃣ Indicadores Generales

Tabla con 2 columnas mostrando:
- Total Procesos
- Total Verificables Programados
- Verificables Completados
- Verificables en Proceso
- Verificables Pendientes
- Etapas Atrasadas (destacadas en rojo)
- Etapas que Vencen Hoy
- Tasa de Cumplimiento General
- Presupuesto Total Administrado

### 5️⃣ Análisis por Dirección

Para cada dirección:

```
┌─ DIRECCIÓN DE ASESORÍA JURÍDICA ──┐
│                                    │
│ Contratos con mayor monto:         │
│  1️⃣ Contrato A - $5M (85%)        │
│  2️⃣ Contrato B - $3M (60%)        │
│  3️⃣ Contrato C - $1M (40%)        │
│                                    │
│ Procesos: 12 │ Verificables: 45   │
│ Completados: 35 │ Atrasadas: 2    │
│ Cumplimiento: 78%                 │
└────────────────────────────────────┘
```

### 6️⃣ Etapas en Atraso

```
Severidad:
🔴 CRÍTICO   - Más de 30 días
🟠 ALTO      - Entre 15 y 30 días
🟡 MEDIO     - Menos de 15 días
✓ EXCELENTE  - Sin atrasos
```

Para cada etapa tardía:
- Dirección responsable
- Proceso afectado
- Nombre de la etapa
- Días de atraso

### 7️⃣ Resumen de Actividad

**Top 5 Direcciones Más Activas:**

```
🥇 Dirección A - 45 cambios • 23 etapas
🥈 Dirección B - 32 cambios • 18 etapas
🥉 Dirección C - 28 cambios • 15 etapas
⭐ Dirección D - 15 cambios • 8 etapas
✓  Dirección E - 8 cambios  • 4 etapas
```

**Direcciones sin cambios registrados:**

```
⚠️ Dirección X
⚠️ Dirección Y
⚠️ Dirección Z

Nota: Se recomienda realizar seguimiento...
```

## Datos Incluidos en el Informe

### Información Obtenida de:

1. **Subtareas/Procesos**
   - Código Olimpo
   - Nombre del proceso
   - Dirección responsable
   - Presupuesto inicial
   - Estado general

2. **Etapas/Verificables**
   - Nombre de la etapa
   - Orden de ejecución
   - Estado (Completado, En proceso, Pendiente)
   - Fechas (Planificada, Reforma, Real)
   - Días de atraso

3. **Auditoría**
   - Cambios registrados por dirección
   - Período del informe
   - Usuario responsable

### Filtros Aplicados

- **Por período**: Desde fecha inicio hasta fecha fin
- **Por alcance del usuario**:
  - Si es Admin/Reportería: Todas las direcciones
  - Si es Dirección: Solo su dirección

## Especificaciones Técnicas

### Backend

- **Endpoint**: `POST /api/reportes/generar-informe-pdf`
- **Parámetros**:
  ```json
  {
    "fechaInicio": "2024-01-01",
    "fechaFin": "2024-01-31"
  }
  ```
- **Librería**: `pdfkit` (versión 0.13.x)
- **Tamaño máximo**: Sin límite (excepto timeout)

### Frontend

- **Componente**: `Informes.vue`
- **Ruta**: `/informes`
- **Permisos necesarios**: `reportes.read`
- **Historial**: Se guarda en localStorage (últimos 5 informes)

### Características PDF

- **Tamaño**: A4 (210 × 297 mm)
- **Márgenes**: 50 pt (aprox. 18 mm)
- **Fuentes**: Helvetica (estándar, bold)
- **Colores**: Escala profesional azul/verde
- **Páginas numeradas**: Sí (excepto portada)
- **Responsive**: No aplica (PDF es fijo)

## Casos de Uso

### Caso 1: Reporte Mensual
```
Período: 2026-01-01 al 2026-01-31
Audiencia: Gerencia General
Propósito: Evaluar avance mensual del POA
```

### Caso 2: Reporte Trimestral
```
Período: 2026-01-01 al 2026-03-31
Audiencia: Directivos
Propósito: Análisis de cumplimiento trimestral
```

### Caso 3: Reporte Ad-hoc
```
Período: Personalizado (últimos 15 días, por ejemplo)
Audiencia: Gerente específico
Propósito: Investigar un problema particular
```

## Troubleshooting

### El PDF no se descarga

**Síntomas**: El botón se activa pero no ocurre descarga

**Soluciones**:
1. Verificar que el navegador permite descargas
2. Revisar si hay bloqueador de pop-ups activo
3. Probar en modo incógnito
4. Verificar permisos de la carpeta Downloads

### El informe está vacío

**Síntomas**: Se genera el PDF pero sin datos

**Posibles causas**:
- El período seleccionado no tiene datos
- El usuario solo tiene acceso a una dirección sin procesos
- Hay un error en la conexión a base de datos

**Soluciones**:
1. Ampliar el rango de fechas
2. Verificar permisos del usuario
3. Revisar los logs del servidor

### El PDF tarda mucho en generar

**Síntomas**: Botón en "Generando..." por más de 30 segundos

**Posibles causas**:
- Base de datos lenta
- Período muy amplio (años de datos)
- Servidor con bajo rendimiento

**Soluciones**:
1. Reducir el rango de fechas
2. Verificar estado del servidor
3. Ejecutar en horarios de bajo uso

## Mejoras Futuras

- [ ] Gráficos de progreso (barras, líneas)
- [ ] Firma digital del reporte
- [ ] Exportación a Excel con datos crudos
- [ ] Envío automático por email
- [ ] Programación de informes recurrentes
- [ ] Marca de agua personalizada
- [ ] Múltiples idiomas (ES, EN)
- [ ] Filtros adicionales (por responsable, tipo plan)

## Notas para Desarrolladores

### Agregar nuevas secciones al PDF

1. Localizar la sección en `generarInformePDF()`
2. Agregar lógica de datos en `POST /api/reportes/generar-informe-pdf`
3. Pasar los datos en el objeto `datosPDF`
4. Renderizar en el PDF con métodos de pdfkit

### Modificar estilos

Los colores principales son:
- **Azul primario**: `#1a5fad` (encabezados)
- **Verde éxito**: `#16a34a` (completado)
- **Rojo alerta**: `#dc2626` (crítico)
- **Gris neutro**: `#f8fafc` (fondo)

### Testing

Para probar localmente:
```bash
curl -X POST http://localhost:3000/api/reportes/generar-informe-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fechaInicio":"2024-01-01","fechaFin":"2024-12-31"}' \
  > informe_test.pdf
```

## Historial de Cambios

### v1.0 (Actual)
- ✅ Generación de PDF con 5 secciones principales
- ✅ Análisis por dirección con contratos top 3
- ✅ Identificación de etapas tardías por severidad
- ✅ Rankings de direcciones activas e inactivas
- ✅ Integración con auditoría para contar cambios
- ✅ Historial en localStorage

### Futuro (v1.1)
- Gráficos incrustados
- Análisis comparativo periodo anterior
- Exportación a múltiples formatos
