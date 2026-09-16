import express from 'express';
import * as mysql from '../data/mysql.js';
import { getScopeFromReq, parseDateOnly, obtenerEstadoProceso, obtenerPresupuestoProceso, procesoCuentaEnReporte } from '../utils/helpers.js';

const router = express.Router();

async function resolveSubtareaIdFromRef(subtareaRef, scope = {}) {
  const ref = String(subtareaRef || '').trim();
  if (/^\d+$/.test(ref)) {
    const refNum = Number(ref);
    // Buscar en procesos por ID
    const result = await mysql.query(
      `SELECT id FROM procesos WHERE id = ? LIMIT 1`,
      [refNum]
    );
    if (result?.[0]?.id) return result[0].id;
    return null;
  }
  const subtarea = await mysql.getSubtareaByCodigoOlympoByScope(ref, scope);
  return subtarea?.id || null;
}

const parseDateOnlyLocal = parseDateOnly;
const obtenerEstadoProcesoResumen = obtenerEstadoProceso;
const obtenerPresupuestoProcesoResumen = obtenerPresupuestoProceso;
const procesoCuentaEnResumenYAtrasos = procesoCuentaEnReporte;

// GET /api/subtareas/admin/etapas-disponibles - Compatibilidad con /api/actividades
router.get('/admin/etapas-disponibles', async (req, res) => {
  try {
    const etapas = await mysql.obtenerTodasEtapas();
    res.json(etapas);
  } catch (error) {
    console.error('Error en GET /api/subtareas/admin/etapas-disponibles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/admin/responsables - Compatibilidad con /api/actividades
router.get('/admin/responsables', async (req, res) => {
  try {
    const responsables = await mysql.getAllResponsables();
    res.json(responsables);
  } catch (error) {
    console.error('Error en GET /api/subtareas/admin/responsables:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/admin/direcciones - Direcciones disponibles para asignación de usuarios
router.get('/admin/direcciones', async (req, res) => {
  try {
    const direcciones = await mysql.getDireccionesDisponibles();
    res.json(direcciones);
  } catch (error) {
    console.error('Error en GET /api/subtareas/admin/direcciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subtareas/admin/etapas - Compatibilidad con /api/actividades
router.post('/admin/etapas', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || String(nombre).trim() === '') {
      return res.status(400).json({ error: 'El nombre de la etapa es requerido' });
    }
    const nuevaEtapa = await mysql.crearEtapaPersonalizada(String(nombre).trim());
    res.status(201).json(nuevaEtapa);
  } catch (error) {
    console.error('Error en POST /api/subtareas/admin/etapas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para obtener scope con direcciones asignadas
async function getScopeWithDirecciones(req) {
  const scope = getScopeFromReq(req);
  if (scope.userId && Number.isInteger(scope.userId)) {
    try {
      const direcciones = await mysql.getDireccionesUsuario(scope.userId);
      scope.direccionesAsignadas = direcciones.map((d) => d.nombre);
    } catch (err) {
      console.error('Error al cargar direcciones del usuario:', err);
      scope.direccionesAsignadas = [];
    }
  }
  return scope;
}

// GET /api/subtareas - Listar todas las subtareas con su seguimiento
router.get('/', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const limit = Math.min(parseInt(req.query.limit) || 75, 500); // Máximo 500
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const subtareas = await mysql.getAllSubtareasByScope(scope);
    const total = subtareas.length;

    // Aplicar paginación
    const subtareasPaginadas = subtareas.slice(offset, offset + limit);

    // Las subtareas ya vienen con las etapas asignadas desde getAllSubtareas()
    const subtareasEnriquecidas = subtareasPaginadas.map(subtarea => {
      return {
        ...subtarea,
        porcentajeAvance: subtarea.avanceGeneral || 0
      };
    });

    // Retornar con información de paginación en headers para compatibilidad
    res.set({
      'X-Total-Count': String(total),
      'X-Offset': String(offset),
      'X-Limit': String(limit),
      'X-Has-More': ((offset + limit) < total) ? 'true' : 'false'
    });
    res.json(subtareasEnriquecidas);
  } catch (error) {
    console.error('Error en GET /api/subtareas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/resumen/diario - Indicadores diarios de seguimiento
router.get('/resumen/diario', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareas = await mysql.getAllSubtareasByScope(scope);
    
    const subtareasContabilizadas = subtareas.filter((subtarea) => procesoCuentaEnResumenYAtrasos(subtarea));

    // Calcular totales
    const totalSubtareas = subtareasContabilizadas.length;
    let totalEtapas = 0;
    let completadas = 0;
    let conPendientes = 0;
    let enRetraso = 0;
    let vencenHoy = 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const subtarea of subtareasContabilizadas) {
      const etapas = subtarea.etapas || [];
      totalEtapas += etapas.length;
      
      for (const etapa of etapas) {
        if (etapa.aplica) {
          // Contar según estado (por ahora, todas son pendientes hasta que se implemente seguimiento)
          if (etapa.fechaTentativa) {
            const fechaEtapa = new Date(etapa.fechaTentativa);
            fechaEtapa.setHours(0, 0, 0, 0);
            
            if (fechaEtapa < hoy) {
              enRetraso++;
            } else if (fechaEtapa.getTime() === hoy.getTime()) {
              vencenHoy++;
            }
          }
        }
      }
      
      const etapasActivas = etapas.filter(e => e.aplica);
      if (etapasActivas.length > 0) {
        conPendientes++;
      }
    }

    const resumen = {
      totalSubtareas,
      totalEtapas,
      completadas,
      conPendientes,
      enRetraso,
      vencenHoy
    };

    res.json(resumen);
  } catch (error) {
    console.error('Error en GET /api/subtareas/resumen/diario:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/resumen/semanal - Tendencias semanales para dashboard
router.get('/resumen/semanal', async (req, res) => {
  try {
    const resumen = await mysql.getDashboardWeeklySummary(getScopeFromReq(req), {
      area: req.query.area,
      responsable: req.query.responsable,
      busqueda: req.query.busqueda,
      direccion: req.query.direccion,
      tipoPlan: req.query.tipoPlan,
      cuatrimestre: req.query.cuatrimestre,
      tipoContratacion: req.query.tipoContratacion,
      monto: req.query.monto
    });
    res.json(resumen);
  } catch (error) {
    console.error('Error en GET /api/subtareas/resumen/semanal:', error);
    res.status(500).json({ error: error.message || 'Error al obtener resumen semanal' });
  }
});

// GET /api/subtareas/etapas/lista - Listar todas las etapas del PAC
router.get('/etapas/lista', async (req, res) => {
  try {
    const snapshot = await mysql.getDatabaseSnapshot();
    res.json(snapshot.etapas);
  } catch (error) {
    console.error('Error en GET /api/subtareas/etapas/lista:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subtareas - Crear nueva subtarea
router.post('/', async (req, res) => {
  try {
    const nuevaSubtarea = await mysql.createSubtarea(req.body);
    
    if (!nuevaSubtarea) {
      return res.status(400).json({ error: 'Error al crear subtarea' });
    }

    res.status(201).json(nuevaSubtarea);
  } catch (error) {
    console.error('Error en POST /api/subtareas:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef/etapas - Compatibilidad con /api/actividades (id o codigo)
router.get('/:subtareaRef/etapas', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapas = await mysql.getSubtareaEtapas(subtareaId);
    res.json(etapas);
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}/etapas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef/etapas/todas/todas - Obtener todas las etapas incluyendo deshabilitadas para edición
router.get('/:subtareaRef/etapas/todas/todas', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapas = await mysql.getSubtareaEtapasAll(subtareaId);
    res.json(etapas);
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}/etapas/todas/todas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/subtareas/:subtareaRef/etapas - Compatibilidad con /api/actividades (id o codigo)
router.put('/:subtareaRef/etapas', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const { etapas } = req.body;
    await mysql.setSubtareaEtapas(subtareaId, etapas || []);

    // Actualizar la fecha de última actualización del proceso (tabla procesos, no subtareas)
    const updateResult = await mysql.query('UPDATE procesos SET updated_at = NOW() WHERE id = ?', [subtareaId]);
    console.log(`✅ UPDATE updated_at para proceso ${subtareaId}:`, updateResult);

    res.json({ success: true, message: 'Etapas guardadas correctamente' });
  } catch (error) {
    console.error(`Error en PUT /api/subtareas/${req.params.subtareaRef}/etapas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subtareas/:subtareaRef/etapas - Crear nueva etapa personalizada
router.post('/:subtareaRef/etapas', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });

    const { nombre, clasificacion, fechaTentativa, estado, observaciones } = req.body;

    if (!nombre || String(nombre).trim() === '') {
      return res.status(400).json({ error: 'El nombre de la etapa es requerido' });
    }

    const clasificacionValida = ['preparatoria', 'precontractual', 'contractual', 'ejecución', 'sin_clasificar'].includes(
      String(clasificacion || '').toLowerCase()
    ) ? String(clasificacion).toLowerCase() : 'sin_clasificar';

    console.log(`➕ Creando nueva etapa personalizada: nombre="${nombre}", clasificacion="${clasificacionValida}", proceso=${subtareaId}`);

    // Crear la etapa en la tabla etapas_catalogo
    const etapaResult = await mysql.query(
      `INSERT INTO etapas_catalogo (nombre, orden, clasificacion)
       VALUES (?, ?, ?)`,
      [String(nombre).trim(), 999, clasificacionValida]
    );
    const nuevoEtapaId = etapaResult.insertId;
    console.log(`✅ Etapa creada con ID: ${nuevoEtapaId}, clasificación: ${clasificacionValida}`);

    // Agregar la etapa al proceso
    const payload = [{
      etapaId: nuevoEtapaId,
      aplica: true,
      fechaTentativa: fechaTentativa || null,
      fechaPlanificada: fechaTentativa || null,
      estado: estado || 'pendiente',
      fechaReal: null,
      observaciones: observaciones || ''
    }];

    await mysql.setSubtareaEtapas(subtareaId, payload);

    // Actualizar la fecha de última actualización del proceso
    await mysql.query('UPDATE procesos SET updated_at = NOW() WHERE id = ?', [subtareaId]);
    console.log(`✅ Etapa personalizada creada y asignada al proceso ${subtareaId}`);

    // Retornar las etapas actualizadas
    const etapasActualizadas = await mysql.getSubtareaEtapas(subtareaId);
    res.json({ success: true, etapas: etapasActualizadas, message: 'Etapa creada correctamente' });
  } catch (error) {
    console.error(`Error en POST /api/subtareas/${req.params.subtareaRef}/etapas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef/etapas/:etapaId/seguimientos - Compatibilidad con /api/actividades
router.get('/:subtareaRef/etapas/:etapaId/seguimientos', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);
    const dias = parseInt(req.query.dias, 10) || 30;
    const seguimientos = await mysql.getSeguimientosDiarios(subtareaId, etapaId, dias);
    res.json(seguimientos || []);
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}/seguimientos:`, error);
    res.status(500).json({ error: error.message || 'Error al obtener seguimientos' });
  }
});

// GET /api/subtareas/:subtareaRef/seguimientos-resumen - Conteos y alertas por etapa
router.get('/:subtareaRef/seguimientos-resumen', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const dias = parseInt(req.query.dias, 10) || 3650;
    const resumen = await mysql.getSeguimientosResumenPorSubtarea(subtareaId, dias);
    res.json(resumen || []);
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}/seguimientos-resumen:`, error);
    res.status(500).json({ error: error.message || 'Error al obtener resumen de seguimientos' });
  }
});

// POST /api/subtareas/:subtareaRef/etapas/:etapaId/seguimientos - Compatibilidad con /api/actividades
router.post('/:subtareaRef/etapas/:etapaId/seguimientos', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);
    const { comentario, tieneAlerta, fecha, responsableId, responsableNombre, responsable } = req.body;

    if (!comentario || String(comentario).trim() === '') {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }

    console.log(`📝 Guardando seguimiento: proceso=${subtareaId}, etapa=${etapaId}, comentario="${comentario}"`);

    await mysql.createSeguimientoDiario({
      subtareaId,
      etapaId,
      comentario,
      tieneAlerta: Boolean(tieneAlerta),
      fecha: fecha || new Date().toISOString().split('T')[0],
      responsableId: responsableId || null,
      responsableNombre: responsableNombre || responsable || null
    });

    // Actualizar la fecha de última actualización del proceso (tabla procesos, no subtareas)
    const updateResult = await mysql.query('UPDATE procesos SET updated_at = NOW() WHERE id = ?', [subtareaId]);
    console.log(`✅ UPDATE updated_at para proceso ${subtareaId}:`, updateResult);

    console.log(`✅ Seguimiento guardado`);

    const seguimientos = await mysql.getSeguimientosDiarios(subtareaId, etapaId, 365);
    console.log(`📊 Seguimientos recuperados: ${seguimientos?.length || 0} registros`);
    res.status(201).json({ success: true, seguimientos });
  } catch (error) {
    console.error(`Error en POST /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}/seguimientos:`, error);
    res.status(500).json({ error: error.message || 'Error al guardar seguimiento' });
  }
});

// PUT /api/subtareas/:subtareaRef/etapas/:etapaId/seguimientos/:seguimientoId - Compatibilidad con /api/actividades
router.put('/:subtareaRef/etapas/:etapaId/seguimientos/:seguimientoId', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);
    const seguimientoId = parseInt(req.params.seguimientoId, 10);
    const { comentario, tieneAlerta, responsableId, responsableNombre, responsable } = req.body;

    if (!comentario || String(comentario).trim() === '') {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }

    await mysql.updateSeguimientoDiario(seguimientoId, {
      comentario,
      tieneAlerta: Boolean(tieneAlerta),
      responsableId: responsableId || undefined,
      responsableNombre: responsableNombre || responsable || undefined
    });

    const seguimientos = await mysql.getSeguimientosDiarios(subtareaId, etapaId, 30);
    res.json({ success: true, seguimientos });
  } catch (error) {
    console.error(`Error en PUT /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}/seguimientos/${req.params.seguimientoId}:`, error);
    res.status(500).json({ error: error.message || 'Error al actualizar seguimiento' });
  }
});

// DELETE /api/subtareas/:subtareaRef/etapas/:etapaId/seguimientos/:seguimientoId - Compatibilidad con /api/actividades
router.delete('/:subtareaRef/etapas/:etapaId/seguimientos/:seguimientoId', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);
    const seguimientoId = parseInt(req.params.seguimientoId, 10);

    console.log(`🗑️  Eliminando seguimiento: proceso=${subtareaId}, etapa=${etapaId}, seguimiento=${seguimientoId}`);

    await mysql.deleteSeguimientoDiario(seguimientoId);

    // Actualizar la fecha de última actualización del proceso cuando se elimina un comentario
    try {
      await mysql.query('UPDATE procesos SET updated_at = NOW() WHERE id = ?', [subtareaId]);
      console.log(`✅ UPDATE updated_at para proceso ${subtareaId} (eliminar seguimiento)`);
    } catch (updateErr) {
      console.warn(`⚠️  Error actualizando updated_at para proceso ${subtareaId}:`, updateErr.message);
      // No es fatal, continuamos
    }

    const seguimientos = await mysql.getSeguimientosDiarios(subtareaId, etapaId, 30);
    console.log(`📊 Seguimientos recuperados después de eliminar: ${seguimientos?.length || 0} registros`);
    res.json({ success: true, seguimientos });
  } catch (error) {
    console.error(`Error en DELETE /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}/seguimientos/${req.params.seguimientoId}:`, error);
    res.status(500).json({ error: error.message || 'Error al eliminar seguimiento' });
  }
});

// PUT /api/subtareas/:subtareaRef/etapas/:etapaId - Actualizar etapa específica (id o codigo)
router.put('/:subtareaRef/etapas/:etapaId', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);

    const payload = {
      etapaId,
      aplica: true,
      fechaTentativa: req.body.fechaPlanificada || req.body.fechaTentativa || null,
      fechaReforma: req.body.fechaReforma || req.body.fechaPlanificada || req.body.fechaTentativa || null,
      estado: req.body.estado || 'pendiente',
      fechaReal: req.body.fechaReal || null,
      observaciones: req.body.observaciones || null,
      responsableId: req.body.responsableId || null,
      responsableNombre: req.body.responsable || req.body.responsableNombre || null
    };

    const etapas = await mysql.setSubtareaEtapas(subtareaId, [payload]);
    const etapaActualizada = (etapas || []).find(e => Number(e.etapaId) === etapaId) || null;
    if (!etapaActualizada) return res.status(404).json({ error: 'Etapa no encontrada' });

    res.json(etapaActualizada);
  } catch (error) {
    console.error(`Error en PUT /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/subtareas/:subtareaRef - Actualizar subtarea (id o codigo)
router.put('/:subtareaRef', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });

    // Usar función que maneja tanto tabla antigua como versiones
    const subtareaActualizada = await mysql.updateSubtareaVersion(subtareaId, req.body);

    if (!subtareaActualizada) {
      return res.status(404).json({ error: 'Subtarea no encontrada' });
    }

    res.json(subtareaActualizada);
  } catch (error) {
    console.error(`Error en PUT /api/subtareas/${req.params.subtareaRef}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef - Obtener subtarea con detalle completo (id o codigo)
router.get('/:subtareaRef', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const subtarea = await mysql.getSubtareaById(subtareaId);
    if (!subtarea) return res.status(404).json({ error: 'Subtarea no encontrada' });

    res.json(subtarea);
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/subtareas/:subtareaRef - Eliminar subtarea (id o codigo)
router.delete('/:subtareaRef', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });

    await mysql.deleteSubtarea(req.params.subtareaRef);
    res.json({ message: 'Subtarea eliminada' });
  } catch (error) {
    console.error(`Error en DELETE /api/subtareas/${req.params.subtareaRef}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef/resumen - Resumen de progreso de subtarea (id o codigo)
router.get('/:subtareaRef/resumen', async (req, res) => {
  try {
    const scope = await getScopeWithDirecciones(req);
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, scope);
    const subtarea = subtareaId ? await mysql.getSubtareaByIdByScope(subtareaId, scope) : null;
    
    if (!subtarea) {
      return res.status(404).json({ error: 'Subtarea no encontrada' });
    }

    const seguimiento = subtarea.seguimientoEtapas || [];
    const totalEtapas = seguimiento.length;
    const etapasCompletadas = seguimiento.filter(e => e.estado === 'completado').length;
    const etapasEnProceso = seguimiento.filter(e => e.estado === 'en_proceso').length;
    const etapasPendientes = seguimiento.filter(e => e.estado === 'pendiente').length;

    res.json({
      codigoOlympo: subtarea.codigoOlympo,
      nombre: subtarea.nombre,
      presupuesto: subtarea.presupuesto,
      totalEtapas,
      etapasCompletadas,
      etapasEnProceso,
      etapasPendientes,
      porcentajeAvance: totalEtapas > 0 ? Math.round((etapasCompletadas / totalEtapas) * 100) : 0,
      estado: subtarea.estado,
      proximaEtapa: seguimiento.find(e => e.estado !== 'completado')?.etapaNombre || 'Completado'
    });
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}/resumen:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef/seguimientos-resumen - Resumen de seguimientos
router.get('/:subtareaRef/seguimientos-resumen', async (req, res) => {
  try {
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });

    const seguimientos = await mysql.getSeguimientosResumenPorSubtarea(subtareaId, 3650);
    res.json({ seguimientos, total: seguimientos.length });
  } catch (error) {
    console.error('Error en seguimientos-resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

// DUPLICADO ELIMINADO - Usar el primer endpoint GET (línea 282)

// DUPLICADO ELIMINADO - Usar el primer endpoint POST (línea 313)

// GET /api/subtareas/cargar-etapas - Obtener etapas de un proceso por codigo_olympo
router.get('/cargar-etapas', async (req, res) => {
  try {
    const codigoOlympo = req.query.codigo;

    if (!codigoOlympo) {
      return res.status(400).json({ error: 'codigo_olympo es requerido' });
    }

    // Obtener etapas de un proceso por código Olympo
    const [etapasData] = await mysql.query(
      `SELECT se.id, se.subtarea_id, se.etapa_id, se.fecha_tentativa, se.fecha_reforma, se.fecha_reforma_3, se.fecha_planificada,
              ep.nombre AS etapa_nombre, ep.orden, ep.clasificacion, ep.descripcion,
              sg.estado, sg.fecha_real, sg.observaciones, sg.responsable AS responsable_nombre, se.aplica
       FROM subtareas s
       LEFT JOIN subtareas_etapas se ON s.id = se.subtarea_id
       LEFT JOIN etapas_catalogo ep ON ep.id = se.etapa_id
       LEFT JOIN seguimiento_etapas sg ON sg.subtarea_id = se.subtarea_id AND sg.etapa_id = se.etapa_id
       WHERE s.codigo_olympo = ?
       ORDER BY COALESCE(ep.orden, 999), sg.fecha_real DESC`,
      [codigoOlympo]
    );

    const etapasMap = new Map();
    for (const e of etapasData) {
      if (!etapasMap.has(e.etapa_id)) {
        etapasMap.set(e.etapa_id, {
          id: e.id,
          etapaId: e.etapa_id,
          etapaNombre: e.etapa_nombre,
          orden: e.orden,
          clasificacion: e.clasificacion,
          descripcion: e.descripcion,
          fechaTentativa: e.fecha_tentativa,
          fechaReforma: e.fecha_reforma,
          fechaReforma3: e.fecha_reforma_3,
          fechaPlanificada: e.fecha_planificada,
          estado: e.estado,
          fechaReal: e.fecha_real,
          observaciones: e.observaciones,
          responsable: e.responsable_nombre,
          aplica: e.aplica === 1 || e.aplica === true
        });
      }
    }

    const etapas = Array.from(etapasMap.values());
    res.json({ etapas });
  } catch (error) {
    // Ruta legacy: subtareas/subtareas_etapas ya no existen en la estructura normalizada
    console.warn('GET /cargar-etapas: tablas legacy no disponibles en la nueva estructura:', error.message);
    res.json({ etapas: [] });
  }
});

export default router;
