import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getAllResponsables, getAllSubtareas, insertNotificacion, query } from '../data/mysql.js';
import {
  DEFAULT_NOTIFICATION_TEMPLATE,
  getConfiguracionCorreo,
  getServerPreset,
  registrarEjecucionCorreo
} from './notificacionesConfig.js';

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'production' ? '.env.production' : '.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error && ENV_PATH !== '.env') {
  dotenv.config();
}

const INSTITUTIONAL_LOGO_URL = 'https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT.png';

let transporter = null;
let transporterKey = '';
const executionJobs = new Map();
let activeExecutionJobId = null;

function pruneExecutionJobs(limit = 20) {
  const jobs = Array.from(executionJobs.values())
    .sort((a, b) => new Date(b.updatedAt || b.startedAt || 0).getTime() - new Date(a.updatedAt || a.startedAt || 0).getTime());

  for (const job of jobs.slice(limit)) {
    executionJobs.delete(job.jobId);
  }
}

function createExecutionJob(force = false) {
  pruneExecutionJobs();
  const now = new Date().toISOString();
  const job = {
    jobId: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'running',
    percent: 0,
    message: 'Preparando ejecución de notificaciones...',
    force,
    startedAt: now,
    updatedAt: now,
    processedRecipients: 0,
    totalRecipients: 0,
    sent: 0,
    totalStages: 0,
    skipped: false,
    delayedStages: null,
    error: null,
    phase: 'queued'
  };

  executionJobs.set(job.jobId, job);
  activeExecutionJobId = job.jobId;
  return job;
}

function updateExecutionJob(jobId, patch = {}) {
  const current = executionJobs.get(jobId);
  if (!current) return null;

  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  executionJobs.set(jobId, next);
  if (['completed', 'failed'].includes(next.status) && activeExecutionJobId === jobId) {
    activeExecutionJobId = null;
  }
  return next;
}

export function getEstadoEjecucionNotificaciones(jobId) {
  const job = executionJobs.get(String(jobId || '').trim());
  return job ? { ...job } : null;
}

