# 📚 Guía de Uso del Catálogo de Etapas

## Descripción General

El catálogo de etapas es un sistema de clasificación que organiza las 66 etapas de contratación en 4 categorías:
- **Preparatoria** (9 etapas)
- **Precontractual** (23 etapas)
- **Contractual** (1 etapa)
- **Sin clasificar** (33 etapas)

---

## Archivos Generados

### 1. **Base de Datos**
- **Tabla:** `etapas_catalogo`
- Almacena la clasificación de cada etapa con campos:
  - `id`: ID de la etapa
  - `nombre`: Nombre de la etapa
  - `clasificacion`: Tipo de fase (preparatoria, precontractual, contractual, sin_clasificar)
  - `orden`: Posición dentro de la fase
  - `created_at` / `updated_at`: Auditoría

### 2. **Archivos de Configuración**

#### `catalogo-etapas.json`
Archivo JSON con toda la estructura del catálogo, listo para importar en JavaScript/Node.

```json
{
  "clasificaciones": {
    "preparatoria": {
      "nombre": "Fase Preparatoria",
      "etapas": [...]
    },
    ...
  },
  "resumen": {...}
}
```

#### `catalogo-etapas.md`
Documentación legible con toda la clasificación en formato tabla.

#### `queries-catalogo-etapas.sql`
Conjunto de consultas SQL útiles para trabajar con el catálogo.

### 3. **Módulo JavaScript**

#### `modules/catalogo-etapas.js`
Módulo exportado que proporciona métodos para trabajar con el catálogo.

---

## Uso en el Código

### Importar el módulo

```javascript
import catalogo from './modules/catalogo-etapas.js';
```

### Métodos Disponibles

#### 1. **Obtener información de una etapa**

```javascript
// Por ID
const etapa = catalogo.obtenerPorId(50);
// Retorna: { id: 50, nombre: 'CONTRATO', clasificacion: 'contractual', orden: 1, ... }

// Por nombre
const etapa = catalogo.obtenerPorNombre('CONTRATO');
// Retorna: { id: 50, nombre: 'CONTRATO', clasificacion: 'contractual', ... }
```

#### 2. **Verificar clasificación**

```javascript
// Obtener clasificación
const clasificacion = catalogo.obtenerClasificacion(50);
// Retorna: 'contractual'

// Verificar fase específica
catalogo.esPreparatoria(1);        // true
catalogo.esPrecontractual(12);     // true
catalogo.esContractual(50);        // true
```

#### 3. **Obtener etapas por fase**

```javascript
// Obtener todas las etapas de una fase
const preparatorias = catalogo.obtenerEtapasDeClasificacion('preparatoria');
const precontractuales = catalogo.obtenerEtapasDeClasificacion('precontractual');
const contractuales = catalogo.obtenerEtapasDeClasificacion('contractual');

// Retorna array de etapas
```

#### 4. **Obtener orden dentro de la fase**

```javascript
// Obtener orden de una etapa
const orden = catalogo.obtenerOrden(49); // ADJUDICACION
// Retorna: 23 (es la etapa 23 de la fase precontractual)

// Comparar orden de dos etapas
const resultado = catalogo.compararOrden(49, 50);
// Retorna: -1 (ADJUDICACION viene antes que CONTRATO)
```

#### 5. **Calcular progreso en un proceso**

```javascript
// Array de IDs de etapas completadas
const etapasCompletadas = [1, 2, 3, 10, 11, 12, 13, 14, 15, 16];

// Obtener progresión por fase
const progresion = catalogo.obtenerProgresionFases(etapasCompletadas);
// Retorna: {
//   preparatoria: { completadas: 6, total: 9 },
//   precontractual: { completadas: 4, total: 23 },
//   contractual: { completadas: 0, total: 1 },
//   sin_clasificar: { completadas: 0, total: 33 }
// }

// Obtener porcentajes de completitud
const porcentajes = catalogo.obtenerPorcentajesFases(etapasCompletadas);
// Retorna: {
//   preparatoria: 67,
//   precontractual: 17,
//   contractual: 0,
//   sin_clasificar: 0
// }
```

#### 6. **Búsqueda**

```javascript
// Buscar etapas por término
const resultados = catalogo.buscar('certificacion');
// Retorna: [
//   { id: 1, nombre: 'SOLICTUD DE CERTIFICACION PROGRAMATICA', ... },
//   { id: 2, nombre: 'CERTIFICACION POA PAI', ... },
//   { id: 16, nombre: 'SOLICITUD DE CERTIFICACION PRESUPUESTARIA', ... },
//   ...
// ]
```

#### 7. **Obtener estadísticas**

```javascript
// Resumen general
const estadisticas = catalogo.obtenerEstadisticas();
// Retorna: {
//   total_etapas: 66,
//   clasificadas: 33,
//   sin_clasificar: 33,
//   por_fase: { preparatoria: 9, precontractual: 23, ... }
// }
```

---

## Casos de Uso Comunes

### 1. **Mostrar barra de progreso por fase**

