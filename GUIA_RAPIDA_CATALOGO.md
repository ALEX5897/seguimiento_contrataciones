# 🎯 Guía Rápida - Catálogo de Etapas

## 👤 Para Administradores

### Acceder a la Interfaz
**Menú → Admin → Catálogos → Catálogo de Etapas**

O directamente: `http://localhost:3000/#/admin/catalogo-etapas`

### Tareas Comunes

**Editar una etapa**
1. Busca la etapa
2. Clic en "Editar"
3. Cambiar clasificación/orden/descripción
4. Clic en "Guardar"

**Clasificar múltiples etapas**
1. Filtra por clasificación actual (ej: "Sin Clasificar")
2. Selecciona etapas (individual o "Seleccionar todas")
3. Elige clasificación destino
4. Clic en "Aplicar"

**Exportar datos**
- Clic en "📥 Exportar JSON"

📖 Leer: [ADMIN_CATALOGO_ETAPAS.md](./ADMIN_CATALOGO_ETAPAS.md)

---

## 👨‍💻 Para Desarrolladores

### Usar el Catálogo en Código

**JavaScript (Node.js / Frontend)**
```javascript
import catalogo from './backend/modules/catalogo-etapas.js';

// Verificar clasificación
if (catalogo.esPrecontractual(49)) {
  // ADJUDICACION
}

// Calcular progreso
const porcentajes = catalogo.obtenerPorcentajesFases([1, 2, 3]);
// { preparatoria: 33, precontractual: 0, contractual: 0 }

// Buscar etapas
const resultados = catalogo.buscar('certificacion');
```

**SQL**
```sql
-- Obtener etapas de una fase
SELECT * FROM etapas_catalogo
WHERE clasificacion = 'precontractual'
ORDER BY orden;

-- Progreso de un proceso
SELECT ec.nombre, ec.clasificacion, COUNT(seg.id) as completadas
FROM etapas_catalogo ec
LEFT JOIN seguimiento_etapas seg ON ec.id = seg.etapa_id AND seg.estado = 'completada'
WHERE seg.subtarea_id = ?
GROUP BY ec.clasificacion;
```

**API REST**
```javascript
// Obtener todas las etapas
GET /api/catalogos/etapas

// Obtener etapas de una fase
GET /api/catalogos/etapas/clasificacion/precontractual

// Actualizar una etapa
PUT /api/catalogos/etapas/49
{
  "clasificacion": "precontractual",
  "orden": 23,
  "descripcion": "Etapa de adjudicación"
}

// Actualizar múltiples
POST /api/catalogos/etapas/clasificar-multiple
{
  "etapas": [
    { "id": 20, "clasificacion": "precontractual", "orden": 3 },
    { "id": 21, "clasificacion": "precontractual", "orden": 4 }
  ]
}

// Resumen
GET /api/catalogos/etapas-resumen
```

📖 Leer: [GUIA_USO_CATALOGO_ETAPAS.md](./GUIA_USO_CATALOGO_ETAPAS.md)

---

## 📋 Referencia Rápida del Catálogo

### Fases Definidas

| Fase | Icono | Etapas | Propósito |
|------|-------|--------|----------|
| Preparatoria | 🔵 | 9 | Certificaciones e informes iniciales |
| Precontractual | 🟢 | 23 | Licitación, publicación y adjudicación |
| Contractual | 🔴 | 1 | Formalización del contrato |
| Sin Clasificar | ⚪ | 33 | Pendiente de categorización |

### Etapas Clave
- **ID 1-9**: Preparatoria
- **ID 12-49**: Precontractual
- **ID 50**: Contractual (Contrato)
- **Otros**: Sin Clasificar

### Órdenes
```
Preparatoria:    1-9 (o flexible)
Precontractual:  1-23 (secuencial)
Contractual:     1
Sin Clasificar:  null o flexible
```

📖 Leer: [CATALOGO_ETAPAS.md](./CATALOGO_ETAPAS.md)

---

## 🔧 Instalación y Configuración

### Requisitos
- Backend Node.js ejecutándose
- Base de datos MySQL/MariaDB con tabla `etapas_catalogo`
- Usuario autenticado con rol admin

### Activar
1. Las rutas y funciones ya están agregadas
2. Solo reinicia backend y frontend
3. Accede a: `Admin → Catálogos → Catálogo de Etapas`

