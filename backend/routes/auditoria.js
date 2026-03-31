import express from 'express';
import * as mysql from '../data/mysql.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const data = await mysql.getEventosAuditoria({
      page: req.query.page,
      limit: req.query.limit,
      modulo: req.query.modulo,
      accion: req.query.accion,
      userId: req.query.userId,
      role: req.query.role,
      success: req.query.success,
      desde: req.query.desde,
      hasta: req.query.hasta,
      search: req.query.search
    });

    res.json(data);
  } catch (error) {
    console.error('Error en GET /api/auditoria:', error);
    res.status(500).json({ error: error.message || 'Error al consultar auditoría' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await mysql.getEventoAuditoriaById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(item);
  } catch (error) {
    console.error(`Error en GET /api/auditoria/${req.params.id}:`, error);
    res.status(500).json({ error: error.message || 'Error al consultar evento de auditoría' });
  }
});

export default router;
