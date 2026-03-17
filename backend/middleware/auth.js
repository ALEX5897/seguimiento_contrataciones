import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-este-secreto-en-produccion';

function obtenerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

export function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      role: usuario.role,
      direccionNombre: usuario.direccionNombre || null
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function requireAuth(req, res, next) {
  const token = obtenerToken(req);
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado para este recurso' });
    }
    next();
  };
}

export function canWriteSeguimiento(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (req.user.role === 'admin' || req.user.role === 'direccion') return next();
  return res.status(403).json({ error: 'Tu rol no permite modificar seguimientos' });
}
