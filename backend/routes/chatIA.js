import express from 'express';
import { query } from '../data/mysql.js';
import { normalizeText } from '../utils/helpers.js';

const router = express.Router();

// ── Configuración ─────────────────────────────────────────────────────────────
const IA_CHAT_ENABLED            = String(process.env.IA_CHAT_ENABLED ?? 'false').toLowerCase() === 'true';
const IA_CHAT_PROVIDER           = String(process.env.IA_CHAT_PROVIDER || 'openai').trim().toLowerCase();
const IA_CHAT_MODEL              = String(process.env.IA_CHAT_MODEL || 'gpt-4o-mini').trim();
const IA_CHAT_API_KEY            = String(process.env.IA_CHAT_API_KEY || '').trim();
const IA_CHAT_BASE_URL           = String(process.env.IA_CHAT_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const IA_CHAT_MAX_INPUT_CHARS    = Number.parseInt(String(process.env.IA_CHAT_MAX_INPUT_CHARS || '2000'), 10);
const IA_CHAT_MAX_HISTORY        = Number.parseInt(String(process.env.IA_CHAT_MAX_HISTORY || '5'), 10);
const IA_CHAT_TEMPERATURE        = Number.parseFloat(String(process.env.IA_CHAT_TEMPERATURE || '0.2'));
const IA_CHAT_REQUEST_TIMEOUT_MS = Number.parseInt(
  String(process.env.IA_CHAT_REQUEST_TIMEOUT_MS || (process.env.IA_CHAT_PROVIDER === 'ollama' ? '90000' : '30000')),
  10
);
const IA_SQL_MAX_ROWS = Number.parseInt(String(process.env.IA_SQL_MAX_ROWS || '50'), 10);
const IA_CHAT_OLLAMA_SEED = Number.parseInt(String(process.env.IA_CHAT_OLLAMA_SEED || '23'), 10);
const IA_CHAT_FORCE_GROUNDED_ANSWER = String(process.env.IA_CHAT_FORCE_GROUNDED_ANSWER ?? 'true').toLowerCase() === 'true';

const SAFE_ROLES = new Set(['system', 'user', 'assistant']);
const ALLOWED_TABLES = new Set([
  'subtareas',
  'responsables_catalogo',
  'direcciones_catalogo',
  'etapas_pac',
  'subtareas_etapas',
  'seguimiento_etapas'
]);

const DOMAIN_KEYWORDS = [
  'seguimiento', 'contratacion', 'contrataciones', 'poa', 'pac',
  'proceso', 'procesos', 'subtarea', 'subtareas', 'etapa', 'etapas',
  'actividad', 'actividades', 'direccion', 'direcciones', 'responsable',
  'estado', 'avance', 'presupuesto', 'reforma', 'olympo', 'codigo',
  'comentario', 'comentarios', 'observacion', 'observaciones', 'semana', 'semanal',
  'base de datos', 'bd', 'tics', 'tecnologia', 'tecnologias', 'tecnolog', 'area', 'área'
];

const SENSITIVE_KEYWORDS = [
  'usuario', 'usuarios', 'password', 'contrasena', 'contraseña', 'hash', 'token',
  'auditoria', 'auditoría', 'sesion', 'sesión', 'login', 'credencial', 'credenciales'
];

const SQL_BLOCKED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
  'TRUNCATE', 'EXEC', 'EXECUTE', 'CALL', 'GRANT', 'REVOKE'
];

const LIST_QUESTION_KEYWORDS = ['cuales', 'cuáles', 'listar', 'lista', 'muestr', 'dame', 'detalle'];
const COUNT_QUESTION_KEYWORDS = ['cuantos', 'cuántos', 'cuantas', 'cuántas', 'total', 'numero', 'número', 'cantidad'];
const DELAYED_QUESTION_KEYWORDS = ['retras', 'atras', 'vencid', 'pendiente', 'demor'];
const BUDGET_QUESTION_KEYWORDS = ['presupuesto', 'monto', 'valor', 'inversion', 'inversión'];

// Columnas permitidas en formato alias.columna — whitelist estricta
const ALLOWED_ALIAS_COLUMNS = new Set([
  's.id', 's.nombre', 's.codigo_olympo', 's.presupuesto_2026_inicial',
  's.direccion_encargada', 's.responsable_id',
  'r.id', 'r.nombre', 'r.direccion_id',
  'd.id', 'd.nombre',
  'e.id', 'e.nombre', 'e.orden',
  'st.subtarea_id', 'st.etapa_id', 'st.fecha_prevista',
  'se.subtarea_id', 'se.etapa_id', 'se.estado', 'se.fecha_planificada', 'se.fecha_real'
]);

// Schema exacto de la BD — solo columnas verificadas
const DB_SCHEMA_COMPACT = [
  'subtareas AS s: id, nombre, codigo_olympo, presupuesto_2026_inicial, responsable_id, direccion_encargada',
  'responsables_catalogo AS r: id, nombre, direccion_id',
  'direcciones_catalogo AS d: id, nombre',
  'etapas_pac AS e: id, nombre, orden',
  'subtareas_etapas AS st: subtarea_id, etapa_id, fecha_prevista',
  'seguimiento_etapas AS se: subtarea_id, etapa_id, estado, fecha_planificada, fecha_real',
  '',
  'JOINS VÁLIDOS:',
  '  s.responsable_id = r.id',
  '  r.direccion_id = d.id',
  '  s.id = st.subtarea_id  (para etapas planificadas)',
  '  s.id = se.subtarea_id  (para estado/fechas de etapas)',
  '  e.id = st.etapa_id | e.id = se.etapa_id',
  '',
  'RETRASO: se.fecha_real IS NULL AND se.fecha_planificada < CURDATE()',
  'FILTRO DIRECCIÓN: siempre via JOIN r → d, usar WHERE d.nombre=? nunca hardcodear nombres',
  'PROHIBIDO: s.etapa_id (no existe), s.estado, s.fecha_inicio, s.fecha_fin, columnas no listadas'
].join('\n');

