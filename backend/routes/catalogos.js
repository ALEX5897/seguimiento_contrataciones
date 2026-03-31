import express from 'express';
import * as mysql from '../data/mysql.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/direcciones', async (req, res) => {
  try {
    const items = await mysql.getDireccionesCatalogo();
    res.json(items);
  } catch (error) {
    console.error('Error en GET /api/catalogos/direcciones:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/direcciones', async (req, res) => {
  try {
    const item = await mysql.createDireccionCatalogo(req.body || {});
    res.status(201).json(item);
  } catch (error) {
    console.error('Error en POST /api/catalogos/direcciones:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/direcciones/:id', async (req, res) => {
  try {
    const item = await mysql.updateDireccionCatalogo(Number(req.params.id), req.body || {});
    if (!item) return res.status(404).json({ error: 'Dirección no encontrada' });
    res.json(item);
  } catch (error) {
    console.error(`Error en PUT /api/catalogos/direcciones/${req.params.id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/direcciones/:id', async (req, res) => {
  try {
    const ok = await mysql.deleteDireccionCatalogo(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Dirección no encontrada' });
    res.json({ success: true });
  } catch (error) {
    console.error(`Error en DELETE /api/catalogos/direcciones/${req.params.id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/responsables', async (req, res) => {
  try {
    const items = await mysql.getResponsablesCatalogo();
    res.json(items);
  } catch (error) {
    console.error('Error en GET /api/catalogos/responsables:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/responsables', async (req, res) => {
  try {
    const item = await mysql.createResponsableCatalogo(req.body || {});
    res.status(201).json(item);
  } catch (error) {
    console.error('Error en POST /api/catalogos/responsables:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/responsables/:id', async (req, res) => {
  try {
    const item = await mysql.updateResponsableCatalogo(Number(req.params.id), req.body || {});
    if (!item) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json(item);
  } catch (error) {
    console.error(`Error en PUT /api/catalogos/responsables/${req.params.id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/responsables/:id', async (req, res) => {
  try {
    const ok = await mysql.deleteResponsableCatalogo(Number(req.params.id));
    if (!ok) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error(`Error en DELETE /api/catalogos/responsables/${req.params.id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
