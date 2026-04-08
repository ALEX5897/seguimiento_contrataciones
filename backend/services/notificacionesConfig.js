import { normalizeTextEncoding, query } from '../data/mysql.js';

const EMAIL_FROM_RAW = String(process.env.EMAIL_FROM || 'Sistema Seguimiento <noreply@quitoturismo.gob.ec>').trim();
const EMAIL_FROM_MATCH = EMAIL_FROM_RAW.match(/^(.*)<([^>]+)>$/);
const DEFAULT_FROM_NAME = normalizeTextEncoding((EMAIL_FROM_MATCH?.[1] || 'Sistema Seguimiento').trim(), { trim: true, collapseWhitespace: true }) || 'Sistema Seguimiento';
const DEFAULT_FROM_EMAIL = normalizeTextEncoding((EMAIL_FROM_MATCH?.[2] || EMAIL_FROM_RAW).trim(), { trim: true, collapseWhitespace: true }) || 'noreply@quitoturismo.gob.ec';

export const DEFAULT_NOTIFICATION_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{asunto}}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:820px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <div style="background:#ffffff;">
        {{bannerHtml}}
      </div>

      <div style="background:#0f172a;color:#ffffff;padding:22px 24px;">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;">Sistema institucional</div>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">{{titulo}}</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:.9;">{{motivo}}</p>
      </div>

      <div style="padding:24px;line-height:1.6;font-size:14px;">
        {{contenido}}
      </div>

      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;color:#64748b;font-size:12px;">
        <div><strong>Fecha:</strong> {{fecha}}</div>
        <div style="margin-top:6px;">{{pie}}</div>
      </div>
    </div>
  </body>