// ── Helpers generales ─────────────────────────────────────────────────────────

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      role: SAFE_ROLES.has(String(item.role || '').toLowerCase())
        ? String(item.role).toLowerCase()
        : 'user',
      content: String(item.content || '').trim()
    }))
    .filter((item) => item.content.length > 0)
    .slice(-Math.max(0, IA_CHAT_MAX_HISTORY));
}

function sanitizeUserInput(value) {
  return String(value || '').trim().slice(0, Math.max(200, IA_CHAT_MAX_INPUT_CHARS));
}

function isDomainQuestion(message) {
  const msg = normalizeText(message);
  return Boolean(msg) && (
    DOMAIN_KEYWORDS.some((kw) => msg.includes(kw))
    || msg.includes('registro')
    || msg.includes('registros')
  );
}

function asksSensitiveData(message) {
  const msg = normalizeText(message);
  return Boolean(msg) && SENSITIVE_KEYWORDS.some((kw) => msg.includes(kw));
}

function detectQuestionIntent(message) {
  const msg = normalizeText(message);
  return {
    wantsList: LIST_QUESTION_KEYWORDS.some((kw) => msg.includes(kw)),
    wantsCount: COUNT_QUESTION_KEYWORDS.some((kw) => msg.includes(kw)),
    asksDelayed: DELAYED_QUESTION_KEYWORDS.some((kw) => msg.includes(kw)),
    asksBudget: BUDGET_QUESTION_KEYWORDS.some((kw) => msg.includes(kw))
  };
}

function shouldUseDeterministicSQL(message, history = []) {
  const intent = detectQuestionIntent(message);
  const msg = normalizeText(message);
  if (intent.asksDelayed || intent.wantsCount || intent.wantsList) return true;
  if (Array.isArray(history) && history.length > 0 && (msg.includes('valor') || msg.includes('presupuesto') || msg.includes('monto'))) return true;
  if (Array.isArray(history) && history.length > 0 && (msg.includes('nombre') || msg.includes('registro'))) return true;
  return false;
}

function buildIntentLabel(intent) {
  if (!intent || typeof intent !== 'object') return null;
  const labels = [];
  if (intent.asksDelayed) labels.push('retrasos');
  if (intent.asksBudget) labels.push('presupuesto');
  if (intent.wantsCount) labels.push('conteo');
  if (intent.wantsList) labels.push('listado');
  return labels.length > 0 ? labels.join(', ') : 'consulta general';
}

const FOLLOW_UP_KEYWORDS = ['ese', 'esa', 'esos', 'esas', 'anterior', 'anteriormente', 'registro', 'registros', 'nombre', 'detalle', 'codigo', 'proceso'];

function isFollowUpQuestion(message, history = []) {
  const msg = normalizeText(message);
  if (!msg || !Array.isArray(history) || history.length === 0) return false;
  return FOLLOW_UP_KEYWORDS.some((kw) => msg.includes(kw));
}

function extractChatContext(history = []) {
  const context = {
    lastProcessCode: null,
    lastProcessName: null,
    lastDirection: null
  };

  if (!Array.isArray(history)) return context;

  const codePattern = /\b\d{2}(?:\.\d{2,3}){3,}\b/g;
  const namedLinePattern = /codigo_olympo:\s*([^|]+)\|\s*nombre:\s*([^|]+)/i;
  const directionPattern = /(?:Filtro aplicado|Dirección consultada):\s*(.+)/i;

  for (const item of [...history].reverse()) {
    const content = String(item?.content || '');
    if (!content) continue;

    if (!context.lastDirection) {
      const directionMatch = content.match(directionPattern);
      if (directionMatch?.[1]) {
        context.lastDirection = directionMatch[1].trim();
      }
    }

    if (!context.lastProcessCode) {
      const codeMatch = content.match(codePattern);
      if (codeMatch?.[0]) {
        context.lastProcessCode = codeMatch[0].trim();
      }
    }

    if (!context.lastProcessName) {
      const namedMatch = content.match(namedLinePattern);
      if (namedMatch?.[2]) {
        context.lastProcessName = namedMatch[2].trim();
      }
    }

    if (context.lastProcessCode && context.lastProcessName && context.lastDirection) break;
  }

  return context;
}

function getEffectiveDirection(req, direccionFiltro = null) {
  const role = String(req.user?.role || '').toLowerCase();
  const userDir = String(req.user?.direccionNombre || '').trim();
  const requestedDir = String(direccionFiltro || '').trim();

  if (role === 'direccion' && userDir) return userDir;
  if (requestedDir && requestedDir.toLowerCase() !== 'todas') return requestedDir;
  return null;
}

function safeTimeEnd(label) {
  try {
    console.timeEnd(label);
  } catch {
    try {
      if (String(label).includes('total-request')) {
        console.timeEnd('â±ï¸ [chatIA] total-request');
      }
    } catch {}
    // Evita warnings cuando una salida temprana no había cerrado el timer.
  }
}