export async function iniciarEjecucionNotificaciones({ force = false } = {}) {
  const activeJob = activeExecutionJobId ? executionJobs.get(activeExecutionJobId) : null;
  if (activeJob?.status === 'running') {
    return { ...activeJob, alreadyRunning: true };
  }

  const job = createExecutionJob(force);

  Promise.resolve().then(async () => {
    try {
      updateExecutionJob(job.jobId, {
        percent: 5,
        phase: 'checking',
        message: 'Validando configuración y preparando el envío...'
      });

      const result = await ejecutarNotificacionesProgramadas({
        force,
        progress: (progressPatch = {}) => updateExecutionJob(job.jobId, progressPatch)
      });

      updateExecutionJob(job.jobId, {
        status: 'completed',
        percent: 100,
        phase: result?.skipped ? 'skipped' : 'completed',
        message: result?.message || (result?.skipped ? 'La ejecución fue omitida por la configuración actual.' : 'Ejecución completada correctamente.'),
        delayedStages: result?.delayedStages || null,
        skipped: Boolean(result?.skipped),
        executedAt: result?.executedAt || new Date().toISOString(),
        error: null
      });
    } catch (error) {
      updateExecutionJob(job.jobId, {
        status: 'failed',
        percent: 100,
        phase: 'failed',
        message: 'La ejecución terminó con errores.',
        error: error?.message || 'No se pudo completar la ejecución',
        executedAt: new Date().toISOString()
      });
    }
  });

  return { ...job };
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDestinatarios(destinatarios) {
  const items = Array.isArray(destinatarios) ? destinatarios : [destinatarios];
  return [...new Set(
    items
      .flatMap((item) => String(item ?? '').split(/[;,\n]/))
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function normalizarEstado(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['completado', 'completada', 'cerrado', 'cerrada', 'closed', 'done'].includes(normalized)) return 'completado';
  return normalized || 'pendiente';
}

function obtenerEstadoProcesoNotificacion(subtarea) {
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

function obtenerPresupuestoProceso(subtarea) {
  const valor = Number(subtarea?.presupuesto || subtarea?.presupuesto2026Inicial || 0);
  return Number.isFinite(valor) ? valor : 0;
}

function procesoDebeNotificarse(subtarea) {
  const estado = obtenerEstadoProcesoNotificacion(subtarea);
  if (estado === 0 || estado === 2) return false;
  if (obtenerPresupuestoProceso(subtarea) <= 0) return false;
  return true;
}

function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value, timeZone = 'America/Guayaquil') {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
}

function formatDateTime(value = new Date(), timeZone = 'America/Guayaquil') {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
}

function getLocalDateInfo(timeZone = 'America/Guayaquil') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`
  };
}

function replaceTokens(template, replacements) {
  return Object.entries(replacements).reduce((acc, [key, value]) => (
    acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value ?? ''))
  ), String(template || ''));
}

function getTransporter(config) {
  const preset = getServerPreset(config.serverType);
  const host = String(config.smtpHost || preset.smtpHost || '').trim();
  const port = Number(config.smtpPort || preset.smtpPort || 587);
  const secure = Boolean(config.smtpSecure ?? preset.smtpSecure);

  if (!host) return null;
  if (config.requireAuth && (!config.smtpUser || !config.smtpPassword)) return null;

  const options = {
    host,
    port,
    secure,
    auth: config.requireAuth
      ? {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      : undefined
  };

  const key = JSON.stringify({ host, port, secure, user: config.smtpUser, requireAuth: config.requireAuth });
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport(options);
    transporterKey = key;
  }

  return transporter;
}

function resolveBannerAttachment() {
  return {
    bannerHtml: `
      <div style="padding:20px 24px 10px;background:#ffffff;border-bottom:1px solid #e2e8f0;">
        <img
          src="${INSTITUTIONAL_LOGO_URL}"
          alt="Quito Turismo"
          style="display:block;max-width:220px;width:100%;height:auto;"
        />
      </div>
    `,
    attachments: []
  };
}

function buildHtmlCorreo(config, asunto, contenido, options = {}) {
  const htmlBody = /<[^>]+>/.test(String(contenido || ''))
    ? String(contenido || '')
    : `<p>${escapeHtml(contenido || '')}</p>`;
  const { bannerHtml, attachments } = resolveBannerAttachment();

  const replacements = {
    asunto: escapeHtml(asunto),
    titulo: escapeHtml(options.title || asunto),
    motivo: escapeHtml(options.reason || 'Notificación automática'),
    fecha: escapeHtml(formatDateTime(new Date(), config.timezone || 'America/Guayaquil')),
    pie: escapeHtml(config.footerText || 'Este es un mensaje automático del sistema'),
    contenido: htmlBody,
    responsable: escapeHtml(options.responsable || ''),
    proceso: escapeHtml(options.proceso || ''),
    diasAtraso: escapeHtml(options.diasAtraso || ''),
    bannerHtml
  };

  const template = String(config.htmlTemplate || DEFAULT_NOTIFICATION_TEMPLATE);
  let rendered = replaceTokens(template, replacements);

  if (!/{{\s*bannerHtml\s*}}/i.test(template) && !rendered.includes(INSTITUTIONAL_LOGO_URL)) {
    if (/<body[^>]*>/i.test(rendered)) {
      rendered = rendered.replace(/<body([^>]*)>/i, `<body$1>${bannerHtml}`);
    } else {
      rendered = `${bannerHtml}${rendered}`;
    }
  }

  if (!/{{\s*contenido\s*}}/i.test(template) && !rendered.includes(htmlBody)) {
    rendered = `${rendered}\n${htmlBody}`;
  }
  return { html: rendered, attachments };
}

async function registrarHistorial(destinatarios, asunto, mensaje, tareaId = null, enviada = false) {
  const correos = parseDestinatarios(destinatarios);
  await Promise.all(
    correos.map((destinatario) => insertNotificacion({
      tipo: 'email',
      destinatario,
      asunto,
      mensaje,
      tareaId,
      fecha: new Date(),
      leida: false,
      enviada
    }))
  );
}

async function getResponsablesMaps() {
  const responsables = await getAllResponsables();
  return {
    byId: new Map(responsables.map((item) => [Number(item.id), item])),
    byName: new Map(responsables.map((item) => [String(item.nombre || '').trim().toLowerCase(), item]))
  };
}

async function getUltimosComentariosSeguimiento(subtareaIds = []) {
  const ids = [...new Set(subtareaIds.map((item) => Number(item)).filter((item) => item > 0))];
  if (!ids.length) return new Map();

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await query(
    `SELECT subtarea_id, etapa_id, comentario, fecha, updated_at, created_at
     FROM seguimientos_diarios
     WHERE subtarea_id IN (${placeholders})
     ORDER BY subtarea_id ASC, etapa_id ASC, fecha DESC, updated_at DESC, created_at DESC, id DESC`,
    ids
  );

  const latestMap = new Map();
  for (const row of rows) {
    const key = `${Number(row.subtarea_id)}:${Number(row.etapa_id)}`;
    if (!latestMap.has(key)) {
      latestMap.set(key, {
        comentario: String(row.comentario || '').trim(),
        fecha: row.fecha || row.updated_at || row.created_at || null
      });
    }
  }

  return latestMap;
}

function resolveResponsableEtapa(subtarea, etapa, maps) {
  const responsableId = Number(etapa?.responsableId || subtarea?.responsableId || 0);
  if (responsableId > 0 && maps.byId.has(responsableId)) {
    return maps.byId.get(responsableId);
  }

  const nombre = String(etapa?.responsableNombre || subtarea?.responsableNombre || '').trim().toLowerCase();
  if (nombre && maps.byName.has(nombre)) {
    return maps.byName.get(nombre);
  }

  return null;
}

function limitarAsunto(value, max = 240) {
  const text = String(value || '').trim();
  if (!text) return 'Notificación del sistema';
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trim()}…` : text;
}

function construirAsuntoDesdePlantilla(template, fallback, motivo) {
  const subject = String(template || '').trim();
  if (!subject) return limitarAsunto(fallback);
  return limitarAsunto(replaceTokens(subject, {
    motivo: escapeHtml(motivo || fallback),
    asunto: escapeHtml(fallback)
  }));
}

export async function enviarCorreo(destinatarios, asunto, contenido, tareaId = null, options = {}) {
  const config = options.config || await getConfiguracionCorreo({ includeSecret: true });
  const destinatariosArray = parseDestinatarios(destinatarios);
  const ccArray = parseDestinatarios(options.cc ?? config.supervisorEmails);
  const asuntoFinal = limitarAsunto(String(asunto || '').trim() || 'Notificación del sistema');
  const { html, attachments } = buildHtmlCorreo(config, asuntoFinal, contenido, options);

  if (!destinatariosArray.length) {
    return { success: false, sent: false, message: 'No hay destinatarios configurados' };
  }

  if (!config.enabled && !options.forceSend) {
    await registrarHistorial([...destinatariosArray, ...ccArray], asuntoFinal, html, tareaId, false);
    console.log('📧 Notificaciones deshabilitadas. Correo registrado pero no enviado.');
    return { success: true, sent: false, message: 'Notificaciones deshabilitadas' };
  }

  if (!config.fromEmail) {
    await registrarHistorial([...destinatariosArray, ...ccArray], asuntoFinal, html, tareaId, false);
    return { success: false, sent: false, message: 'Debe configurar el remitente del correo' };
  }

  try {
    const transport = getTransporter(config);
    if (!transport) {
      await registrarHistorial([...destinatariosArray, ...ccArray], asuntoFinal, html, tareaId, false);
      console.warn('⚠️ SMTP no configurado correctamente en el módulo de notificaciones');
      return { success: false, sent: false, message: 'SMTP no configurado o credenciales incompletas' };
    }

    const info = await transport.sendMail({
      from: `${config.fromName || 'Sistema Seguimiento'} <${config.fromEmail}>`,
      to: destinatariosArray.join(', '),
      cc: ccArray.length ? ccArray.join(', ') : undefined,
      subject: asuntoFinal,
      html,
      attachments
    });

    await registrarHistorial([...destinatariosArray, ...ccArray], asuntoFinal, html, tareaId, true);
    console.log('✅ Correo enviado:', info.messageId);
    return { success: true, sent: true, messageId: info.messageId };
  } catch (error) {
    await registrarHistorial([...destinatariosArray, ...ccArray], asuntoFinal, html, tareaId, false);
    console.error('❌ Error al enviar correo:', error?.message || error);
    return { success: false, sent: false, error: error?.message || 'Error al enviar correo' };
  }
}

export async function enviarCorreoPrueba(destinatario) {
  const config = await getConfiguracionCorreo({ includeSecret: true });
  const asunto = 'Prueba de configuración de correo';
  const contenido = `
    <p>Hola,</p>
    <p>Este mensaje confirma que la configuración del módulo de correo fue procesada correctamente.</p>
    <ul>
      <li><strong>Servidor:</strong> ${escapeHtml(config.serverType || 'smtp')}</li>
      <li><strong>Host:</strong> ${escapeHtml(config.smtpHost || 'No configurado')}</li>
      <li><strong>Puerto:</strong> ${escapeHtml(config.smtpPort || '')}</li>
      <li><strong>Hora programada:</strong> ${escapeHtml(config.sendTime || '08:00')}</li>
    </ul>
    <p>Si recibió este mensaje, el sistema está listo para enviar alertas automáticas.</p>
  `;

  return enviarCorreo(destinatario, asunto, contenido, null, {
    config,
    forceSend: true,
    reason: 'Prueba de correo',
    title: 'Validación de configuración SMTP',
    cc: []
  });
}

export async function enviarAlertasEtapasAtrasadas(configOverride = null, options = {}) {
  const config = configOverride || await getConfiguracionCorreo({ includeSecret: true });
  const onProgress = typeof options?.onProgress === 'function' ? options.onProgress : null;

  if (!config.notifyDelayedStages) {
    onProgress?.({
      phase: 'skipped',
      percent: 100,
      message: 'La alerta de etapas atrasadas está deshabilitada.',
      skipped: true
    });
    return { success: true, skipped: true, message: 'La alerta de etapas atrasadas está deshabilitada' };
  }

  onProgress?.({
    phase: 'collecting',
    percent: 12,
    message: 'Analizando procesos y etapas con atraso...'
  });

  const subtareas = await getAllSubtareas();
  const responsableMaps = await getResponsablesMaps();
  const comentarioMap = await getUltimosComentariosSeguimiento(subtareas.map((item) => Number(item.id || 0)));
  const umbral = Math.max(1, Number(config.delayedStageDays || 1));
  const localInfo = getLocalDateInfo(config.timezone || 'America/Guayaquil');
  const hoy = parseDateOnly(localInfo.dateKey) || new Date();
  hoy.setHours(0, 0, 0, 0);

  const grupos = new Map();
  let totalEtapas = 0;

  for (const subtarea of subtareas) {
    if (!procesoDebeNotificarse(subtarea)) continue;

    for (const etapa of subtarea.seguimientoEtapas || []) {
      const estado = normalizarEstado(etapa?.estado);
      if (estado === 'completado') continue;

      const fechaPlanificada = parseDateOnly(etapa?.fechaPlanificada || etapa?.fechaTentativa || etapa?.fechaReforma);
      if (!fechaPlanificada) continue;

      const diasAtraso = Math.floor((hoy.getTime() - fechaPlanificada.getTime()) / 86400000);
      if (diasAtraso < umbral) continue;

      const responsable = resolveResponsableEtapa(subtarea, etapa, responsableMaps);
      const email = String(responsable?.email || '').trim();
      if (!email) continue;

      const key = email.toLowerCase();
      if (!grupos.has(key)) {
        grupos.set(key, {
          responsableNombre: responsable?.nombre || subtarea?.responsableNombre || 'Responsable',
          email,
          items: []
        });
      }

      const etapaId = Number(etapa?.etapaId || etapa?.id || 0);
      const comentarioInfo = comentarioMap.get(`${Number(subtarea?.id || 0)}:${etapaId}`);

      grupos.get(key).items.push({
        codigoOlympo: subtarea?.codigoOlympo || '',
        proceso: subtarea?.nombre || 'Proceso sin nombre',
        direccion: subtarea?.direccionNombre || 'Sin dirección',
        etapa: etapa?.etapaNombre || 'Etapa',
        fechaPlanificada,
        diasAtraso,
        ultimoComentario: String(comentarioInfo?.comentario || etapa?.observaciones || '').trim(),
        fechaComentario: comentarioInfo?.fecha || null
      });
      totalEtapas += 1;
    }
  }

  const totalRecipients = grupos.size;
  onProgress?.({
    phase: 'sending',
    percent: totalRecipients ? 20 : 100,
    message: totalRecipients
      ? `Se encontraron ${totalEtapas} etapa(s) atrasadas en ${totalRecipients} responsable(s). Iniciando envío...`
      : 'No se encontraron responsables con correo para notificar.',
    totalRecipients,
    processedRecipients: 0,
    sent: 0,
    totalStages: totalEtapas
  });

  let enviados = 0;
  let procesados = 0;
  for (const grupo of grupos.values()) {
    const procesos = Array.from(grupo.items.reduce((acc, item) => {
      const key = `${item.codigoOlympo}::${item.proceso}`;
      if (!acc.has(key)) {
        acc.set(key, {
          codigoOlympo: item.codigoOlympo,
          proceso: item.proceso,
          direccion: item.direccion,
          etapas: []
        });
      }
      acc.get(key).etapas.push(item);
      return acc;
    }, new Map()).values());

    const procesosHtml = procesos
      .sort((a, b) => a.proceso.localeCompare(b.proceso))
      .map((proceso) => {
        const rowsHtml = proceso.etapas
          .sort((a, b) => b.diasAtraso - a.diasAtraso || a.etapa.localeCompare(b.etapa))
          .map((item) => `
            <tr>
              <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(item.etapa)}</td>
              <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(formatDate(item.fechaPlanificada, config.timezone))}</td>
              <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;font-weight:700;color:#b91c1c;text-align:center;">${item.diasAtraso}</td>
              <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;">${item.ultimoComentario ? `${escapeHtml(item.ultimoComentario)}${item.fechaComentario ? `<div style="margin-top:6px;font-size:11px;color:#64748b;">Último seguimiento: ${escapeHtml(formatDate(item.fechaComentario, config.timezone))}</div>` : ''}` : '<span style="color:#94a3b8;">Sin seguimiento registrado</span>'}</td>
            </tr>
          `)
          .join('');

        return `
          <div style="margin:18px 0 22px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <div style="background:#eff6ff;padding:14px 16px;border-bottom:1px solid #dbeafe;">
              <div style="font-size:12px;color:#1d4ed8;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Proceso</div>
              <h3 style="margin:6px 0 0;font-size:18px;color:#0f172a;">${escapeHtml(proceso.proceso)}</h3>
              <div style="margin-top:6px;font-size:13px;color:#334155;">
                <strong>Código:</strong> ${escapeHtml(proceso.codigoOlympo || '-')} &nbsp;|&nbsp;
                <strong>Dirección:</strong> ${escapeHtml(proceso.direccion || 'Sin dirección')}
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Etapa atrasada</th>
                  <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Fecha tentativa</th>
                  <th style="padding:10px;border:1px solid #e2e8f0;text-align:center;">Días tarde</th>
                  <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Último comentario de seguimiento</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;
      })
      .join('');

    const totalProcesos = procesos.length;
    const motivo = `Etapas con ${umbral}+ día(s) de atraso`;
    const asunto = construirAsuntoDesdePlantilla(
      config.subjectTemplate,
      totalProcesos === 1
        ? `🚨 Proceso con ${grupo.items.length} etapa(s) atrasadas: ${procesos[0]?.proceso || 'Proceso'}`
        : `🚨 ${grupo.items.length} etapa(s) atrasadas en ${totalProcesos} proceso(s)`,
      motivo
    );

    const contenido = `
      <p>Estimado/a <strong>${escapeHtml(grupo.responsableNombre)}</strong>,</p>
      <p>Se detectaron <strong>${grupo.items.length} etapa(s)</strong> atrasadas distribuidas en <strong>${totalProcesos} proceso(s)</strong> a su cargo.</p>
      <p>En cada bloque se detalla el encabezado del proceso y, cuando existe, el último comentario de seguimiento registrado.</p>
      ${procesosHtml}
      <p>Por favor actualice el seguimiento o registre las novedades correspondientes en el sistema.</p>
    `;

    const resultado = await enviarCorreo(grupo.email, asunto, contenido, null, {
      config,
      reason: motivo,
      title: 'Alertas automáticas por etapas atrasadas'
    });

    procesados += 1;
    if (resultado?.sent) enviados += 1;

    const percent = totalRecipients
      ? Math.min(95, 20 + Math.round((procesados / totalRecipients) * 75))
      : 100;

    onProgress?.({
      phase: 'sending',
      percent,
      message: `Enviando correos: ${procesados}/${totalRecipients} procesado(s).`,
      totalRecipients,
      processedRecipients: procesados,
      sent: enviados,
      totalStages: totalEtapas
    });
  }

  return {
    success: true,
    sent: enviados,
    totalRecipients: grupos.size,
    totalStages: totalEtapas,
    thresholdDays: umbral
  };
}

export async function ejecutarNotificacionesProgramadas({ force = false, progress = null } = {}) {
  progress?.({
    phase: 'checking',
    percent: 5,
    message: 'Validando configuración de notificaciones...'
  });

  const config = await getConfiguracionCorreo({ includeSecret: true });
  if (!config.enabled) {
    progress?.({
      phase: 'skipped',
      percent: 100,
      message: 'Las notificaciones por correo están deshabilitadas.',
      skipped: true
    });
    return { success: true, skipped: true, message: 'Las notificaciones por correo están deshabilitadas' };
  }

  const localInfo = getLocalDateInfo(config.timezone || 'America/Guayaquil');
  const horaConfigurada = String(config.sendTime || '08:00');

  if (!force && localInfo.time < horaConfigurada) {
    progress?.({
      phase: 'skipped',
      percent: 100,
      message: `Aún no es la hora programada (${horaConfigurada}).`,
      skipped: true
    });
    return {
      success: true,
      skipped: true,
      message: `Aún no es la hora programada (${horaConfigurada})`,
      now: localInfo.time
    };
  }

  if (!force && String(config.lastExecutionDate || '') === localInfo.dateKey) {
    progress?.({
      phase: 'skipped',
      percent: 100,
      message: 'La notificación programada de hoy ya fue ejecutada.',
      skipped: true
    });
    return {
      success: true,
      skipped: true,
      message: 'La notificación programada de hoy ya fue ejecutada',
      date: localInfo.dateKey
    };
  }

  progress?.({
    phase: 'collecting',
    percent: 10,
    message: 'Consultando procesos pendientes con atraso...'
  });

  const resumenAtrasos = await enviarAlertasEtapasAtrasadas(config, { onProgress: progress });

  progress?.({
    phase: 'finalizing',
    percent: 98,
    message: 'Registrando la ejecución final...'
  });

  await registrarEjecucionCorreo(new Date(), localInfo.dateKey);

  return {
    success: true,
    force,
    scheduledTime: horaConfigurada,
    executedAt: new Date().toISOString(),
    delayedStages: resumenAtrasos,
    message: resumenAtrasos?.skipped ? resumenAtrasos.message : 'Proceso ejecutado correctamente'
  };
}

async function buscarResponsablePorId(responsableId) {
  const responsables = await getAllResponsables();
  return responsables.find((item) => Number(item.id) === Number(responsableId)) || null;
}

export async function enviarNotificacionCambioEstado(tarea, estadoAnterior, estadoNuevo) {
  const responsable = await buscarResponsablePorId(tarea?.responsableId);
  if (!responsable?.email) return { success: false, sent: false, message: 'Responsable sin correo configurado' };

  const asunto = `Estado de tarea actualizado: ${tarea?.nombre || 'Tarea'}`;
  const contenido = `
    <p>Se actualizó el estado de una tarea asociada al proceso de contratación.</p>
    <ul>
      <li><strong>Tarea:</strong> ${escapeHtml(tarea?.nombre || 'N/A')}</li>
      <li><strong>Estado anterior:</strong> ${escapeHtml(estadoAnterior || 'N/A')}</li>
      <li><strong>Estado nuevo:</strong> ${escapeHtml(estadoNuevo || 'N/A')}</li>
      <li><strong>Fecha:</strong> ${escapeHtml(formatDateTime(new Date()))}</li>
    </ul>
  `;

  return enviarCorreo(responsable.email, asunto, contenido, tarea?.id || null, {
    reason: 'Cambio de estado de tarea'
  });
}

export async function enviarAlertaVencimiento(tarea, diasRestantes) {
  const responsable = await buscarResponsablePorId(tarea?.responsableId);
  if (!responsable?.email) return { success: false, sent: false, message: 'Responsable sin correo configurado' };

  const asunto = `⚠️ Tarea próxima a vencer en ${diasRestantes} día(s): ${tarea?.nombre || 'Tarea'}`;
  const contenido = `
    <p>La siguiente tarea está próxima a vencer:</p>
    <ul>
      <li><strong>Tarea:</strong> ${escapeHtml(tarea?.nombre || 'N/A')}</li>
      <li><strong>Estado actual:</strong> ${escapeHtml(tarea?.estado || 'Pendiente')}</li>
      <li><strong>Fecha límite:</strong> ${escapeHtml(formatDate(tarea?.fechaFin))}</li>
      <li><strong>Días restantes:</strong> ${escapeHtml(diasRestantes)}</li>
    </ul>
  `;

  return enviarCorreo(responsable.email, asunto, contenido, tarea?.id || null, {
    reason: 'Vencimiento próximo'
  });
}

export async function enviarAlertaAtraso(tarea, diasAtraso) {
  const responsable = await buscarResponsablePorId(tarea?.responsableId);
  if (!responsable?.email) return { success: false, sent: false, message: 'Responsable sin correo configurado' };

  const asunto = `🚨 Tarea atrasada ${diasAtraso} día(s): ${tarea?.nombre || 'Tarea'}`;
  const contenido = `
    <p>La tarea siguiente presenta atraso y requiere atención inmediata:</p>
    <ul>
      <li><strong>Tarea:</strong> ${escapeHtml(tarea?.nombre || 'N/A')}</li>
      <li><strong>Estado actual:</strong> ${escapeHtml(tarea?.estado || 'Pendiente')}</li>
      <li><strong>Fecha límite:</strong> ${escapeHtml(formatDate(tarea?.fechaFin))}</li>
      <li><strong>Días de atraso:</strong> ${escapeHtml(diasAtraso)}</li>
    </ul>
  `;

  return enviarCorreo(responsable.email, asunto, contenido, tarea?.id || null, {
    reason: 'Tarea atrasada'
  });
}

export async function enviarAlertaHitoCritico(hito, tarea) {
  const responsable = await buscarResponsablePorId(tarea?.responsableId);
  if (!responsable?.email) return { success: false, sent: false, message: 'Responsable sin correo configurado' };

  const asunto = `📋 Hito crítico pendiente: ${hito?.nombre || 'Hito'}`;
  const contenido = `
    <p>Se registró un hito crítico pendiente dentro del proceso de contratación.</p>
    <ul>
      <li><strong>Hito:</strong> ${escapeHtml(hito?.nombre || 'N/A')}</li>
      <li><strong>Tarea:</strong> ${escapeHtml(tarea?.nombre || 'N/A')}</li>
      <li><strong>Fecha planificada:</strong> ${escapeHtml(formatDate(hito?.fechaPlanificada))}</li>
      <li><strong>Estado:</strong> ${escapeHtml(hito?.estado || 'Pendiente')}</li>
    </ul>
    ${hito?.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHtml(hito.observaciones)}</p>` : ''}
  `;

  return enviarCorreo(responsable.email, asunto, contenido, tarea?.id || null, {
    reason: 'Hito crítico pendiente'
  });
}