</html>`;

const SERVER_PRESETS = {
  smtp: { smtpHost: '', smtpPort: 587, smtpSecure: false },
  gmail: { smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpSecure: true },
  office365: { smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  sendgrid: { smtpHost: 'smtp.sendgrid.net', smtpPort: 587, smtpSecure: false },
  otro: { smtpHost: '', smtpPort: 587, smtpSecure: false }
};

function parseBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'si', 'sí', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value, fallback = 0, min = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return normalizeTextEncoding(String(value), { trim: true, collapseWhitespace: false }) || fallback;
}

function normalizeEmailList(value, fallback = '') {
  const source = value === null || value === undefined ? fallback : value;
  return String(source || '')
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');
}

function normalizeTime(value, fallback = '08:00') {
  const text = String(value || fallback).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Math.max(0, Math.min(23, Number(match[1])));
  const minutes = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeServerType(value, fallback = 'smtp') {
  const normalized = String(value || fallback).trim().toLowerCase();
  return Object.hasOwn(SERVER_PRESETS, normalized) ? normalized : fallback;
}

function buildDefaults() {
  return {
    enabled: String(process.env.NOTIFICATIONS_ENABLED || 'false').toLowerCase() === 'true',
    fromName: DEFAULT_FROM_NAME,
    fromEmail: DEFAULT_FROM_EMAIL,
    serverType: 'smtp',
    smtpHost: String(process.env.SMTP_HOST || '').trim(),
    smtpPort: parseInteger(process.env.SMTP_PORT, 587, 1),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
    requireAuth: true,
    smtpUser: String(process.env.SMTP_USER || '').trim(),
    smtpPassword: String(process.env.SMTP_PASS || ''),
    supervisorEmails: normalizeEmailList(process.env.SUPERVISOR_EMAILS || ''),
    sendTime: '08:00',
    timezone: 'America/Guayaquil',
    notifyDelayedStages: true,
    delayedStageDays: 2,
    subjectTemplate: 'Seguimiento de contrataciones - {{motivo}}',
    htmlTemplate: DEFAULT_NOTIFICATION_TEMPLATE,
    footerText: 'Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo',
    lastExecutionAt: null,
    lastExecutionDate: null,
    smtpPasswordConfigured: Boolean(process.env.SMTP_PASS)
  };
}

function toConfig(row = null, { includeSecret = false } = {}) {
  const defaults = buildDefaults();
  if (!row) {
    return {
      ...defaults,
      smtpPassword: includeSecret ? defaults.smtpPassword : '',
      smtpPasswordConfigured: Boolean(defaults.smtpPassword)
    };
  }

  const config = {
    enabled: Boolean(row.enabled),
    fromName: normalizeText(row.remitente_nombre, defaults.fromName),
    fromEmail: normalizeText(row.remitente_email, defaults.fromEmail),
    serverType: normalizeServerType(row.tipo_servidor, defaults.serverType),
    smtpHost: normalizeText(row.smtp_host, defaults.smtpHost),
    smtpPort: parseInteger(row.smtp_port, defaults.smtpPort, 1),
    smtpSecure: Boolean(row.smtp_secure),
    requireAuth: parseBoolean(row.requiere_auth, true),
    smtpUser: normalizeText(row.smtp_user, defaults.smtpUser),
    smtpPassword: includeSecret ? String(row.smtp_password || '') : '',
    smtpPasswordConfigured: Boolean(row.smtp_password),
    supervisorEmails: normalizeEmailList(row.supervisor_emails, defaults.supervisorEmails),
    sendTime: normalizeTime(row.hora_envio, defaults.sendTime),
    timezone: normalizeText(row.zona_horaria, defaults.timezone),
    notifyDelayedStages: Boolean(row.notificar_etapas_atrasadas),
    delayedStageDays: parseInteger(row.dias_atraso_minimo, defaults.delayedStageDays, 1),
    subjectTemplate: normalizeText(row.asunto_plantilla, defaults.subjectTemplate),
    htmlTemplate: String(row.plantilla_html || defaults.htmlTemplate),
    footerText: normalizeText(row.pie_mensaje, defaults.footerText),
    lastExecutionAt: row.ultima_ejecucion_at || null,
    lastExecutionDate: row.ultima_ejecucion_fecha || null
  };

  return config;
}

export async function getConfiguracionCorreo({ includeSecret = false } = {}) {
  const rows = await query('SELECT * FROM configuracion_notificaciones ORDER BY id ASC LIMIT 1');
  return toConfig(rows[0] || null, { includeSecret });
}

export async function guardarConfiguracionCorreo(payload = {}) {
  const current = await getConfiguracionCorreo({ includeSecret: true });
  const next = {
    enabled: parseBoolean(payload.enabled, current.enabled),
    fromName: normalizeText(payload.fromName, current.fromName),
    fromEmail: normalizeText(payload.fromEmail, current.fromEmail),
    serverType: normalizeServerType(payload.serverType, current.serverType),
    smtpHost: normalizeText(payload.smtpHost, current.smtpHost),
    smtpPort: parseInteger(payload.smtpPort, current.smtpPort, 1),
    smtpSecure: parseBoolean(payload.smtpSecure, current.smtpSecure),
    requireAuth: parseBoolean(payload.requireAuth, current.requireAuth),
    smtpUser: normalizeText(payload.smtpUser, current.smtpUser),
    smtpPassword: current.smtpPassword,
    supervisorEmails: normalizeEmailList(payload.supervisorEmails, current.supervisorEmails),
    sendTime: normalizeTime(payload.sendTime, current.sendTime),
    timezone: normalizeText(payload.timezone, current.timezone || 'America/Guayaquil') || 'America/Guayaquil',
    notifyDelayedStages: parseBoolean(payload.notifyDelayedStages, current.notifyDelayedStages),
    delayedStageDays: parseInteger(payload.delayedStageDays, current.delayedStageDays, 1),
    subjectTemplate: normalizeText(payload.subjectTemplate, current.subjectTemplate),
    htmlTemplate: String(payload.htmlTemplate || current.htmlTemplate || DEFAULT_NOTIFICATION_TEMPLATE),
    footerText: normalizeText(payload.footerText, current.footerText)
  };

  if (payload.smtpPassword !== undefined) {
    const submittedPassword = String(payload.smtpPassword || '');
    if (submittedPassword.trim()) {
      next.smtpPassword = submittedPassword;
    }
  }

  const preset = SERVER_PRESETS[next.serverType] || SERVER_PRESETS.smtp;
  if (!next.smtpHost && preset.smtpHost) next.smtpHost = preset.smtpHost;
  if (!next.smtpPort && preset.smtpPort) next.smtpPort = preset.smtpPort;
  if (payload.smtpSecure === undefined) next.smtpSecure = preset.smtpSecure;

  const rows = await query('SELECT id FROM configuracion_notificaciones ORDER BY id ASC LIMIT 1');
  if (rows[0]?.id) {
    await query(
      `UPDATE configuracion_notificaciones
       SET enabled = ?,
           remitente_nombre = ?,
           remitente_email = ?,
           tipo_servidor = ?,
           smtp_host = ?,
           smtp_port = ?,
           smtp_secure = ?,
           requiere_auth = ?,
           smtp_user = ?,
           smtp_password = ?,
           supervisor_emails = ?,
           hora_envio = ?,
           zona_horaria = ?,
           notificar_etapas_atrasadas = ?,
           dias_atraso_minimo = ?,
           asunto_plantilla = ?,
           plantilla_html = ?,
           pie_mensaje = ?
       WHERE id = ?`,
      [
        next.enabled,
        next.fromName,
        next.fromEmail,
        next.serverType,
        next.smtpHost,
        next.smtpPort,
        next.smtpSecure,
        next.requireAuth,
        next.smtpUser,
        next.smtpPassword,
        next.supervisorEmails,
        next.sendTime,
        next.timezone,
        next.notifyDelayedStages,
        next.delayedStageDays,
        next.subjectTemplate,
        next.htmlTemplate,
        next.footerText,
        rows[0].id
      ]
    );
  } else {
    await query(
      `INSERT INTO configuracion_notificaciones (
        enabled, remitente_nombre, remitente_email, tipo_servidor,
        smtp_host, smtp_port, smtp_secure, requiere_auth, smtp_user, smtp_password,
        supervisor_emails, hora_envio, zona_horaria,
        notificar_etapas_atrasadas, dias_atraso_minimo,
        asunto_plantilla, plantilla_html, pie_mensaje
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        next.enabled,
        next.fromName,
        next.fromEmail,
        next.serverType,
        next.smtpHost,
        next.smtpPort,
        next.smtpSecure,
        next.requireAuth,
        next.smtpUser,
        next.smtpPassword,
        next.supervisorEmails,
        next.sendTime,
        next.timezone,
        next.notifyDelayedStages,
        next.delayedStageDays,
        next.subjectTemplate,
        next.htmlTemplate,
        next.footerText
      ]
    );
  }

  return getConfiguracionCorreo();
}

export async function registrarEjecucionCorreo(at = new Date(), dateKey = '') {
  const isoDate = new Date(at);
  const resolvedDateKey = String(dateKey || '').trim() || `${isoDate.getFullYear()}-${String(isoDate.getMonth() + 1).padStart(2, '0')}-${String(isoDate.getDate()).padStart(2, '0')}`;

  await query(
    `UPDATE configuracion_notificaciones
     SET ultima_ejecucion_at = ?, ultima_ejecucion_fecha = ?
     ORDER BY id ASC
     LIMIT 1`,
    [isoDate, resolvedDateKey]
  );
}

export function getServerPreset(serverType = 'smtp') {
  return SERVER_PRESETS[normalizeServerType(serverType)] || SERVER_PRESETS.smtp;
}