function formatScalar(value) {
  if (value === null || value === undefined || value === '') return 'N/D';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('es-EC')
      : value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return text;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'USD 0,00';
  return amount.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function pickRowLabel(row, index) {
  return row.codigo_olympo
    || row.nombre
    || row.estado
    || row.etapa
    || row.direccion
    || `Registro ${index + 1}`;
}

function formatRowForAnswer(row, index) {
  const preferredOrder = [
    'codigo_olympo', 'nombre', 'estado', 'fecha_planificada', 'fecha_real',
    'fecha_prevista', 'presupuesto_2026_inicial', 'presupuesto_total',
    'responsable', 'direccion', 'etapa', 'total'
  ];

  const entries = [];
  for (const key of preferredOrder) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const rawValue = row[key];
      const value = key.includes('presupuesto')
        ? formatCurrency(rawValue)
        : formatScalar(rawValue);
      entries.push(`${key}: ${value}`);
    }
  }

  for (const [key, rawValue] of Object.entries(row)) {
    if (preferredOrder.includes(key)) continue;
    entries.push(`${key}: ${formatScalar(rawValue)}`);
  }

  return `- ${pickRowLabel(row, index)} | ${entries.join(' | ')}`;
}

function buildGroundedAnswer(message, rows, req, direccionFiltro = null, history = []) {
  const intent = detectQuestionIntent(message);
  const dirEfectiva = getEffectiveDirection(req, direccionFiltro);
  const chatContext = extractChatContext(history);
  const responseLines = [dirEfectiva ? `Filtro aplicado: ${dirEfectiva}.` : 'Filtro aplicado: Todas las direcciones.'];

  if (!Array.isArray(rows) || rows.length === 0) {
    responseLines.push('No encontré registros en la base de datos para esa consulta.');
    return responseLines.join('\n');
  }

  if (rows.length === 1) {
    const [row] = rows;
    const keys = Object.keys(row);
    const hasAggregateOnly = keys.every((key) => ['total', 'presupuesto_total', 'cantidad', 'monto_total'].includes(key));
    if (hasAggregateOnly) {
      const parts = [];
      if (row.total !== undefined) parts.push(`total: ${formatScalar(row.total)}`);
      if (row.cantidad !== undefined) parts.push(`cantidad: ${formatScalar(row.cantidad)}`);
      if (row.presupuesto_total !== undefined) parts.push(`presupuesto total: ${formatCurrency(row.presupuesto_total)}`);
      if (row.monto_total !== undefined) parts.push(`monto total: ${formatCurrency(row.monto_total)}`);
      responseLines.push(`Resultado real de la BD: ${parts.join(' | ')}.`);
      return responseLines.join('\n');
    }

    if (keys.length === 1 && typeof row[keys[0]] === 'number') {
      responseLines.push(`Resultado real de la BD: ${keys[0]} = ${formatScalar(row[keys[0]])}.`);
      return responseLines.join('\n');
    }
  }

  responseLines.push(`Encontré ${rows.length} registro(s) reales en la BD para tu consulta.`);

  if (chatContext.lastProcessCode && rows.some((row) => row.codigo_olympo === chatContext.lastProcessCode)) {
    responseLines.push(`Contexto conversacional reutilizado: proceso ${chatContext.lastProcessCode}.`);
  }

  if (intent.asksDelayed) {
    const delayedCount = rows.filter((row) => row.fecha_real == null && row.fecha_planificada).length;
    if (delayedCount > 0) {
      responseLines.push(`Procesos con retraso detectado en los resultados: ${formatScalar(delayedCount)}.`);
    }
  }

  if (intent.asksBudget) {
    const totalBudget = rows.reduce((acc, row) => acc + Number(row.presupuesto_2026_inicial || row.presupuesto_total || 0), 0);
    if (totalBudget > 0) {
      responseLines.push(`Presupuesto acumulado visible en los resultados: ${formatCurrency(totalBudget)}.`);
    }
  }

  if (intent.wantsCount && !intent.wantsList && rows.length > 1) {
    responseLines.push(`Total contabilizado: ${formatScalar(rows.length)}.`);
  }

  responseLines.push('Detalle:');
  for (const [index, row] of rows.slice(0, 10).entries()) {
    responseLines.push(formatRowForAnswer(row, index));
  }

  if (rows.length > 10) {
    responseLines.push(`Se muestran 10 de ${rows.length} registros para mantener la respuesta legible.`);
  }

  return responseLines.join('\n');

  if (!Array.isArray(rows) || rows.length === 0) {
    lines.push('No encontré registros en la base de datos para esa consulta.');
    return 'No encontré registros en la base de datos para esa consulta con los filtros aplicados.';
  }

  if (rows.length === 1) {
    const [row] = rows;
    const keys = Object.keys(row);
    const hasAggregateOnly = keys.every((key) => ['total', 'presupuesto_total', 'cantidad', 'monto_total'].includes(key));
    if (hasAggregateOnly) {
      const parts = [];
      if (row.total !== undefined) parts.push(`total: ${formatScalar(row.total)}`);
      if (row.cantidad !== undefined) parts.push(`cantidad: ${formatScalar(row.cantidad)}`);
      if (row.presupuesto_total !== undefined) parts.push(`presupuesto total: ${formatCurrency(row.presupuesto_total)}`);
      if (row.monto_total !== undefined) parts.push(`monto total: ${formatCurrency(row.monto_total)}`);
      return `Resultado real de la BD: ${parts.join(' | ')}.`;
    }

    if (keys.length === 1 && typeof row[keys[0]] === 'number') {
      return `Resultado real de la BD: ${keys[0]} = ${formatScalar(row[keys[0]])}.`;
    }
  }

  const lines = [];
  lines.push(`Encontré ${rows.length} registro(s) reales en la BD para tu consulta.`);

  if (intent.asksDelayed) {
    const delayedCount = rows.filter((row) => row.fecha_real == null && row.fecha_planificada).length;
    if (delayedCount > 0) {
      lines.push(`Procesos con retraso detectado en los resultados: ${formatScalar(delayedCount)}.`);
    }
  }

  if (intent.asksBudget) {
    const totalBudget = rows.reduce((acc, row) => acc + Number(row.presupuesto_2026_inicial || row.presupuesto_total || 0), 0);
    if (totalBudget > 0) {
      lines.push(`Presupuesto acumulado visible en los resultados: ${formatCurrency(totalBudget)}.`);
    }
  }

  if (intent.wantsCount && !intent.wantsList && rows.length > 1) {
    lines.push(`Total contabilizado: ${formatScalar(rows.length)}.`);
  }

  lines.push('Detalle:');
  for (const [index, row] of rows.slice(0, 10).entries()) {
    lines.push(formatRowForAnswer(row, index));
  }

  if (rows.length > 10) {
    lines.push(`Se muestran 10 de ${rows.length} registros para mantener la respuesta legible.`);
  }

  return lines.join('\n');
}

