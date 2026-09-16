import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error) {
  throw new Error('No se pudo cargar el archivo .env en ' + ENV_PATH);
}

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import iconv from 'iconv-lite';

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error('Faltan variables de entorno para la conexión MySQL. Verifica DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.');
}
const ALLOW_MANUAL_COMPLETION_DATE = String(process.env.ALLOW_MANUAL_COMPLETION_DATE ?? 'true').toLowerCase() === 'true';
const SIN_DIRECCION_NOMBRE = process.env.UNASSIGNED_DIRECCION_NAME || 'Sin dirección';
const DEFAULT_UNASSIGNED_USERNAME = normalizeUsername(process.env.DEFAULT_UNASSIGNED_USER || 'sin_direccion');
const DEFAULT_UNASSIGNED_PASSWORD = process.env.DEFAULT_UNASSIGNED_PASSWORD || '12345';
const CORE_ROLES = ['admin', 'direccion', 'reporteria'];

const CAMPOS_ETAPAS_CATALOGO = [
  { clave: 'fecha_reforma', nombre: 'Fecha reforma', orden: 1 },
  { clave: 'fecha_reforma_3', nombre: 'Fecha reforma 3', orden: 2 },
  { clave: 'fecha_completo', nombre: 'Fecha de completo', orden: 3 },
  { clave: 'estado_etapa', nombre: 'Estado', orden: 4 }
];

let pool;
let subtareasColumnsCache = null;

const DIRECCIONES_ID_NOMBRE = {
  1: 'Dirección de Asesoría Jurídica',
  2: 'DPEI / Jefatura de TICS',
  3: 'DAF / Jefatura Administrativa',
  4: 'DAF / Jefatura de Talento Humano',
  5: 'Dirección de Comercialización'
};

const DEFAULT_PERMISSION_MODULES = [
  { clave: 'dashboard', nombre: 'Dashboard', descripcion: 'Acceso a indicadores generales', orden: 10 },
  { clave: 'actividades', nombre: 'Procesos / Actividades', descripcion: 'Gestión y consulta de procesos', orden: 20 },
  { clave: 'reportes', nombre: 'Reportes', descripcion: 'Consulta y exportación de reportes', orden: 30 },
  { clave: 'versiones', nombre: 'Versiones', descripcion: 'Gestión de reformas y versiones POA', orden: 40 },
  { clave: 'admin_usuarios', nombre: 'Admin Usuarios', descripcion: 'Administración de usuarios del sistema', orden: 50 },
  { clave: 'admin_catalogos', nombre: 'Admin Catálogos', descripcion: 'Administración de catálogos maestros', orden: 60 },
  { clave: 'admin_permisos', nombre: 'Admin Permisos', descripcion: 'Administración de permisos y menús', orden: 70 },
  { clave: 'admin_auditoria', nombre: 'Admin Auditoría', descripcion: 'Consulta de trazabilidad y bitácora de cambios', orden: 75 },
  { clave: 'notificaciones', nombre: 'Notificaciones', descripcion: 'Consulta y gestión de notificaciones', orden: 80 },
  { clave: 'chat_ia', nombre: 'Chat IA', descripcion: 'Asistente conversacional para apoyo operativo', orden: 85 },
  { clave: 'estados', nombre: 'Estados', descripcion: 'Consulta de estados de seguimiento', orden: 90 },
  { clave: 'admin_actividades', nombre: 'Admin Procesos', descripcion: 'Configuración administrativa de procesos', orden: 100 },
  { clave: 'admin_versiones', nombre: 'Admin Versiones', descripcion: 'Operaciones administrativas de versiones', orden: 110 }
];

const DEFAULT_PERMISSION_MENU = [
  { clave: 'dashboard', nombre: 'Dashboard', ruta: '/', orden: 10 },
  { clave: 'actividades', nombre: 'Procesos', ruta: '/actividades', orden: 20 },
  { clave: 'reportes', nombre: 'Reportes', ruta: '/reportes', orden: 30 },
  { clave: 'informes', nombre: 'Informes Gerenciales', ruta: '/informes', orden: 31 },
  { clave: 'notificaciones', nombre: 'Notificaciones', ruta: '/notificaciones', orden: 35 },
  { clave: 'chat_ia', nombre: 'Chat IA', ruta: '/chat-ia', orden: 36 },
  { clave: 'admin_actividades', nombre: 'Admin Procesos', ruta: '/admin/actividades', orden: 40 },
  { clave: 'admin_versiones', nombre: 'Admin Versiones', ruta: '/admin/versiones', orden: 50 },
  { clave: 'admin_usuarios', nombre: 'Admin Usuarios', ruta: '/admin/usuarios', orden: 60 },
  { clave: 'admin_catalogos', nombre: 'Admin Catálogos', ruta: '/admin/catalogos', orden: 70 },
  { clave: 'admin_permisos', nombre: 'Admin Permisos', ruta: '/admin/permisos', orden: 80 },
  { clave: 'admin_auditoria', nombre: 'Admin Auditoría', ruta: '/admin/auditoria', orden: 90 }
];

const MENU_TO_MODULE_PERMISSION = {
  dashboard: 'dashboard',
  actividades: 'actividades',
  reportes: 'reportes',
  informes: 'reportes',
  notificaciones: 'notificaciones',
  chat_ia: 'chat_ia',
  admin_actividades: 'admin_actividades',
  admin_versiones: 'admin_versiones',
  admin_usuarios: 'admin_usuarios',
  admin_catalogos: 'admin_catalogos',
  admin_permisos: 'admin_permisos',
  admin_auditoria: 'admin_auditoria'
};

const ROLE_PERMISSION_DEFAULTS = {
  admin: {
    modules: DEFAULT_PERMISSION_MODULES.reduce((acc, item) => {
      acc[item.clave] = { read: true, create: true, update: true, delete: true };
      return acc;
    }, {}),
    menu: DEFAULT_PERMISSION_MENU.reduce((acc, item) => {
      acc[item.clave] = true;
      return acc;
    }, {})
  },
  direccion: {
    modules: {
      dashboard: { read: true, create: false, update: false, delete: false },
      actividades: { read: true, create: false, update: true, delete: false },
      reportes: { read: true, create: false, update: false, delete: false },
      versiones: { read: true, create: false, update: false, delete: false },
      admin_usuarios: { read: false, create: false, update: false, delete: false },
      admin_catalogos: { read: false, create: false, update: false, delete: false },
      admin_permisos: { read: false, create: false, update: false, delete: false },
      admin_auditoria: { read: false, create: false, update: false, delete: false },
      notificaciones: { read: true, create: false, update: true, delete: false },
      chat_ia: { read: true, create: true, update: false, delete: false },
      estados: { read: true, create: false, update: false, delete: false },
      admin_actividades: { read: false, create: false, update: false, delete: false },
      admin_versiones: { read: false, create: false, update: false, delete: false }
    },
    menu: {
      dashboard: true,
      actividades: true,
      reportes: true,
      notificaciones: true,
      chat_ia: true,
      admin_actividades: false,
      admin_versiones: false,
      admin_usuarios: false,
      admin_catalogos: false,
      admin_permisos: false,
      admin_auditoria: false
    }
  },
  reporteria: {
    modules: {
      dashboard: { read: true, create: false, update: false, delete: false },
      actividades: { read: true, create: false, update: false, delete: false },
      reportes: { read: true, create: false, update: false, delete: false },
      versiones: { read: true, create: false, update: false, delete: false },
      admin_usuarios: { read: false, create: false, update: false, delete: false },
      admin_catalogos: { read: false, create: false, update: false, delete: false },
      admin_permisos: { read: false, create: false, update: false, delete: false },
      admin_auditoria: { read: false, create: false, update: false, delete: false },
      notificaciones: { read: true, create: false, update: true, delete: false },
      chat_ia: { read: true, create: true, update: false, delete: false },
      estados: { read: true, create: false, update: false, delete: false },
      admin_actividades: { read: false, create: false, update: false, delete: false },
      admin_versiones: { read: false, create: false, update: false, delete: false }
    },
    menu: {
      dashboard: true,
      actividades: true,
      reportes: true,
      notificaciones: true,
      chat_ia: true,
      admin_actividades: false,
      admin_versiones: false,
      admin_usuarios: false,
      admin_catalogos: false,
      admin_permisos: false,
      admin_auditoria: false
    }
  }
};

const MOJIBAKE_PATTERN = /[Ã├┤│┬┐└┘╔╗╚╝╠╣╦╩╬▒░▓ÔÇ]/;

function countMojibake(value = '') {
  return (String(value).match(/[Ã├┤│┬┐└┘╔╗╚╝╠╣╦╩╬▒░▓ÔÇ]/g) || []).length;
}

function noiseScore(value = '') {
  const text = String(value || '');
  const mojibake = countMojibake(text);
  // Contar caracteres de reemplazo Unicode (U+FFFD)
  const replacement = (text.match(/[\uFFFD]/g) || []).length;
  return mojibake + (replacement * 3);
}

function decodeMojibake(value = '') {
  const text = String(value || '');
  if (!MOJIBAKE_PATTERN.test(text)) return text;

  try {
    const candidates = [text];
    candidates.push(iconv.encode(text, 'cp850').toString('utf8'));
    candidates.push(iconv.encode(text, 'cp437').toString('utf8'));

    candidates.sort((a, b) => noiseScore(a) - noiseScore(b));
    return candidates[0];
  } catch {
    return text;
  }
}

export function normalizeTextEncoding(value, { trim = false, collapseWhitespace = false } = {}) {
  if (value === null || value === undefined) return value;

  let text = String(value);
  const decoded = decodeMojibake(text);
  if (noiseScore(decoded) < noiseScore(text)) {
    text = decoded;
  }

  const directReplacements = new Map([
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'],
    ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ'],
    ['ÔÇô', '–'], ['ÔÇ£', '“'], ['ÔÇ', '”'], ['ÔÇÖ', '’'], ['ÔÇÿ', ' ']
  ]);

  for (const [bad, good] of directReplacements.entries()) {
    text = text.split(bad).join(good);
  }

  if (trim) text = text.trim();
  if (collapseWhitespace) text = text.replace(/\s+/g, ' ');
  return text;
}

export function normalizePayloadEncoding(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return normalizeTextEncoding(value);
  if (Array.isArray(value)) return value.map((item) => normalizePayloadEncoding(item));
  if (value instanceof Date || Buffer.isBuffer(value)) return value;

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizePayloadEncoding(item)])
    );
  }

  return value;
}

function toCamelRow(row) {
  const map = {
    subtarea_id: 'subtareaId',
    etapa_id: 'etapaId',
    direccion_id: 'direccionId',
    responsable_id: 'responsableId',
    codigo_olympo: 'codigoOlympo',
    codigo_unico_proceso: 'codigoUnicoProceso',
    direccion_encargada: 'direccionEncargada',
    partida_presupuestaria: 'partidaPresupuestaria',
    presupuesto_2026_inicial: 'presupuesto2026Inicial',
    costo_2026: 'costo2026',
    plazo_contrato: 'plazoContrato',
    pac_no_pac: 'pacNoPac',
    procedimiento_sugerido: 'procedimientoSugerido',
    tipo_contratacion: 'tipoContratacion',
    estado_carga: 'estadoCarga',
    fecha_tentativa: 'fechaTentativa',
    fecha_reforma: 'fechaReforma',
    fecha_reforma_3: 'fechaReforma3',
    fecha_planificada: 'fechaPlanificada',
    fecha_real: 'fechaReal',
    fecha_inicio: 'fechaInicio',
    fecha_fin: 'fechaFin',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    proceso_en_riesgo: 'procesoEnRiesgo',
    riesgo_comentario: 'riesgoComentario',
    responsable_nombre: 'responsableNombre',
    etapa_nombre: 'etapaNombre',
    direccion_nombre: 'direccionNombre',
    es_personalizada: 'esPersonalizada',
    tiene_alerta: 'tieneAlerta',
    fecha_leida: 'fechaLeida',
    tarea_id: 'tareaId',
    es_version_actual: 'esVersionActual',
    subtarea_id_original: 'subtareaIdOriginal',
    version_id: 'versionId',
    meta_indicador: 'metaIndicador',
    meta_valor_2026: 'metaValor2026',
    meta_formula_calculo: 'metaFormulaCalculo',
    meta_tipo: 'metaTipo',
    presupuesto_con_reformas: 'presupuestoConReformas',
    presupuesto_original: 'presupuestoOriginal',
    reforma_9: 'reforma9',
    fuente_financiamiento_id: 'fuenteFinanciamientoId',
    actividad_nombre: 'actividadNombre',
    actividad_composicion_gasto: 'actividadComposicionGasto',
    actividad_enfoque_genero: 'actividadEnfoqueGenero',
    actividad_tipo_obra: 'actividadTipoObra',
    actividad_fecha_inicio: 'actividadFechaInicio',
    actividad_fecha_fin: 'actividadFechaFin',
    tarea_nombre: 'tareaNombre',
    tarea_fecha_inicio: 'tareaFechaInicio',
    tarea_fecha_fin: 'tareaFechaFin',
    objetivo_operativo_pmdot: 'objetivoOperativoPmdot',
    meta_pmdot_2033: 'metaPmdot2033',
    valor_meta_pmdot_2025: 'valorMetaPmdot2025',
    numero_reforma: 'numeroReforma',
    version_nombre: 'versionNombre',
    version_id: 'versionId',
    orden_login: 'ordenLogin',
    fecha_inicio_rol: 'fechaInicioRol',
    fecha_fin_rol: 'fechaFinRol',
    total_actividades: 'totalActividades',
    presupuesto_total: 'presupuestoTotal',
    actividades_activas: 'actividadesActivas',
    actividades_inactivas: 'actividadesInactivas'
  };

  const output = {};
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = map[key] || key;
    output[mappedKey] = typeof value === 'string'
      ? normalizeTextEncoding(value)
      : value;
  }
  return output;
}

async function resolverDireccionEncargada(data = {}) {
  const id = Number(data.direccionId);
  if (Number.isInteger(id) && id > 0) {
    const rows = await query('SELECT nombre FROM direcciones_catalogo WHERE id = ? LIMIT 1', [id]);
    if (rows[0]?.nombre) return normalizeTextEncoding(rows[0].nombre, { trim: true, collapseWhitespace: true });
    if (DIRECCIONES_ID_NOMBRE[id]) return DIRECCIONES_ID_NOMBRE[id];
  }

  if (data.direccionEncargada) return normalizeTextEncoding(data.direccionEncargada, { trim: true, collapseWhitespace: true });
  if (data.direccionNombre) return normalizeTextEncoding(data.direccionNombre, { trim: true, collapseWhitespace: true });

  return SIN_DIRECCION_NOMBRE;
}

function obtenerDireccionIdDesdeNombre(nombre = '') {
  const normalized = String(nombre).trim().toLowerCase();
  const found = Object.entries(DIRECCIONES_ID_NOMBRE).find(([, text]) => text.toLowerCase() === normalized);
  return found ? Number(found[0]) : null;
}

async function resolverResponsableNombre(data = {}) {
  if (data.responsable) return normalizeTextEncoding(data.responsable, { trim: true, collapseWhitespace: true });
  if (data.responsableNombre) return normalizeTextEncoding(data.responsableNombre, { trim: true, collapseWhitespace: true });
  const responsableId = Number(data.responsableId);
  if (Number.isInteger(responsableId) && responsableId > 0) {
    const rows = await query('SELECT nombre FROM responsables_catalogo WHERE id = ? LIMIT 1', [responsableId]);
    return rows[0]?.nombre ? normalizeTextEncoding(rows[0].nombre, { trim: true, collapseWhitespace: true }) : null;
  }
  return null;
}

async function resolverResponsable(data = {}) {
  const responsableId = Number(data.responsableId);
  if (Number.isInteger(responsableId) && responsableId > 0) {
    const rows = await query(
      `SELECT id, nombre
       FROM responsables_catalogo
       WHERE id = ?
       LIMIT 1`,
      [responsableId]
    );
    if (!rows[0]) throw new Error('Responsable no existe en catálogo');
    return {
      id: Number(rows[0].id),
      nombre: normalizeTextEncoding(rows[0].nombre || '', { trim: true, collapseWhitespace: true }) || null
    };
  }

  const nombre = await resolverResponsableNombre(data);
  if (!nombre) {
    return { id: null, nombre: null };
  }

  const rows = await query(
    `SELECT id, nombre
     FROM responsables_catalogo
     WHERE TRIM(nombre) = ?
     ORDER BY activo DESC, id ASC
     LIMIT 1`,
    [nombre]
  );

  if (!rows[0]) {
    return { id: null, nombre };
  }

  return {
    id: Number(rows[0].id),
    nombre: normalizeTextEncoding(rows[0].nombre || '', { trim: true, collapseWhitespace: true }) || nombre
  };
}

