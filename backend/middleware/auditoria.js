import { registrarEventoAuditoria } from '../data/mysql.js';
import { getPermissionContext } from './permisos.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function cloneIfObject(value) {
  if (!value || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || null;
}

export function auditApiChanges(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!MUTATION_METHODS.has(method)) return next();

  if (req.path.startsWith('/health') || req.path.startsWith('/auth/login')) return next();

  const startedAt = Date.now();
  const requestBody = cloneIfObject(req.body);
  const requestQuery = cloneIfObject(req.query);
  const originalJson = res.json.bind(res);

  let responseBody;
  res.json = (body) => {
    responseBody = cloneIfObject(body);
    return originalJson(body);
  };

  res.on('finish', async () => {
    try {
      const context = getPermissionContext(req);
      const durationMs = Date.now() - startedAt;
      const errorMensaje = res.statusCode >= 400
        ? (responseBody?.error || responseBody?.message || `HTTP ${res.statusCode}`)
        : null;

      await registrarEventoAuditoria({
        userId: req.user?.id || null,
        username: req.user?.username || null,
        role: req.user?.role || null,
        direccionNombre: req.user?.direccionNombre || null,
        accion: context.accion,
        modulo: context.modulo,
        recurso: req.path,
        metodo: method,
        ruta: req.originalUrl || req.path,
        statusCode: res.statusCode,
        exito: res.statusCode >= 200 && res.statusCode < 400,
        ip: normalizeIp(req),
        userAgent: req.headers['user-agent'] || null,
        requestQuery,
        requestBody,
        responseBody: {
          durationMs,
          payload: responseBody || null
        },
        errorMensaje
      });
    } catch (error) {
      console.error('Error registrando auditoría:', error?.message || error);
    }
  });

  next();
}