// ── Helpers de configuración ──────────────────────────────────────────────────

function providerNeedsApiKey() {
  return IA_CHAT_PROVIDER === 'openai';
}

function providerIsConfigured() {
  if (!IA_CHAT_ENABLED) return false;
  if (IA_CHAT_PROVIDER === 'openai') return Boolean(IA_CHAT_API_KEY);
  if (IA_CHAT_PROVIDER === 'ollama') return true;
  return false;
}

// ── Llamada genérica al proveedor IA ─────────────────────────────────────────

async function callAI(messages, {
  temperature = 0.1,
  timeoutMs   = IA_CHAT_REQUEST_TIMEOUT_MS,
  numPredict  = 600,
  jsonMode    = false
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (IA_CHAT_PROVIDER === 'openai') {
      const response = await fetch(`${IA_CHAT_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${IA_CHAT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: IA_CHAT_MODEL, temperature, messages }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error?.message || payload?.message || 'Fallo OpenAI'));
      const content = String(payload?.choices?.[0]?.message?.content || '').trim();
      if (!content) throw new Error('OpenAI no devolvió contenido');
      return { content, model: String(payload?.model || IA_CHAT_MODEL) };
    }

    if (IA_CHAT_PROVIDER === 'ollama') {
      const body = {
        model:   IA_CHAT_MODEL || 'llama3.2:3b',
        messages,
        stream:  false,
        options: {
          temperature,
          num_predict: numPredict,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.05,
          seed: Number.isFinite(IA_CHAT_OLLAMA_SEED) ? IA_CHAT_OLLAMA_SEED : 23
        }
      };
      if (jsonMode) body.format = 'json';

      const response = await fetch(`${IA_CHAT_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Ollama: ${String(payload?.error || payload?.message || 'sin detalle')}`);
      const content = String(payload?.message?.content || '').trim();
      if (!content) throw new Error('Ollama no devolvió contenido');
      return { content, model: String(payload?.model || IA_CHAT_MODEL || 'llama3.2:3b') };
    }

    throw new Error(`Proveedor IA no soportado: ${IA_CHAT_PROVIDER}`);
  } finally {
    clearTimeout(timeout);
  }
}

// ── Validación de seguridad SQL ───────────────────────────────────────────────

function validateSQL(sql) {
  const normalized = String(sql || '').trim();
  if (!normalized.toUpperCase().startsWith('SELECT')) {
    return { valid: false, reason: 'Solo se permiten consultas SELECT' };
  }
  if (/;\s*\S/.test(normalized)) {
    return { valid: false, reason: 'Múltiples statements no permitidos' };
  }
  const upper = normalized.toUpperCase();
  for (const kw of SQL_BLOCKED_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(upper)) {
      return { valid: false, reason: `Operación ${kw} bloqueada` };
    }
  }
  return { valid: true };
}

// Valida que el SQL solo use columnas del schema permitido
function validateColumns(sql) {
  const aliasColPattern = /\b([a-z][a-z0-9]*)\.([a-z_]+)\b/gi;
  const invalid = [];
  let m;
  while ((m = aliasColPattern.exec(sql)) !== null) {
    const col = `${m[1].toLowerCase()}.${m[2].toLowerCase()}`;
    if (!ALLOWED_ALIAS_COLUMNS.has(col)) {
      invalid.push(col);
    }
  }
  if (invalid.length > 0) {
    throw new Error(`Columnas inválidas detectadas: ${invalid.join(', ')}`);
  }
}

function validateTables(sql) {
  const tablePattern = /\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)\b/gi;
  const invalid = [];
  let match;

  while ((match = tablePattern.exec(sql)) !== null) {
    const tableName = String(match[1] || '').toLowerCase();
    if (!ALLOWED_TABLES.has(tableName)) {
      invalid.push(tableName);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Tablas inválidas detectadas: ${invalid.join(', ')}`);
  }
}

function validateParams(sql, params) {
  const expected = (String(sql).match(/\?/g) || []).length;
  const received = Array.isArray(params) ? params.length : 0;
  if (expected !== received) {
    throw new Error(`Número de parámetros inválido. Esperados: ${expected}, recibidos: ${received}`);
  }
}

// Para rol 'direccion' el SQL DEBE filtrar por su dirección
function enforceScopeOnSQL(sql, req, direccionFiltro = null) {
  const role = String(req.user?.role || '').toLowerCase();
  const lower = sql.toLowerCase();
  const effectiveDirection = getEffectiveDirection(req, direccionFiltro);

  if (effectiveDirection) {
    const hasDirectionJoin = lower.includes('direcciones_catalogo');
    const hasDirectionFilter = lower.includes('d.nombre') || lower.includes('dc.nombre');
    if (!hasDirectionJoin || !hasDirectionFilter) {
      return { valid: false, reason: `Filtro de dirección no aplicado para "${effectiveDirection}"` };
    }
    return { valid: true };
  }

  if (role !== 'direccion') return { valid: true };

  const hasDireccionEncargada = lower.includes('direccion_encargada');
  const hasDireccionesCatalogo = lower.includes('direcciones_catalogo') && (lower.includes('d.nombre') || lower.includes('dc.nombre'));
  if (!hasDireccionEncargada && !hasDireccionesCatalogo) {
    return { valid: false, reason: `Scope de dirección no aplicado (requerido para rol '${role}')` };
  }
  return { valid: true };
}

// ── Fallback SQL determinístico (cuando el SQL generado falla) ────────────────

function buildFallbackSQL(message, req, direccionFiltro = null, history = []) {
  const intent = detectQuestionIntent(message);
  const normalizedMessage = normalizeText(message);
  const chatContext = extractChatContext(history);
  const dirEfectiva = getEffectiveDirection(req, direccionFiltro);

  let sqlParts = [
    'SELECT COUNT(*) as total, SUM(s.presupuesto_2026_inicial) as presupuesto_total',
    'FROM subtareas s',
    'JOIN responsables_catalogo r ON s.responsable_id = r.id',
    'JOIN direcciones_catalogo d ON r.direccion_id = d.id'
  ];

  const params = [];
  const conditions = [];

  if (
    chatContext.lastProcessCode
    && (normalizedMessage.includes('ese proceso')
      || normalizedMessage.includes('ese registro')
      || normalizedMessage.includes('valor')
      || normalizedMessage.includes('presupuesto'))
  ) {
    sqlParts[0] = [
      'SELECT s.codigo_olympo, s.nombre, d.nombre AS direccion,',
      'r.nombre AS responsable, s.presupuesto_2026_inicial'
    ].join(' ');
    conditions.push('s.codigo_olympo = ?');
    params.push(chatContext.lastProcessCode);
  }

  if (intent.asksDelayed) {
    sqlParts.push('JOIN seguimiento_etapas se ON s.id = se.subtarea_id');
    sqlParts[0] = [
      'SELECT s.codigo_olympo, s.nombre, d.nombre AS direccion,',
      'se.estado, se.fecha_planificada, se.fecha_real'
    ].join(' ');
    conditions.push('se.fecha_real IS NULL');
    conditions.push('se.fecha_planificada < CURDATE()');
  } else if (intent.wantsList || (!intent.wantsCount && !intent.asksBudget)) {
    sqlParts[0] = [
      'SELECT s.codigo_olympo, s.nombre, d.nombre AS direccion,',
      'r.nombre AS responsable, s.presupuesto_2026_inicial'
    ].join(' ');
  }

  if (dirEfectiva) {
    conditions.push('d.nombre = ?');
    params.push(dirEfectiva);
  }

  if (conditions.length > 0) {
    sqlParts.push(`WHERE ${conditions.join(' AND ')}`);
  }

  return { sql: sqlParts.join(' '), params };
}

// ── Paso 1: IA genera SQL desde la pregunta ───────────────────────────────────

function buildSQLSystemPrompt(req, direccionFiltro = null) {
  const role      = String(req.user?.role || 'sin-rol');
  const hoy       = new Date().toISOString().split('T')[0];

  // Dirección efectiva: rol 'direccion' siempre usa la suya (seguridad); otros usan el filtro UI
  const dirEfectiva = getEffectiveDirection(req, direccionFiltro);

  const scopeRule = dirEfectiva
    ? `FILTRO OBLIGATORIO: incluye siempre JOIN responsables_catalogo r ON s.responsable_id=r.id JOIN direcciones_catalogo d ON r.direccion_id=d.id WHERE d.nombre=? y añade "${dirEfectiva}" en params.`
    : 'Incluye siempre JOIN responsables_catalogo r ON s.responsable_id=r.id JOIN direcciones_catalogo d ON r.direccion_id=d.id';

  return [
    `Fecha: ${hoy}. Eres un generador SQL MySQL. Solo SELECT. LIMIT 50.`,
    'REGLAS: NO inventes columnas. Solo usa las del esquema. Responde SOLO JSON sin markdown.',
    '',
    'ESQUEMA:',
    DB_SCHEMA_COMPACT,
    '',
    scopeRule,
    '',
    'REGLAS CRÍTICAS:',
    '- Para unir procesos con etapas: usa subtareas_etapas (st) o seguimiento_etapas (se). NUNCA s.etapa_id.',
    '- Proceso retrasado: se.fecha_real IS NULL AND se.fecha_planificada < CURDATE()',
    '- Si no entiendes la pregunta: needs_clarification=true',
    '',
    'EJEMPLO (procesos retrasados de una dirección):',
    `{"sql":"SELECT s.codigo_olympo, s.nombre, se.fecha_planificada FROM subtareas s JOIN responsables_catalogo r ON s.responsable_id=r.id JOIN direcciones_catalogo d ON r.direccion_id=d.id JOIN seguimiento_etapas se ON s.id=se.subtarea_id WHERE d.nombre=? AND se.fecha_real IS NULL AND se.fecha_planificada < CURDATE() LIMIT 50","params":["${dirEfectiva || 'NombreDireccion'}"],"needs_clarification":false,"clarification_question":null}`,
    '',
    'Responde SOLO con JSON:',
    '{"sql":"SELECT...","params":[],"needs_clarification":false,"clarification_question":null}'
  ].filter(Boolean).join('\n');
}

function extractSQLResult(content) {
  // Paso previo: eliminar bloques markdown y extraer primer objeto JSON entre llaves
  const stripped = content.replace(/```json|```/gi, '').trim();
  const braceMatch = stripped.match(/\{[\s\S]*\}/);
  const cleaned = braceMatch ? braceMatch[0] : stripped;

  // Intento 1: JSON completo entre llaves
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.sql) {
      return {
        sql:                    String(parsed.sql).trim(),
        params:                 Array.isArray(parsed.params) ? parsed.params : [],
        needs_clarification:    Boolean(parsed.needs_clarification),
        clarification_question: parsed.clarification_question ? String(parsed.clarification_question) : null
      };
    }
  } catch { /* continuar con fallbacks */ }

  // Intento 2: extraer campo "sql" por regex (JSON truncado)
  const sqlMatch = cleaned.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (sqlMatch) {
    const sql = sqlMatch[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
    const clarMatch   = cleaned.match(/"needs_clarification"\s*:\s*(true|false)/);
    const questMatch  = cleaned.match(/"clarification_question"\s*:\s*"([^"]*)"/);
    const paramsMatch = cleaned.match(/"params"\s*:\s*(\[[^\]]*\])/);
    let params = [];
    if (paramsMatch) { try { params = JSON.parse(paramsMatch[1]); } catch { params = []; } }
    return {
      sql,
      params,
      needs_clarification:    clarMatch?.[1] === 'true',
      clarification_question: questMatch?.[1] || null
    };
  }

  // Intento 3: encontrar un SELECT directamente en el texto
  const selectMatch = stripped.match(/SELECT\s[\s\S]+?(?=\n\n|$)/i);
  if (selectMatch) {
    return {
      sql: selectMatch[0].replace(/\n/g, ' ').trim(),
      params: [],
      needs_clarification: false,
      clarification_question: null
    };
  }

  return null;
}

