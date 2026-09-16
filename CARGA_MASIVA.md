# Módulo de Carga Masiva - Matriz Base POA 2026

## Descripción general

El módulo de carga masiva permite importar procesos desde **Matriz_Base_POA_2026_1.xlsx** con validaciones automáticas completas.

**Ubicación**: `/admin/carga-masiva` en el frontend
**Archivo base**: `Matriz_Base_POA_2026_1.xlsx`
**Estructura**: 341 procesos × 20 columnas

## Características

✅ **Validaciones completas**
- Campos obligatorios: Código Olympo, Subtarea
- Formatos válidos: números, fechas (conversión desde formato Excel)
- Validación de presupuestos (deben ser números válidos ≥ 0)

✅ **Flujo en 3 pasos**
1. Selección de versión/reforma
2. Carga y validación de archivo
3. Revisión de errores y procesos
4. Ejecución con opciones de limpieza/actualización

✅ **Opciones de carga**
- Limpiar datos previos de la versión (elimina procesos y contexto)
- Actualizar procesos existentes (por código_olympo) o solo insertar nuevos

✅ **Manejo de fechas**
- Convierte automáticamente números de Excel a fechas ISO
- Soporta formato de Excel (1899-12-30 como base)

## Estructura de archivos

### Backend
```
backend/
├── services/cargaMasiva.js          # Lógica de validación y carga
├── routes/cargaMasiva.js            # Endpoints API
├── analizar_matriz.js               # Script para analizar estructura
└── uploads/                         # Directorio para archivos temporales
```

### Frontend
```
frontend/src/
├── views/CargaMasiva.vue            # Componente principal
└── router/index.ts                  # Rutas (agregada: /admin/carga-masiva)
```

## Columnas de Matriz_Base_POA_2026_1.xlsx

| Columna | Tipo | Requerido | Descripción |
|---------|------|-----------|-------------|
| direccion | Texto | | Dirección responsable (ej: "Dirección de Asesoría Jurídica") |
| actividad_composicion_gasto | Texto | | Tipo de gasto (ej: "Nuevo", "Ampliación") |
| actividad_enfoque_genero | Texto | | Enfoque de género (ej: "SI", "NO") |
| actividad_tipo_obra | Texto | | Tipo de obra (ej: "Reparación", "Construcción") |
| actividad_fecha_inicio | Fecha | | Fecha inicio de actividad (formato Excel: número) |
| actividad_fecha_fin | Fecha | | Fecha fin de actividad (formato Excel: número) |
| obra_nombre | Texto | | Nombre de la obra |
| obra_fecha_inicio | Fecha | | Fecha inicio de obra (formato Excel: número) |
| obra_fecha_fin | Fecha | | Fecha fin de obra (formato Excel: número) |
| **subtarea** | Texto | ✅ | **Nombre del proceso/actividad** |
| **codigo_olympo** | Texto | ✅ | **Código único del sistema anterior (ej: 01.01.001.002.530702.000.009)** |
| partida_presupuestaria | Texto | | Código de partida presupuestaria |
| fuente_financiamiento | Texto | | Fuente de fondos (ej: "Fondos Propios") |
| presupuesto_con_reformas | Número | | Presupuesto total incluidas reformas |
| pac_no_pac | Texto | | Plan de Adquisiciones (ej: "PAC", "NO PAC") |
| tipo_contratacion | Texto | | Tipo de contratación (ej: "Ínfima", "Menor", "Mayor") |
| cpc | Texto | | Código de Clasificación de Productos |
| cuatrimestre | Texto | | Período (ej: "I", "II", "III") |
| codigo_unico_proceso | Texto | | Identificador único alternativo |
| version_id | Número | | ID de la versión (no se usa en carga) |

## API Endpoints

### POST `/api/carga-masiva/validar`
Valida un archivo Excel sin cargarlo en la BD.

**Request:**
```
POST /api/carga-masiva/validar
Content-Type: multipart/form-data
Authorization: Bearer <token>

archivo: <archivo.xlsx>
```

