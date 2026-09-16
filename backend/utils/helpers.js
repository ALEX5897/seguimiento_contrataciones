// Funciones utilitarias compartidas entre rutas y middleware

export function getScopeFromReq(req) {
  return {
    role: req.user?.role,
    userId: req.user?.id || null,
    direccionNombre: req.user?.direccionNombre || null
  };
}

export function normalizeIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || null;
}

export function extractBearerToken(req) {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const date = new Date(value.getTime());
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function obtenerEstadoProceso(subtarea) {
  const valor = subtarea?.activo;
  if (valor === undefined || valor === null || valor === '') return 1;
  if (typeof valor === 'number') {
    if (valor === 2) return 2;
    return valor === 0 ? 0 : 1;
  }
  if (typeof valor === 'boolean') return valor ? 1 : 0;
  const normalizado = String(valor).trim().toLowerCase();
  if (['2', 'desierto'].includes(normalizado)) return 2;
  if (['0', 'false', 'inactivo'].includes(normalizado)) return 0;
  return 1;
}

export function obtenerPresupuestoProceso(subtarea) {
  const valor = Number(subtarea?.presupuesto ?? subtarea?.presupuesto2026Inicial ?? subtarea?.presupuesto_2026_inicial ?? 0);
  return Number.isFinite(valor) ? valor : 0;
}

export function procesoCuentaEnReporte(subtarea) {
  const estado = obtenerEstadoProceso(subtarea);
  if (estado === 0) return false;
  if (estado === 1 && obtenerPresupuestoProceso(subtarea) <= 0) return false;
  return true;
}
