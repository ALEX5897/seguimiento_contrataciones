import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getDatabaseSnapshot } from '../data/mysql.js';
import { registrarNotificacion } from '../routes/notificaciones.js';

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'production' ? '.env.production' : '.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error && ENV_PATH !== '.env') {
  dotenv.config();
}

// Configurar transporter de nodemailer
let transporter = null;

function getTransporter() {
  if (!transporter && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

// Enviar correo electrónico
export async function enviarCorreo(destinatarios, asunto, contenido, tareaId = null) {
  const notificacionesHabilitadas = process.env.NOTIFICATIONS_ENABLED === 'true';
  
  // Registrar notificación en la base de datos
  const destinatariosArray = Array.isArray(destinatarios) ? destinatarios : [destinatarios];
  await Promise.all(
    destinatariosArray.map(dest => registrarNotificacion('email', dest, asunto, contenido, tareaId))
  );

  if (!notificacionesHabilitadas) {
    console.log('📧 Notificaciones deshabilitadas. Correo registrado pero no enviado.');
    console.log(`   Para: ${destinatariosArray.join(', ')}`);
    console.log(`   Asunto: ${asunto}`);
    return { success: true, sent: false, message: 'Notificaciones deshabilitadas' };
  }

  try {
    const transport = getTransporter();
    if (!transport) {
      console.warn('⚠️  SMTP no configurado. Configure las variables de entorno SMTP_*');
      return { success: false, sent: false, message: 'SMTP no configurado' };
    }

    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'Sistema Seguimiento <noreply@quitoturismo.gob.ec>',
      to: destinatariosArray.join(', '),
      subject: asunto,
      html: contenido
    });

    console.log('✅ Correo enviado:', info.messageId);
    return { success: true, sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error al enviar correo:', error.message);
    return { success: false, sent: false, error: error.message };
  }
}

// Enviar notificación de cambio de estado
export async function enviarNotificacionCambioEstado(tarea, estadoAnterior, estadoNuevo) {
  const database = await getDatabaseSnapshot();
  const responsable = database.responsables.find(r => r.id === tarea.responsableId);
  const actividad = database.actividades.find(a => a.id === tarea.actividadId);
  
  if (!responsable) return;

  const asunto = `Estado de tarea actualizado: ${tarea.nombre}`;
  const contenido = `
    <h2>Actualización de Estado de Tarea</h2>
    <p><strong>Tarea:</strong> ${tarea.nombre}</p>
    <p><strong>Actividad:</strong> ${actividad?.nombre || 'N/A'}</p>
    <p><strong>Estado anterior:</strong> <span style="color: #888;">${estadoAnterior}</span></p>
    <p><strong>Estado nuevo:</strong> <span style="color: #2563eb; font-weight: bold;">${estadoNuevo}</span></p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-EC')}</p>
    <hr>
    <p style="color: #666; font-size: 12px;">
      Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo
    </p>
  `;

  const destinatarios = [responsable.email];
  
  // Agregar supervisores si están configurados
  const supervisores = process.env.SUPERVISOR_EMAILS?.split(',').filter(e => e.trim());
  if (supervisores && supervisores.length > 0) {
    destinatarios.push(...supervisores);
  }

  return await enviarCorreo(destinatarios, asunto, contenido, tarea.id);
}

// Enviar alerta de vencimiento próximo
export async function enviarAlertaVencimiento(tarea, diasRestantes) {
  const database = await getDatabaseSnapshot();
  const responsable = database.responsables.find(r => r.id === tarea.responsableId);
  const actividad = database.actividades.find(a => a.id === tarea.actividadId);
  
  if (!responsable) return;

  const asunto = `⚠️ Tarea próxima a vencer en ${diasRestantes} días: ${tarea.nombre}`;
  const contenido = `
    <h2 style="color: #f59e0b;">⚠️ Alerta de Vencimiento Próximo</h2>
    <p><strong>Tarea:</strong> ${tarea.nombre}</p>
    <p><strong>Actividad:</strong> ${actividad?.nombre || 'N/A'}</p>
    <p><strong>Estado actual:</strong> ${tarea.estado}</p>
    <p><strong>Fecha de vencimiento:</strong> <span style="color: #dc2626;">${new Date(tarea.fechaFin).toLocaleDateString('es-EC')}</span></p>
    <p><strong>Días restantes:</strong> ${diasRestantes}</p>
    <p style="margin-top: 20px;">
      Por favor, priorice esta tarea para evitar retrasos en el cronograma.
    </p>
    <hr>
    <p style="color: #666; font-size: 12px;">
      Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo
    </p>
  `;

  const destinatarios = [responsable.email];
  const supervisores = process.env.SUPERVISOR_EMAILS?.split(',').filter(e => e.trim());
  if (supervisores && supervisores.length > 0) {
    destinatarios.push(...supervisores);
  }

  return await enviarCorreo(destinatarios, asunto, contenido, tarea.id);
}

// Enviar alerta de tarea atrasada
export async function enviarAlertaAtraso(tarea, diasAtraso) {
  const database = await getDatabaseSnapshot();
  const responsable = database.responsables.find(r => r.id === tarea.responsableId);
  const actividad = database.actividades.find(a => a.id === tarea.actividadId);
  
  if (!responsable) return;

  const asunto = `🚨 Tarea atrasada ${diasAtraso} días: ${tarea.nombre}`;
  const contenido = `
    <h2 style="color: #dc2626;">🚨 Alerta de Tarea Atrasada</h2>
    <p><strong>Tarea:</strong> ${tarea.nombre}</p>
    <p><strong>Actividad:</strong> ${actividad?.nombre || 'N/A'}</p>
    <p><strong>Estado actual:</strong> ${tarea.estado}</p>
    <p><strong>Fecha límite:</strong> ${new Date(tarea.fechaFin).toLocaleDateString('es-EC')}</p>
    <p><strong>Días de atraso:</strong> <span style="color: #dc2626; font-weight: bold;">${diasAtraso}</span></p>
    <p style="margin-top: 20px; background-color: #fee2e2; padding: 15px; border-left: 4px solid #dc2626;">
      <strong>ACCIÓN REQUERIDA:</strong> Esta tarea requiere atención inmediata. 
      Por favor, actualice su estado o contacte con coordinación si existe algún impedimento.
    </p>
    <hr>
    <p style="color: #666; font-size: 12px;">
      Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo
    </p>
  `;

  const destinatarios = [responsable.email];
  const supervisores = process.env.SUPERVISOR_EMAILS?.split(',').filter(e => e.trim());
  if (supervisores && supervisores.length > 0) {
    destinatarios.push(...supervisores);
  }

  return await enviarCorreo(destinatarios, asunto, contenido, tarea.id);
}

// Enviar alerta de hito crítico pendiente
export async function enviarAlertaHitoCritico(hito, tarea) {
  const database = await getDatabaseSnapshot();
  const responsable = database.responsables.find(r => r.id === tarea.responsableId);
  const actividad = database.actividades.find(a => a.id === tarea.actividadId);
  
  if (!responsable) return;

  const asunto = `📋 Hito crítico pendiente: ${hito.nombre}`;
  const contenido = `
    <h2 style="color: #7c3aed;">📋 Hito Crítico Pendiente</h2>
    <p><strong>Hito:</strong> ${hito.nombre}</p>
    <p><strong>Tarea:</strong> ${tarea.nombre}</p>
    <p><strong>Actividad:</strong> ${actividad?.nombre || 'N/A'}</p>
    <p><strong>Fecha planificada:</strong> ${new Date(hito.fechaPlanificada).toLocaleDateString('es-EC')}</p>
    <p><strong>Estado:</strong> ${hito.estado}</p>
    ${hito.observaciones ? `<p><strong>Observaciones:</strong> ${hito.observaciones}</p>` : ''}
    <p style="margin-top: 20px;">
      Este hito es parte del proceso de contratación y requiere su seguimiento.
    </p>
    <hr>
    <p style="color: #666; font-size: 12px;">
      Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo
    </p>
  `;

  return await enviarCorreo(responsable.email, asunto, contenido, tarea.id);
}