**Response:**
```json
{
  "valido": true,
  "resumen": {
    "totalFilas": 341,
    "procesosValidos": 339,
    "erroresEncontrados": 2,
    "advertenciasEncontradas": 0
  },
  "procesos": [
    {
      "rowNum": 2,
      "codigo_olympo": "01.01.001.002.530702.000.009",
      "codigo_unico_proceso": "01.01.001.002",
      "subtarea": "Actualización de licencia de un sistema jurídico",
      "direccion_encargada": "Dirección de Asesoría Jurídica",
      "presupuesto_con_reformas": 300,
      "pac_no_pac": "NO PAC",
      ...
    }
  ],
  "errores": [
    {
      "fila": 45,
      "campo": "presupuesto_con_reformas",
      "mensaje": "Debe ser un número válido"
    }
  ],
  "advertencias": []
}
```

### POST `/api/carga-masiva/ejecutar`
Ejecuta la carga de procesos validados.

**Request:**
```json
{
  "procesos": [...procesos validados...],
  "versionId": 1,
  "opciones": {
    "limpiarDatos": false,
    "actualizarExistentes": false
  }
}
```

**Response:**
```json
{
  "exitoso": true,
  "resultados": {
    "cargados": 339,
    "actualizados": 0,
    "errores": [],
    "totalProcesados": 339
  }
}
```

### GET `/api/carga-masiva/versiones`
Lista versiones/reformas disponibles.

**Response:**
```json
[
  {
    "id": 1,
    "numero_reforma": 10,
    "anio": 2026,
    "fecha_creacion": "2026-03-05T12:00:00Z"
  }
]
```

### GET `/api/carga-masiva/plantilla`
Descarga plantilla Excel con estructura correcta.

**Response:** Archivo Excel descargado

## Validaciones implementadas

### Nivel 1: Campos obligatorios
- `subtarea`: No puede estar vacío
- `codigo_olympo`: No puede estar vacío

### Nivel 2: Formato
- `presupuesto_con_reformas`: Debe ser número ≥ 0
- Fechas: Deben ser convertibles a fechas válidas (soporta formato Excel)

### Nivel 3: Lógica
- No hay validaciones de referencias cruzadas (todas las direcciones se permiten)
- Los procesos duplicados se detectan por `codigo_olympo` + `version_id`

## Flujo de uso

### Paso 1: Preparación
1. Ir a `/admin/carga-masiva`
2. Seleccionar versión/reforma (ej: Reforma 10 - 2026)
3. Cargar archivo Excel (puede ser copia de Matriz_Base_POA_2026_1.xlsx)

### Paso 2: Validación
1. Click en "🔍 Validar archivo"
2. Esperar análisis de validación
3. Ver resumen: total de filas, procesos válidos, errores

### Paso 3: Revisión
- Ver tabla de procesos a cargar
- Ver lista de errores (si los hay)
- Revisar advertencias
- **Errores impiden la carga**; advertencias no

### Paso 4: Ejecución
1. (Opcional) ☑️ "Limpiar datos previos" - elimina todos los procesos de la versión
2. (Opcional) ☑️ "Actualizar procesos existentes" - modifica procesos duplicados
3. Click en "✅ Proceder con la carga"
4. Esperar a que se complete
5. Ver reporte final

## Manejo de errores

### Errores de validación (impiden carga)
| Error | Causa | Solución |
|-------|-------|----------|
| Campo requerido | Subtarea o Código Olympo vacío | Llenar la celda |
| Debe ser un número válido | Presupuesto no es número | Usar solo dígitos y punto decimal |
| Formato de fecha inválido | Fecha en formato no reconocible | Usar formato YYYY-MM-DD o Excel |

### Advertencias (no impiden carga)
| Advertencia | Causa |
|-------------|-------|
| Dirección no encontrada | La dirección no existe en la BD |

### Errores de carga
| Error | Causa |
|-------|-------|
| Proceso ya existe | Código Olympo duplicado (si no está "actualizar existentes") |
| Error de base de datos | Problema de conexión o permisos |

## Conversión de fechas Excel

XLSX libera usa el formato de Excel donde:
- **Base**: 1899-12-30 = 0
- **Cada unidad**: 1 día

