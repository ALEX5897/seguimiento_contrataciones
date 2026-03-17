import express from 'express';
import { ESTADOS } from '../data/database.js';
import {
  createTarea,
  deleteTareaCascade,
  getDatabaseSnapshot,
  insertHistoricoEstado,
  updateTarea
} from '../data/mysql.js';
import { enviarNotificacionCambioEstado } from '../services/notificaciones.js';

export const tareasRouter = express.Router();

// Obtener todas las tareas con filtros opcionales
tareasRouter.get('/', async (req, res) => {
  const { estado, prioridad, responsableId, actividadId } = req.query;
  const database = await getDatabaseSnapshot();
  
  let tareas = database.tareas;
  
  if (estado) {
    tareas = tareas.filter(t => t.estado === estado);
  }
  if (prioridad) {
    tareas = tareas.filter(t => t.prioridad === prioridad);
  }
  if (responsableId) {
    tareas = tareas.filter(t => t.responsableId === parseInt(responsableId));
  }
  if (actividadId) {
    tareas = tareas.filter(t => t.actividadId === parseInt(actividadId));
  }

  // Enriquecer con información relacionada
  const tareasEnriquecidas = tareas.map(tarea => ({
    ...tarea,
    actividad: database.actividades.find(a => a.id === tarea.actividadId),
    responsable: database.responsables.find(r => r.id === tarea.responsableId),
    subtareas: database.subtareas.filter(s => s.tareaId === tarea.id),
    hitos: database.hitosContratacion.filter(h => h.tareaId === tarea.id)
  }));

  res.json(tareasEnriquecidas);
});

// Obtener una tarea por ID
tareasRouter.get('/:id', async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return next();
  }
  const database = await getDatabaseSnapshot();
  const tarea = database.tareas.find(t => t.id === id);
  
  if (!tarea) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  const tareaCompleta = {
    ...tarea,
    actividad: database.actividades.find(a => a.id === tarea.actividadId),
    responsable: database.responsables.find(r => r.id === tarea.responsableId),
    subtareas: database.subtareas.filter(s => s.tareaId === tarea.id),
    hitos: database.hitosContratacion.filter(h => h.tareaId === tarea.id),
    historial: database.historicoEstados.filter(h => h.tareaId === tarea.id)
  };

  res.json(tareaCompleta);
});

// Crear nueva tarea
tareasRouter.post('/', async (req, res) => {
  const { nombre, actividadId, responsableId, estado, prioridad, fechaInicio, fechaFin, observaciones } = req.body;

  if (!nombre || !actividadId || !responsableId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, actividadId, responsableId' });
  }

  const nuevaTarea = await createTarea({
    actividadId,
    nombre,
    responsableId,
    estado: estado || ESTADOS.PENDIENTE,
    prioridad: prioridad || 'media',
    fechaInicio,
    fechaFin,
    observaciones: observaciones || ''
  });

  res.status(201).json(nuevaTarea);
});

// Actualizar tarea
tareasRouter.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const database = await getDatabaseSnapshot();
  const tareaAnterior = database.tareas.find(t => t.id === id);
  
  if (!tareaAnterior) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  const cambioEstado = req.body.estado && req.body.estado !== tareaAnterior.estado;

  const tareaActualizada = await updateTarea(id, req.body);

  // Registrar cambio de estado en historial
  if (cambioEstado) {
    await insertHistoricoEstado({
      tareaId: id,
      estadoAnterior: tareaAnterior.estado,
      estadoNuevo: req.body.estado,
      usuarioId: req.body.usuarioId || null,
      fecha: new Date().toISOString(),
      observaciones: req.body.observaciones || ''
    });

    // Enviar notificación
    await enviarNotificacionCambioEstado(
      tareaActualizada,
      tareaAnterior.estado,
      req.body.estado
    );
  }

  res.json(tareaActualizada);
});

// Eliminar tarea
tareasRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const database = await getDatabaseSnapshot();
  const tarea = database.tareas.find(t => t.id === id);
  
  if (!tarea) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  await deleteTareaCascade(id);

  res.status(204).send();
});

// Obtener resumen de tareas por estado
tareasRouter.get('/resumen/estados', async (req, res) => {
  const database = await getDatabaseSnapshot();
  const resumen = Object.values(ESTADOS).reduce((acc, estado) => {
    acc[estado] = database.tareas.filter(t => t.estado === estado).length;
    return acc;
  }, {});

  res.json(resumen);
});

// Obtener tareas próximas a vencer (próximos 7 días)
tareasRouter.get('/alertas/vencimiento', async (req, res) => {
  const database = await getDatabaseSnapshot();
  const hoy = new Date();
  const proximosDias = new Date();
  proximosDias.setDate(hoy.getDate() + 7);

  const tareasProximasVencer = database.tareas.filter(tarea => {
    if (!tarea.fechaFin || tarea.estado === ESTADOS.COMPLETADA || tarea.estado === ESTADOS.CERRADA) {
      return false;
    }
    const fechaFin = new Date(tarea.fechaFin);
    return fechaFin >= hoy && fechaFin <= proximosDias;
  });

  const tareasEnriquecidas = tareasProximasVencer.map(tarea => ({
    ...tarea,
    responsable: database.responsables.find(r => r.id === tarea.responsableId),
    actividad: database.actividades.find(a => a.id === tarea.actividadId)
  }));

  res.json(tareasEnriquecidas);
});

// Obtener tareas atrasadas
tareasRouter.get('/alertas/atrasadas', async (req, res) => {
  const database = await getDatabaseSnapshot();
  const hoy = new Date();

  const tareasAtrasadas = database.tareas.filter(tarea => {
    if (!tarea.fechaFin || tarea.estado === ESTADOS.COMPLETADA || tarea.estado === ESTADOS.CERRADA) {
      return false;
    }
    const fechaFin = new Date(tarea.fechaFin);
    return fechaFin < hoy;
  });

  const tareasEnriquecidas = tareasAtrasadas.map(tarea => ({
    ...tarea,
    responsable: database.responsables.find(r => r.id === tarea.responsableId),
    actividad: database.actividades.find(a => a.id === tarea.actividadId),
    diasAtraso: Math.floor((hoy - new Date(tarea.fechaFin)) / (1000 * 60 * 60 * 24))
  }));

  res.json(tareasEnriquecidas);
});