async function generateSQLFromQuestion(message, req, direccionFiltro = null, history = []) {
  console.log('🔧 [chatIA] Paso 1 — generando SQL...');
  console.time('⏱️ [chatIA] sql-generation');

  const { content } = await callAI(
    [
      { role: 'system', content: buildSQLSystemPrompt(req, direccionFiltro) },
      ...history,
      { role: 'user',   content: String(message).slice(0, IA_CHAT_MAX_INPUT_CHARS) }
    ],
    {
      temperature: 0.1,
      numPredict:  400,
      jsonMode:    true
    }
  );

  console.timeEnd('⏱️ [chatIA] sql-generation');
  console.log('🔧 [chatIA] Respuesta raw SQL:', content.slice(0, 400));

  const result = extractSQLResult(content);
  if (!result || !result.sql) {
    throw new Error(`No se pudo extraer SQL del contenido: ${content.slice(0, 300)}`);
  }

  console.log('SQL generado:', result.sql);
  return result;
}

// ── Paso 2: Ejecutar SQL en BD ────────────────────────────────────────────────

async function executeQuerySafe(sql, params, req, direccionFiltro = null) {
  const sqlCheck = validateSQL(sql);
  if (!sqlCheck.valid) throw new Error(`SQL inválido: ${sqlCheck.reason}`);

  const scopeCheck = enforceScopeOnSQL(sql, req, direccionFiltro);
  if (!scopeCheck.valid) throw new Error(`Scope incumplido: ${scopeCheck.reason}`);

  validateTables(sql);
  validateColumns(sql);
  validateParams(sql, params);
  console.log('SQL validado OK');

  let safeSql = sql.trimEnd().replace(/;+$/, '');
  if (!/\bLIMIT\b/i.test(safeSql)) {
    safeSql = `${safeSql} LIMIT ${IA_SQL_MAX_ROWS}`;
  }

  console.log('🗄️  [chatIA] SQL a ejecutar:', safeSql);
  console.log('🗄️  [chatIA] Parámetros SQL:', JSON.stringify(params));
  console.time('⏱️ [chatIA] sql-execution');
  console.log('Ejecutando query...');

  const rows = await query(safeSql, params);

  console.timeEnd('⏱️ [chatIA] sql-execution');

  const result = Array.isArray(rows) ? rows : [];
  console.log('🗄️  [chatIA] Registros devueltos:', result.length);

  return {
    rows: result.slice(0, IA_SQL_MAX_ROWS),
    sql: safeSql,
    params: Array.isArray(params) ? params : []
  };
}