Ejemplo:
- 46023 = 2026-03-05 (aproximadamente 126 años después de 1899-12-30)
- 46387 = 2026-12-31

El servicio `cargaMasiva.js` convierte automáticamente:
```javascript
const excelDate = 46023;
const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
// Resultado: 2026-03-05T00:00:00Z
```

## Estructura de base de datos

### Tabla: procesos
```sql
INSERT INTO procesos (
  version_id, codigo_olympo, codigo_unico_proceso, subtarea,
  direccion_encargada, partida_presupuestaria,
  fuente_financiamiento, presupuesto_2026_inicial, costo_2026,
  pac_no_pac, tipo_contratacion, estado,
  estado_carga, activo
) VALUES (...)
```

### Tabla: procesos_contexto
```sql
INSERT INTO procesos_contexto (
  proceso_id, actividad_nombre, actividad_composicion_gasto,
  actividad_enfoque_genero, actividad_tipo_obra,
  actividad_fecha_inicio, actividad_fecha_fin
) VALUES (...)
```

## Transacciones y atomicidad

Cada carga se ejecuta dentro de una transacción MySQL:
- Si **todos** los procesos se cargan exitosamente → COMMIT
- Si **hay errores** en cualquier proceso → ROLLBACK

Esto garantiza consistencia: o se cargan todos o ninguno.

## Permisos requeridos

| Acción | Módulo | Acción |
|--------|--------|--------|
| Validar archivo | `admin_actividades` | `read` + `create` |
| Ejecutar carga | `admin_actividades` | `create` |
| Descargar plantilla | `admin_actividades` | `read` |
| Listar versiones | `admin_actividades` | `read` |

## Ejemplo de ejecución

```bash
# 1. Backend: Instalar dependencias
cd backend
npm install multer

# 2. Frontend: Navegar a módulo
http://localhost:5173/#/admin/carga-masiva

# 3. Seleccionar Reforma 10 - 2026

# 4. Subir Matriz_Base_POA_2026_1.xlsx (o copia)

# 5. Validar → Revisar → Cargar

# 6. Ver resultados: 339 procesos cargados exitosamente
```

## Troubleshooting

### "El archivo debe contener las columnas: subtarea y codigo_olympo"
**Causa**: Las columnas requeridas no están presentes
**Solución**: Verificar que el archivo tiene exactamente esas columnas (case-insensitive)

### "Solo se permiten archivos Excel"
**Causa**: Formato de archivo incorrecto
**Solución**: Usar `.xlsx` o `.xls`

### "Error de conexión a base de datos"
**Causa**: Servidor MySQL no disponible
**Solución**: Verificar que MySQL está corriendo

### "Procesos no aparecen después de cargar"
**Causa**: Opción "Limpiar datos" fue activada
**Verificar**: El proceso limpia datos previos, los procesos nuevos deben estar visibles

### "Algunas filas no se cargaron"
**Causa**: Hay errores en esas filas (presupuesto inválido, fechas incorrectas)
**Solución**: Ver reporte de validación, corregir datos en Excel, recargar

## Notas técnicas

### Performance
- Lectura de Excel: ~500ms para 341 procesos
- Validación: ~1s
- Carga a BD: ~5s (incluye índices)
- **Tiempo total estimado**: 6-7s

### Límites
- Tamaño máximo de archivo: 50MB
- Procesos por archivo: Sin límite (tested con 341)
- Columnas: 20 (definidas en estructura)

### Archivos temporales
- Se guardan en `backend/uploads/`
- Se eliminan automáticamente después de validación
- Limite de limpieza: TODO

## Futuras mejoras

- [ ] Importar datos desde API externa (no solo Excel)
- [ ] Carga de seguimientos (estados, etapas, fechas reales)
- [ ] Validaciones personalizables por dirección
- [ ] Importación de múltiples hojas en un solo Excel
- [ ] Reportes en PDF o Excel de resultados
- [ ] Historial de cargas realizadas
- [ ] Rollback parcial de cargas fallidas

---

**Última actualización**: 2026-09-10  
**Versión**: 1.0.0  
**Archivo base**: Matriz_Base_POA_2026_1.xlsx (v1)
