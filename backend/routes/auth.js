import express from 'express';
import * as mysql from '../data/mysql.js';
import { generarToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/direcciones', async (req, res) => {
  try {
    const direcciones = await mysql.getDireccionesDisponibles();
    res.json(direcciones);
  } catch (error) {
    console.error('Error en GET /api/auth/direcciones:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/opciones-login', async (req, res) => {
  try {
    const opciones = await mysql.getOpcionesLogin();
    res.json(opciones);
  } catch (error) {
    console.error('Error en GET /api/auth/opciones-login:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son requeridos' });
    }

    const usuario = await mysql.verifyUsuarioCredentials(username, password);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);
    res.json({ token, user: usuario });
  } catch (error) {
    console.error('Error en POST /api/auth/login:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const usuario = await mysql.getUsuarioById(req.user.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    console.error('Error en GET /api/auth/me:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