// ── Paso 2b: Fallback cuando el SQL falla por columna inválida ────────────────

async function executeWithFallback(sql, params, message, req, direccionFiltro = null, history = []) {
  try {
    return await executeQuerySafe(sql, params, req, direccionFiltro);
  } catch (err) {
    const detail = String(err?.message || '');
    const lowerDetail = detail.toLowerCase();
    const canFallback = lowerDetail.includes('unknown column')
      || lowerDetail.includes('columnas inválidas')
      || lowerDetail.includes('tablas inválidas')
      || lowerDetail.includes('sql inválido')
      || lowerDetail.includes('parse')
      || lowerDetail.includes('syntax')
      || lowerDetail.includes('número de parámetros inválido');

    if (!canFallback && !lowerDetail.includes('scope incumplido') && !lowerDetail.includes('filtro de direcci')) throw err;

    console.error('ERROR SQL:', detail);
    console.log('🔄 [chatIA] Aplicando fallback SQL determinístico...');

    const { sql: fallbackSql, params: fallbackParams } = buildFallbackSQL(message, req, direccionFiltro, history);
    console.log('🗄️  [chatIA] Fallback SQL:', fallbackSql);

    const sqlCheck = validateSQL(fallbackSql);
    if (!sqlCheck.valid) throw new Error(`Fallback SQL inválido: ${sqlCheck.reason}`);

    let safeFallback = fallbackSql.trimEnd().replace(/;+$/, '');
    if (!/\bLIMIT\b/i.test(safeFallback)) {
      safeFallback = `${safeFallback} LIMIT ${IA_SQL_MAX_ROWS}`;
    }

    const rows = await query(safeFallback, fallbackParams);
    const result = Array.isArray(rows) ? rows : [];
    console.log('🗄️  [chatIA] Fallback — registros devueltos:', result.length);
    return {
      rows: result.slice(0, IA_SQL_MAX_ROWS),
      sql: safeFallback,
      params: fallbackParams
    };
  }
}