export function getPool() {
  if (!pool) throw new Error('MySQL no inicializado. Ejecuta initMySQL() antes de usar la base de datos.');
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function getSubtareasColumns() {
  if (subtareasColumnsCache) return subtareasColumnsCache;
  const rows = await query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subtareas'
  `);
  subtareasColumnsCache = new Set(rows.map((row) => row.name));
  return subtareasColumnsCache;
}

async function createSchema() {
  // Las 10 tablas minimalistas ya existen después de la normalización
  // Esta función solo verifica que existan
  await query('SET FOREIGN_KEY_CHECKS = 0');
  // Comentadas: dropeos de vistas antiguas (no existen más)
  // await query('DROP VIEW IF EXISTS v_comparacion_versiones').catch(() => {});
  // await query('DROP VIEW IF EXISTS v_resumen_versiones').catch(() => {});
  // await query('DROP TABLE IF EXISTS cambios_reforma').catch(() => {});
  // await query('DROP TABLE IF EXISTS poa_versiones').catch(() => {});
  await query('SET FOREIGN_KEY_CHECKS = 1');

  // Tabla antigua: subtareas - reemplazada por procesos en la estructura minimalista
  // No se crea en esta versión normalizada

  const cols = await query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subtareas'
  `);
  const allowed = new Set([
    'id', 'direccion_encargada', 'nombre', 'codigo_olympo', 'partida_presupuestaria',
    'presupuesto_2026_inicial', 'costo_2026', 'cuatrimestre', 'plazo_contrato',
    'pac_no_pac', 'procedimiento_sugerido', 'responsable_id', 'responsable', 'activo', 'observaciones',
    'proceso_en_riesgo', 'riesgo_comentario',
    'fecha_inicio', 'fecha_fin',
    'created_at', 'updated_at'
  ]);
  for (const col of cols) {
    if (!allowed.has(col.name)) {
      await query(`ALTER TABLE subtareas DROP COLUMN \`${col.name}\``).catch(() => {});
    }
  }

  const subtareasColsSet = new Set(cols.map((row) => row.name));
  if (!subtareasColsSet.has('responsable_id')) {
    await query('ALTER TABLE subtareas ADD COLUMN responsable_id INT NULL AFTER procedimiento_sugerido').catch(() => {});
  }
  if (!subtareasColsSet.has('fecha_inicio')) {
    await query('ALTER TABLE subtareas ADD COLUMN fecha_inicio DATE NULL AFTER observaciones').catch(() => {});
  }
  if (!subtareasColsSet.has('fecha_fin')) {
    await query('ALTER TABLE subtareas ADD COLUMN fecha_fin DATE NULL AFTER fecha_inicio').catch(() => {});
  }
  if (!subtareasColsSet.has('proceso_en_riesgo')) {
    await query('ALTER TABLE subtareas ADD COLUMN proceso_en_riesgo BOOLEAN NOT NULL DEFAULT false AFTER observaciones').catch(() => {});
  }
  if (!subtareasColsSet.has('riesgo_comentario')) {
    await query('ALTER TABLE subtareas ADD COLUMN riesgo_comentario TEXT NULL AFTER proceso_en_riesgo').catch(() => {});
  }
  if (!subtareasColsSet.has('fecha_reforma_3')) {
    await query('ALTER TABLE subtareas ADD COLUMN fecha_reforma_3 DATE NULL AFTER riesgo_comentario').catch(() => {});
  }
  if (!subtareasColsSet.has('updated_at')) {
    await query('ALTER TABLE subtareas ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER fecha_reforma_3').catch(() => {});
  }

  // Agregar updated_at a la tabla procesos (tabla nueva)
  try {
    const procesosCols = await query(`
      SELECT COLUMN_NAME AS name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'procesos'
    `);
    const procesosColsSet = new Set(procesosCols.map((row) => row.name));
    if (!procesosColsSet.has('updated_at')) {
      await query('ALTER TABLE procesos ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP').catch(() => {});
      console.log('✅ Columna updated_at agregada a tabla procesos');
    }
  } catch (err) {
    console.warn('No se pudo verificar/crear updated_at en procesos:', err.message);
  }

  // Eliminar tabla vieja etapas_pac si existe
  await query('DROP TABLE IF EXISTS etapas_pac').catch(() => {});
  console.log('✅ Tabla etapas_pac eliminada (migrada a etapas_catalogo)');

  // Nueva tabla consolidada: seguimiento_etapas
  await query(`
    CREATE TABLE IF NOT EXISTS seguimiento_etapas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proceso_id INT NOT NULL,
      etapa_id INT NOT NULL,
      estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
      fecha_planificada DATE NULL,
      fecha_real DATE NULL,
      responsable_id INT NULL,
      responsable VARCHAR(255) NULL,
      observaciones TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (proceso_id) REFERENCES procesos(id) ON DELETE CASCADE,
      FOREIGN KEY (etapa_id) REFERENCES etapas_catalogo(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // Eliminar restricción única si existe (para permitir múltiples comentarios por etapa)
  await query('ALTER TABLE seguimiento_etapas DROP INDEX unique_subtarea_etapa_seguimiento').catch(() => {});
  await query('ALTER TABLE seguimiento_etapas DROP INDEX uk_proceso_etapa').catch(() => {});

  // Cambiar subtarea_id a proceso_id si es necesario
  const seguimientoCols = await query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seguimiento_etapas'
  `);
  const seguimientoColsSet = new Set(seguimientoCols.map((row) => row.name));

  if (seguimientoColsSet.has('subtarea_id') && !seguimientoColsSet.has('proceso_id')) {
    await query('ALTER TABLE seguimiento_etapas CHANGE COLUMN subtarea_id proceso_id INT NOT NULL').catch(() => {});
  }
  if (!seguimientoColsSet.has('responsable_id')) {
    await query('ALTER TABLE seguimiento_etapas ADD COLUMN responsable_id INT NULL AFTER fecha_real').catch(() => {});
  }
  if (!seguimientoColsSet.has('created_at')) {
    await query('ALTER TABLE seguimiento_etapas ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP').catch(() => {});
  }
  if (!seguimientoColsSet.has('updated_at')) {
    await query('ALTER TABLE seguimiento_etapas ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP').catch(() => {});
  }

  // Tabla de comentarios de etapas (separada de etapas_proceso)
  await query(`
    CREATE TABLE IF NOT EXISTS comentarios_etapa (
      id INT AUTO_INCREMENT PRIMARY KEY,
      proceso_id INT NOT NULL,
      etapa_id INT NOT NULL,
      observaciones TEXT NULL,
      responsable_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (proceso_id) REFERENCES procesos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // Tabla antigua: seguimientos_diarios - no se crea en estructura minimalista
  // Functionalidad consolidada en comentarios_etapa

  // Tabla seguimientos_diarios no se crea - comentado para compatibilidad

  await query(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo VARCHAR(50) NOT NULL,
      destinatario VARCHAR(255) NOT NULL,
      asunto VARCHAR(255) NOT NULL,
      mensaje LONGTEXT NOT NULL,
      tarea_id INT NULL,
      fecha DATETIME NOT NULL,
      leida BOOLEAN NOT NULL DEFAULT false,
      fecha_leida DATETIME NULL,
      enviada BOOLEAN NOT NULL DEFAULT false,
      INDEX idx_fecha (fecha),
      INDEX idx_tarea (tarea_id)
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS configuracion_notificaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      remitente_nombre VARCHAR(255) NULL,
      remitente_email VARCHAR(255) NULL,
      tipo_servidor VARCHAR(50) NOT NULL DEFAULT 'smtp',
      smtp_host VARCHAR(255) NULL,
      smtp_port INT NOT NULL DEFAULT 587,
      smtp_secure BOOLEAN NOT NULL DEFAULT false,
      requiere_auth BOOLEAN NOT NULL DEFAULT true,
      smtp_user VARCHAR(255) NULL,
      smtp_password VARCHAR(255) NULL,
      supervisor_emails TEXT NULL,
      hora_envio VARCHAR(5) NOT NULL DEFAULT '08:00',
      zona_horaria VARCHAR(80) NOT NULL DEFAULT 'America/Guayaquil',
      notificar_etapas_atrasadas BOOLEAN NOT NULL DEFAULT true,
      dias_atraso_minimo INT NOT NULL DEFAULT 2,
      asunto_plantilla VARCHAR(255) NULL,
      plantilla_html LONGTEXT NULL,
      pie_mensaje VARCHAR(255) NULL,
      ultima_ejecucion_at DATETIME NULL,
      ultima_ejecucion_fecha VARCHAR(10) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL UNIQUE,
      nombre VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(80) NOT NULL,
      direccion_nombre VARCHAR(255) NULL,
      orden_login INT NOT NULL DEFAULT 0,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`ALTER TABLE usuarios MODIFY COLUMN role VARCHAR(80) NOT NULL`).catch(() => {});
  await query(`ALTER TABLE usuarios ADD COLUMN orden_login INT NOT NULL DEFAULT 0 AFTER direccion_nombre`).catch(() => {});
  await query(`ALTER TABLE usuarios ADD COLUMN fecha_inicio_rol DATE NULL AFTER activo`).catch(() => {});
  await query(`ALTER TABLE usuarios ADD COLUMN fecha_fin_rol DATE NULL AFTER fecha_inicio_rol`).catch(() => {});

  // Tablas antiguas comentadas - usando nueva estructura minimalista:
  // - permisos_modulos_catalogo → catalogo (tipo='modulos')
  // - permisos_menu_catalogo → catalogo (tipo='menu')
  // - permisos_roles_modulos → permisos (role, modulo, accion, permitido)
  // - permisos_roles_menu → permisos (role, modulo, accion)
  // - permisos_roles_campos_etapas → permisos (role, modulo, accion)
  // - auditoria_eventos → audit_log

  await query(`ALTER TABLE permisos_roles_modulos MODIFY COLUMN role VARCHAR(80) NOT NULL`).catch(() => {});
  await query(`ALTER TABLE permisos_roles_menu MODIFY COLUMN role VARCHAR(80) NOT NULL`).catch(() => {});
  await query(`ALTER TABLE auditoria_eventos MODIFY COLUMN role VARCHAR(80) NULL`).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS direcciones_catalogo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL UNIQUE,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS responsables_catalogo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      email VARCHAR(255) NULL,
      direccion_id INT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_responsables_direccion
        FOREIGN KEY (direccion_id) REFERENCES direcciones_catalogo(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await query(`
    ALTER TABLE subtareas
    ADD CONSTRAINT fk_subtareas_responsable
    FOREIGN KEY (responsable_id) REFERENCES responsables_catalogo(id)
    ON DELETE SET NULL
  `).catch(() => {});

  await query(`
    ALTER TABLE seguimiento_etapas
    ADD CONSTRAINT fk_seguimiento_responsable
    FOREIGN KEY (responsable_id) REFERENCES responsables_catalogo(id)
    ON DELETE SET NULL
  `).catch(() => {});

  await query(`
    ALTER TABLE seguimientos_diarios
    ADD CONSTRAINT fk_seguimientos_diarios_responsable
    FOREIGN KEY (responsable_id) REFERENCES responsables_catalogo(id)
    ON DELETE SET NULL
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS usuarios_direcciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      direccion_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_usuario_direccion (usuario_id, direccion_id),
      CONSTRAINT fk_usuarios_direcciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_usuarios_direcciones_direccion
        FOREIGN KEY (direccion_id) REFERENCES direcciones_catalogo(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
}

async function seedInitialData() {
  const adminDefaultUser = process.env.DEFAULT_ADMIN_USER || 'admin';
  const adminDefaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || '12345';

  const existeAdmin = await query(
    `SELECT id FROM usuarios WHERE role = 'admin' LIMIT 1`
  );

  if (existeAdmin.length === 0) {
    const passwordHash = await bcrypt.hash(adminDefaultPassword, 10);
    await query(
      `INSERT INTO usuarios (username, nombre, password_hash, role, direccion_nombre, activo)
       VALUES (?, ?, ?, 'admin', NULL, true)`,
      [adminDefaultUser, 'Administrador del sistema', passwordHash]
    );
  }

  const countDirecciones = await query('SELECT COUNT(*) AS total FROM direcciones_catalogo');
  
  if (Number(countDirecciones[0]?.total || 0) === 0) {
    const direcciones = await getDireccionesDisponibles();
    for (const direccion of direcciones) {
      await query(
        'INSERT INTO direcciones_catalogo (nombre, activo) VALUES (?, true)',
        [direccion]
      ).catch(() => {});
    }
  }

  await query(
    `INSERT INTO direcciones_catalogo (nombre, activo)
     VALUES (?, true)
     ON DUPLICATE KEY UPDATE activo = true`,
    [SIN_DIRECCION_NOMBRE]
  );

  const countResponsables = await query('SELECT COUNT(*) AS total FROM responsables_catalogo');
  if (Number(countResponsables[0]?.total || 0) === 0) {
    const responsables = await getAllResponsables();
    for (const responsable of responsables) {
      const direccion = String(responsable?.direccionNombre || '').trim();
      const dirRows = direccion
        ? await query('SELECT id FROM direcciones_catalogo WHERE nombre = ? LIMIT 1', [direccion])
        : [];
      const direccionId = dirRows[0]?.id || null;

      await query(
        `INSERT INTO responsables_catalogo (nombre, email, direccion_id, activo)
         VALUES (?, NULL, ?, true)`,
        [responsable.nombre, direccionId]
      ).catch(() => {});
    }
  }

  const unassignedUser = await query(
    `SELECT id
     FROM usuarios
     WHERE role = 'direccion' AND LOWER(TRIM(direccion_nombre)) = LOWER(TRIM(?))
     LIMIT 1`,
    [SIN_DIRECCION_NOMBRE]
  );

  if (unassignedUser.length === 0) {
    const passwordHash = await bcrypt.hash(DEFAULT_UNASSIGNED_PASSWORD, 10);
    await query(
      `INSERT INTO usuarios (username, nombre, password_hash, role, direccion_nombre, activo)
       VALUES (?, ?, ?, 'direccion', ?, true)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         direccion_nombre = VALUES(direccion_nombre),
         activo = true`,
      [
        DEFAULT_UNASSIGNED_USERNAME,
        'Usuario sin dirección',
        passwordHash,
        SIN_DIRECCION_NOMBRE
      ]
    );
  }

  await query(
    `UPDATE procesos
     SET direccion = ?
     WHERE direccion IS NULL
       OR TRIM(direccion) = ''
       OR LOWER(TRIM(direccion)) IN ('sin direccion', 'sin dirección', 'sin asignar', 'n/a', 'na', 'no aplica', '-')`,
    [SIN_DIRECCION_NOMBRE]
  );

  await query(
    `INSERT INTO configuracion_notificaciones (
      enabled, remitente_nombre, remitente_email, tipo_servidor,
      smtp_host, smtp_port, smtp_secure, requiere_auth, smtp_user, smtp_password,
      supervisor_emails, hora_envio, zona_horaria,
      notificar_etapas_atrasadas, dias_atraso_minimo,
      asunto_plantilla, pie_mensaje
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM configuracion_notificaciones LIMIT 1)`,
    [
      String(process.env.NOTIFICATIONS_ENABLED || 'false').toLowerCase() === 'true',
      'Sistema de Seguimiento',
      process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] || 'noreply@quitoturismo.gob.ec',
      'smtp',
      process.env.SMTP_HOST || '',
      parseInt(process.env.SMTP_PORT || '587', 10),
      String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      true,
      process.env.SMTP_USER || '',
      process.env.SMTP_PASS || '',
      process.env.SUPERVISOR_EMAILS || '',
      '08:00',
      'America/Guayaquil',
      true,
      2,
      'Seguimiento de contrataciones - {{motivo}}',
      'Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo'
    ]
  );

  await seedPermisosBase();
}

async function seedPermisosBase() {
  // Permisos por defecto ya fueron insertados en la normalización
  // Esta función se mantiene vacía para compatibilidad
  // Tabla antigua permisos_modulos_catalogo, permisos_roles_modulos, etc. fueron consolidadas en tabla 'permisos'
}

export async function initMySQL() {
  const bootstrap = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4'
  });
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
  await bootstrap.end();

  pool = await mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: 'utf8mb4'
  });

  await pool.query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');

  await createSchema();
  await seedInitialData();
  subtareasColumnsCache = null;
}

async function resolveSubtareaId(idOrCode) {
  if (Number.isInteger(Number(idOrCode)) && Number(idOrCode) > 0) return Number(idOrCode);
  const rows = await query('SELECT id FROM procesos WHERE codigo_olympo = ? LIMIT 1', [String(idOrCode)]);
  return rows[0]?.id || null;
}

