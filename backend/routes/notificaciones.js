import express from 'express';
import { getDatabaseSnapshot, insertNotificacion, marcarNotificacionLeida } from '../data/mysql.js';

export const notificacionesRouter = express.Router();

// Obtener historial de notificaciones
notificacionesRouter.get('/', async (req, res) => {
  const { tipo, leida } = req.query;
  const database = await getDatabaseSnapshot();
  
  let notificaciones = database.notificaciones;
  
  if (tipo) {
    notificaciones = notificaciones.filter(n => n.tipo === tipo);
  }
  if (leida !== undefined) {
    notificaciones = notificaciones.filter(n => n.leida === (leida === 'true'));
  }

  res.json(notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
});

// Marcar notificación como leída
notificacionesRouter.patch('/:id/leer', async (req, res) => {
  const id = parseInt(req.params.id);
  const database = await getDatabaseSnapshot();
  const existing = database.notificaciones.find(n => n.id === id);
  
  if (!existing) {
    return res.status(404).json({ error: 'Notificación no encontrada' });
  }

  const notificacion = await marcarNotificacionLeida(id);

  res.json(notificacion);
});

// Registrar nueva notificación (usado internamente)
export async function registrarNotificacion(tipo, destinatario, asunto, mensaje, tareaId = null) {
  return insertNotificacion({
    tipo,
    destinatario,
    asunto,
    mensaje,
    tareaId,
    fecha: new Date().toISOString(),
    leida: false,
    enviada: false
  });
}
