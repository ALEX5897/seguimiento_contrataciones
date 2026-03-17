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
import { verificarVencimientos, verificarAtrasos } from './services/alertas.js';
import { initMySQL } from './data/mysql.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

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
app.use('/api/actividades', actividadesRouter); // Ahora apunta a subtareas (actividades)
app.use('/api/estados', estadosRouter);
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/subtareas', subtareasRouter);
app.use('/api/versiones', versionesRouter);
app.use('/api/catalogos', catalogosRouter);
app.use('/api/reportes', reportesRouter);

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
  await initMySQL();

  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Servidor ejecutándose en http://${HOST}:${PORT}`);
    console.log(`🗄️  MySQL conectado en ${process.env.DB_HOST || 'localhost'} (BD: ${process.env.DB_NAME || 'seguimiento_contrataciones'})`);
    console.log(`📧 Notificaciones: ${process.env.NOTIFICATIONS_ENABLED === 'true' ? 'ACTIVADAS' : 'DESACTIVADAS'}`);
    console.log(`⏰ Verificaciones automáticas programadas\n`);
  });
}

startServer().catch((error) => {
  console.error('❌ Error al iniciar el servidor:', error.message);
  process.exit(1);
});