export async function getAllSubtareas() {
  try {
    // Query de procesos (tabla consolidada con 10 campos)
    const subtareas = await query(`
      SELECT p.*, rc.email AS responsableEmail, rc.nombre AS responsableNombre
      FROM procesos p
      LEFT JOIN responsables_catalogo rc ON p.responsable_id = rc.id
      ORDER BY COALESCE(p.activo, 1) DESC, p.id
      LIMIT 500
    `);

    // Query de etapas-proceso
    let etapasMap = new Map();
    try {
      const etapas = await query(`
        SELECT ep.id, ep.proceso_id, ep.etapa_id, ep.aplica, ep.fecha_planificada,
               ec.nombre AS etapa_nombre, ec.clasificacion,
               COALESCE(sg.estado, 'pendiente') AS estado,
               sg.fecha_real
        FROM etapas_proceso ep
        LEFT JOIN etapas_catalogo ec ON ec.id = ep.etapa_id
        LEFT JOIN (
          SELECT DISTINCT proceso_id, etapa_id,
                 FIRST_VALUE(estado) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as estado,
                 FIRST_VALUE(fecha_real) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as fecha_real
          FROM seguimiento_etapas
        ) sg ON sg.proceso_id = ep.proceso_id AND sg.etapa_id = ep.etapa_id
        WHERE ep.aplica = 1
        ORDER BY ep.proceso_id, ep.etapa_id
        LIMIT 15000
      `);

      for (const e of etapas) {
        if (!etapasMap.has(e.proceso_id)) etapasMap.set(e.proceso_id, []);
        etapasMap.get(e.proceso_id).push({
          id: e.id,
          etapaId: e.etapa_id,
          etapaNombre: e.etapa_nombre,
          orden: e.orden,
          clasificacion: e.clasificacion,
          estado: e.estado || 'pendiente',
          aplica: e.aplica,
          fechaPlanificada: e.fecha_planificada ? e.fecha_planificada.toISOString().split('T')[0] : null,
          fechaReal: e.fecha_real ? e.fecha_real.toISOString().split('T')[0] : null
        });
      }
    } catch (etapasErr) {
      console.warn('Error cargando etapas:', etapasErr.message);
    }

    return subtareas.map((row) => ({
      id: row.id,
      subtareaId: row.id,
      nombre: row.subtarea || 'Sin nombre',
      subtarea: row.subtarea || 'Sin nombre',
      codigoOlympo: row.codigo_olympo,
      codigoUnicoProceso: row.codigo_unico_proceso,
      direccionNombre: row.direccion || 'Sin dirección',
      direccion: row.direccion || 'Sin dirección',
      responsableNombre: row.responsableNombre || 'N/A',
      responsableEmail: row.responsableEmail || '',
      pacNoPac: row.pac_no_pac || 'PAC',
      tipoPlan: String(row.pac_no_pac || 'PAC'),
      presupuesto2026Inicial: Number(row.presupuesto_2026_inicial || 0),
      presupuestoConReformas: Number(row.presupuesto_con_reformas ?? row.presupuesto_2026_inicial ?? 0),
      presupuesto: Number(row.presupuesto_con_reformas ?? row.presupuesto_2026_inicial ?? 0),
      cpc: String(row.cpc || ''),
      partidaPresupuestaria: String(row.partida_presupuestaria || ''),
      fuenteFinanciamiento: String(row.fuente_financiamiento || ''),
      versionId: row.version_id ? Number(row.version_id) : null,
      tipoContratacion: String(row.tipo_contratacion || ''),
      procesoEnRiesgo: Boolean(Number(row.proceso_en_riesgo || 0)),
      riesgoComentario: row.riesgo_comentario,
      cuatrimestre: row.cuatrimestre,
      estado: row.estado || 'pendiente',
      activo: row.activo,
      updated_at: row.updated_at || null,
      etapas: etapasMap.get(row.id) || []
    }));
  } catch (error) {
    console.error('ERROR en getAllSubtareas:', error.message, error.stack);
    throw error;
  }
}

export async function getAllSubtareasByScope(scope = {}) {
  // Usar getAllSubtareas() directamente (tabla procesos migrada)
  const items = await getAllSubtareas();
  const userRole = scope?.role;

  // Si el usuario tiene direcciones asignadas en el scope, usar esas (comparando por nombre)
  if (Array.isArray(scope?.direccionesAsignadas) && scope.direccionesAsignadas.length > 0) {
    const dirNames = new Set(scope.direccionesAsignadas.map((d) => String(d).trim().toLowerCase()));
    return items.filter((item) => dirNames.has(String(item?.direccionNombre || '').trim().toLowerCase()));
  }

  // Fallback para usuarios con rol "direccion"
  if (userRole === 'direccion') {
    const direccion = String(scope?.direccionNombre || '').trim().toLowerCase();
    return items.filter((item) => String(item?.direccionNombre || '').trim().toLowerCase() === direccion);
  }

  // Sin restricciones = ver todo
  return items;
}

export async function getSubtareaById(id) {
  const subtareas = await getAllSubtareas();
  const subtarea = subtareas.find((s) => Number(s.id) === Number(id)) || null;

  if (subtarea) {
    // Enriquecer con etapas que incluyan el estado
    const etapasConEstado = await getSubtareaEtapas(id);
    subtarea.etapas = etapasConEstado;
  }

  return subtarea;
}

export async function getSubtareaByIdByScope(id, scope = {}) {
  const subtarea = await getSubtareaById(id);
  if (!subtarea) return null;

  // Si el usuario tiene direcciones asignadas, verificar acceso (comparando por nombre)
  if (Array.isArray(scope?.direccionesAsignadas) && scope.direccionesAsignadas.length > 0) {
    const dirNames = new Set(scope.direccionesAsignadas.map((d) => String(d).trim().toLowerCase()));
    return dirNames.has(String(subtarea?.direccionNombre || '').trim().toLowerCase()) ? subtarea : null;
  }

  // Fallback para usuarios con rol "direccion"
  if (scope?.role === 'direccion') {
    const direccion = String(scope?.direccionNombre || '').trim().toLowerCase();
    const subtareaDireccion = String(subtarea?.direccionNombre || '').trim().toLowerCase();
    return direccion && direccion === subtareaDireccion ? subtarea : null;
  }

  return subtarea;
}

export async function getSubtareaByCodigoOlympo(codigoOlympo) {
  const subtareas = await getAllSubtareas();
  return subtareas.find((s) => s.codigoOlympo === codigoOlympo) || null;
}

export async function getSubtareaByCodigoOlympoByScope(codigoOlympo, scope = {}) {
  const subtarea = await getSubtareaByCodigoOlympo(codigoOlympo);
  if (!subtarea) return null;

  // Si el usuario tiene direcciones asignadas, verificar acceso (comparando por nombre)
  if (Array.isArray(scope?.direccionesAsignadas) && scope.direccionesAsignadas.length > 0) {
    const dirNames = new Set(scope.direccionesAsignadas.map((d) => String(d).trim().toLowerCase()));
    return dirNames.has(String(subtarea?.direccionNombre || '').trim().toLowerCase()) ? subtarea : null;
  }

  // Fallback para usuarios con rol "direccion"
  if (scope?.role === 'direccion') {
    const direccion = String(scope?.direccionNombre || '').trim().toLowerCase();
    const subtareaDireccion = String(subtarea?.direccionNombre || '').trim().toLowerCase();
    return direccion && direccion === subtareaDireccion ? subtarea : null;
  }

  return subtarea;
}

export async function getUsuarioByUsername(username) {
  const login = String(username || '').trim().toLowerCase();
  const rows = await query(
    `SELECT id, username, nombre, password_hash, role, direccion_nombre, orden_login, activo
     FROM usuarios
     WHERE LOWER(username) = ?
     LIMIT 1`,
    [login]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    nombre: row.nombre,
    passwordHash: row.password_hash,
    role: row.role,
    direccionNombre: row.direccion_nombre,
    activo: Boolean(row.activo)
  };
}

export async function getUsuarioByLoginIdentifier(identifier) {
  const login = String(identifier || '').trim();
  const loginLower = login.toLowerCase();
  const rows = await query(
    `SELECT id, username, nombre, password_hash, role, direccion_nombre, orden_login, activo
     FROM usuarios
    WHERE LOWER(username) = ?
      OR (role = 'direccion' AND LOWER(TRIM(direccion_nombre)) = ?)
      OR LOWER(TRIM(nombre)) = ?
    ORDER BY CASE
      WHEN LOWER(username) = ? THEN 0
      WHEN role = 'direccion' AND LOWER(TRIM(direccion_nombre)) = ? THEN 1
      ELSE 2
    END, id
     LIMIT 1`,
   [loginLower, loginLower, loginLower, loginLower, loginLower]
  );

  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    nombre: row.nombre,
    passwordHash: row.password_hash,
    role: row.role,
    direccionNombre: row.direccion_nombre,
    activo: Boolean(row.activo)
  };
}

export async function getUsuarioById(id) {
  const rows = await query(
    `SELECT id, username, nombre, role, direccion_nombre, orden_login, activo, fecha_inicio_rol, fecha_fin_rol, created_at, updated_at
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const item = toCamelRow(rows[0]);
  item.nombre = normalizeText(item.nombre || '');
  item.direccionNombre = item.direccionNombre ? normalizeText(item.direccionNombre) : null;
  item.activo = Boolean(item.activo);
  item.fechaInicioRol = item.fechaInicioRol ? formatearFechaISO(item.fechaInicioRol) : null;
  item.fechaFinRol = item.fechaFinRol ? formatearFechaISO(item.fechaFinRol) : null;
  return item;
}

export async function getUsuarios() {
  const rows = await query(
    `SELECT id, username, nombre, role, direccion_nombre, orden_login, activo, fecha_inicio_rol, fecha_fin_rol, created_at, updated_at
     FROM usuarios
     ORDER BY orden_login ASC, nombre ASC`
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.nombre = normalizeText(item.nombre || '');
    item.direccionNombre = item.direccionNombre ? normalizeText(item.direccionNombre) : null;
    item.activo = Boolean(item.activo);
    item.fechaInicioRol = item.fechaInicioRol ? formatearFechaISO(item.fechaInicioRol) : null;
    item.fechaFinRol = item.fechaFinRol ? formatearFechaISO(item.fechaFinRol) : null;
    return item;
  });
}

function normalizeUsername(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_');
}

function normalizeUsernameKey(value = '') {
  return normalizeUsername(value).toLowerCase();
}

function normalizeRoleKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function repairMojibake(value = '') {
  let text = String(value || '');

  const directReplacements = new Map([
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'],
    ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ']
  ]);

  for (const [bad, good] of directReplacements.entries()) {
    text = text.split(bad).join(good);
  }

  const replacementCharPatterns = new Map([
    [/Direcci.n/gi, 'Dirección'],
    [/Asesor.a/gi, 'Asesoría'],
    [/Jur.dica/gi, 'Jurídica'],
    [/Comercializaci.n/gi, 'Comercialización'],
    [/Comunicaci.n/gi, 'Comunicación'],
    [/Promoci.n/gi, 'Promoción'],
    [/Planificaci.n/gi, 'Planificación'],
    [/Informaci.n/gi, 'Información'],
    [/Tecnolog.as/gi, 'Tecnologías'],
    [/Tur.stica/gi, 'Turística'],
    [/Tur.stico/gi, 'Turístico'],
    [/Atracci.n/gi, 'Atracción'],
    [/Estad.stica/gi, 'Estadística'],
    [/Gesti.n/gi, 'Gestión'],
    [/Administraci.n/gi, 'Administración']
  ]);

  for (const [pattern, replacement] of replacementCharPatterns.entries()) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function normalizeText(value = '') {
  return repairMojibake(String(value || '').trim().replace(/\s+/g, ' '));
}

function normalizeActivo(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return Boolean(defaultValue);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'si', 'sí', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return Boolean(defaultValue);
}

function formatearFechaISO(fecha) {
  if (!fecha) return null;
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.substring(0, 10);
  if (fecha instanceof Date) return fecha.toISOString().substring(0, 10);
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().substring(0, 10);
}

export async function createUsuario(data = {}) {
  const username = normalizeUsername(data.username);
  const nombre = normalizeText(data.nombre);
  const password = String(data.password || '12345');
  const role = normalizeRoleKey(data.role || 'direccion');
  const direccionNombre = data.direccionNombre ? normalizeText(data.direccionNombre) : null;
  const ordenLogin = Math.max(0, Number.parseInt(String(data.ordenLogin ?? 0), 10) || 0);
  const activo = normalizeActivo(data.activo, true);
  const fechaInicioRol = data.fechaInicioRol && /^\d{4}-\d{2}-\d{2}$/.test(String(data.fechaInicioRol)) ? String(data.fechaInicioRol).trim() : null;
  const fechaFinRol = data.fechaFinRol && /^\d{4}-\d{2}-\d{2}$/.test(String(data.fechaFinRol)) ? String(data.fechaFinRol).trim() : null;

  if (!username || !nombre || !password) throw new Error('username, nombre y password son requeridos');

  const existeUsername = await query(
    `SELECT id FROM usuarios WHERE LOWER(username) = ? LIMIT 1`,
    [normalizeUsernameKey(username)]
  );
  if (existeUsername.length > 0) throw new Error('El usuario ya existe');

  const rolesDisponibles = await getRolesUsuariosDisponibles();
  if (!rolesDisponibles.includes(role)) throw new Error('Rol inválido o no configurado');
  if (role === 'direccion' && !direccionNombre) throw new Error('direccionNombre es requerido para rol dirección');

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO usuarios (username, nombre, password_hash, role, direccion_nombre, orden_login, activo, fecha_inicio_rol, fecha_fin_rol)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [username, nombre, passwordHash, role, role === 'direccion' ? direccionNombre : null, ordenLogin, activo, fechaInicioRol, fechaFinRol]
  );

  return getUsuarioById(result.insertId);
}

export async function updateUsuario(id, data = {}) {
  const sets = [];
  const values = [];

  if (data.username !== undefined) {
    const username = normalizeUsername(data.username);
    if (!username) throw new Error('username es requerido');

    const existente = await query(
      'SELECT id FROM usuarios WHERE LOWER(username) = ? AND id <> ? LIMIT 1',
      [normalizeUsernameKey(username), id]
    );
    if (existente.length > 0) throw new Error('El usuario ya existe');

    sets.push('username = ?');
    values.push(username);
  }
  if (data.nombre !== undefined) {
    sets.push('nombre = ?');
    values.push(normalizeText(data.nombre));
  }
  if (data.role !== undefined) {
    const role = normalizeRoleKey(data.role || '');
    const rolesDisponibles = await getRolesUsuariosDisponibles();
    if (!rolesDisponibles.includes(role)) throw new Error('Rol inválido o no configurado');
    sets.push('role = ?');
    values.push(role);
  }
  if (data.direccionNombre !== undefined) {
    sets.push('direccion_nombre = ?');
    values.push(data.direccionNombre ? normalizeText(data.direccionNombre) : null);
  }
  if (data.ordenLogin !== undefined) {
    sets.push('orden_login = ?');
    values.push(Math.max(0, Number.parseInt(String(data.ordenLogin ?? 0), 10) || 0));
  }
  if (data.activo !== undefined) {
    sets.push('activo = ?');
    values.push(normalizeActivo(data.activo, true));
  }
  if (data.password !== undefined && String(data.password).trim() !== '') {
    const passwordHash = await bcrypt.hash(String(data.password), 10);
    sets.push('password_hash = ?');
    values.push(passwordHash);
  }
  if (data.fechaInicioRol !== undefined) {
    const fecha = data.fechaInicioRol && /^\d{4}-\d{2}-\d{2}$/.test(String(data.fechaInicioRol)) ? String(data.fechaInicioRol).trim() : null;
    sets.push('fecha_inicio_rol = ?');
    values.push(fecha);
  }
  if (data.fechaFinRol !== undefined) {
    const fecha = data.fechaFinRol && /^\d{4}-\d{2}-\d{2}$/.test(String(data.fechaFinRol)) ? String(data.fechaFinRol).trim() : null;
    sets.push('fecha_fin_rol = ?');
    values.push(fecha);
  }

  if (!sets.length) return getUsuarioById(id);
  values.push(id);
  await query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, values);
  return getUsuarioById(id);
}

export async function deleteUsuario(id) {
  const result = await query('DELETE FROM usuarios WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function verificarVigenciaRol(userId) {
  const rows = await query(
    `SELECT role, fecha_fin_rol FROM usuarios WHERE id = ? AND activo = true LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return;

  const usuario = rows[0];
  if (!usuario.fecha_fin_rol) return;

  const hoy = new Date().toISOString().slice(0, 10);
  if (usuario.fecha_fin_rol < hoy && usuario.role !== 'direccion') {
    await query(
      `UPDATE usuarios SET role = ?, fecha_inicio_rol = NULL, fecha_fin_rol = NULL WHERE id = ?`,
      ['direccion', userId]
    );
  }
}

export async function verifyUsuarioCredentials(username, plainPassword) {
  const usuario = await getUsuarioByLoginIdentifier(username);
  if (!usuario || !usuario.activo) return null;
  const ok = await bcrypt.compare(String(plainPassword || ''), usuario.passwordHash);
  if (!ok) return null;

  return {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    role: usuario.role,
    direccionNombre: usuario.direccionNombre,
    activo: usuario.activo
  };
}

export async function getDireccionesUsuario(usuarioId) {
  const rows = await query(
    `SELECT d.id, d.nombre
     FROM usuarios_direcciones ud
     JOIN direcciones_catalogo d ON d.id = ud.direccion_id
     WHERE ud.usuario_id = ?
     ORDER BY d.nombre`,
    [usuarioId]
  );
  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre
  }));
}

export async function setDireccionesUsuario(usuarioId, direccionIds = []) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM usuarios_direcciones WHERE usuario_id = ?', [usuarioId]);

    for (const dirId of direccionIds) {
      await conn.execute(
        'INSERT INTO usuarios_direcciones (usuario_id, direccion_id) VALUES (?, ?)',
        [usuarioId, dirId]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function puedeProcesoCualquierDireccion(usuarioId) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM usuarios_direcciones WHERE usuario_id = ?',
    [usuarioId]
  );
  return Number(rows[0]?.total || 0) === 0;
}

