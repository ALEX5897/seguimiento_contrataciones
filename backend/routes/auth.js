import express from 'express';
import * as mysql from '../data/mysql.js';
import { generarToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

function normalizeIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || null;
}

function extractToken(req) {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
}

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
      await mysql.registrarEventoAuditoria({
        userId: null,
        username: String(username || '').trim().slice(0, 80) || null,
        role: null,
        direccionNombre: null,
        accion: 'login',
        modulo: 'auth',
        recurso: '/auth/login',
        metodo: 'POST',
        ruta: req.originalUrl || req.path,
        statusCode: 401,
        exito: false,
        ip: normalizeIp(req),
        userAgent: req.headers['user-agent'] || null,
        requestQuery: req.query,
        requestBody: { username: String(username || '').trim() },
        responseBody: { error: 'Credenciales inválidas' },
        errorMensaje: 'Credenciales inválidas'
      }).catch((error) => {
        console.error('Error registrando intento de login fallido:', error?.message || error);
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);
    const permisos = await mysql.getPermisosSesionRol(usuario.role);

    await mysql.registrarEventoAuditoria({
      userId: usuario.id,
      username: usuario.username,
      role: usuario.role,
      direccionNombre: usuario.direccionNombre,
      accion: 'login',
      modulo: 'auth',
      recurso: '/auth/login',
      metodo: 'POST',
      ruta: req.originalUrl || req.path,
      statusCode: 200,
      exito: true,
      ip: normalizeIp(req),
      userAgent: req.headers['user-agent'] || null,
      requestQuery: req.query,
      requestBody: { username: usuario.username },
      responseBody: { userId: usuario.id, role: usuario.role }
    }).catch((error) => {
      console.error('Error registrando login exitoso:', error?.message || error);
    });

    res.json({ token, user: usuario, permisos });
  } catch (error) {
    console.error('Error en POST /api/auth/login:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = extractToken(req);

    await mysql.registrarEventoAuditoria({
      userId: req.user?.id || null,
      username: req.user?.username || null,
      role: req.user?.role || null,
      direccionNombre: req.user?.direccionNombre || null,
      accion: 'logout',
      modulo: 'auth',
      recurso: '/auth/logout',
      metodo: 'POST',
      ruta: req.originalUrl || req.path,
      statusCode: 200,
      exito: true,
      ip: normalizeIp(req),
      userAgent: req.headers['user-agent'] || null,
      requestQuery: req.query,
      requestBody: null,
      responseBody: {
        userId: req.user?.id || null,
        tokenPresent: Boolean(token)
      }
    }).catch((error) => {
      console.error('Error registrando logout:', error?.message || error);
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error en POST /api/auth/logout:', error);
    res.status(500).json({ error: error.message || 'No se pudo cerrar sesión' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const usuario = await mysql.getUsuarioById(req.user.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const permisos = await mysql.getPermisosSesionRol(usuario.role);
    res.json({ ...usuario, permisos });
  } catch (error) {
    console.error('Error en GET /api/auth/me:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