```javascript
import catalogo from './modules/catalogo-etapas.js';

function mostrarProgreso(subtareaId, seguimientoEtapas) {
  // Obtener etapas completadas
  const etapasCompletadas = seguimientoEtapas
    .filter(seg => seg.estado === 'completada')
    .map(seg => seg.etapa_id);

  // Calcular progreso
  const porcentajes = catalogo.obtenerPorcentajesFases(etapasCompletadas);

  // Renderizar UI
  return {
    preparatoria: porcentajes.preparatoria,
    precontractual: porcentajes.precontractual,
    contractual: porcentajes.contractual
  };
}
```

### 2. **Validar orden de etapas**

```javascript
// Verificar que la próxima etapa sea válida
function validarProximaEtapa(etapaActualId, proximaEtapaId) {
  const clasificacionActual = catalogo.obtenerClasificacion(etapaActualId);
  const clasificacionProxima = catalogo.obtenerClasificacion(proximaEtapaId);

  // Si están en la misma fase, verificar orden
  if (clasificacionActual === clasificacionProxima) {
    const comparacion = catalogo.compararOrden(etapaActualId, proximaEtapaId);
    return comparacion < 0; // La próxima debe venir después
  }

  // Si son diferentes fases, permitir solo siguiendo el flujo
  const fases = ['preparatoria', 'precontractual', 'contractual'];
  const idxActual = fases.indexOf(clasificacionActual);
  const idxProxima = fases.indexOf(clasificacionProxima);
  
  return idxProxima > idxActual;
}
```

### 3. **Filtrar reportes por fase**

```javascript
// En una API endpoint
app.get('/api/reportes/por-fase/:fase', (req, res) => {
  const { fase } = req.params;
  const etapasDePhase = catalogo.obtenerEtapasDeClasificacion(fase);
  const etapaIds = etapasDePhase.map(e => e.id);

  // Consultar BD con estos IDs
  // SELECT * FROM seguimiento_etapas WHERE etapa_id IN (...)
});
```

### 4. **Determinar fase actual de un proceso**

```javascript
function determinarFaseActual(seguimientoEtapas) {
  // Obtener última etapa completada
  const ultimaEtapaCompletada = seguimientoEtapas
    .filter(seg => seg.estado === 'completada')
    .sort((a, b) => catalogo.compararOrden(a.etapa_id, b.etapa_id))
    .pop();

  if (!ultimaEtapaCompletada) {
    return 'preparatoria'; // Inicio
  }

  const clasificacion = catalogo.obtenerClasificacion(ultimaEtapaCompletada.etapa_id);
  const fases = ['preparatoria', 'precontractual', 'contractual'];
  const idxFase = fases.indexOf(clasificacion);

  // Si completó todas las etapas de una fase, va a la siguiente
  const etapasDelFase = catalogo.obtenerEtapasDeClasificacion(clasificacion);
  const etapasCompletadas = seguimientoEtapas
    .filter(seg => seg.estado === 'completada')
    .map(seg => seg.etapa_id)
    .filter(id => etapasDelFase.some(e => e.id === id));

  if (etapasCompletadas.length === etapasDelFase.length) {
    return fases[idxFase + 1] || 'completado';
  }

  return clasificacion;
}
```

### 5. **Actualizar catálogo desde BD**

```javascript
// En una ruta admin
app.post('/api/admin/catalogo/actualizar-clasificacion', async (req, res) => {
  const { etapaId, nuevaClasificacion, orden } = req.body;

  try {
    await conn.execute(
      'UPDATE etapas_catalogo SET clasificacion = ?, orden = ?, updated_at = NOW() WHERE id = ?',
      [nuevaClasificacion, orden, etapaId]
    );

    res.json({ success: true, mensaje: 'Clasificación actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Consideraciones Importantes

### Etapas sin clasificar
Actualmente, 33 etapas (50%) están sin clasificar. Estas incluyen:
- Etapas de procesos especiales (VPN, Directorio)
- Etapas post-adjudicación (CARTA DE INTENCIÓN, VALORIZACIÓN, etc.)
- Etapas de integración (ERP, registros)

**Recomendación:** Revisar y clasificar estas etapas según el flujo real de procesos.

### Nomenclatura inconsistente
Algunas etapas tienen variaciones en nombres (espacios, mayúsculas). La clasificación usa búsqueda flexible pero se recomienda normalizar los nombres en la tabla `etapas_pac`.

### Integración con reportes
El catálogo es especialmente útil para:
- Filtrar reportes por fase
- Calcular KPIs de completitud
- Mostrar dashboards de progreso
- Validar flujos de aprobación

---

## Scripts de Mantenimiento

### Ver catálogo actual en BD
```bash
# Desde backend/
node -e "
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({...});
const [rows] = await conn.execute(
  'SELECT id, nombre, clasificacion, orden FROM etapas_catalogo ORDER BY clasificacion, orden'
);
console.table(rows);
conn.end();
"
```

### Sincronizar catálogo
```bash
cd backend
node catalogo-etapas.mjs
```

---

## Próximos Pasos

1. **Clasificar etapas faltantes** - Definir clasificación para las 33 etapas sin clasificar
2. **Crear vista en BD** - Facilitar consultas frecuentes (ver query 15 en queries-catalogo-etapas.sql)
3. **Integrar en UI** - Mostrar clasificación en dashboards y reportes
4. **Auditoría de flujos** - Validar que los flujos reales respetan este catálogo
