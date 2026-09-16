# 🛠️ Administración del Catálogo de Etapas

## Acceso a la Interfaz

### En la Aplicación Web
1. Ingresa a la aplicación con usuario administrador
2. Ve a **Admin → Catálogos → Catálogo de Etapas**
3. Alternativamente, accede directo a: `http://localhost:3000/#/admin/catalogo-etapas`

### Permisos Requeridos
- Módulo: `admin_catalogos`
- Acción: `read` (lectura)
- Usuario debe tener rol de administrador

---

## 📊 Interfaz de Administración

### Panel de Resumen
Muestra estadísticas generales del catálogo:
- **Total de Etapas**: Cantidad total registrada (66)
- **Clasificadas**: Etapas con clasificación asignada (33)
- **Sin Clasificar**: Etapas pendientes de clasificación (33)
- **Por Fase**: Detalle de cantidad en cada clasificación

### Filtros
- **Mostrar clasificación**: Filtrar por fase específica
- **Buscar**: Búsqueda por nombre de etapa o ID
- **Exportar JSON**: Descargar datos en formato JSON

---

## ✏️ Edición Individual

### Pasos para Editar una Etapa

1. **Localiza la etapa** en la tabla usando el buscador si es necesario
2. **Haz clic en "Editar"** en la columna de acciones
3. **Modifica los campos**:
   - **Clasificación**: Selecciona la fase (Preparatoria, Precontractual, Contractual, Sin Clasificar)
   - **Orden**: Número que determina la posición dentro de su fase
   - **Descripción**: Texto adicional sobre la etapa (opcional)
4. **Haz clic en "Guardar"** para confirmar los cambios
5. Se mostrará un mensaje de confirmación

### Ejemplo de Edición

```
Etapa: "MESA TECNICA" (ID: 6)

Cambio de:
  Clasificación: Sin Clasificar → Precontractual
  Orden: null → 0.5 (entre publicación y proformas)
  Descripción: "Revisión técnica de las propuestas"
```

---

## 🚀 Edición Masiva

Para clasificar múltiples etapas a la vez:

### Pasos

1. **Selecciona etapas**:
   - Marca el checkbox de cada etapa individual, O
   - Usa "Seleccionar todas las etapas mostradas" para seleccionar todas en la vista actual

2. **Configura la clasificación**:
   - **Mostrar clasificación**: Elegir la fase destino
   - **Orden inicial** (opcional): Si deseas asignar orden secuencial a las etapas seleccionadas

3. **Haz clic en "Aplicar"**:
   - Se actualizarán todas las etapas seleccionadas
   - Se mostrará cantidad de etapas actualizadas

### Ejemplo de Edición Masiva

```
Seleccionar etapas:
  ✓ ELABORACION DE PLIEGOS PARA DIRECTORIO
  ✓ CONVOCATORIA DEL DIRECTORIO
  ✓ DIRECTORIO
  ✓ RESOLUCION DEL DIRECTORIO

Aplicar:
  Clasificación: Precontractual
  Orden inicial: 3.5

Resultado:
  ✓ 4 etapas clasificadas como Precontractual
  ✓ Órdenes asignadas: 3.5, 4.5, 5.5, 6.5
```

---

## 📋 Clasificaciones Disponibles

### 🔵 Preparatoria
**Descripción**: Etapas iniciales de preparación
- Solicitud de Certificación Programática
- Certificación POA/PAI
- Solicitud de CATE
- CATE
- Informe Técnico
- Informe de Necesidad
- Solicitud de Autorización de Informe
- Autorización del Informe
- Términos de Referencia - Especificaciones Técnicas

### 🟢 Precontractual
**Descripción**: Licitación, publicación y adjudicación
- Solicitud de Publicación
- Publicación Proformas
- Entrega de Proformas
- Recepción Proformas
- Estudio de Mercado
- Certificaciones Presupuestarias
- Pliegos
- Resolución de Inicio
- Preguntas/Respuestas
- Entrega de Ofertas
- Convalidaciones
- Calificación
- Adjudicación

### 🔴 Contractual
**Descripción**: Formalización del contrato
- Contrato

### ⚪ Sin Clasificar
**Descripción**: Pendiente de categorización
- Procesos especiales (VPN, Directorio)
- Post-adjudicación (Intención, Valorización, etc.)
- Autorizaciones especiales (SERCOP, Quito Honesto, MINTEL)
- Integraciones (ERP, registros)

---

## 🔍 Búsqueda y Filtrado

### Búsqueda por Nombre
- Escribe en el campo "Buscar"
- Busca en nombre de etapa e ID
- La búsqueda es dinámica (en tiempo real)

