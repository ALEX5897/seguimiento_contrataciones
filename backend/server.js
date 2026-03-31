import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
// import { tareasRouter } from './routes/tareas.js'; // Comentado - tabla obsoleta
import { actividadesRouter } from './routes/actividades.js';
import { estadosRouter } from './routes/estados.js';
import { notificacionesRouter } from './routes/notificaciones.js';
import subtareasRouter from './routes/subtareas.js';
import versionesRouter from './routes/versiones.js';
import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import catalogosRouter from './routes/catalogos.js';
import reportesRouter from './routes/reportes.js';
import permisosRouter from './routes/permisos.js';
import auditoriaRouter from './routes/auditoria.js';
import { verificarVencimientos, verificarAtrasos } from './services/alertas.js';
import { initMySQL } from './data/mysql.js';
import { requireAuth } from './middleware/auth.js';
import { requireApiPermission } from './middleware/permisos.js';
import { auditApiChanges } from './middleware/auditoria.js';

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'production' ? '.env.production' : '.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error && ENV_PATH !== '.env') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_RETRY_ATTEMPTS = parseInt(process.env.DB_RETRY_ATTEMPTS || '10', 10);
const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
// app.use('/api/tareas', tareasRouter); // Comentado - ahora son subtareas
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (req.path.startsWith('/auth')) return next();
  return requireAuth(req, res, next);
});
app.use('/api', requireApiPermission);
app.use('/api', auditApiChanges);
app.use('/api/actividades', actividadesRouter); // Ahora apunta a subtareas (actividades)
app.use('/api/estados', estadosRouter);
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/subtareas', subtareasRouter);
app.use('/api/versiones', versionesRouter);
app.use('/api/catalogos', catalogosRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/permisos', permisosRouter);
app.use('/api/auditoria', auditoriaRouter);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    notificationsEnabled: process.env.NOTIFICATIONS_ENABLED === 'true'
  });
});

// Programar verificaciones automáticas
// Cada día a las 8:00 AM - verificar vencimientos próximos
cron.schedule('0 8 * * *', async () => {
  console.log('Ejecutando verificación de vencimientos...');
  await verificarVencimientos();
});

// Cada día a las 9:00 AM - verificar tareas atrasadas
cron.schedule('0 9 * * *', async () => {
  console.log('Ejecutando verificación de atrasos...');
  await verificarAtrasos();
});

// Cada lunes a las 8:00 AM - resumen semanal
cron.schedule('0 8 * * 1', async () => {
  console.log('Generando resumen semanal...');
  const { generarResumenSemanal } = await import('./services/resumen.js');
  await generarResumenSemanal();
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Iniciar servidor
async function startServer() {
  let lastError = null;

  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await initMySQL();
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const retriable = ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'].includes(error?.code);
      const isLast = attempt === DB_RETRY_ATTEMPTS;

      if (!retriable || isLast) break;

      console.warn(`⚠️  MySQL no disponible (intento ${attempt}/${DB_RETRY_ATTEMPTS}). Reintentando en ${DB_RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
    }
  }

  if (lastError) throw lastError;

  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Servidor ejecutándose en http://${HOST}:${PORT}`);
    console.log(`🗄️  MySQL conectado en ${process.env.DB_HOST || 'localhost'} (BD: ${process.env.DB_NAME || 'seguimiento_contrataciones'})`);
    console.log(`📧 Notificaciones: ${process.env.NOTIFICATIONS_ENABLED === 'true' ? 'ACTIVADAS' : 'DESACTIVADAS'}`);
    console.log(`⏰ Verificaciones automáticas programadas\n`);
  });
}

startServer().catch((error) => {
  const errorMessage = error?.message || error?.sqlMessage || String(error);
  console.error('❌ Error al iniciar el servidor:', errorMessage);
  if (error?.code) console.error('Código:', error.code);
  if (error?.errno) console.error('Errno:', error.errno);
  if (error?.stack) console.error(error.stack);
  process.exit(1);
});