// ── Paso 3: IA genera respuesta analítica ─────────────────────────────────────

function buildAnalystSystemPrompt(req) {
  const role      = String(req.user?.role || 'sin-rol');
  const direccion = String(req.user?.direccionNombre || 'sin-direccion');
  const hoy       = new Date().toLocaleString('es-EC');

  return [
    'Eres un analista experto en procesos administrativos POA/PAC.',
    `Fecha: ${hoy} | Sesión: rol=${role}, dirección=${direccion}.`,
    '',
    'REGLAS:',
    '- Usa SOLO los datos de "RESULTADOS DE CONSULTA".',
    '- Prohibido inventar datos o usar conocimiento externo.',
    '- Si no hay registros → indicarlo claramente sin inventar.',
    '- No dar respuestas genéricas.',
    '',
    'FORMATO (máximo 4 hallazgos):',
    '**Hallazgo:** <qué está pasando exactamente>',
    '**Evidencia:** <dato concreto de los resultados>',
    '**Recomendación:** <acción específica y accionable>',
    '',
    'Sé breve, técnico y directo. Modo solo lectura.'
  ].join('\n');
}

async function generateFinalAnswer(message, rows, req, history = [], direccionFiltro = null) {
  if (IA_CHAT_FORCE_GROUNDED_ANSWER) {
    const content = buildGroundedAnswer(message, rows, req, direccionFiltro, history);
    return { content, model: `${IA_CHAT_PROVIDER}:grounded` };
  }

  console.log(`🤖 [chatIA] Paso 3 — generando respuesta analítica con ${rows.length} registros...`);
  console.time('⏱️ [chatIA] final-answer');

  const dataStr = rows.length > 0
    ? JSON.stringify(rows, null, 2)
    : '(La consulta no devolvió registros para el período y filtros indicados)';

  const userContent = [
    `Pregunta: "${message}"`,
    '',
    'RESULTADOS DE CONSULTA:',
    dataStr
  ].join('\n');

  const { content, model } = await callAI(
    [
      { role: 'system', content: buildAnalystSystemPrompt(req) },
      ...history,
      { role: 'user',   content: userContent }
    ],
    {
      temperature: Number.isFinite(IA_CHAT_TEMPERATURE) ? IA_CHAT_TEMPERATURE : 0.2,
      timeoutMs:   IA_CHAT_REQUEST_TIMEOUT_MS,
      numPredict:  800,
      jsonMode:    false
    }
  );

  console.timeEnd('⏱️ [chatIA] final-answer');
  console.log('✅ [chatIA] Respuesta generada | chars:', content.length, '| modelo:', model);

  return { content, model };
}

// ── Rutas ─────────────────────────────────────────────────────────────────────

router.get('/direcciones', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT id, nombre FROM direcciones_catalogo WHERE activo = 1 ORDER BY nombre ASC',
      []
    );
    return res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('❌ [chatIA] /direcciones error:', err.message);
    return res.status(500).json({ error: 'No se pudo cargar el catálogo de direcciones' });
  }
});

router.get('/config', (_req, res) => {
  const configured = providerIsConfigured();
  res.json({
    enabled:        IA_CHAT_ENABLED,
    provider:       IA_CHAT_PROVIDER,
    model:          IA_CHAT_MODEL,
    maxInputChars:  IA_CHAT_MAX_INPUT_CHARS,
    maxHistory:     IA_CHAT_MAX_HISTORY,
    grounded:       IA_CHAT_FORCE_GROUNDED_ANSWER,
    configured,
    fallbackActive: IA_CHAT_ENABLED && !configured
  });
});

router.get('/test-connection', async (_req, res) => {
  if (IA_CHAT_PROVIDER !== 'ollama') {
    return res.json({ ok: false, reason: `Proveedor actual: ${IA_CHAT_PROVIDER} (no Ollama)` });
  }
  const url = `${IA_CHAT_BASE_URL}/api/chat`;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: IA_CHAT_MODEL,
        messages: [{ role: 'user', content: 'Responde solo la palabra: CONECTADO' }],
        stream: false,
        options: { temperature: 0.1 }
      }),
      signal: controller.signal
    });
    clearTimeout(t);
    const payload = await response.json().catch(() => ({}));
    const content = String(payload?.message?.content || '').trim();
    return res.json({
      ok:       response.ok && Boolean(content),
      url,
      model:    IA_CHAT_MODEL,
      status:   response.status,
      response: content || null,
      rawError: response.ok ? null : (payload?.error || payload?.message || null)
    });
  } catch (err) {
    return res.json({ ok: false, url, model: IA_CHAT_MODEL, error: err.message });
  }
});

