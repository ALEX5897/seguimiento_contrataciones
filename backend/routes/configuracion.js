import express from 'express';
import * as mysql from '../data/mysql.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/configuracion/:clave - Obtener una configuración específica
router.get('/:clave', async (req, res) => {
  try {
    const config = await mysql.getConfiguracion(req.params.clave);
    if (!config) {
      return res.status(404).json({ error: `Configuración "${req.params.clave}" no encontrada` });
    }
    res.json(config);
  } catch (error) {
    console.error('Error en GET /api/configuracion/:clave:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/configuracion - Obtener todas las configuraciones (solo admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden ver todas las configuraciones' });
    }

    const configs = await mysql.obtenerTodasConfiguraciones();
    res.json(configs);
  } catch (error) {
    console.error('Error en GET /api/configuracion:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/configuracion/:clave - Actualizar una configuración (solo admin)
router.put('/:clave', requireAuth, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar configuraciones' });
    }

    const { valor } = req.body;
    if (valor === undefined || valor === null) {
      return res.status(400).json({ error: 'El valor de la configuración es requerido' });
    }

    await mysql.actualizarConfiguracion(req.params.clave, valor);
    res.json({
      message: `Configuración "${req.params.clave}" actualizada`,
      clave: req.params.clave,
      valor
    });
  } catch (error) {
    console.error('Error en PUT /api/configuracion/:clave:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
