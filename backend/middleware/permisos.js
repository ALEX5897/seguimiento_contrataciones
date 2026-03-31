import { hasPermisoModulo } from '../data/mysql.js';

function actionFromMethod(method = 'GET') {
  const normalized = String(method || 'GET').toUpperCase();
  if (normalized === 'POST') return 'create';
  if (normalized === 'PUT' || normalized === 'PATCH') return 'update';
  if (normalized === 'DELETE') return 'delete';
  return 'read';
}

function resolveModuleFromPath(path = '', method = 'GET') {
  const normalizedPath = String(path || '');
  const pathNoApi = normalizedPath.startsWith('/api')
    ? (normalizedPath.slice('/api'.length) || '/')
    : normalizedPath;

  if (pathNoApi.startsWith('/health')) return null;
  if (pathNoApi.startsWith('/auth')) return null;
  if (pathNoApi.startsWith('/permisos/mis-permisos')) return null;

  if (pathNoApi.startsWith('/permisos')) return 'admin_permisos';
  if (pathNoApi.startsWith('/auditoria')) return 'admin_auditoria';
  if (pathNoApi.startsWith('/usuarios')) return 'admin_usuarios';
  if (pathNoApi.startsWith('/catalogos')) return 'admin_catalogos';
  if (pathNoApi.startsWith('/reportes')) return 'reportes';
  if (pathNoApi.startsWith('/notificaciones')) return 'notificaciones';
  if (pathNoApi.startsWith('/estados')) return 'estados';

  if (pathNoApi.startsWith('/subtareas/admin') || pathNoApi.startsWith('/actividades/admin')) {
    return 'admin_actividades';
  }

  if (pathNoApi.startsWith('/subtareas') || pathNoApi.startsWith('/actividades')) {
    return 'actividades';
  }

  if (pathNoApi.startsWith('/versiones')) {
    return String(method || 'GET').toUpperCase() === 'GET' ? 'versiones' : 'admin_versiones';
  }

  return null;
}

export async function requireApiPermission(req, res, next) {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ error: 'No autenticado' });

    const modulo = resolveModuleFromPath(req.path, req.method);
    if (!modulo) return next();

    const action = actionFromMethod(req.method);
    const permitido = await hasPermisoModulo(role, modulo, action);
    if (!permitido) {
      return res.status(403).json({
        error: 'No autorizado para este recurso',
        detalle: { modulo, accion: action }
      });
    }

    return next();
  } catch (error) {
    console.error('Error al validar permisos:', error);
    return res.status(500).json({ error: 'Error al validar permisos' });
  }
}

export function getPermissionContext(req) {
  const modulo = resolveModuleFromPath(req.path, req.method);
  const accion = actionFromMethod(req.method);
  return { modulo, accion };
}