### Filtro por Clasificación
- Selecciona una clasificación en el desplegable
- La tabla mostrará solo etapas de esa fase
- Útil para edición masiva de etapas de una fase específica

### Combinación de Filtros
Puedes combinar búsqueda + clasificación:
```
Ejemplo:
  Clasificación: "Precontractual"
  Buscar: "publicacion"
  
Resultado: Muestra solo etapas precontractuales que contengan "publicacion"
```

---

## 💾 Exportación

### Exportar JSON
1. Aplica los filtros que desees (opcional)
2. Haz clic en "📥 Exportar JSON"
3. Se descargará un archivo con las etapas filtradas

**Nombre del archivo**: `catalogo-etapas-{clasificacion}-{fecha}.json`

**Ejemplo de contenido**:
```json
[
  {
    "id": 12,
    "nombre": "SOLICITUD DE PUBLICACION",
    "clasificacion": "precontractual",
    "orden": 1,
    "descripcion": "Solicitud inicial de publicación de necesidad",
    "createdAt": "2026-08-05T10:30:00.000Z",
    "updatedAt": "2026-08-05T14:45:00.000Z"
  },
  ...
]
```

---

## 📊 Estadísticas y Reportes

### Resumen Automático
La sección de resumen se actualiza automáticamente después de cada cambio:
- Total de etapas
- Cantidad clasificadas vs sin clasificar
- Desglose por fase

### Visualización
Los datos se muestran en una tarjeta con gradiente:
- Números grandes y fáciles de leer
- Código de colores por fase
- Porcentajes automáticos

---

## ⚠️ Guía de Mejores Prácticas

### Orden de las Etapas
- **Preparatoria**: 1-9 (o 1, 2, 3, ...)
- **Precontractual**: 10-32 (o 1, 2, 3, ...)
- **Contractual**: 1
- **Sin Clasificar**: Sin orden (puede ser null)

**Recomendación**: Usar orden secuencial dentro de cada fase

### Descripciones
Agregar descripciones ayuda a:
- Entender el propósito de cada etapa
- Facilitar búsquedas futuras
- Documentar el catálogo

**Formato sugerido**:
```
Acción principal + Actor responsable + Resultado

Ejemplo:
"Solicitud de autorización del informe técnico por parte de la DAF"
```

### Nomenclatura
Mantener consistencia en nombres:
- Usar mayúsculas uniformes
- Evitar abreviaturas inconsistentes
- Normalizar espacios y caracteres especiales

---

## 🔗 APIs Utilizadas

### Endpoints del Servidor

#### Obtener todas las etapas
```
GET /api/catalogos/etapas
```

#### Obtener etapas por clasificación
```
GET /api/catalogos/etapas/clasificacion/{clasificacion}
```
Parámetro: `preparatoria`, `precontractual`, `contractual`, `sin_clasificar`

#### Actualizar una etapa
```
PUT /api/catalogos/etapas/{id}
Body: {
  clasificacion: string,
  orden: number | null,
  descripcion: string | null
}
```

#### Actualizar múltiples etapas
```
POST /api/catalogos/etapas/clasificar-multiple
Body: {
  etapas: [
    { id, clasificacion, orden, descripcion },
    ...
  ]
}
```

#### Obtener resumen
```
GET /api/catalogos/etapas-resumen
```

---

## 🐛 Solución de Problemas

### "Error al cargar etapas"
- Verifica conexión a internet
- Revisa que el servidor backend esté ejecutándose
- Comprueba que tengas permisos de administrador

### Las ediciones no se guardan
- Verifica que hayas hecho clic en "Guardar"
- Comprueba el mensaje de error mostrado
- Revisa la consola del navegador (F12)

### Búsqueda no funciona
- Limpia el filtro de clasificación
- Recarga la página (F5)
- Intenta con términos más simples

### Exportación no funciona
- Comprueba configuración del navegador de descargas
- Intenta con otro navegador
- Verifica espacio disponible en disco

---

## 📞 Contacto y Soporte

### Para Reportar Problemas
1. Anota el error exacto mostrado
2. Toma un screenshot
3. Envía a: [correo de soporte]

### Para Solicitar Mejoras
- Sistema de comentarios en la interfaz (próximamente)
- Contacto directo con el equipo de TI

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambios |
|---|---|---|
| 2026-08-05 | 1.0 | Creación del módulo de administración |

---

## 🚀 Próximas Funcionalidades (Roadmap)

- [ ] Importar etapas desde Excel
- [ ] Vista previa de cambios antes de guardar
- [ ] Historial de cambios con auditoría
- [ ] Validación de flujos contra catálogo
- [ ] Generación automática de órdenes
- [ ] Plantillas de clasificación
- [ ] Integración con reportes

