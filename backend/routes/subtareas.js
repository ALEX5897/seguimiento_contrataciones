import express from 'express';
import * as mysql from '../data/mysql.js';

const router = express.Router();

function getScopeFromReq(req) {
  return {
    role: req.user?.role,
    direccionNombre: req.user?.direccionNombre || null
  };
}

async function resolveSubtareaIdFromRef(subtareaRef, scope = {}) {
  const ref = String(subtareaRef || '').trim();
  if (/^\d+$/.test(ref)) {
    const subtarea = await mysql.getSubtareaByIdByScope(Number(ref), scope);
    return subtarea?.id || null;
  }
  const subtarea = await mysql.getSubtareaByCodigoOlympoByScope(ref, scope);
  return subtarea?.id || null;
}

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

// GET /api/subtareas - Listar todas las subtareas con su seguimiento
router.get('/', async (req, res) => {
  try {
    const subtareas = await mysql.getAllSubtareasByScope(getScopeFromReq(req));
    
    // Las subtareas ya vienen con las etapas asignadas desde getAllSubtareas()
    // Mapear a la estructura que espera el frontend
    const subtareasEnriquecidas = subtareas.map(subtarea => {
      // Filtrar solo las etapas que aplican y mapear al formato esperado
      const seguimientoEtapas = (subtarea.etapas || [])
        .filter(e => Number(e.aplica) === 1 || e.aplica === true || String(e.aplica).toLowerCase() === 'true')
        .map(etapa => ({
          id: etapa.id,
          etapaId: etapa.etapaId,
          etapaNombre: etapa.etapaNombre,
          fechaPlanificada: etapa.fechaPlanificada || etapa.fechaTentativa || null,
          fechaReal: etapa.fechaReal || null,
          estado: etapa.estado || 'pendiente',
          observaciones: etapa.observaciones || null,
          responsableId: etapa.responsableId || null,
          responsableNombre: etapa.responsableNombre || subtarea.responsableNombre || null,
          orden: etapa.orden
        }));

      return {
        ...subtarea,
        seguimientoEtapas,
        porcentajeAvance: subtarea.avanceGeneral || 0
      };
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
    const subtareas = await mysql.getAllSubtareasByScope(getScopeFromReq(req));
    
    // Calcular totales
    const totalSubtareas = subtareas.length;
    let totalEtapas = 0;
    let completadas = 0;
    let conPendientes = 0;
    let enRetraso = 0;
    let vencenHoy = 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const subtarea of subtareas) {
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
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapas = await mysql.getSubtareaEtapas(subtareaId);
    res.json(etapas);
  } catch (error) {
    console.error(`Error en GET /api/subtareas/${req.params.subtareaRef}/etapas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/subtareas/:subtareaRef/etapas - Compatibilidad con /api/actividades (id o codigo)
router.put('/:subtareaRef/etapas', async (req, res) => {
  try {
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const { etapas } = req.body;
    console.log(`[PUT /api/subtareas/${subtareaId}/etapas] Guardando ${etapas?.length || 0} etapas: ${etapas?.map(e => `(id:${e.etapaId},estado:${e.estado})`).join(', ')}`);
    const resultado = await mysql.setSubtareaEtapas(subtareaId, etapas || []);
    console.log(`[PUT /api/subtareas/${subtareaId}/etapas] Resultado: ${resultado?.length || 0} etapas retornadas`);
    res.json(resultado);
  } catch (error) {
    console.error(`Error en PUT /api/subtareas/${req.params.subtareaRef}/etapas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subtareas/:subtareaRef/etapas/:etapaId/seguimientos - Compatibilidad con /api/actividades
router.get('/:subtareaRef/etapas/:etapaId/seguimientos', async (req, res) => {
  try {
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
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
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
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
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);
    const { comentario, tieneAlerta, fecha, responsableId, responsableNombre, responsable } = req.body;

    if (!comentario || String(comentario).trim() === '') {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }

    await mysql.createSeguimientoDiario({
      subtareaId,
      etapaId,
      comentario,
      tieneAlerta: Boolean(tieneAlerta),
      fecha: fecha || new Date().toISOString().split('T')[0],
      responsableId: responsableId || null,
      responsableNombre: responsableNombre || responsable || null
    });

    const seguimientos = await mysql.getSeguimientosDiarios(subtareaId, etapaId, 30);
    res.status(201).json({ success: true, seguimientos });
  } catch (error) {
    console.error(`Error en POST /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}/seguimientos:`, error);
    res.status(500).json({ error: error.message || 'Error al guardar seguimiento' });
  }
});

// PUT /api/subtareas/:subtareaRef/etapas/:etapaId/seguimientos/:seguimientoId - Compatibilidad con /api/actividades
router.put('/:subtareaRef/etapas/:etapaId/seguimientos/:seguimientoId', async (req, res) => {
  try {
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
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
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);
    const seguimientoId = parseInt(req.params.seguimientoId, 10);

    await mysql.deleteSeguimientoDiario(seguimientoId);
    const seguimientos = await mysql.getSeguimientosDiarios(subtareaId, etapaId, 30);
    res.json({ success: true, seguimientos });
  } catch (error) {
    console.error(`Error en DELETE /api/subtareas/${req.params.subtareaRef}/etapas/${req.params.etapaId}/seguimientos/${req.params.seguimientoId}:`, error);
    res.status(500).json({ error: error.message || 'Error al eliminar seguimiento' });
  }
});

// PUT /api/subtareas/:subtareaRef/etapas/:etapaId - Actualizar etapa específica (id o codigo)
router.put('/:subtareaRef/etapas/:etapaId', async (req, res) => {
  try {
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    if (!subtareaId) return res.status(404).json({ error: 'Subtarea no encontrada' });
    const etapaId = parseInt(req.params.etapaId, 10);

    const payload = {
      etapaId,
      aplica: true,
      fechaTentativa: req.body.fechaPlanificada || req.body.fechaTentativa || null,
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
    const subtareaActualizada = await mysql.updateSubtarea(req.params.subtareaRef, req.body);
    
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
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
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
    const subtareaId = await resolveSubtareaIdFromRef(req.params.subtareaRef, getScopeFromReq(req));
    const subtarea = subtareaId ? await mysql.getSubtareaByIdByScope(subtareaId, getScopeFromReq(req)) : null;
    
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

export default router;