### Verificar Instalación
```bash
# Backend
curl http://localhost:3000/api/catalogos/etapas

# Frontend
http://localhost:3000/#/admin/catalogo-etapas
```

---

## 📊 Estadísticas Actuales

**Total**: 66 etapas

```
🔵 Preparatoria        9 etapas  (13.6%)
🟢 Precontractual     23 etapas  (34.8%)
🔴 Contractual         1 etapa   ( 1.5%)
⚪ Sin Clasificar      33 etapas  (50.0%)
```

**Etapas Críticas**:
- ADJUDICACION (ID 49) - Precontractual, Orden 23
- CONTRATO (ID 50) - Contractual, Orden 1

---

## ❓ Preguntas Frecuentes

**P: ¿Cómo cambiar la clasificación de una etapa?**
R: Admin → Catálogo de Etapas → Buscar → Editar → Cambiar clasificación → Guardar

**P: ¿Puedo cambiar el orden de las etapas?**
R: Sí, en el campo "Orden" puedes asignar cualquier número dentro de su fase

**P: ¿Qué pasa si una etapa está "Sin Clasificar"?**
R: Se mostrará en reportes pero no afectará el cálculo de fases. Debe clasificarse.

**P: ¿Puedo crear nuevas etapas desde aquí?**
R: No, solo se pueden editar las 66 etapas existentes. Nuevas etapas se agregan en la tabla `etapas_pac`

**P: ¿Cómo exporto los datos?**
R: Clic en "📥 Exportar JSON". Se descargará un archivo con todas las etapas (o las filtradas)

**P: ¿Se audita quién cambió qué?**
R: Sí, automáticamente con `updated_at`. Para historial completo, ver la tabla directamente

---

## 🚀 Roadmap

### Próximas Fases
- [ ] Importar etapas desde Excel
- [ ] Historial de cambios con auditoría
- [ ] Validación de flujos
- [ ] Generación automática de órdenes
- [ ] Vistas personalizadas por tipo de proceso

### Trabajo Pendiente
- [ ] Clasificar 33 etapas sin clasificar
- [ ] Crear vista en BD
- [ ] Integrar en reportes
- [ ] Añadir KPIs por fase

---

## 📁 Archivos Relacionados

```
Raíz del Proyecto/
├─ CATALOGO_ETAPAS.md              ← Catálogo completo (referencia)
├─ GUIA_USO_CATALOGO_ETAPAS.md     ← Ejemplos de código
├─ ADMIN_CATALOGO_ETAPAS.md        ← Manual de administración (detallado)
├─ IMPLEMENTACION_ADMIN_ETAPAS.md  ← Cambios técnicos realizados
├─ RESUMEN_CATALOGO_ETAPAS.md      ← Inicio rápido
├─ GUIA_RAPIDA_CATALOGO.md         ← Este archivo
│
└─ backend/
   ├─ routes/catalogos.js          ← Endpoints REST
   ├─ data/mysql.js                ← Funciones de BD
   ├─ modules/catalogo-etapas.js   ← Módulo JavaScript
   ├─ queries-catalogo-etapas.sql  ← Consultas SQL útiles
   └─ catalogo-etapas.json         ← Datos en JSON

└─ frontend/
   └─ src/
      ├─ views/AdminCatalogoEtapas.vue  ← Interfaz de administración
      └─ router/index.ts                 ← Configuración de rutas
```

---

## 📞 Contacto y Soporte

**Para usar la interfaz**: Ver [ADMIN_CATALOGO_ETAPAS.md](./ADMIN_CATALOGO_ETAPAS.md)

**Para desarrollar con el catálogo**: Ver [GUIA_USO_CATALOGO_ETAPAS.md](./GUIA_USO_CATALOGO_ETAPAS.md)

**Para entender la implementación**: Ver [IMPLEMENTACION_ADMIN_ETAPAS.md](./IMPLEMENTACION_ADMIN_ETAPAS.md)

**Para ver el catálogo completo**: Ver [CATALOGO_ETAPAS.md](./CATALOGO_ETAPAS.md)

---

**Última actualización**: 2026-08-05  
**Versión**: 1.0  
**Status**: ✅ Operativo
