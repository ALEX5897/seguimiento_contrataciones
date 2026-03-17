import express from 'express';
import * as mysql from '../data/mysql.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRoles('admin'));

router.get('/', async (req, res) => {
  try {
    const usuarios = await mysql.getUsuarios();
    res.json(usuarios);
  } catch (error) {
    console.error('Error en GET /api/usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const usuario = await mysql.createUsuario(req.body || {});
    res.status(201).json(usuario);
  } catch (error) {
    console.error('Error en POST /api/usuarios:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const usuario = await mysql.updateUsuario(Number(req.params.id), req.body || {});
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    console.error(`Error en PUT /api/usuarios/${req.params.id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuarios = await mysql.getUsuarios();
    const usuario = usuarios.find((item) => Number(item.id) === id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const adminsActivos = usuarios.filter((item) => item.role === 'admin' && item.activo);
    if (usuario.role === 'admin' && usuario.activo && adminsActivos.length <= 1) {
      return res.status(400).json({ error: 'No puedes eliminar el último admin activo' });
    }

    const eliminado = await mysql.deleteUsuario(id);
    if (!eliminado) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error(`Error en DELETE /api/usuarios/${req.params.id}:`, error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