router.post('/message', async (req, res) => {
  console.time('⏱️ [chatIA] total-request');
  console.log('📥 [chatIA] Request | usuario:', req.user?.username || 'sin-usuario', '| rol:', req.user?.role || 'sin-rol');

  try {
    if (!IA_CHAT_ENABLED) {
      safeTimeEnd('â±ï¸ [chatIA] total-request');
      return res.status(503).json({ error: 'El chat IA está deshabilitado por configuración' });
    }

    const message = sanitizeUserInput(req.body?.message);
    console.log('📝 [chatIA] Mensaje:', `"${message.slice(0, 120)}${message.length > 120 ? '...' : ''}"`, '| chars:', message.length);

    if (!message) {
      safeTimeEnd('â±ï¸ [chatIA] total-request');
      return res.status(400).json({ error: 'Debe enviar un mensaje no vacío' });
    }

    if (!isDomainQuestion(message) && !isFollowUpQuestion(message, normalizeHistory(req.body?.history))) {
      safeTimeEnd('â±ï¸ [chatIA] total-request');
      console.log('🚫 [chatIA] Fuera de dominio — rechazado');
      return res.status(400).json({
        error: 'Consulta fuera de alcance. Solo respondo sobre procesos POA/PAC, etapas, direcciones, responsables y presupuestos.'
      });
    }

    if (asksSensitiveData(message)) {
      safeTimeEnd('â±ï¸ [chatIA] total-request');
      console.log('🚫 [chatIA] Datos sensibles — rechazado');
      return res.status(400).json({
        error: 'Consulta restringida. El chat no accede a usuarios, contraseñas, tokens ni auditoría.'
      });
    }

    if (providerNeedsApiKey() && !IA_CHAT_API_KEY) {
      safeTimeEnd('â±ï¸ [chatIA] total-request');
      return res.status(503).json({ error: 'IA_CHAT_API_KEY no configurada para el proveedor OpenAI' });
    }

    const history = normalizeHistory(req.body?.history);
    const direccionFiltro = req.body?.direccionFiltro
      ? String(req.body.direccionFiltro).trim().slice(0, 200)
      : null;
    if (direccionFiltro) {
      console.log('🔍 [chatIA] Filtro de dirección:', direccionFiltro);
    }

    // Paso 1: SQL determinístico para preguntas simples; IA para consultas más abiertas
    const sqlPlan = shouldUseDeterministicSQL(message, history)
      ? { ...buildFallbackSQL(message, req, direccionFiltro, history), needs_clarification: false, clarification_question: null }
      : await generateSQLFromQuestion(message, req, direccionFiltro, history);

    const { sql, params, needs_clarification, clarification_question } = sqlPlan;
    console.log('🔧 [chatIA] SQL recibido:', sql.slice(0, 200), '| params:', JSON.stringify(params));

    if (needs_clarification) {
      console.log('❓ [chatIA] Aclaración requerida:', clarification_question);
      console.timeEnd('⏱️ [chatIA] total-request');
      return res.json({
        response:           clarification_question || 'Necesito más información. ¿Podrías especificar la dirección o el proceso?',
        provider:           IA_CHAT_PROVIDER,
        model:              IA_CHAT_MODEL,
        needsClarification: true,
        registros_usados:   0,
        intent:             null
      });
    }

    if (!sql) {
      throw new Error('La IA no generó un SQL válido para esta consulta');
    }

    // Paso 2: Ejecutar SQL (con fallback automático si falla por columna)
    const execution = await executeWithFallback(sql, params, message, req, direccionFiltro, history);
    const rows = execution.rows;

    // Paso 3: IA genera respuesta analítica
    const { content, model } = await generateFinalAnswer(message, rows, req, history, direccionFiltro);

    console.timeEnd('⏱️ [chatIA] total-request');

    const intentFlags = detectQuestionIntent(message);

    return res.json({
      response:         content,
      provider:         IA_CHAT_PROVIDER,
      model,
      registros_usados: rows.length,
      intent:           buildIntentLabel(intentFlags),
      intentFlags,
      grounded:         IA_CHAT_FORCE_GROUNDED_ANSWER,
      sqlEjecutado:     execution.sql,
      sqlParams:        execution.params
    });
  } catch (error) {
    console.timeEnd('⏱️ [chatIA] total-request');
    const detail = String(error?.message || error || 'Error desconocido');
    console.error('❌ [chatIA ERROR] POST /api/chat-ia/message:', detail);
    console.error('❌ [chatIA ERROR] Stack:', error?.stack || 'sin stack');

    if (error?.name === 'AbortError' || detail.toLowerCase().includes('abort')) {
      console.error(`❌ [chatIA ERROR] Timeout en ${IA_CHAT_PROVIDER} — límite: ${IA_CHAT_REQUEST_TIMEOUT_MS}ms`);
      return res.status(504).json({ error: `Timeout al consultar ${IA_CHAT_PROVIDER}. Intente de nuevo.` });
    }

    return res.status(502).json({
      error:    `No se pudo procesar la consulta: ${detail}`,
      provider: IA_CHAT_PROVIDER,
      model:    IA_CHAT_MODEL,
      hint:     IA_CHAT_PROVIDER === 'ollama'
        ? 'Verifica que Ollama está corriendo: curl http://localhost:11434/api/tags'
        : 'Verifica tu API key y límites de la cuenta'
    });
  }
});

export default router;
