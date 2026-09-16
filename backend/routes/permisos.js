import express from 'express';
import * as mysql from '../data/mysql.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/mis-permisos', async (req, res) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'No autenticado' });

    const permisos = await mysql.getPermisosSesionRol(role);
    res.json(permisos);
  } catch (error) {
    console.error('Error en GET /api/permisos/mis-permisos:', error);
    res.status(500).json({ error: error.message || 'Error al obtener permisos de sesión' });
  }
});

router.get('/', async (req, res) => {
  try {
    const data = await mysql.getPermisosRolesResumen();
    res.json(data);
  } catch (error) {
    console.error('Error en GET /api/permisos:', error);
    res.status(500).json({ error: error.message || 'Error al obtener permisos' });
  }
});

router.post('/roles', async (req, res) => {
  try {
    const created = await mysql.createRole(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    console.error('Error en POST /api/permisos/roles:', error);
    res.status(400).json({ error: error.message || 'No se pudo crear el rol' });
  }
});

router.delete('/roles/:role', async (req, res) => {
  try {
    const result = await mysql.deleteRole(req.params.role);
    res.json(result);
  } catch (error) {
    console.error(`Error en DELETE /api/permisos/roles/${req.params.role}:`, error);
    res.status(400).json({ error: error.message || 'No se pudo eliminar el rol' });
  }
});

router.get('/rol/:role', async (req, res) => {
  try {
    const role = String(req.params.role || '').trim();
    if (!role) return res.status(400).json({ error: 'role es requerido' });

    const data = await mysql.getPermisosRol(role);
    res.json(data);
  } catch (error) {
    console.error(`Error en GET /api/permisos/rol/${req.params.role}:`, error);
    res.status(500).json({ error: error.message || 'Error al obtener permisos del rol' });
  }
});

router.put('/rol/:role', async (req, res) => {
  try {
    const role = String(req.params.role || '').trim();
    if (!role) return res.status(400).json({ error: 'role es requerido' });

    const updated = await mysql.updatePermisosRol(role, req.body || {});
    res.json(updated);
  } catch (error) {
    console.error(`Error en PUT /api/permisos/rol/${req.params.role}:`, error);
    res.status(400).json({ error: error.message || 'Error al actualizar permisos del rol' });
  }
});

export default router;