export async function getAllResponsables() {
  const rows = await query(
    `SELECT id, nombre, metadata
     FROM catalogo
     WHERE tipo = 'responsables' AND activo = 1
     ORDER BY nombre`
  );

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    email: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata).email : row.metadata.email) : null,
    direccionId: null,
    direccionNombre: null
  }));
}

export async function getDireccionesDisponibles() {
  const rows = await query(
    `SELECT nombre
     FROM direcciones_catalogo
     WHERE activo = true
     ORDER BY nombre`
  );

  if (rows.length > 0) {
    return rows.map((row) => String(row.nombre || '').trim()).filter(Boolean);
  }

  const direccionesBase = Object.values(DIRECCIONES_ID_NOMBRE).map((nombre) => String(nombre).trim());
  return [...new Set(direccionesBase)].sort((a, b) => a.localeCompare(b, 'es'));
}

export async function getDireccionesLoginDisponibles() {
  const rows = await query(`
    SELECT DISTINCT TRIM(direccion_nombre) AS nombre
    FROM usuarios
    WHERE role = 'direccion'
      AND activo = true
      AND direccion_nombre IS NOT NULL
      AND TRIM(direccion_nombre) <> ''
    ORDER BY TRIM(direccion_nombre)
  `);

  return rows.map((row) => String(row.nombre));
}

export async function getOpcionesLogin() {
  const rows = await query(
    `SELECT DISTINCT username, orden_login
     FROM usuarios
     WHERE activo = true
       AND username IS NOT NULL
       AND TRIM(username) <> ''
     ORDER BY COALESCE(orden_login, 0) ASC, username ASC`
  );

  const hiddenUsernames = new Set([
    normalizeUsernameKey(process.env.DEFAULT_ADMIN_USER || 'admin')
  ]);

  return rows
    .map((row) => String(row.username || '').trim())
    .filter((username) => Boolean(username) && !hiddenUsernames.has(normalizeUsernameKey(username)));
}

export async function getRolesUsuariosDisponibles() {
  const [usuariosRows, modulosRows, menuRows] = await Promise.all([
    query('SELECT DISTINCT role FROM usuarios WHERE role IS NOT NULL AND TRIM(role) <> ""'),
    query('SELECT DISTINCT role FROM permisos_roles_modulos WHERE role IS NOT NULL AND TRIM(role) <> ""'),
    query('SELECT DISTINCT role FROM permisos_roles_menu WHERE role IS NOT NULL AND TRIM(role) <> ""')
  ]);

  const roles = new Set(CORE_ROLES);

  for (const row of [...usuariosRows, ...modulosRows, ...menuRows]) {
    const role = normalizeRoleKey(row.role || '');
    if (role) roles.add(role);
  }

  return Array.from(roles).sort((a, b) => a.localeCompare(b, 'es'));
}

export async function getPermisosModulosCatalogo() {
  const rows = await query(
    `SELECT clave, nombre, descripcion, activo, orden
     FROM permisos_modulos_catalogo
     WHERE activo = true
     ORDER BY orden, nombre`
  );

  return rows.map((row) => ({
    clave: String(row.clave),
    nombre: String(row.nombre),
    descripcion: row.descripcion ? String(row.descripcion) : null,
    activo: Boolean(row.activo),
    orden: Number(row.orden || 0)
  }));
}

export async function getPermisosMenuCatalogo() {
  const rows = await query(
    `SELECT clave, nombre, ruta, activo, orden
     FROM permisos_menu_catalogo
     WHERE activo = true
     ORDER BY orden, nombre`
  );

  return rows.map((row) => ({
    clave: String(row.clave),
    nombre: String(row.nombre),
    ruta: String(row.ruta),
    activo: Boolean(row.activo),
    orden: Number(row.orden || 0)
  }));
}

export async function getPermisosRol(role) {
  const roleName = normalizeRoleKey(role || '');
  if (!roleName) throw new Error('role es requerido');

  const [modulosCatalogo, menuCatalogo] = await Promise.all([
    getPermisosModulosCatalogo(),
    getPermisosMenuCatalogo()
  ]);

  const [modulosRows, menuRows, camposRows] = await Promise.all([
    query(
      `SELECT modulo_clave, puede_leer, puede_crear, puede_actualizar, puede_borrar
       FROM permisos_roles_modulos
       WHERE role = ?`,
      [roleName]
    ),
    query(
      `SELECT menu_clave, puede_ingresar
       FROM permisos_roles_menu
       WHERE role = ?`,
      [roleName]
    ),
    query(
      `SELECT campo_clave, puede_ver, puede_editar
       FROM permisos_roles_campos_etapas
       WHERE role = ?`,
      [roleName]
    )
  ]);

  const modulosByClave = new Map(
    modulosRows.map((row) => [
      String(row.modulo_clave),
      {
        read: Boolean(row.puede_leer),
        create: Boolean(row.puede_crear),
        update: Boolean(row.puede_actualizar),
        delete: Boolean(row.puede_borrar)
      }
    ])
  );

  const menuByClave = new Map(
    menuRows.map((row) => [String(row.menu_clave), Boolean(row.puede_ingresar)])
  );

  const camposByClave = new Map(
    camposRows.map((row) => [
      String(row.campo_clave),
      {
        puedeVer: Boolean(row.puede_ver),
        puedeEditar: Boolean(row.puede_editar)
      }
    ])
  );

  return {
    role: roleName,
    modulos: modulosCatalogo.map((modulo) => ({
      ...modulo,
      permisos: modulosByClave.get(modulo.clave) || { read: false, create: false, update: false, delete: false }
    })),
    menu: menuCatalogo.map((menu) => ({
      ...menu,
      puedeIngresar: (() => {
        const base = Boolean(menuByClave.get(menu.clave));
        const requiredModule = MENU_TO_MODULE_PERMISSION[menu.clave];
        if (!requiredModule) return base;
        const moduleRead = Boolean(modulosByClave.get(requiredModule)?.read);
        return base && moduleRead;
      })()
    })),
    campos: CAMPOS_ETAPAS_CATALOGO.map((campo) => ({
      ...campo,
      puedeVer: camposByClave.has(campo.clave) ? camposByClave.get(campo.clave).puedeVer : true,
      puedeEditar: camposByClave.has(campo.clave) ? camposByClave.get(campo.clave).puedeEditar : true
    }))
  };
}

export async function getPermisosRolesResumen() {
  const roles = await getRolesUsuariosDisponibles();
  const permisos = await Promise.all(roles.map((role) => getPermisosRol(role)));
  return { roles, permisos };
}

export async function createRole(data = {}) {
  const roleName = normalizeRoleKey(data.role || data.nombre || '');
  const baseRole = normalizeRoleKey(data.baseRole || 'reporteria') || 'reporteria';
  const copiarPermisos = data.copiarPermisos !== false;

  if (!roleName) throw new Error('El nombre del rol es requerido');

  const rolesActuales = await getRolesUsuariosDisponibles();
  if (rolesActuales.includes(roleName)) {
    throw new Error('El rol ya existe');
  }

  const roleBaseSeguro = rolesActuales.includes(baseRole) ? baseRole : 'reporteria';
  const plantilla = await getPermisosRol(roleBaseSeguro);

  const payload = {
    modulos: plantilla.modulos.map((item) => ({
      clave: item.clave,
      permisos: copiarPermisos
        ? {
            read: Boolean(item.permisos.read),
            create: Boolean(item.permisos.create),
            update: Boolean(item.permisos.update),
            delete: Boolean(item.permisos.delete)
          }
        : { read: false, create: false, update: false, delete: false }
    })),
    menu: plantilla.menu.map((item) => ({
      clave: item.clave,
      puedeIngresar: copiarPermisos ? Boolean(item.puedeIngresar) : false
    })),
    campos: plantilla.campos.map((item) => ({
      clave: item.clave,
      puedeVer: copiarPermisos ? Boolean(item.puedeVer) : true,
      puedeEditar: copiarPermisos ? Boolean(item.puedeEditar) : true
    }))
  };

  return updatePermisosRol(roleName, payload);
}

