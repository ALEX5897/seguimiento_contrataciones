# 🎨 Guía de Personalización del Informe 2

El Informe 2 (Detalle de Cambios) ahora se genera desde **HTML + CSS**, lo que lo hace muy fácil de personalizar.

---

## 📍 Ubicación del Código

**Archivo principal**: `backend/utils/informeTemplates.js`

Este archivo contiene:
- ✅ Plantillas HTML
- ✅ Estilos CSS
- ✅ Funciones generadoras

---

## 🔧 Modificar Estilos CSS

### Ubicación
Dentro de `getEstilosGlobales()` en `informeTemplates.js`

### Ejemplos de Cambios

#### 1. Cambiar Color Principal (Actualmente Verde)
```css
/* BUSCAR: */
.portada {
  background: linear-gradient(135deg, #165e4e 0%, #0d4a38 100%);
}

/* CAMBIAR A: */
.portada {
  background: linear-gradient(135deg, #1e3a8a 0%, #0f2438 100%); /* Azul */
}
```

#### 2. Cambiar Tamaño de Fuente
```css
/* BUSCAR: */
.portada h1 {
  font-size: 48px;
}

/* CAMBIAR A: */
.portada h1 {
  font-size: 56px; /* Más grande */
}
```

#### 3. Cambiar Colores de Estados
```css
/* Estados en tabla */
.estado-completado {
  background: #c8e6c9;  /* Color fondo */
  color: #2e7d32;        /* Color texto */
}

.estado-proceso {
  background: #ffe0b2;
  color: #f57c00;
}

.estado-pendiente {
  background: #ffcdd2;
  color: #c62828;
}
```

#### 4. Cambiar Márgenes y Espaciado
```css
/* BUSCAR: */
.page {
  padding: 40px;
}

/* CAMBIAR A: */
.page {
  padding: 50px; /* Más espacio */
}
```

---

## 📝 Modificar Estructura HTML

### Ubicación
Funciones como:
- `generarPortada()`
- `generarResumen()`
- `generarDetallePorDireccion()`

### Ejemplo: Agregar Logo

En `generarPortada()`, agregar:
```html
<img src="https://tudominio.com/logo.png" 
     style="width: 120px; margin-bottom: 20px;">
```

### Ejemplo: Cambiar Texto de Portada

```javascript
function generarPortada(fechaInicio, fechaFin) {
  return `
    <div class="page portada">
      <h1>📊 MI NUEVO TÍTULO</h1>  <!-- CAMBIAR AQUÍ -->
      <p class="subtitulo">Nuevo subtítulo</p>  <!-- CAMBIAR AQUÍ -->
      ...
    </div>
  `;
}
```

---

## 🎯 Modificar Tabla de Etapas

### Ubicación
En `generarDetallePorDireccion()`, dentro de la tabla

### Cambiar Encabezados

```html
<!-- ACTUAL -->
<th>Etapa</th>
<th>Estado</th>
<th>Comentario</th>
<th>Fecha/Hora</th>

<!-- CAMBIAR A -->
<th>Nombre de la Etapa</th>
<th>Situación Actual</th>
<th>Notas / Observaciones</th>
<th>Cuándo</th>
```

### Agregar Columnas Nuevas

```html
<!-- AGREGAR EN ENCABEZADO -->
<th>Responsable</th>

<!-- EN FILAS DE DATOS -->
<td>${etapa.responsable || '-'}</td>
```

---

## 🎨 Cambiar Paleta de Colores Completa

### Colores Principales Actuales
- Verde Oscuro: `#165e4e`
- Verde Claro: `#e0f2f1`
- Verde Fuerte: `#00897b`

### Reemplazar Globalmente

Usar Buscar y Reemplazar en el archivo:

| Buscar | Reemplazar | Propósito |
|--------|-----------|----------|
| `#165e4e` | `#1e3a8a` | Color primario (azul) |
| `#e0f2f1` | `#dbeafe` | Color claro |
| `#00897b` | `#1e40af` | Color fuerte |

---

## 📊 Modificar Secciones del Informe

### Portada
```javascript
// Archivo: informeTemplates.js
// Función: generarPortada()
// Cambiar: título, subtítulo, estadísticas
```

### Resumen
```javascript
// Función: generarResumen()
// Cambiar: texto descriptivo, información mostrada
```

### Tabla de Etapas
```javascript
// Función: generarDetallePorDireccion()
// Cambiar: estructura de tabla, columnas, estilos
```

---

## 🔌 Agregar Datos Nuevos

### Paso 1: Modificar la Estructura de Datos
En el endpoint `POST /api/reportes/generar-informe-detalle-pdf`:

```javascript
// Agregar datos al objeto procData
procData.nuevocampo = 'valor';
```

### Paso 2: Pasar al HTML
Asegurarse que `datos` contiene el nuevo campo

### Paso 3: Mostrar en la Tabla
En `generarHTMLInformeDetalle()`:

```html
<th>Mi Nuevo Campo</th>
...
<td>${dato.nuevoField}</td>
```

---

## 🚀 Pruebas

Después de cambios, generar informe:

1. Abrir interfaz en `/#/informes`
2. Seleccionar tipo: **Detalle**
3. Elegir fechas
4. Hacer clic en **Generar**
5. Descargar PDF y revisar cambios

---

## 📐 Responsive Design

Los estilos ya incluyen media queries para impresión:

```css
@media print {
  .page {
    page-break-after: always;
  }
}
```

Esto asegura que el PDF se vea bien en A4.

---

## ⚙️ Funciones Helper Útiles

### `formatearMonto(monto)`
Convierte números a formato moneda:
```javascript
formatearMonto(150000) // → $150,000
```

### `getEstadoIcono(estado)`
Devuelve icono y color según estado:
```javascript
const { icono, label, color } = getEstadoIcono('completado');
// icono: '✅'
// label: 'Completado'
// color: '#2e7d32'
```

---

## 🎯 Casos de Uso Comunes

### Cambiar Idioma

Buscar y reemplazar:
- "Etapa" → "Step"
- "Estado" → "Status"
- "Comentario" → "Comment"
- "Fecha/Hora" → "Date/Time"

### Agregar Marca de Agua

En `generarPortada()`:
```css
.portada {
  background-image: url('data:image/svg+xml,<svg>...</svg>');
}
```

### Cambiar Formato de Fecha

En `informeTemplates.js`:
```javascript
// ACTUAL: DD/MM/AAAA HH:MM
// CAMBIAR en: const fecha = com.fecha
```

---

## ✅ Checklist de Personalización

- [ ] Colores ajustados al branding corporativo
- [ ] Logo agregado (si aplica)
- [ ] Estilos de tabla personalizados
- [ ] Encabezados en idioma correcto
- [ ] Márgenes y espacios ajustados
- [ ] PDF generado se ve bien en impresora

---

## 📞 Resumen de Archivos

| Archivo | Propósito |
|---------|----------|
| `backend/utils/informeTemplates.js` | Plantillas HTML + CSS |
| `backend/routes/reportes.js` | Endpoint y lógica |
| `frontend/src/views/Informes.vue` | Interfaz de usuario |

---

**Nota**: Todos los cambios se reflejan inmediatamente en el siguiente informe generado. No requiere reinicio.
