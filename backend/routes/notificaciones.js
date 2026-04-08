import express from 'express';
import { getDatabaseSnapshot, insertNotificacion, marcarNotificacionLeida } from '../data/mysql.js';
import { guardarConfiguracionCorreo, getConfiguracionCorreo } from '../services/notificacionesConfig.js';
import {
  enviarCorreoPrueba,
  getEstadoEjecucionNotificaciones,
  iniciarEjecucionNotificaciones
} from '../services/notificaciones.js';

export const notificacionesRouter = express.Router();

// Obtener historial de notificaciones
notificacionesRouter.get('/', async (req, res) => {
  try {
    const { tipo, leida } = req.query;
    const database = await getDatabaseSnapshot();

    let notificaciones = database.notificaciones;

    if (tipo) {
      notificaciones = notificaciones.filter((n) => n.tipo === tipo);
    }
    if (leida !== undefined) {
      notificaciones = notificaciones.filter((n) => n.leida === (leida === 'true'));
    }

    res.json(notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error);
    res.status(500).json({ error: error.message || 'No se pudo obtener el historial de notificaciones' });
  }
});

// Obtener configuración de correo
notificacionesRouter.get('/configuracion', async (req, res) => {
  try {
    const config = await getConfiguracionCorreo();
    res.json(config);
  } catch (error) {
    console.error('Error en GET /api/notificaciones/configuracion:', error);
    res.status(500).json({ error: error.message || 'No se pudo obtener la configuración de correo' });
  }
});

// Guardar configuración de correo
notificacionesRouter.put('/configuracion', async (req, res) => {
  try {
    const updated = await guardarConfiguracionCorreo(req.body || {});
    res.json(updated);
  } catch (error) {
    console.error('Error en PUT /api/notificaciones/configuracion:', error);
    res.status(400).json({ error: error.message || 'No se pudo guardar la configuración de correo' });
  }
});

// Enviar un correo de prueba
notificacionesRouter.post('/probar', async (req, res) => {
  try {
    const destinatario = String(req.body?.destinatario || '').trim();
    if (!destinatario) {
      return res.status(400).json({ error: 'Debe indicar un destinatario para la prueba' });
    }

    const resultado = await enviarCorreoPrueba(destinatario);
    if (!resultado.success) {
      return res.status(400).json(resultado);
    }

    res.json(resultado);
  } catch (error) {
    console.error('Error en POST /api/notificaciones/probar:', error);
    res.status(500).json({ error: error.message || 'No se pudo enviar el correo de prueba' });
  }
});

// Ejecutar el proceso programado manualmente en segundo plano
notificacionesRouter.post('/ejecutar', async (req, res) => {
  try {
    const resultado = await iniciarEjecucionNotificaciones({ force: true });
    res.status(202).json(resultado);
  } catch (error) {
    console.error('Error en POST /api/notificaciones/ejecutar:', error);
    res.status(500).json({ error: error.message || 'No se pudo iniciar la notificación programada' });
  }
});

// Consultar el estado de una ejecución manual
notificacionesRouter.get('/ejecuciones/:jobId', async (req, res) => {
  try {
    const estado = getEstadoEjecucionNotificaciones(req.params.jobId);
    if (!estado) {
      return res.status(404).json({ error: 'No se encontró la ejecución solicitada' });
    }

    res.json(estado);
  } catch (error) {
    console.error(`Error en GET /api/notificaciones/ejecuciones/${req.params.jobId}:`, error);
    res.status(500).json({ error: error.message || 'No se pudo consultar el estado de la ejecución' });
  }
});

// Marcar notificación como leída
notificacionesRouter.patch('/:id/leer', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const database = await getDatabaseSnapshot();
    const existing = database.notificaciones.find((n) => n.id === id);

    if (!existing) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const notificacion = await marcarNotificacionLeida(id);
    res.json(notificacion);
  } catch (error) {
    console.error(`Error en PATCH /api/notificaciones/${req.params.id}/leer:`, error);
    res.status(500).json({ error: error.message || 'No se pudo marcar la notificación como leída' });
  }
});

// Registrar nueva notificación (compatibilidad interna)
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