export async function deleteRole(role) {
  const roleName = normalizeRoleKey(role || '');
  if (!roleName) throw new Error('role es requerido');
  if (CORE_ROLES.includes(roleName)) {
    throw new Error('No se puede eliminar un rol base del sistema');
  }

  const rows = await query('SELECT COUNT(*) AS total FROM usuarios WHERE role = ?', [roleName]);
  if (Number(rows[0]?.total || 0) > 0) {
    throw new Error('No se puede eliminar un rol que tiene usuarios asignados');
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM permisos_roles_menu WHERE role = ?', [roleName]);
    await conn.execute('DELETE FROM permisos_roles_modulos WHERE role = ?', [roleName]);
    await conn.execute('DELETE FROM permisos_roles_campos_etapas WHERE role = ?', [roleName]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return { success: true, role: roleName };
}

export async function updatePermisosRol(role, data = {}) {
  const roleName = normalizeRoleKey(role || '');
  if (!roleName) throw new Error('role es requerido');

  const modulos = Array.isArray(data.modulos) ? data.modulos : [];
  const menu = Array.isArray(data.menu) ? data.menu : [];
  const campos = Array.isArray(data.campos) ? data.campos : [];

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    for (const item of modulos) {
      const clave = String(item?.clave || '').trim();
      if (!clave) continue;
      const permisos = item?.permisos || {};
      await conn.execute(
        `INSERT INTO permisos_roles_modulos (role, modulo_clave, puede_leer, puede_crear, puede_actualizar, puede_borrar)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           puede_leer = VALUES(puede_leer),
           puede_crear = VALUES(puede_crear),
           puede_actualizar = VALUES(puede_actualizar),
           puede_borrar = VALUES(puede_borrar)`,
        [
          roleName,
          clave,
          Boolean(permisos.read),
          Boolean(permisos.create),
          Boolean(permisos.update),
          Boolean(permisos.delete)
        ]
      );
    }

    for (const item of menu) {
      const clave = String(item?.clave || '').trim();
      if (!clave) continue;
      const puedeIngresar = Boolean(item?.puedeIngresar);

      if (puedeIngresar) {
        const requiredModule = MENU_TO_MODULE_PERMISSION[clave];
        if (requiredModule) {
          await conn.execute(
            `INSERT INTO permisos_roles_modulos (role, modulo_clave, puede_leer, puede_crear, puede_actualizar, puede_borrar)
             VALUES (?, ?, true, false, false, false)
             ON DUPLICATE KEY UPDATE
               puede_leer = true`,
            [roleName, requiredModule]
          );
        }
      }

      await conn.execute(
        `INSERT INTO permisos_roles_menu (role, menu_clave, puede_ingresar)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           puede_ingresar = VALUES(puede_ingresar)`,
        [roleName, clave, puedeIngresar]
      );
    }

    for (const item of campos) {
      const clave = String(item?.clave || '').trim();
      if (!clave) continue;
      const puedeVer = Boolean(item?.puedeVer);
      const puedeEditar = Boolean(item?.puedeEditar);

      await conn.execute(
        `INSERT INTO permisos_roles_campos_etapas (role, campo_clave, puede_ver, puede_editar)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           puede_ver = VALUES(puede_ver),
           puede_editar = VALUES(puede_editar)`,
        [roleName, clave, puedeVer, puedeEditar]
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return getPermisosRol(roleName);
}

export async function hasPermisoModulo(role, moduloClave, accion = 'read') {
  const roleName = normalizeRoleKey(role || '');
  const modulo = String(moduloClave || '').trim();
  const action = String(accion || 'read').trim().toLowerCase();

  if (!roleName || !modulo) return false;

  const actionMap = {
    read: 'puede_leer',
    create: 'puede_crear',
    update: 'puede_actualizar',
    delete: 'puede_borrar'
  };
  const column = actionMap[action] || actionMap.read;

  const rows = await query(
    `SELECT ${column} AS permitido
     FROM permisos_roles_modulos
     WHERE role = ? AND modulo_clave = ?
     LIMIT 1`,
    [roleName, modulo]
  );

  return Boolean(rows[0]?.permitido);
}

export async function hasAccesoMenu(role, menuClave) {
  const roleName = normalizeRoleKey(role || '');
  const menu = String(menuClave || '').trim();
  if (!roleName || !menu) return false;

  const rows = await query(
    `SELECT puede_ingresar
     FROM permisos_roles_menu
     WHERE role = ? AND menu_clave = ?
     LIMIT 1`,
    [roleName, menu]
  );

  return Boolean(rows[0]?.puede_ingresar);
}

export async function getPermisosSesionRol(role) {
  const permisos = await getPermisosRol(role);
  const modulos = {};
  const menu = {};
  const campos = {};

  for (const modulo of permisos.modulos) {
    modulos[modulo.clave] = modulo.permisos;
  }
  for (const item of permisos.menu) {
    menu[item.clave] = Boolean(item.puedeIngresar);
  }
  for (const campo of permisos.campos) {
    campos[campo.clave] = {
      ver: Boolean(campo.puedeVer),
      editar: Boolean(campo.puedeEditar)
    };
  }

  return {
    role: permisos.role,
    modulos,
    menu,
    campos
  };
}

function sanitizeAuditData(value) {
  const redactKeys = ['password', 'passwordHash', 'password_hash', 'token', 'authorization'];

  function walk(input) {
    if (input === null || input === undefined) return input;
    if (Array.isArray(input)) return input.map(walk);
    if (typeof input === 'object') {
      const out = {};
      for (const [key, val] of Object.entries(input)) {
        const shouldRedact = redactKeys.some((k) => String(key).toLowerCase() === k.toLowerCase());
        out[key] = shouldRedact ? '***REDACTED***' : walk(val);
      }
      return out;
    }
    if (typeof input === 'string' && input.length > 4000) return `${input.slice(0, 4000)}...`;
    return input;
  }

  return walk(value);
}

function asJsonString(value) {
  if (value === undefined) return null;
  try {
    const sanitized = sanitizeAuditData(value);
    return JSON.stringify(sanitized);
  } catch {
    return JSON.stringify({ error: 'No serializable' });
  }
}

export async function registrarEventoAuditoria(evento = {}) {
  const payload = {
    userId: evento.userId || null,
    username: evento.username ? String(evento.username).slice(0, 80) : null,
    role: evento.role ? String(evento.role).slice(0, 50) : null,
    direccionNombre: evento.direccionNombre ? String(evento.direccionNombre).slice(0, 255) : null,
    accion: String(evento.accion || 'read').slice(0, 20),
    modulo: evento.modulo ? String(evento.modulo).slice(0, 80) : null,
    recurso: evento.recurso ? String(evento.recurso).slice(0, 255) : null,
    metodo: String(evento.metodo || 'GET').slice(0, 10),
    ruta: String(evento.ruta || '/').slice(0, 255),
    statusCode: Number(evento.statusCode || 500),
    exito: Boolean(evento.exito),
    ip: evento.ip ? String(evento.ip).slice(0, 64) : null,
    userAgent: evento.userAgent ? String(evento.userAgent).slice(0, 512) : null,
    requestQuery: asJsonString(evento.requestQuery),
    requestBody: asJsonString(evento.requestBody),
    responseBody: asJsonString(evento.responseBody),
    errorMensaje: evento.errorMensaje ? String(evento.errorMensaje).slice(0, 2000) : null
  };

  await query(
    `INSERT INTO audit_log (
      tabla, tabla_id, accion, usuario_id, cambios_antes, cambios_despues
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.modulo || 'api',
      null,
      payload.accion,
      payload.userId,
      JSON.stringify({ ip: payload.ip, userAgent: payload.userAgent, ruta: payload.ruta }),
      JSON.stringify({ statusCode: payload.statusCode, exito: payload.exito, error: payload.errorMensaje })
    ]
  );
}

export async function getEventosAuditoria(filters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const limitRaw = Number(filters.limit || 50);
  const limit = Math.min(200, Math.max(1, limitRaw));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (filters.tabla) {
    where.push('tabla = ?');
    params.push(String(filters.tabla));
  }
  if (filters.accion) {
    where.push('accion = ?');
    params.push(String(filters.accion));
  }
  if (filters.userId) {
    where.push('usuario_id = ?');
    params.push(Number(filters.userId));
  }
  if (filters.desde) {
    where.push('fecha >= ?');
    params.push(`${String(filters.desde)} 00:00:00`);
  }
  if (filters.hasta) {
    where.push('fecha <= ?');
    params.push(`${String(filters.hasta)} 23:59:59`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRows = await query(
    `SELECT COUNT(*) AS total
     FROM audit_log
     ${whereClause}`,
    params
  );
  const total = Number(totalRows[0]?.total || 0);

  const rows = await query(
    `SELECT id, tabla, tabla_id, accion, usuario_id, cambios_antes, cambios_despues, fecha
     FROM audit_log
     ${whereClause}
     ORDER BY fecha DESC, id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map((row) => toCamelRow(row)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}

export async function getResumenSesionesAuditoria(filters = {}) {
  const activeWindowMinutesRaw = Number(filters.activeWindowMinutes || 30);
  const activeWindowMinutes = Math.min(24 * 60, Math.max(5, activeWindowMinutesRaw));
  const recentLimitRaw = Number(filters.recentLimit || 20);
  const recentLimit = Math.min(100, Math.max(5, recentLimitRaw));

  const generatedAtRows = await query(
    `SELECT CONCAT(DATE_FORMAT(DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%s'), '-05:00') AS generated_at`
  );
  const generatedAt = generatedAtRows[0]?.generated_at || new Date().toISOString();

  try {
    const activosRows = await query(
      `SELECT
          ae.user_id,
          COALESCE(u.username, ae.username) AS username,
          COALESCE(u.nombre, ae.username) AS nombre,
          COALESCE(u.role, ae.role) AS role,
          COALESCE(u.direccion_nombre, ae.direccion_nombre) AS direccion_nombre,
          CONCAT(DATE_FORMAT(DATE_SUB(ae.fecha, INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%s'), '-05:00') AS ultimo_login,
          ae.ip,
          ae.user_agent,
          COALESCE(u.activo, true) AS usuario_activo
        FROM auditoria_eventos ae
        INNER JOIN (
          SELECT user_id, MAX(id) AS ultimo_evento_id
          FROM auditoria_eventos
          WHERE accion = 'login'
            AND exito = true
            AND user_id IS NOT NULL
            AND fecha >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
            AND NOT EXISTS (
              SELECT 1
              FROM auditoria_eventos lo
              WHERE lo.user_id = auditoria_eventos.user_id
                AND lo.accion = 'logout'
                AND lo.exito = true
                AND lo.id > auditoria_eventos.id
            )
          GROUP BY user_id
        ) ult ON ult.ultimo_evento_id = ae.id
        LEFT JOIN usuarios u ON u.id = ae.user_id
        ORDER BY ae.fecha DESC, ae.id DESC`,
      [activeWindowMinutes]
    );

    const ultimosIniciosRows = await query(
      `SELECT
          ae.id,
          ae.user_id,
          COALESCE(u.username, ae.username) AS username,
          COALESCE(u.nombre, ae.username) AS nombre,
          COALESCE(u.role, ae.role) AS role,
          COALESCE(u.direccion_nombre, ae.direccion_nombre) AS direccion_nombre,
          ae.exito,
          ae.status_code,
          ae.ip,
          ae.user_agent,
          ae.error_mensaje,
          CONCAT(DATE_FORMAT(DATE_SUB(ae.fecha, INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%s'), '-05:00') AS fecha
        FROM auditoria_eventos ae
        LEFT JOIN usuarios u ON u.id = ae.user_id
        WHERE ae.accion = 'login'
        ORDER BY ae.fecha DESC, ae.id DESC
        LIMIT ${recentLimit}`
    );

    return {
      activeWindowMinutes,
      generatedAt,
      activos: activosRows.map((row) => {
        const item = toCamelRow(row);
        item.usuarioActivo = Boolean(item.usuarioActivo);
        return item;
      }),
      ultimosInicios: ultimosIniciosRows.map((row) => toCamelRow(row))
    };
  } catch (error) {
    console.warn('getResumenSesionesAuditoria: tabla auditoria_eventos no disponible en la nueva estructura:', error.message);
    return { activeWindowMinutes, generatedAt, activos: [], ultimosInicios: [] };
  }
}

export async function getEventoAuditoriaById(id) {
  let rows;
  try {
    rows = await query(
      `SELECT id, user_id, username, role, direccion_nombre, accion, modulo, recurso, metodo, ruta,
              status_code, exito, ip, user_agent, request_query, request_body, response_body, error_mensaje,
              CONCAT(DATE_FORMAT(DATE_SUB(fecha, INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%s'), '-05:00') AS fecha
       FROM auditoria_eventos
       WHERE id = ?
       LIMIT 1`,
      [Number(id)]
    );
  } catch (error) {
    console.warn('getEventoAuditoriaById: tabla auditoria_eventos no disponible en la nueva estructura:', error.message);
    return null;
  }
  if (!rows[0]) return null;

  const item = toCamelRow(rows[0]);
  const parseField = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(String(value));
    } catch {
      return value;
    }
  };
  item.requestQuery = parseField(rows[0].request_query);
  item.requestBody = parseField(rows[0].request_body);
  item.responseBody = parseField(rows[0].response_body);
  return item;
}

export async function getDireccionesCatalogo() {
  const rows = await query(
    `SELECT id, nombre, activo, created_at, updated_at
     FROM direcciones_catalogo
     ORDER BY nombre`
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.activo = normalizeActivo(item.activo, true);
    return item;
  });
}

export async function createDireccionCatalogo(data = {}) {
  const nombre = String(data.nombre || '').trim();
  if (!nombre) throw new Error('El nombre de la dirección es requerido');

  const result = await query(
    `INSERT INTO direcciones_catalogo (nombre, activo)
     VALUES (?, ?)`,
    [nombre, normalizeActivo(data.activo, true)]
  );

  const rows = await query(
    'SELECT id, nombre, activo, created_at, updated_at FROM direcciones_catalogo WHERE id = ? LIMIT 1',
    [result.insertId]
  );
  if (!rows[0]) return null;
  const item = toCamelRow(rows[0]);
  item.activo = normalizeActivo(item.activo, true);
  return item;
}

export async function updateDireccionCatalogo(id, data = {}) {
  const sets = [];
  const values = [];

  if (data.nombre !== undefined) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre de la dirección es requerido');
    sets.push('nombre = ?');
    values.push(nombre);
  }
  if (data.activo !== undefined) {
    sets.push('activo = ?');
    values.push(normalizeActivo(data.activo, true));
  }

  if (!sets.length) {
    const rows = await query('SELECT id, nombre, activo, created_at, updated_at FROM direcciones_catalogo WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return null;
    const item = toCamelRow(rows[0]);
    item.activo = normalizeActivo(item.activo, true);
    return item;
  }

  values.push(id);
  await query(`UPDATE direcciones_catalogo SET ${sets.join(', ')} WHERE id = ?`, values);
  const rows = await query('SELECT id, nombre, activo, created_at, updated_at FROM direcciones_catalogo WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const item = toCamelRow(rows[0]);
  item.activo = normalizeActivo(item.activo, true);
  return item;
}

export async function deleteDireccionCatalogo(id) {
  const uso = await query('SELECT COUNT(*) AS total FROM responsables_catalogo WHERE direccion_id = ?', [id]);
  if (Number(uso[0]?.total || 0) > 0) {
    throw new Error('No se puede eliminar una dirección con responsables asociados');
  }
  const result = await query('DELETE FROM direcciones_catalogo WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getResponsablesCatalogo() {
  const rows = await query(
    `SELECT r.id, r.nombre, r.email, r.direccion_id, d.nombre AS direccion_nombre,
            r.activo, r.created_at, r.updated_at
     FROM responsables_catalogo r
     LEFT JOIN direcciones_catalogo d ON d.id = r.direccion_id
     ORDER BY r.nombre`
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.activo = normalizeActivo(item.activo, true);
    return item;
  });
}

export async function createResponsableCatalogo(data = {}) {
  const nombre = String(data.nombre || '').trim();
  if (!nombre) throw new Error('El nombre del responsable es requerido');

  const result = await query(
    `INSERT INTO responsables_catalogo (nombre, email, direccion_id, activo)
     VALUES (?, ?, ?, ?)`,
    [
      nombre,
      data.email ? String(data.email).trim() : null,
      data.direccionId || null,
      normalizeActivo(data.activo, true)
    ]
  );

  const rows = await query(
    `SELECT r.id, r.nombre, r.email, r.direccion_id, d.nombre AS direccion_nombre,
            r.activo, r.created_at, r.updated_at
     FROM responsables_catalogo r
     LEFT JOIN direcciones_catalogo d ON d.id = r.direccion_id
     WHERE r.id = ? LIMIT 1`,
    [result.insertId]
  );
  if (!rows[0]) return null;
  const item = toCamelRow(rows[0]);
  item.activo = normalizeActivo(item.activo, true);
  return item;
}

export async function updateResponsableCatalogo(id, data = {}) {
  const sets = [];
  const values = [];

  if (data.nombre !== undefined) {
    const nombre = String(data.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del responsable es requerido');
    sets.push('nombre = ?');
    values.push(nombre);
  }
  if (data.email !== undefined) {
    sets.push('email = ?');
    values.push(data.email ? String(data.email).trim() : null);
  }
  if (data.direccionId !== undefined) {
    sets.push('direccion_id = ?');
    values.push(data.direccionId || null);
  }
  if (data.activo !== undefined) {
    sets.push('activo = ?');
    values.push(normalizeActivo(data.activo, true));
  }

  if (!sets.length) {
    const rows = await query(
      `SELECT r.id, r.nombre, r.email, r.direccion_id, d.nombre AS direccion_nombre,
              r.activo, r.created_at, r.updated_at
       FROM responsables_catalogo r
       LEFT JOIN direcciones_catalogo d ON d.id = r.direccion_id
       WHERE r.id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    const item = toCamelRow(rows[0]);
    item.activo = normalizeActivo(item.activo, true);
    return item;
  }

  values.push(id);
  await query(`UPDATE responsables_catalogo SET ${sets.join(', ')} WHERE id = ?`, values);
  const rows = await query(
    `SELECT r.id, r.nombre, r.email, r.direccion_id, d.nombre AS direccion_nombre,
            r.activo, r.created_at, r.updated_at
     FROM responsables_catalogo r
     LEFT JOIN direcciones_catalogo d ON d.id = r.direccion_id
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const item = toCamelRow(rows[0]);
  item.activo = normalizeActivo(item.activo, true);
  return item;
}

export async function deleteResponsableCatalogo(id) {
  const result = await query('DELETE FROM responsables_catalogo WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function createSubtarea(data) {
  const codigoOlympo = String(data.codigoOlympo || data.codigo_olympo || '').trim()
    || `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const riesgoComentario = String(data.riesgoComentario || data.riesgo_comentario || '').trim();

  const result = await query(
    `INSERT INTO procesos (
      direccion, subtarea, codigo_olympo, codigo_unico_proceso,
      partida_presupuestaria, presupuesto_con_reformas, pac_no_pac, tipo_contratacion,
      fuente_financiamiento, proceso_en_riesgo, riesgo_comentario, activo,
      cpc, version_id, cuatrimestre
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.direccion || null,
      data.subtarea || data.nombre || null,
      codigoOlympo,
      data.codigoUnicoProceso || null,
      data.partidaPresupuestaria || null,
      data.presupuesto ?? data.presupuesto2026Inicial ?? 0,
      String(data.pacNoPac || data.tipoPlan || 'PAC'),
      data.tipoContratacion || null,
      data.fuenteFinanciamiento || null,
      Boolean(data.procesoEnRiesgo ?? data.proceso_en_riesgo),
      riesgoComentario || null,
      data.activo ?? true,
      data.cpc || null,
      data.versionId || null,
      data.cuatrimestre || null
    ]
  );

  return getSubtareaById(result.insertId);
}

export async function updateSubtarea(idOrCode, data) {
  const id = await resolveSubtareaId(idOrCode);
  if (!id) return null;

  const sets = [];
  const values = [];

  const fieldMap = {
    codigoOlympo: 'codigo_olympo',
    codigoUnicoProceso: 'codigo_unico_proceso',
    partidaPresupuestaria: 'partida_presupuestaria',
    presupuesto: 'presupuesto_con_reformas',
    tipoPlan: 'pac_no_pac',
    tipoContratacion: 'tipo_contratacion',
    procesoEnRiesgo: 'proceso_en_riesgo',
    riesgoComentario: 'riesgo_comentario',
    activo: 'activo',
    fuenteFinanciamiento: 'fuente_financiamiento',
    subtarea: 'subtarea',
    direccion: 'direccion',
    cpc: 'cpc',
    versionId: 'version_id',
    cuatrimestre: 'cuatrimestre'
  };

  Object.entries(fieldMap).forEach(([camel, sql]) => {
    if (data[camel] !== undefined) {
      const value = data[camel];
      sets.push(`${sql} = ?`);
      values.push(value === '' ? null : value);
    }
  });

  if (!sets.length) return getSubtareaById(id);
  values.push(id);

  const sql = `UPDATE procesos SET ${sets.join(', ')} WHERE id = ?`;
  console.log('🔧 DEBUG updateSubtarea:', {
    id,
    sql,
    valuesCount: values.length,
    dataKeys: Object.keys(data),
    sentFields: sets,
    sentValues: values.slice(0, -1), // Sin el ID que va al final
    cpcRecibido: data.cpc,
    versionIdRecibido: data.versionId,
    timestamp: new Date().toISOString()
  });

  try {
    await query(sql, values);
  } catch (error) {
    console.error('❌ Error en updateSubtarea SQL:', {
      sql,
      values,
      error: error.message,
      sqlError: error.sqlMessage || error.code
    });
    throw error;
  }

  return getSubtareaById(id);
}

export async function deleteSubtarea(idOrCode) {
  const id = await resolveSubtareaId(idOrCode);
  if (!id) return;
  await query('DELETE FROM procesos WHERE id = ?', [id]);
}

// Editar proceso en versión activa
export async function updateSubtareaVersion(id, data) {
  // En el nuevo esquema, todos los procesos tienen version_id directo
  // Simplemente actualizar la tabla procesos
  const fieldMap = {
    codigoOlympo: 'codigo_olympo',
    codigoUnicoProceso: 'codigo_unico_proceso',
    partidaPresupuestaria: 'partida_presupuestaria',
    presupuesto: 'presupuesto_con_reformas',
    tipoPlan: 'pac_no_pac',
    tipoContratacion: 'tipo_contratacion',
    procesoEnRiesgo: 'proceso_en_riesgo',
    riesgoComentario: 'riesgo_comentario',
    activo: 'activo',
    fuenteFinanciamiento: 'fuente_financiamiento',
    subtarea: 'subtarea',
    direccion: 'direccion',
    cpc: 'cpc',
    versionId: 'version_id',
    cuatrimestre: 'cuatrimestre'
  };

  const fields = [];
  const values = [];

  Object.entries(fieldMap).forEach(([camel, sql]) => {
    if (data[camel] !== undefined) {
      fields.push(`${sql} = ?`);
      values.push(data[camel] === '' ? null : data[camel]);
    }
  });

  if (fields.length === 0) {
    return getSubtareaById(id);
  }

  values.push(id);
  const sql = `UPDATE procesos SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, values);

  return getSubtareaById(id);
}

function normalizarFechaSalida(fecha) {
  if (!fecha) return null;
  const str = String(fecha).trim();
  // Si está en formato ISO (contiene T), extraer solo la parte de fecha
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  // Si ya está en formato yyyy-MM-dd, devolver como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Si está en formato mm/dd/yyyy, convertir a yyyy-MM-dd
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const yyyy = mmddyyyy[3];
    const mm = mmddyyyy[1].padStart(2, '0');
    const dd = mmddyyyy[2].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Intentar parseo general (GMT, RFC, etc.)
  try {
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    return null;
  }
  return str;
}

export async function getSubtareaEtapas(subtareaId) {
  const rows = await query(
    `SELECT ep.id, ep.proceso_id, ep.etapa_id, ep.aplica, ep.fecha_planificada,
            COALESCE(sg.estado, 'pendiente') AS estado,
            sg.fecha_real, sg.responsable_id, sg.observaciones,
            ec.nombre AS etapa_nombre
     FROM etapas_proceso ep
     JOIN etapas_catalogo ec ON ep.etapa_id = ec.id
     LEFT JOIN (
       SELECT DISTINCT proceso_id, etapa_id,
              FIRST_VALUE(estado) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as estado,
              FIRST_VALUE(fecha_real) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as fecha_real,
              FIRST_VALUE(responsable_id) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as responsable_id,
              FIRST_VALUE(observaciones) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as observaciones
       FROM seguimiento_etapas
     ) sg ON sg.proceso_id = ep.proceso_id AND sg.etapa_id = ep.etapa_id
     WHERE ep.proceso_id = ? AND ep.aplica = 1
     ORDER BY ep.etapa_id`,
    [subtareaId]
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.responsableId = row.responsable_id ? Number(row.responsable_id) : null;

    function toISODate(val) {
      if (!val) return null;
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    }

    const fechaPlanificada = toISODate(item.fechaPlanificada);
    const fechaReal = toISODate(item.fechaReal);

    item.fechaPlanificada = fechaPlanificada;
    item.fechaReal = fechaReal;

    const estadoNormalizado = String(item.estado || '').toLowerCase().trim();
    item.diasRetraso = null;

    if (estadoNormalizado === 'completado' && fechaReal && fechaPlanificada) {
      const parseYYYYMMDD = (dateStr) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
      };

      const realDate = parseYYYYMMDD(fechaReal);
      const planificadaDate = parseYYYYMMDD(fechaPlanificada);
      const diffTime = realDate - planificadaDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      item.diasRetraso = Math.max(0, diffDays);
    }

    return item;
  });
}

export async function getSubtareaEtapasAll(subtareaId) {
  const rows = await query(
    `SELECT ep.id, ep.proceso_id, ep.etapa_id, ep.aplica, ep.fecha_planificada,
            COALESCE(sg.estado, 'pendiente') AS estado,
            sg.fecha_real, sg.responsable_id, sg.observaciones,
            ec.nombre AS etapa_nombre
     FROM etapas_proceso ep
     JOIN etapas_catalogo ec ON ep.etapa_id = ec.id
     LEFT JOIN (
       SELECT DISTINCT proceso_id, etapa_id,
              FIRST_VALUE(estado) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as estado,
              FIRST_VALUE(fecha_real) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as fecha_real,
              FIRST_VALUE(responsable_id) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as responsable_id,
              FIRST_VALUE(observaciones) OVER (PARTITION BY proceso_id, etapa_id ORDER BY created_at DESC) as observaciones
       FROM seguimiento_etapas
     ) sg ON sg.proceso_id = ep.proceso_id AND sg.etapa_id = ep.etapa_id
     WHERE ep.proceso_id = ?
     ORDER BY ep.etapa_id`,
    [subtareaId]
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.responsableId = row.responsable_id ? Number(row.responsable_id) : null;

    function toISODate(val) {
      if (!val) return null;
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    }

    const fechaPlanificada = toISODate(item.fechaPlanificada);
    const fechaReal = toISODate(item.fechaReal);

    item.fechaPlanificada = fechaPlanificada;
    item.fechaReal = fechaReal;

    const estadoNormalizado = String(item.estado || '').toLowerCase().trim();
    item.diasRetraso = null;

    if (estadoNormalizado === 'completado' && fechaReal && fechaPlanificada) {
      const parseYYYYMMDD = (dateStr) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateStr);
      };

      const realDate = parseYYYYMMDD(fechaReal);
      const planificadaDate = parseYYYYMMDD(fechaPlanificada);
      const diffTime = realDate - planificadaDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      item.diasRetraso = Math.max(0, diffDays);
    }

    return item;
  });
}

function normalizarEstadoSeguimiento(estado) {
  return estado === 'completado' ? 'completado' : 'pendiente';
}

function fechaHoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarFechaManual(fecha) {
  if (!fecha) return null;
  // Si es un objeto Date, obtener yyyy-MM-dd en local, no UTC
  if (fecha instanceof Date) {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const valor = String(fecha).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }
  const soloFechaDesdeDateTime = valor.match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?$/);
  if (soloFechaDesdeDateTime?.[1]) {
    return soloFechaDesdeDateTime[1];
  }
  // Si contiene T, extraer solo la fecha
  if (valor.includes('T')) {
    const soloFecha = valor.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha) ? soloFecha : null;
  }
  // No intentar parseo general para evitar desfases de zona horaria
  return null;
}

export async function setSubtareaEtapas(subtareaId, etapas) {
  console.log(`[setSubtareaEtapas] Iniciando con ${etapas?.length || 0} etapas para proceso ${subtareaId}`);

  const existentes = await query(
    'SELECT etapa_id, estado, fecha_real FROM seguimiento_etapas WHERE proceso_id = ?',
    [subtareaId]
  );
  const existentesPorEtapa = new Map(
    existentes.map((row) => [Number(row.etapa_id), row])
  );

  const etapasEnriquecidas = [];
  for (const etapa of etapas) {
    const etapaId = Number(etapa.etapaId);
    const existente = existentesPorEtapa.get(etapaId);
    const responsable = await resolverResponsable(etapa || {});
    const estadoNormalizado = normalizarEstadoSeguimiento(etapa.estado || 'pendiente');
    const estadoFinal = estadoNormalizado;
    const fechaManual = normalizarFechaManual(etapa.fechaReal);
    const fechaRealFinal = estadoFinal !== 'completado'
      ? null
      : (ALLOW_MANUAL_COMPLETION_DATE
        ? (fechaManual || existente?.fecha_real || fechaHoyISO())
        : (existente?.fecha_real || fechaHoyISO()));

    const fechaPlanificadaFinal = normalizarFechaManual(etapa.fechaPlanificada) || null;

    console.log(`  [Etapa ${etapaId}] Guardando:`, {
      aplica: etapa.aplica,
      fechaPlanificada: etapa.fechaPlanificada,
      fechaPlanificadaFinal,
      estado: etapa.estado,
      estadoFinal,
      fechaReal: etapa.fechaReal,
      fechaRealFinal
    });

    etapasEnriquecidas.push({
      etapaId,
      aplica: Boolean(etapa.aplica),
      fechaPlanificada: fechaPlanificadaFinal,
      estadoFinal,
      fechaRealFinal,
      responsableId: responsable.id,
      responsableNombre: responsable.nombre,
      observaciones: etapa.observaciones ? normalizeTextEncoding(etapa.observaciones, { trim: true }) : null
    });
  }

  console.log(`[setSubtareaEtapas] Enriquecidas ${etapasEnriquecidas.length} etapas`);

  const conn = await getPool().getConnection();

  try {
    await conn.beginTransaction();
    console.log(`[setSubtareaEtapas] Transacción iniciada`);

    let procesadas = 0;
    for (const etapa of etapasEnriquecidas) {
      await conn.execute(
        `INSERT INTO etapas_proceso (proceso_id, etapa_id, aplica, fecha_planificada)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           aplica = VALUES(aplica),
           fecha_planificada = VALUES(fecha_planificada)`,
        [subtareaId, etapa.etapaId, etapa.aplica, etapa.fechaPlanificada]
      );

      const existe = Boolean(existentesPorEtapa.get(etapa.etapaId));
      if (existe) {
        await conn.execute(
          `INSERT INTO seguimiento_etapas (proceso_id, etapa_id, estado, fecha_real, responsable_id, observaciones)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             estado = VALUES(estado),
             fecha_real = VALUES(fecha_real),
             responsable_id = VALUES(responsable_id),
             observaciones = VALUES(observaciones)`,
          [
            subtareaId,
            etapa.etapaId,
            etapa.estadoFinal,
            etapa.fechaRealFinal,
            etapa.responsableId,
            etapa.observaciones
          ]
        );
      } else {
        await conn.execute(
          `INSERT INTO seguimiento_etapas (proceso_id, etapa_id, estado, fecha_real, responsable_id, observaciones)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            subtareaId,
            etapa.etapaId,
            etapa.estadoFinal,
            etapa.fechaRealFinal,
            etapa.responsableId,
            etapa.observaciones
          ]
        );
      }
      procesadas++;
    }

    await conn.commit();
    console.log(`[setSubtareaEtapas] Transacción confirmada. ${procesadas} etapas procesadas`);
  } catch (error) {
    console.error(`[setSubtareaEtapas] Error durante transacción:`, error);
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const resultado = await getSubtareaEtapas(subtareaId);
  console.log(`[setSubtareaEtapas] Final: ${resultado?.length || 0} etapas retornadas`);
  return resultado;
}

export async function actualizarEtapaSubtarea(codigoOlympo, etapaId, data = {}) {
  const subtarea = await getSubtareaByCodigoOlympo(codigoOlympo);
  if (!subtarea) return null;

  const existentes = await query(
    'SELECT estado, fecha_real FROM seguimiento_etapas WHERE proceso_id = ? AND etapa_id = ? LIMIT 1',
    [subtarea.id, etapaId]
  );
  const existente = existentes[0] || null;
  const estadoFinal = normalizarEstadoSeguimiento(data.estado || 'pendiente');
  const fechaManual = normalizarFechaManual(data.fechaReal || data.fecha_real);
  const fechaRealFinal = estadoFinal !== 'completado'
    ? null
    : (ALLOW_MANUAL_COMPLETION_DATE
      ? (fechaManual || existente?.fecha_real || fechaHoyISO())
      : (existente?.fecha_real || fechaHoyISO()));
  const responsable = await resolverResponsable(data);

  await query(
    `INSERT INTO etapas_proceso (proceso_id, etapa_id, aplica, fecha_planificada)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE aplica = VALUES(aplica), fecha_planificada = VALUES(fecha_planificada)`,
    [
      subtarea.id,
      etapaId,
      true,
      data.fechaPlanificada || null
    ]
  );

  await query(
    `INSERT INTO seguimiento_etapas (proceso_id, etapa_id, estado, fecha_planificada, fecha_real, responsable_id, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       fecha_planificada = VALUES(fecha_planificada),
       fecha_real = VALUES(fecha_real),
       responsable_id = VALUES(responsable_id),
       observaciones = VALUES(observaciones)`,
    [
      subtarea.id,
      etapaId,
      estadoFinal,
      data.fechaPlanificada || null,
      fechaRealFinal,
      responsable.id,
      data.observaciones ? normalizeTextEncoding(data.observaciones, { trim: true }) : null
    ]
  );

  const etapas = await getSubtareaEtapas(subtarea.id);
  return etapas.find((e) => Number(e.etapaId) === Number(etapaId)) || null;
}

export async function crearEtapaPersonalizada(nombre) {
  const result = await query(
    'INSERT INTO etapas_catalogo (nombre, clasificacion) VALUES (?, ?)',
    [nombre, 'Personalizada']
  );
  const rows = await query('SELECT id, nombre, clasificacion FROM etapas_catalogo WHERE id = ?', [result.insertId]);
  return toCamelRow(rows[0]);
}

export async function obtenerTodasEtapas() {
  const rows = await query('SELECT id, nombre, clasificacion FROM etapas_catalogo ORDER BY nombre');
  return rows.map(toCamelRow);
}

export async function getDatabaseSnapshot() {
  const [procesos, etapas, etapasDelProceso, seguimiento, notificaciones, responsables, direcciones] = await Promise.all([
    query('SELECT * FROM procesos ORDER BY id'),
    query('SELECT * FROM etapas_catalogo ORDER BY nombre'),
    query('SELECT * FROM etapas_proceso ORDER BY proceso_id, etapa_id'),
    query('SELECT * FROM seguimiento_etapas ORDER BY proceso_id, etapa_id'),
    query('SELECT * FROM notificaciones ORDER BY fecha DESC LIMIT 100'),
    getAllResponsables(),
    getDireccionesCatalogo()
  ]);

  return {
    direcciones,
    responsables,
    actividades: procesos.map(toCamelRow),
    tareas: [],
    hitosContratacion: [],
    procesos: procesos.map(toCamelRow),
    etapas: etapas.map(toCamelRow),
    etapasDelProceso: etapasDelProceso.map(toCamelRow),
    seguimiento: seguimiento.map(toCamelRow),
    notificaciones: notificaciones.map(toCamelRow)
  };
}

export async function insertNotificacion(payload) {
  const result = await query(
    `INSERT INTO notificaciones (tipo, destinatario, asunto, mensaje, tarea_id, fecha, leida, fecha_leida, enviada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.tipo,
      payload.destinatario,
      payload.asunto,
      payload.mensaje,
      payload.tareaId || null,
      payload.fecha || new Date(),
      payload.leida ?? false,
      payload.fechaLeida || null,
      payload.enviada ?? false
    ]
  );
  const rows = await query('SELECT * FROM notificaciones WHERE id = ?', [result.insertId]);
  return rows[0] ? toCamelRow(rows[0]) : null;
}

export async function marcarNotificacionLeida(id) {
  await query('UPDATE notificaciones SET leida = true, fecha_leida = ? WHERE id = ?', [new Date(), id]);
  const rows = await query('SELECT * FROM notificaciones WHERE id = ?', [id]);
  return rows[0] ? toCamelRow(rows[0]) : null;
}

export async function getSeguimientosDiarios(procesoId, etapaId, dias = 30) {
  const rows = await query(
    `SELECT ce.id, ce.proceso_id, ce.etapa_id, ce.observaciones,
            ce.responsable_id, COALESCE(u.nombre, 'Sin responsable') as responsable_nombre,
            ce.created_at, ce.updated_at
     FROM comentarios_etapa ce
     LEFT JOIN usuarios u ON u.id = ce.responsable_id
     WHERE ce.proceso_id = ? AND ce.etapa_id = ?
       AND ce.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY ce.created_at DESC
     LIMIT 100`,
    [procesoId, etapaId, dias]
  );
  return rows.map(toCamelRow);
}

export async function getSeguimientosResumenPorSubtarea(procesoId, dias = 3650) {
  const rows = await query(
    `SELECT etapa_id,
            COUNT(*) AS total
     FROM comentarios_etapa
     WHERE proceso_id = ?
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY etapa_id`,
    [procesoId, dias]
  );

  return rows.map((row) => ({
    etapaId: Number(row.etapa_id),
    total: Number(row.total || 0),
    tieneAlerta: false
  }));
}

function buildIsoWeekMeta(dateValue) {
  const source = new Date(dateValue);
  if (Number.isNaN(source.getTime())) return null;

  const date = new Date(Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  const year = date.getUTCFullYear();

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() || 7) - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const start = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
  const end = `${sunday.getUTCFullYear()}-${String(sunday.getUTCMonth() + 1).padStart(2, '0')}-${String(sunday.getUTCDate()).padStart(2, '0')}`;
  const label = `S${String(week).padStart(2, '0')} ${String(monday.getUTCDate()).padStart(2, '0')}/${String(monday.getUTCMonth() + 1).padStart(2, '0')}`;

  return {
    key: `${year}-W${String(week).padStart(2, '0')}`,
    year,
    week,
    start,
    end,
    label,
    order: (year * 100) + week
  };
}

function matchesDashboardFilter(value, expected) {
  if (!expected) return true;
  return normalizeDashboardFilterValue(value) === normalizeDashboardFilterValue(expected);
}

function normalizeDashboardFilterValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function matchesDashboardSearch(subtarea, busqueda) {
  const query = normalizeDashboardFilterValue(busqueda);
  if (!query) return true;

  const corpus = [subtarea?.nombre, subtarea?.direccionNombre, subtarea?.responsableNombre]
    .map((value) => normalizeDashboardFilterValue(value))
    .join(' ');

  return corpus.includes(query);
}

function matchesMontoRange(value, selectedRange) {
  if (!selectedRange) return true;

  const monto = Number(value || 0);
  const ranges = {
    '0-1,000': { min: 0, max: 1000 },
    '1,001-5,000': { min: 1001, max: 5000 },
    '5,001-10,000': { min: 5001, max: 10000 },
    '10,001+': { min: 10001, max: Number.POSITIVE_INFINITY }
  };
  const range = ranges[selectedRange] || null;
  if (!range) return true;
  return monto >= range.min && monto <= range.max;
}

function obtenerEstadoProcesoDashboardResumen(subtarea) {
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

function obtenerPresupuestoDashboardResumen(subtarea) {
  const valor = Number(subtarea?.presupuesto ?? subtarea?.presupuesto2026Inicial ?? subtarea?.presupuesto_2026_inicial ?? 0);
  return Number.isFinite(valor) ? valor : 0;
}

function dashboardSubtareaCuentaEnIndicadores(subtarea) {
  const estado = obtenerEstadoProcesoDashboardResumen(subtarea);
  if (estado === 0) return false;
  if (estado === 1 && obtenerPresupuestoDashboardResumen(subtarea) <= 0) return false;
  return true;
}

function mergeWeeklySeries(seriesA = [], seriesB = []) {
  const merged = new Map();

  for (const item of [...seriesA, ...seriesB]) {
    if (!item?.key) continue;
    const existing = merged.get(item.key) || {
      key: item.key,
      label: item.label,
      year: item.year,
      week: item.week,
      start: item.start,
      end: item.end,
      order: item.order,
      etapasProgramadas: 0,
      alertas: 0
    };

    existing.etapasProgramadas += Number(item.etapasProgramadas || 0);
    existing.alertas += Number(item.alertas || 0);
    merged.set(item.key, existing);
  }

  return Array.from(merged.values()).sort((a, b) => a.order - b.order);
}

export async function getDashboardWeeklySummary(scope = {}, filters = {}) {
  const subtareas = await getAllSubtareasByScope(scope);
  const area = String(filters.area || '').trim();
  const responsable = String(filters.responsable || '').trim();
  const direccion = String(filters.direccion || '').trim();
  const tipoPlan = String(filters.tipoPlan || '').trim();
  const cuatrimestre = String(filters.cuatrimestre || '').trim();
  const tipoContratacion = String(filters.tipoContratacion || '').trim();
  const busqueda = String(filters.busqueda || '').trim();
  const monto = String(filters.monto || '').trim();

  const filteredSubtareas = subtareas.filter((subtarea) => {
    const areaOk = matchesDashboardFilter(subtarea?.direccionNombre || SIN_DIRECCION_NOMBRE, area);
    const responsableBase = subtarea?.responsableNombre || null;
    const responsableOk = matchesDashboardFilter(responsableBase, responsable);
    const direccionOk = matchesDashboardFilter(subtarea?.direccionNombre || SIN_DIRECCION_NOMBRE, direccion);
    const tipoPlanOk = matchesDashboardFilter(subtarea?.pacNoPac || subtarea?.tipoPlan || '', tipoPlan);
    const cuatrimestreOk = !cuatrimestre || String(subtarea?.cuatrimestre ?? '').trim() === cuatrimestre;
    const tipoContratacionOk = matchesDashboardFilter(subtarea?.procedimientoSugerido || subtarea?.procedimiento_sugerido || '', tipoContratacion);
    const busquedaOk = matchesDashboardSearch(subtarea, busqueda);
    const montoOk = matchesMontoRange(subtarea?.presupuesto, monto);
    return dashboardSubtareaCuentaEnIndicadores(subtarea)
      && areaOk
      && responsableOk
      && direccionOk
      && tipoPlanOk
      && cuatrimestreOk
      && tipoContratacionOk
      && busquedaOk
      && montoOk;
  });


  // Mapear semanas: etapas planificadas y cumplidas
  const etapasSeriesMap = new Map();
  const cumplidasSeriesMap = new Map();
  for (const subtarea of filteredSubtareas) {
    const seguimiento = Array.isArray(subtarea?.seguimientoEtapas) ? subtarea.seguimientoEtapas : [];
    const etapas = seguimiento.length
      ? seguimiento
      : (Array.isArray(subtarea?.etapas) ? subtarea.etapas : []);

    for (const etapa of etapas) {
      // Planificadas
      const fechaBase = etapa?.fechaPlanificada || etapa?.fechaTentativa;
      if (fechaBase) {
        const meta = buildIsoWeekMeta(fechaBase);
        if (meta) {
          const current = etapasSeriesMap.get(meta.key) || { ...meta, etapasProgramadas: 0, alertas: 0, etapasCumplidas: 0 };
          current.etapasProgramadas += 1;
          etapasSeriesMap.set(meta.key, current);
        }
      }
      // Cumplidas
      if (etapa?.fechaReal && String(etapa.fechaReal).trim() !== '') {
        const metaCumplida = buildIsoWeekMeta(etapa.fechaReal);
        if (metaCumplida) {
          const currentC = cumplidasSeriesMap.get(metaCumplida.key) || { ...metaCumplida, etapasProgramadas: 0, alertas: 0, etapasCumplidas: 0 };
          currentC.etapasCumplidas += 1;
          cumplidasSeriesMap.set(metaCumplida.key, currentC);
        }
      }
    }
  }

  const filteredSubtareaIds = filteredSubtareas
    .map((subtarea) => Number(subtarea?.id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  // Alertas no implementadas en nuevo sistema de seguimiento_etapas
  const alertRows = [];

  const alertSeriesMap = new Map();
  for (const row of alertRows) {
    const meta = buildIsoWeekMeta(row.fecha);
    if (!meta) continue;
    const current = alertSeriesMap.get(meta.key) || { ...meta, etapasProgramadas: 0, alertas: 0 };
    current.alertas += 1;
    alertSeriesMap.set(meta.key, current);
  }


  // Unir series: incluir todas las semanas con alertas aunque no haya etapas planificadas/cumplidas
  const allKeys = new Set([
    ...Array.from(etapasSeriesMap.keys()),
    ...Array.from(cumplidasSeriesMap.keys()),
    ...Array.from(alertSeriesMap.keys())
  ]);
  const merged = new Map();
  for (const key of allKeys) {
    const base = etapasSeriesMap.get(key) || cumplidasSeriesMap.get(key) || alertSeriesMap.get(key) || {};
    merged.set(key, {
      ...base,
      etapasProgramadas: (etapasSeriesMap.get(key)?.etapasProgramadas) || 0,
      etapasCumplidas: (cumplidasSeriesMap.get(key)?.etapasCumplidas) || 0,
      alertas: (alertSeriesMap.get(key)?.alertas) || 0
    });
  }
  const series = Array.from(merged.values()).sort((a, b) => a.order - b.order);

  return {
    series,
    mejorSemanaCumplimiento: series.reduce((best, item) => (item.etapasProgramadas > (best?.etapasProgramadas || 0) ? item : best), null),
    peorSemanaAlertas: series.reduce((best, item) => (item.alertas > (best?.alertas || 0) ? item : best), null)
  };
}

export async function createSeguimientoDiario(data) {
  const responsable = await resolverResponsable(data || {});
  const procesoId = data.procesoId || data.subtareaId;
  const etapaId = data.etapaId;
  const observaciones = normalizeTextEncoding(data.comentario || data.observaciones || '', { trim: true });
  const responsableId = responsable.id;

  console.log(`🔧 createSeguimientoDiario: proceso=${procesoId}, etapa=${etapaId}, observaciones="${observaciones.substring(0, 50)}..."`);

  const result = await query(
    `INSERT INTO comentarios_etapa
     (proceso_id, etapa_id, observaciones, responsable_id)
     VALUES (?, ?, ?, ?)`,
    [procesoId, etapaId, observaciones, responsableId]
  );

  console.log(`✅ Comentario insertado: id=${result.insertId}`);
  return result.insertId;
}

export async function updateSeguimientoDiario(id, data) {
  const updates = [];
  const values = [];
  if (data.comentario !== undefined || data.observaciones !== undefined) {
    updates.push('observaciones = ?');
    values.push(normalizeTextEncoding(data.comentario || data.observaciones || '', { trim: true }));
  }
  if (data.fecha !== undefined) {
    updates.push('fecha_real = ?');
    values.push(data.fecha);
  }
  if (data.responsableId !== undefined || data.responsableNombre !== undefined || data.responsable !== undefined) {
    const responsable = await resolverResponsable(data || {});
    updates.push('responsable_id = ?');
    values.push(responsable.id);
  }
  if (!updates.length) return;
  updates.push('updated_at = UTC_TIMESTAMP()');
  values.push(id);
  await query(`UPDATE seguimiento_etapas SET ${updates.join(', ')} WHERE id = ?`, values);
}

export async function deleteSeguimientoDiario(id) {
  const result = await query('DELETE FROM comentarios_etapa WHERE id = ?', [id]);
  if (!result.affectedRows) throw new Error('Comentario no encontrado');
}

// ========== VERSIONES Y REFORMAS ==========

export async function getAllVersiones() {
  const rows = await query(`SELECT * FROM versiones ORDER BY id DESC`);
  return rows.map(toCamelRow);
}

export async function getVersionById(id) {
  const rows = await query(
    `SELECT * FROM versiones WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) return null;

  const version = toCamelRow(rows[0]);

  // Obtener procesos de esta versión
  const procesos = await query(
    `SELECT id, version_id, codigo_olympo, subtarea, direccion, pac_no_pac,
            presupuesto_con_reformas, activo, proceso_en_riesgo, created_at
     FROM procesos
     WHERE version_id = ?
     ORDER BY codigo_olympo`,
    [id]
  );

  version.procesos = procesos.map(toCamelRow);
  return version;
}

export async function getVersionActual() {
  const rows = await query(
    `SELECT * FROM versiones WHERE activo = 1 ORDER BY id DESC LIMIT 1`
  );

  return rows.length > 0 ? toCamelRow(rows[0]) : null;
}

export async function getActividadesByVersion(versionId, listaRapida = false) {
  // Query rápida: procesos con etapas optimizadas
  if (listaRapida) {
    const rows = await query(
      `SELECT p.id, p.version_id, p.codigo_olympo, p.subtarea, p.direccion,
              p.presupuesto_2026_inicial, p.pac_no_pac, p.activo, p.proceso_en_riesgo,
              p.tipo_contratacion,
              v.numero AS numero_reforma, v.nombre as version_nombre
       FROM procesos p
       LEFT JOIN versiones v ON v.id = p.version_id
       WHERE p.version_id = ? AND p.activo = 1
       ORDER BY p.codigo_olympo LIMIT 500`,
      [versionId]
    );

    const procesoMap = new Map();
    for (const row of rows) {
      const procesoId = row.id;
      if (!procesoMap.has(procesoId)) {
        const proceso = toCamelRow(row);
        proceso.nombre = proceso.subtarea;
        proceso.presupuesto = parseFloat(proceso.presupuesto2026Inicial) || 0;
        proceso.tipoPlan = proceso.pacNoPac;
        proceso.estado = 'Precontractual';
        proceso.avanceGeneral = 0;
        proceso.etapas = [];
        proceso.seguimientoEtapas = [];
        procesoMap.set(procesoId, proceso);
      }
    }

    let procesos = Array.from(procesoMap.values());

    // Obtener etapas mínimas
    const procesosIds = procesos.map(p => p.id);
    const etapasMap = new Map();

    if (procesosIds.length > 0) {
      const placeholders = procesosIds.map(() => '?').join(',');
      const etapasData = await query(
        `SELECT DISTINCT ep.id, ep.proceso_id, ep.etapa_id, ep.fecha_planificada,
                ec.nombre, ec.clasificacion, sg.estado, sg.fecha_real, ep.aplica
         FROM etapas_proceso ep
         INNER JOIN etapas_catalogo ec ON ec.id = ep.etapa_id
         LEFT JOIN seguimiento_etapas sg ON sg.proceso_id = ep.proceso_id AND sg.etapa_id = ep.etapa_id
         WHERE ep.proceso_id IN (${placeholders})
         ORDER BY ep.proceso_id, ep.etapa_id`,
        procesosIds
      );

      for (const e of etapasData) {
        const procesoId = e.proceso_id;
        if (!etapasMap.has(procesoId)) {
          etapasMap.set(procesoId, []);
        }

        const etapaId = e.etapa_id;
        const existe = etapasMap.get(procesoId).some(et => et.etapaId === etapaId);
        if (!existe) {
          etapasMap.get(procesoId).push({
            id: e.id,
            etapaId: etapaId,
            etapaNombre: e.nombre,
            nombre: e.nombre,
            orden: e.orden,
            clasificacion: e.clasificacion,
            fechaPlanificada: e.fecha_planificada ? String(e.fecha_planificada).split('T')[0] : null,
            estado: e.estado || 'pendiente',
            fechaReal: e.fecha_real ? String(e.fecha_real).split('T')[0] : null,
            observaciones: null,
            aplica: e.aplica === 1 || e.aplica === true
          });
        }
      }
    }

    // Mapear etapas a procesos
    for (const proceso of procesos) {
      const etapas = etapasMap.get(proceso.id) || [];
      proceso.etapas = etapas;
      proceso.seguimientoEtapas = etapas
        .filter(e => Number(e.aplica) === 1 || e.aplica === true)
        .map(etapa => ({
          ...etapa,
          fechaPlanificada: etapa.fechaPlanificada || null
        }));
    }

    return procesos;
  }

  // Query completa: todos los campos del proceso
  const rows = await query(
    `SELECT p.*, v.numero AS numero_reforma, v.nombre as version_nombre
     FROM procesos p
     LEFT JOIN versiones v ON v.id = p.version_id
     WHERE p.version_id = ? AND p.activo = 1
     ORDER BY p.codigo_olympo`,
    [versionId]
  );

  // Mapear procesos
  const procesoMap = new Map();
  for (const row of rows) {
    const procesoId = row.id;
    if (!procesoMap.has(procesoId)) {
      const proceso = toCamelRow(row);
      proceso.nombre = proceso.subtarea;
      proceso.presupuesto = parseFloat(proceso.presupuestoConReformas) || 0;
      proceso.tipoPlan = proceso.pacNoPac;
      proceso.estado = proceso.estado || 'Precontractual';
      proceso.avanceGeneral = 0;
      procesoMap.set(procesoId, proceso);
    }
  }

  let procesos = Array.from(procesoMap.values());

  // Obtener etapas
  const procesosIds = procesos.map(p => p.id);
  const etapasMap = new Map();

  if (procesosIds.length > 0) {
    const placeholders = procesosIds.map(() => '?').join(',');
    const etapasData = await query(
      `SELECT DISTINCT ep.id, ep.proceso_id, ep.etapa_id, ep.fecha_planificada,
              ec.nombre AS etapa_nombre, ec.clasificacion, ec.descripcion,
              sg.estado, sg.fecha_real, sg.observaciones, ep.aplica
       FROM etapas_proceso ep
       JOIN etapas_catalogo ec ON ec.id = ep.etapa_id
       LEFT JOIN seguimiento_etapas sg ON sg.proceso_id = ep.proceso_id AND sg.etapa_id = ep.etapa_id
       WHERE ep.proceso_id IN (${placeholders})
       ORDER BY ep.proceso_id, ep.etapa_id`,
      procesosIds
    );

    for (const e of etapasData) {
      const procesoId = e.proceso_id;
      if (!etapasMap.has(procesoId)) {
        etapasMap.set(procesoId, []);
      }
      etapasMap.get(procesoId).push({
        id: e.id,
        etapaId: e.etapa_id,
        etapaNombre: e.etapa_nombre,
        orden: e.orden,
        clasificacion: e.clasificacion,
        descripcion: e.descripcion,
        estado: e.estado || 'pendiente',
        fechaPlanificada: e.fecha_planificada ? String(e.fecha_planificada).split('T')[0] : null,
        fechaReal: e.fecha_real ? String(e.fecha_real).split('T')[0] : null,
        observaciones: e.observaciones,
        aplica: e.aplica === 1 || e.aplica === true
      });
    }
  }

  // Mapear etapas a procesos
  for (const proceso of procesos) {
    const etapas = etapasMap.get(proceso.id) || [];
    proceso.etapas = etapas;
    proceso.seguimientoEtapas = etapas
      .filter(e => Number(e.aplica) === 1 || e.aplica === true)
      .map(etapa => ({
        ...etapa,
        fechaPlanificada: etapa.fechaPlanificada || null
      }));
  }

  // Consolidar procesos por nombre exacto (múltiples partidas del mismo contrato)
  const procesosConsolidados = new Map();

  for (const proceso of procesos) {
    const nombreExacto = proceso.nombre;

    if (!procesosConsolidados.has(nombreExacto)) {
      procesosConsolidados.set(nombreExacto, {
        ...proceso,
        partidas: [{
          id: proceso.id,
          codigoOlympo: proceso.codigoOlympo,
          presupuesto: proceso.presupuesto,
          direccion: proceso.direccion
        }],
        tieneMultiplesPartidas: false
      });
    } else {
      const consolidado = procesosConsolidados.get(nombreExacto);
      consolidado.presupuesto += proceso.presupuesto;
      consolidado.partidas.push({
        id: proceso.id,
        codigoOlympo: proceso.codigoOlympo,
        presupuesto: proceso.presupuesto,
        direccion: proceso.direccion
      });
      consolidado.tieneMultiplesPartidas = true;
      consolidado.codigoOlympo = 'Múltiples partidas';
    }
  }

  procesos = Array.from(procesosConsolidados.values());
  return procesos;
}

// Obtener procesos de la versión activa actual (para usuarios normales)
export async function getSubtareasVersionActual() {
  const versionActual = await getVersionActual();
  if (!versionActual) {
    // Fallback: retornar de tabla antigua si no hay versión activa
    return getAllSubtareas();
  }
  return getActividadesByVersion(versionActual.id);
}

// Reactivar una versión aprobada (cambiarla a activa)
export async function reactivarVersion(versionId, usuarioActivacion) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener versión a activar
    const [version] = await connection.query(
      'SELECT id FROM versiones WHERE id = ?',
      [versionId]
    );

    if (version.length === 0) {
      throw new Error('Versión no encontrada');
    }

    // Desactivar versión anterior
    await connection.query(
      'UPDATE versiones SET activo = 0 WHERE activo = 1'
    );

    // Activar esta versión
    await connection.query(
      'UPDATE versiones SET activo = 1 WHERE id = ?',
      [versionId]
    );

    // Registrar cambio (tabla legacy, tolerar ausencia en la nueva estructura)
    try {
      await connection.query(
        `INSERT INTO versiones_cambios (
          version_id, tipo_cambio, usuario, descripcion
        ) VALUES (?, 'activar', ?, 'Versión reactivada')`,
        [versionId, usuarioActivacion]
      );
    } catch (auditError) {
      console.warn('No se pudo registrar en versiones_cambios:', auditError.message);
    }

    await connection.commit();
    return await getVersionById(versionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

// Crear nueva reforma vacía (borrador)
export async function crearNuevaReforma(anio, descripcion = '', usuario = 'SISTEMA') {
  if (!anio || anio < 2020 || anio > 2030) {
    throw new Error('Año inválido. Debe estar entre 2020 y 2030');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener el siguiente número de reforma
    const [result] = await connection.query(
      'SELECT MAX(numero) as max_num FROM versiones'
    );
    const numeroReforma = (result[0]?.max_num || 0) + 1;

    // Crear nueva reforma
    const [insertResult] = await connection.query(
      `INSERT INTO versiones (numero, nombre, descripcion, activo)
       VALUES (?, ?, ?, 0)`,
      [numeroReforma, `Reforma ${numeroReforma} ${anio}`, descripcion]
    );

    const versionId = insertResult.insertId;

    // Registrar cambio (tabla legacy, tolerar ausencia en la nueva estructura)
    try {
      await connection.query(
        `INSERT INTO versiones_cambios (
          version_id, tipo_cambio, usuario, descripcion, cantidad_registros
        ) VALUES (?, 'crear', ?, 'Nueva reforma creada', 0)`,
        [versionId, usuario]
      );
    } catch (auditError) {
      console.warn('No se pudo registrar en versiones_cambios:', auditError.message);
    }

    await connection.commit();

    return await getVersionById(versionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

// Duplicar procesos de una reforma a otra
export async function duplicarProcesos(versionIdDestino, versionIdOrigen) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener procesos de la versión origen (DE TABLA PROCESOS)
    const [procesosOrigen] = await connection.query(
      `SELECT id, codigo_olympo, codigo_unico_proceso, subtarea, direccion, responsable_id,
              pac_no_pac, tipo_contratacion, cpc, fuente_financiamiento,
              presupuesto_con_reformas, partida_presupuestaria, cuatrimestre,
              activo, proceso_en_riesgo, riesgo_comentario
       FROM procesos WHERE version_id = ?`,
      [versionIdOrigen]
    );

    // Insertar en versión destino (EN TABLA PROCESOS)
    let cantInsertados = 0;
    for (const proceso of procesosOrigen) {
      await connection.query(
        `INSERT INTO procesos (
          version_id, codigo_olympo, codigo_unico_proceso, subtarea, direccion, responsable_id,
          pac_no_pac, tipo_contratacion, cpc, fuente_financiamiento,
          presupuesto_con_reformas, partida_presupuestaria, cuatrimestre,
          activo, proceso_en_riesgo, riesgo_comentario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionIdDestino, proceso.codigo_olympo, proceso.codigo_unico_proceso, proceso.subtarea,
          proceso.direccion, proceso.responsable_id, proceso.pac_no_pac, proceso.tipo_contratacion,
          proceso.cpc, proceso.fuente_financiamiento, proceso.presupuesto_con_reformas,
          proceso.partida_presupuestaria, proceso.cuatrimestre,
          proceso.activo, proceso.proceso_en_riesgo, proceso.riesgo_comentario
        ]
      );
      cantInsertados++;
    }

    // Registrar cambio (tabla legacy, tolerar ausencia en la nueva estructura)
    try {
      await connection.query(
        `INSERT INTO versiones_cambios (
          version_id, tipo_cambio, usuario, descripcion, cantidad_registros
        ) VALUES (?, 'duplicar', 'SISTEMA', ?, ?)`,
        [versionIdDestino, `Procesos duplicados desde reforma ${versionIdOrigen}`, cantInsertados]
      );
    } catch (auditError) {
      console.warn('No se pudo registrar en versiones_cambios:', auditError.message);
    }

    await connection.commit();
    return cantInsertados;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

// Copiar seguimiento de versión anterior basado en codigo_olympo
export async function copiarSeguimientoDeReformaAnterior(versionIdDestino) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener la versión anterior (la más reciente distinta a la actual)
    const [versionAnterior] = await connection.query(
      `SELECT id FROM versiones
       WHERE id != ?
       ORDER BY created_at DESC LIMIT 1`,
      [versionIdDestino]
    );

    if (!versionAnterior || versionAnterior.length === 0) {
      await connection.commit();
      return { copiados: 0, mensaje: 'No hay reforma anterior' };
    }

    const versionOrigenId = versionAnterior[0].id;

    // Procesos en versión destino con codigo_olympo (DE TABLA PROCESOS)
    const [procesosDestino] = await connection.query(
      `SELECT id, codigo_olympo FROM procesos
       WHERE version_id = ? AND codigo_olympo IS NOT NULL`,
      [versionIdDestino]
    );

    // Procesos en versión anterior con subtarea_id_original (DE TABLA PROCESOS)
    const [procesosOrigen] = await connection.query(
      `SELECT id, codigo_olympo, subtarea_id_original
       FROM procesos
       WHERE version_id = ? AND codigo_olympo IS NOT NULL`,
      [versionOrigenId]
    );

    // Crear mapa de procesos origen por codigo_olympo
    const procesosOrigenMap = new Map();
    procesosOrigen.forEach(p => {
      if (p.codigo_olympo) {
        procesosOrigenMap.set(p.codigo_olympo, p);
      }
    });

    // Copiar seguimiento para procesos coincidentes
    let copiados = 0;
    for (const procDestino of procesosDestino) {
      const procOrigen = procesosOrigenMap.get(procDestino.codigo_olympo);

      if (procOrigen && procOrigen.subtarea_id_original) {
        // Obtener seguimiento de la versión origen
        const [seguimientos] = await connection.query(
          `SELECT subtarea_id, etapa_id, estado, fecha_planificada, fecha_real,
                  responsable_id, responsable, observaciones
           FROM seguimiento_etapas
           WHERE subtarea_id = ?`,
          [procOrigen.subtarea_id_original]
        );

        // Copiar cada seguimiento al proceso destino
        for (const seg of seguimientos) {
          await connection.query(
            `INSERT INTO seguimiento_etapas
             (subtarea_id, etapa_id, estado, fecha_planificada, fecha_real, responsable_id, responsable, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              procDestino.id, seg.etapa_id, seg.estado, seg.fecha_planificada,
              seg.fecha_real, seg.responsable_id, seg.responsable, seg.observaciones
            ]
          );
        }

        copiados++;
      }
    }

    // Registrar cambio (tabla legacy, tolerar ausencia en la nueva estructura)
    try {
      await connection.query(
        `INSERT INTO versiones_cambios
         (version_id, tipo_cambio, usuario, descripcion, cantidad_registros)
         VALUES (?, 'copiar_seguimiento', 'SISTEMA', ?, ?)`,
        [versionIdDestino, `Seguimiento copiado de reforma anterior`, copiados]
      );
    } catch (auditError) {
      console.warn('No se pudo registrar en versiones_cambios:', auditError.message);
    }

    await connection.commit();
    return { copiados, mensaje: `Se copiaron seguimientos de ${copiados} procesos` };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

// Cargar procesos desde Excel (NUEVA ESTRUCTURA)
export async function cargarExcelVersion(versionId, datosProcesos, usuario = 'SISTEMA') {
  if (!Array.isArray(datosProcesos) || datosProcesos.length === 0) {
    throw new Error('Los datos de procesos están vacíos');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let cantInsertados = 0;
    let cantErrores = 0;
    const codigosEnVersion = new Set();

    function truncate(value, maxLen) {
      if (!value) return null;
      const str = String(value).trim();
      if (str.length > maxLen) return str.substring(0, maxLen);
      return str || null;
    }

    function parseNumber(value) {
      if (!value) return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }

    let contadorNAProcessos = 0;

    for (const proceso of datosProcesos) {
      let codigoFinal = proceso.codigo_olympo;

      if (!codigoFinal || codigoFinal === 'N/A') {
        contadorNAProcessos++;
        codigoFinal = `N/A ${String(contadorNAProcessos).padStart(2, '0')}`;
      }

      if (codigosEnVersion.has(codigoFinal)) {
        cantErrores++;
        continue;
      }
      codigosEnVersion.add(codigoFinal);

      const [existe] = await connection.query(
        'SELECT id FROM procesos WHERE codigo_olympo = ? AND version_id = ?',
        [codigoFinal, versionId]
      );

      if (existe.length > 0) {
        cantErrores++;
        continue;
      }

      try {
        await connection.query(
          `INSERT INTO procesos (
            version_id, codigo_olympo, codigo_unico_proceso, subtarea,
            direccion, partida_presupuestaria, presupuesto_con_reformas,
            pac_no_pac, tipo_contratacion, fuente_financiamiento,
            activo, proceso_en_riesgo, riesgo_comentario
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL)`,
          [
            versionId,
            codigoFinal,
            truncate(proceso.codigo_unico_proceso, 50),
            truncate(proceso.subtarea, 1000) || 'Sin descripción',
            proceso.direccion || null,
            truncate(proceso.partida_presupuestaria, 50),
            parseNumber(proceso.presupuesto_con_reformas),
            proceso.pac_no_pac || 'PAC',
            truncate(proceso.tipo_contratacion, 100),
            proceso.fuente_financiamiento || null
          ]
        );

        cantInsertados++;

      } catch (error) {
        cantErrores++;
        continue;
      }
    }

    await connection.commit();
    return {
      insertados: cantInsertados,
      errores: cantErrores,
      total: datosProcesos.length
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

// Aprobar una reforma (cambiar de borrador a aprobado)
export async function aprobarVersion(versionId, usuarioAprobacion) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener versión actual
    const [version] = await connection.query(
      'SELECT * FROM versiones WHERE id = ?',
      [versionId]
    );

    if (version.length === 0) {
      throw new Error('Versión no encontrada');
    }

    // Desactivar cualquier otra versión activa (solo una versión activa a la vez)
    await connection.query(
      `UPDATE versiones SET activo = 0 WHERE id != ?`,
      [versionId]
    );

    // Aprobar esta versión y hacerla activa
    await connection.query(
      `UPDATE versiones SET activo = 1 WHERE id = ?`,
      [versionId]
    );

    // Registrar cambio (tabla legacy, tolerar ausencia en la nueva estructura)
    try {
      await connection.query(
        `INSERT INTO versiones_cambios (
          version_id, tipo_cambio, usuario, descripcion
        ) VALUES (?, 'aprobar', ?, 'Reforma aprobada y activada')`,
        [versionId, usuarioAprobacion]
      );
    } catch (auditError) {
      console.warn('No se pudo registrar en versiones_cambios:', auditError.message);
    }

    await connection.commit();
    return await getVersionById(versionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

export async function getCambiosReforma(versionId) {
  try {
    const rows = await query(
      `SELECT id, tipo_cambio, usuario, descripcion, cantidad_registros, datos_cambio, fecha
       FROM versiones_cambios
       WHERE version_id = ?
       ORDER BY fecha DESC`,
      [versionId]
    );
    return rows.map(toCamelRow);
  } catch (error) {
    console.warn('getCambiosReforma: tabla versiones_cambios no disponible en la nueva estructura:', error.message);
    return [];
  }
}

export async function deleteVersion(versionId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar estado
    const [version] = await connection.query(
      'SELECT activo FROM versiones WHERE id = ?',
      [versionId]
    );

    if (version.length === 0) {
      throw new Error('Versión no encontrada');
    }

    if (Number(version[0].activo) === 1) {
      throw new Error('No se puede eliminar la versión activa');
    }

    // Eliminar procesos
    await connection.query(
      'DELETE FROM procesos WHERE version_id = ?',
      [versionId]
    );

    // Eliminar cambios (tabla legacy, tolerar ausencia en la nueva estructura)
    try {
      await connection.query(
        'DELETE FROM versiones_cambios WHERE version_id = ?',
        [versionId]
      );
    } catch (auditError) {
      console.warn('No se pudo eliminar de versiones_cambios:', auditError.message);
    }

    // Eliminar versión
    await connection.query(
      'DELETE FROM versiones WHERE id = ?',
      [versionId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

// Funciones auxiliares de validación
function validarDatosProcesos(procesos) {
  const errores = [];
  const codigosCampos = new Set();

  procesos.forEach((proc, idx) => {
    // Campos obligatorios
    if (!proc.codigo_olympo || !proc.codigo_olympo.trim()) {
      errores.push(`Fila ${idx + 1}: Código Olympo es obligatorio`);
    }
    if (!proc.subtarea || !proc.subtarea.trim()) {
      errores.push(`Fila ${idx + 1}: Subtarea (nombre) es obligatorio`);
    }

    // Validar presupuesto
    if (proc.presupuesto_2026_inicial !== undefined && proc.presupuesto_2026_inicial !== null) {
      const pres = parseFloat(proc.presupuesto_2026_inicial);
      if (isNaN(pres)) {
        errores.push(`Fila ${idx + 1}: Presupuesto debe ser un número`);
      }
    }

    // Validar duplicados dentro del lote
    if (codigosCampos.has(proc.codigo_olympo)) {
      errores.push(`Fila ${idx + 1}: Código duplicado: ${proc.codigo_olympo}`);
    }
    codigosCampos.add(proc.codigo_olympo);
  });

  return errores;
}

// ========== CATÁLOGO DE ETAPAS ==========

export async function getEtapasCatalogo() {
  const rows = await query(
    `SELECT id, nombre, clasificacion, created_at, updated_at
     FROM etapas_catalogo
     ORDER BY FIELD(clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar'), nombre`
  );
  return rows.map(toCamelRow);
}

export async function getEtapasCatalogoByClasificacion(clasificacion) {
  const rows = await query(
    `SELECT id, nombre, clasificacion, created_at, updated_at
     FROM etapas_catalogo
     WHERE clasificacion = ?
     ORDER BY nombre`,
    [clasificacion]
  );
  return rows.map(toCamelRow);
}

export async function getEtapaCatalogo(id) {
  const rows = await query(
    `SELECT id, nombre, clasificacion, created_at, updated_at
     FROM etapas_catalogo
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows.length > 0 ? toCamelRow(rows[0]) : null;
}

export async function updateEtapaCatalogo(id, data = {}) {
  const sets = [];
  const values = [];

  if (data.clasificacion !== undefined) {
    const clasificacion = String(data.clasificacion || '').trim();
    if (!['preparatoria', 'precontractual', 'contractual', 'sin_clasificar'].includes(clasificacion)) {
      throw new Error('Clasificación inválida');
    }
    sets.push('clasificacion = ?');
    values.push(clasificacion);
  }

  if (!sets.length) {
    return getEtapaCatalogo(id);
  }

  sets.push('updated_at = NOW()');
  values.push(id);

  await query(`UPDATE etapas_catalogo SET ${sets.join(', ')} WHERE id = ?`, values);
  return getEtapaCatalogo(id);
}

export async function updateEtapasCatalogoMultiple(etapas) {
  let actualizadas = 0;

  for (const etapa of etapas) {
    const { id, clasificacion } = etapa;
    if (!id) continue;

    try {
      await updateEtapaCatalogo(id, { clasificacion });
      actualizadas++;
    } catch (error) {
      console.error(`Error al actualizar etapa ${id}:`, error.message);
    }
  }

  return actualizadas;
}

export async function getEtapasCatalogoResumen() {
  const rows = await query(
    `SELECT
      clasificacion,
      COUNT(*) as cantidad
     FROM etapas_catalogo
     GROUP BY clasificacion
     ORDER BY FIELD(clasificacion, 'preparatoria', 'precontractual', 'contractual', 'sin_clasificar')`
  );

  const resumen = {
    totalEtapas: 0,
    porClasificacion: {},
    clasificadas: 0,
    sinClasificar: 0
  };

  for (const row of rows) {
    const item = toCamelRow(row);
    resumen.porClasificacion[item.clasificacion] = {
      cantidad: item.cantidad
    };
    resumen.totalEtapas += item.cantidad;

    if (item.clasificacion !== 'sin_clasificar') {
      resumen.clasificadas += item.cantidad;
    } else {
      resumen.sinClasificar += item.cantidad;
    }
  }

  return resumen;
}

export async function createEtapaCatalogo(data = {}) {
  const nombre = String(data.nombre || '').trim();
  if (!nombre) throw new Error('El nombre de la etapa es requerido');

  const clasificacion = String(data.clasificacion || 'sin_clasificar').trim().toLowerCase();
  const clasificacionesValidas = ['preparatoria', 'precontractual', 'contractual', 'sin_clasificar'];
  if (!clasificacionesValidas.includes(clasificacion)) {
    throw new Error(`Clasificación inválida: "${data.clasificacion}". Debe ser: ${clasificacionesValidas.join(', ')}`);
  }

  const existentes = await query('SELECT id FROM etapas_catalogo WHERE nombre = ?', [nombre]);
  if (existentes.length > 0) {
    throw new Error(`Ya existe una etapa con el nombre "${nombre}"`);
  }

  try {
    await query(
      `INSERT INTO etapas_catalogo (nombre, clasificacion)
       VALUES (?, ?)`,
      [nombre, clasificacion]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error(`Ya existe una etapa con el nombre "${nombre}"`);
    }
    throw error;
  }

  const result = await query('SELECT id FROM etapas_catalogo WHERE nombre = ?', [nombre]);
  return getEtapaCatalogo(result[0].id);
}

export async function deleteEtapaCatalogo(id) {
  const result = await query('DELETE FROM etapas_catalogo WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

export async function getConfiguracion(clave) {
  try {
    const [result] = await query(
      'SELECT clave, valor, tipo FROM configuracion_sistema WHERE clave = ?',
      [clave]
    );
    if (result.length === 0) return null;

    const config = result[0];
    const valor = config.tipo === 'boolean' ? Boolean(Number(config.valor)) : config.valor;
    return { clave: config.clave, valor };
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return null;
  }
}

export async function obtenerTodasConfiguraciones() {
  try {
    const [result] = await query(
      'SELECT clave, valor, tipo, descripcion FROM configuracion_sistema ORDER BY clave'
    );

    return result.map(config => ({
      clave: config.clave,
      valor: config.tipo === 'boolean' ? Boolean(Number(config.valor)) : config.valor,
      tipo: config.tipo,
      descripcion: config.descripcion
    }));
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    return [];
  }
}

export async function actualizarConfiguracion(clave, valor) {
  try {
    const [result] = await query(
      'UPDATE configuracion_sistema SET valor = ? WHERE clave = ?',
      [String(valor), clave]
    );

    if (result.affectedRows === 0) {
      throw new Error(`Configuración "${clave}" no encontrada`);
    }

    return true;
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    throw error;
  }
}

// ============================================
// ALIAS DE EXPORTACIÓN (compatibilidad)
// ============================================

export const getAllActividades = getAllSubtareas;
export const getActividadById = getSubtareaById;
export const createActividad = createSubtarea;
export const updateActividad = updateSubtarea;
export const deleteActividad = deleteSubtarea;
export const getActividadEtapas = getSubtareaEtapas;
export const setActividadEtapas = setSubtareaEtapas;
