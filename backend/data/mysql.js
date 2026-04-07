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
// Log de depuración para conexión MySQL
console.log('--- MySQL ENV DEBUG ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '(set)' : '(empty)');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('-----------------------');

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import iconv from 'iconv-lite';
import { getOfficialUtcDate, toMySqlUtcDateTime } from '../services/horaOficial.js';

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
  { clave: 'estados', nombre: 'Estados', descripcion: 'Consulta de estados de seguimiento', orden: 90 },
  { clave: 'admin_actividades', nombre: 'Admin Procesos', descripcion: 'Configuración administrativa de procesos', orden: 100 },
  { clave: 'admin_versiones', nombre: 'Admin Versiones', descripcion: 'Operaciones administrativas de versiones', orden: 110 }
];

const DEFAULT_PERMISSION_MENU = [
  { clave: 'dashboard', nombre: 'Dashboard', ruta: '/', orden: 10 },
  { clave: 'actividades', nombre: 'Procesos', ruta: '/actividades', orden: 20 },
  { clave: 'reportes', nombre: 'Reportes', ruta: '/reportes', orden: 30 },
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
      estados: { read: true, create: false, update: false, delete: false },
      admin_actividades: { read: false, create: false, update: false, delete: false },
      admin_versiones: { read: false, create: false, update: false, delete: false }
    },
    menu: {
      dashboard: true,
      actividades: true,
      reportes: true,
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
      estados: { read: true, create: false, update: false, delete: false },
      admin_actividades: { read: false, create: false, update: false, delete: false },
      admin_versiones: { read: false, create: false, update: false, delete: false }
    },
    menu: {
      dashboard: true,
      actividades: true,
      reportes: true,
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
    direccion_encargada: 'direccionEncargada',
    partida_presupuestaria: 'partidaPresupuestaria',
    presupuesto_2026_inicial: 'presupuesto2026Inicial',
    costo_2026: 'costo2026',
    plazo_contrato: 'plazoContrato',
    pac_no_pac: 'pacNoPac',
    procedimiento_sugerido: 'procedimientoSugerido',
    fecha_tentativa: 'fechaTentativa',
    fecha_reforma: 'fechaReforma',
    fecha_planificada: 'fechaPlanificada',
    fecha_real: 'fechaReal',
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
    version_id: 'versionId',
    orden_login: 'ordenLogin',
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
  await query('SET FOREIGN_KEY_CHECKS = 0');
  await query('DROP VIEW IF EXISTS v_comparacion_versiones').catch(() => {});
  await query('DROP VIEW IF EXISTS v_resumen_versiones').catch(() => {});
  await query('DROP TABLE IF EXISTS cambios_reforma').catch(() => {});
  await query('DROP TABLE IF EXISTS poa_versiones').catch(() => {});
  await query('SET FOREIGN_KEY_CHECKS = 1');

  await query(`
    CREATE TABLE IF NOT EXISTS subtareas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      direccion_encargada VARCHAR(255) NOT NULL,
      nombre TEXT NOT NULL,
      codigo_olympo VARCHAR(100) NOT NULL UNIQUE,
      partida_presupuestaria VARCHAR(120) NULL,
      presupuesto_2026_inicial DECIMAL(14,2) NOT NULL DEFAULT 0,
      costo_2026 DECIMAL(14,2) NOT NULL DEFAULT 0,
      cuatrimestre VARCHAR(50) NULL,
      plazo_contrato VARCHAR(120) NULL,
      pac_no_pac VARCHAR(30) NOT NULL DEFAULT 'PAC',
      procedimiento_sugerido VARCHAR(255) NULL,
      responsable_id INT NULL,
      responsable VARCHAR(255) NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      observaciones TEXT NULL,
      proceso_en_riesgo BOOLEAN NOT NULL DEFAULT false,
      riesgo_comentario TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

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

  await query(`
    CREATE TABLE IF NOT EXISTS etapas_pac (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      orden INT NOT NULL,
      es_personalizada BOOLEAN DEFAULT false,
      UNIQUE KEY unique_nombre (nombre)
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS subtareas_etapas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subtarea_id INT NOT NULL,
      etapa_id INT NOT NULL,
      aplica BOOLEAN NOT NULL DEFAULT true,
      fecha_tentativa DATE NULL,
      fecha_reforma DATE NULL,
      UNIQUE KEY unique_subtarea_etapa (subtarea_id, etapa_id),
      FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
      FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  const subtareasEtapasCols = await query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subtareas_etapas'
  `);
  const subtareasEtapasColsSet = new Set(subtareasEtapasCols.map((row) => row.name));
  if (!subtareasEtapasColsSet.has('fecha_reforma')) {
    await query('ALTER TABLE subtareas_etapas ADD COLUMN fecha_reforma DATE NULL AFTER fecha_tentativa').catch(() => {});
  }

  await query(`
    CREATE TABLE IF NOT EXISTS seguimiento_etapas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subtarea_id INT NOT NULL,
      etapa_id INT NOT NULL,
      estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
      fecha_planificada DATE NULL,
      fecha_real DATE NULL,
      responsable_id INT NULL,
      responsable VARCHAR(255) NULL,
      observaciones TEXT NULL,
      UNIQUE KEY unique_subtarea_etapa_seguimiento (subtarea_id, etapa_id),
      FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
      FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  const seguimientoCols = await query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seguimiento_etapas'
  `);
  const seguimientoColsSet = new Set(seguimientoCols.map((row) => row.name));
  if (!seguimientoColsSet.has('responsable_id')) {
    await query('ALTER TABLE seguimiento_etapas ADD COLUMN responsable_id INT NULL AFTER fecha_real').catch(() => {});
  }

  await query(`
    CREATE TABLE IF NOT EXISTS seguimientos_diarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subtarea_id INT NOT NULL,
      etapa_id INT NOT NULL,
      fecha DATE NOT NULL,
      comentario TEXT NOT NULL,
      tiene_alerta BOOLEAN DEFAULT FALSE,
      responsable_id INT NULL,
      responsable VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
      FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE,
      INDEX idx_sd_subtarea (subtarea_id)
    ) ENGINE=InnoDB;
  `);

  const seguimientosCols = await query(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seguimientos_diarios'
  `);
  const seguimientosColsSet = new Set(seguimientosCols.map((row) => row.name));
  if (!seguimientosColsSet.has('responsable_id')) {
    await query('ALTER TABLE seguimientos_diarios ADD COLUMN responsable_id INT NULL AFTER tiene_alerta').catch(() => {});
  }

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

  await query(`
    CREATE TABLE IF NOT EXISTS permisos_modulos_catalogo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clave VARCHAR(80) NOT NULL UNIQUE,
      nombre VARCHAR(120) NOT NULL,
      descripcion VARCHAR(255) NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      orden INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS permisos_menu_catalogo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      clave VARCHAR(80) NOT NULL UNIQUE,
      nombre VARCHAR(120) NOT NULL,
      ruta VARCHAR(255) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      orden INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS permisos_roles_modulos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(80) NOT NULL,
      modulo_clave VARCHAR(80) NOT NULL,
      puede_leer BOOLEAN NOT NULL DEFAULT false,
      puede_crear BOOLEAN NOT NULL DEFAULT false,
      puede_actualizar BOOLEAN NOT NULL DEFAULT false,
      puede_borrar BOOLEAN NOT NULL DEFAULT false,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_permisos_roles_modulo (role, modulo_clave),
      CONSTRAINT fk_permisos_roles_modulos_catalogo
        FOREIGN KEY (modulo_clave) REFERENCES permisos_modulos_catalogo(clave)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS permisos_roles_menu (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(80) NOT NULL,
      menu_clave VARCHAR(80) NOT NULL,
      puede_ingresar BOOLEAN NOT NULL DEFAULT false,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_permisos_roles_menu (role, menu_clave),
      CONSTRAINT fk_permisos_roles_menu_catalogo
        FOREIGN KEY (menu_clave) REFERENCES permisos_menu_catalogo(clave)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS auditoria_eventos (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      username VARCHAR(80) NULL,
      role VARCHAR(80) NULL,
      direccion_nombre VARCHAR(255) NULL,
      accion VARCHAR(20) NOT NULL,
      modulo VARCHAR(80) NULL,
      recurso VARCHAR(255) NULL,
      metodo VARCHAR(10) NOT NULL,
      ruta VARCHAR(255) NOT NULL,
      status_code INT NOT NULL,
      exito BOOLEAN NOT NULL DEFAULT false,
      ip VARCHAR(64) NULL,
      user_agent VARCHAR(512) NULL,
      request_query LONGTEXT NULL,
      request_body LONGTEXT NULL,
      response_body LONGTEXT NULL,
      error_mensaje TEXT NULL,
      fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auditoria_fecha (fecha),
      INDEX idx_auditoria_user (user_id),
      INDEX idx_auditoria_modulo (modulo),
      INDEX idx_auditoria_accion (accion)
    ) ENGINE=InnoDB;
  `);

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
    `UPDATE subtareas
     SET direccion_encargada = ?
     WHERE direccion_encargada IS NULL
       OR TRIM(direccion_encargada) = ''
       OR LOWER(TRIM(direccion_encargada)) IN ('sin direccion', 'sin dirección', 'sin asignar', 'n/a', 'na', 'no aplica', '-')`,
    [SIN_DIRECCION_NOMBRE]
  );

  await query(
    `UPDATE subtareas
     SET responsable_id = NULL, responsable = NULL
     WHERE responsable_id IS NULL
       AND (responsable IS NULL OR TRIM(responsable) = '')`
  );

  await seedPermisosBase();
}

async function seedPermisosBase() {
  for (const modulo of DEFAULT_PERMISSION_MODULES) {
    await query(
      `INSERT INTO permisos_modulos_catalogo (clave, nombre, descripcion, activo, orden)
       VALUES (?, ?, ?, true, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         descripcion = VALUES(descripcion),
         orden = VALUES(orden)`,
      [modulo.clave, modulo.nombre, modulo.descripcion || null, modulo.orden]
    );
  }

  for (const menu of DEFAULT_PERMISSION_MENU) {
    await query(
      `INSERT INTO permisos_menu_catalogo (clave, nombre, ruta, activo, orden)
       VALUES (?, ?, ?, true, ?)
       ON DUPLICATE KEY UPDATE
         nombre = VALUES(nombre),
         ruta = VALUES(ruta),
         orden = VALUES(orden)`,
      [menu.clave, menu.nombre, menu.ruta, menu.orden]
    );
  }

  const rolesRows = await query('SELECT DISTINCT role FROM usuarios');
  const roles = [...new Set(rolesRows.map((row) => String(row.role || '').trim()).filter(Boolean))];

  for (const role of roles) {
    const defaults = ROLE_PERMISSION_DEFAULTS[role] || { modules: {}, menu: {} };

    for (const modulo of DEFAULT_PERMISSION_MODULES) {
      const current = defaults.modules[modulo.clave] || { read: false, create: false, update: false, delete: false };
      await query(
        `INSERT IGNORE INTO permisos_roles_modulos (role, modulo_clave, puede_leer, puede_crear, puede_actualizar, puede_borrar)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [role, modulo.clave, Boolean(current.read), Boolean(current.create), Boolean(current.update), Boolean(current.delete)]
      );
    }

    for (const menu of DEFAULT_PERMISSION_MENU) {
      const canAccess = defaults.menu[menu.clave] === true;
      await query(
        `INSERT IGNORE INTO permisos_roles_menu (role, menu_clave, puede_ingresar)
         VALUES (?, ?, ?)`,
        [role, menu.clave, canAccess]
      );
    }
  }
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
  const rows = await query('SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1', [String(idOrCode)]);
  return rows[0]?.id || null;
}

export async function getAllSubtareas() {
  const columns = await getSubtareasColumns();
  const direccionExpr = columns.has('direccion_encargada') ? 's.direccion_encargada' : "'Sin dirección'";
  const responsableExpr = columns.has('responsable') ? 's.responsable' : 'NULL';
  const responsableIdExpr = columns.has('responsable_id') ? 's.responsable_id' : 'NULL';
  const activoOrder = columns.has('activo') ? 's.activo DESC, ' : '';
  const nombreOrder = columns.has('nombre') ? 's.nombre' : 's.id';

  const subtareas = await query(`
    SELECT s.*, ${direccionExpr} AS direccion_nombre, ${responsableExpr} AS responsable_nombre, ${responsableIdExpr} AS responsable_id_ref
    FROM subtareas s
    ORDER BY ${activoOrder}${nombreOrder}
  `);

  const etapas = await query(`
    SELECT se.*, ep.nombre AS etapa_nombre, ep.orden, ep.es_personalizada,
           sg.estado, sg.fecha_planificada, sg.fecha_real, sg.observaciones,
           sg.responsable AS responsable_nombre
    FROM subtareas_etapas se
    JOIN etapas_pac ep ON ep.id = se.etapa_id
    LEFT JOIN seguimiento_etapas sg ON sg.subtarea_id = se.subtarea_id AND sg.etapa_id = se.etapa_id
    ORDER BY se.subtarea_id, ep.orden
  `);

  const bySubtarea = new Map();
  for (const e of etapas) {
    const item = toCamelRow(e);
    if (!bySubtarea.has(e.subtarea_id)) bySubtarea.set(e.subtarea_id, []);
    bySubtarea.get(e.subtarea_id).push(item);
  }

  const direccionesCatalogo = await getDireccionesCatalogo();
  const direccionIdPorNombre = new Map(
    direccionesCatalogo.map((d) => [String(d.nombre || '').trim().toLowerCase(), Number(d.id)])
  );

  return subtareas.map((row) => {
    const item = toCamelRow(row);
    item.direccionNombre = row.direccion_nombre || SIN_DIRECCION_NOMBRE;
    const direccionKey = String(item.direccionNombre || '').trim().toLowerCase();
    item.direccionId = direccionIdPorNombre.get(direccionKey) || obtenerDireccionIdDesdeNombre(item.direccionNombre);
    item.responsableId = row.responsable_id_ref ? Number(row.responsable_id_ref) : null;
    item.responsableNombre = row.responsable_nombre || null;
    item.tipoPlan = row.pac_no_pac;
    item.presupuesto = Number(row.presupuesto_2026_inicial ?? 0);
    item.costoReforma2 = Number(row.costo_2026 ?? 0);
    item.pacNoPac = row.pac_no_pac;
    item.presupuesto2026Inicial = Number(row.presupuesto_2026_inicial ?? 0);
    item.costo2026 = Number(row.costo_2026 ?? 0);
    item.fechaInicio = normalizarFechaSalida(row.fecha_inicio) || null;
    item.fechaFin = normalizarFechaSalida(row.fecha_fin) || null;
    item.procesoEnRiesgo = Boolean(Number(row.proceso_en_riesgo ?? 0));
    item.riesgoComentario = row.riesgo_comentario ? normalizeTextEncoding(row.riesgo_comentario) : null;
    item.avanceGeneral = 0;
    item.estado = 'pendiente';
    item.etapas = bySubtarea.get(row.id) || [];
    item.seguimientoEtapas = item.etapas
      .filter((e) => Number(e.aplica) === 1 || e.aplica === true || String(e.aplica).toLowerCase() === 'true')
      .map((etapa) => ({
        ...etapa,
        fechaPlanificada: etapa.fechaPlanificada || etapa.fechaReforma || etapa.fechaTentativa || null,
        estado: etapa.estado || 'pendiente',
        responsableNombre: etapa.responsableNombre || item.responsableNombre || null
      }));
    return item;
  });
}

export async function getAllSubtareasByScope(scope = {}) {
  const items = await getAllSubtareas();
  if (scope?.role === 'direccion') {
    const direccion = String(scope?.direccionNombre || '').trim().toLowerCase();
    return items.filter((item) => String(item?.direccionNombre || '').trim().toLowerCase() === direccion);
  }
  return items;
}

export async function getSubtareaById(id) {
  const subtareas = await getAllSubtareas();
  return subtareas.find((s) => Number(s.id) === Number(id)) || null;
}

export async function getSubtareaByIdByScope(id, scope = {}) {
  const subtarea = await getSubtareaById(id);
  if (!subtarea) return null;
  if (scope?.role !== 'direccion') return subtarea;

  const direccion = String(scope?.direccionNombre || '').trim().toLowerCase();
  const subtareaDireccion = String(subtarea?.direccionNombre || '').trim().toLowerCase();
  return direccion && direccion === subtareaDireccion ? subtarea : null;
}

export async function getSubtareaByCodigoOlympo(codigoOlympo) {
  const subtareas = await getAllSubtareas();
  return subtareas.find((s) => s.codigoOlympo === codigoOlympo) || null;
}

export async function getSubtareaByCodigoOlympoByScope(codigoOlympo, scope = {}) {
  const subtarea = await getSubtareaByCodigoOlympo(codigoOlympo);
  if (!subtarea) return null;
  if (scope?.role !== 'direccion') return subtarea;

  const direccion = String(scope?.direccionNombre || '').trim().toLowerCase();
  const subtareaDireccion = String(subtarea?.direccionNombre || '').trim().toLowerCase();
  return direccion && direccion === subtareaDireccion ? subtarea : null;
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
    `SELECT id, username, nombre, role, direccion_nombre, orden_login, activo, created_at, updated_at
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
  return item;
}

export async function getUsuarios() {
  const rows = await query(
    `SELECT id, username, nombre, role, direccion_nombre, orden_login, activo, created_at, updated_at
     FROM usuarios
     ORDER BY orden_login ASC, nombre ASC`
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.nombre = normalizeText(item.nombre || '');
    item.direccionNombre = item.direccionNombre ? normalizeText(item.direccionNombre) : null;
    item.activo = Boolean(item.activo);
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

export async function createUsuario(data = {}) {
  const username = normalizeUsername(data.username);
  const nombre = normalizeText(data.nombre);
  const password = String(data.password || '12345');
  const role = normalizeRoleKey(data.role || '');
  const direccionNombre = data.direccionNombre ? normalizeText(data.direccionNombre) : null;
  const ordenLogin = Math.max(0, Number.parseInt(String(data.ordenLogin ?? 0), 10) || 0);
  const activo = normalizeActivo(data.activo, true);

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
    `INSERT INTO usuarios (username, nombre, password_hash, role, direccion_nombre, orden_login, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, nombre, passwordHash, role, role === 'direccion' ? direccionNombre : null, ordenLogin, activo]
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

  if (!sets.length) return getUsuarioById(id);
  values.push(id);
  await query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, values);
  return getUsuarioById(id);
}

export async function deleteUsuario(id) {
  const result = await query('DELETE FROM usuarios WHERE id = ?', [id]);
  return result.affectedRows > 0;
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

export async function getAllResponsables() {
  const rows = await query(
    `SELECT r.id, r.nombre, r.email, r.direccion_id, d.nombre AS direccion_nombre
     FROM responsables_catalogo r
     LEFT JOIN direcciones_catalogo d ON d.id = r.direccion_id
     WHERE r.activo = true
     ORDER BY r.nombre`
  );

  if (rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      email: row.email || null,
      direccionId: row.direccion_id || null,
      direccionNombre: row.direccion_nombre || null
    }));
  }

  const columns = await getSubtareasColumns();
  if (!columns.has('responsable')) return [];
  const direccionExpr = columns.has('direccion_encargada') ? 'MAX(direccion_encargada)' : "'Sin dirección'";
  const legacyRows = await query(`
    SELECT MIN(id) AS id, responsable AS nombre, ${direccionExpr} AS direccion_nombre
    FROM subtareas
    WHERE responsable IS NOT NULL AND TRIM(responsable) <> ''
    GROUP BY responsable
    ORDER BY responsable
  `);

  return legacyRows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    direccionNombre: row.direccion_nombre,
    direccionId: obtenerDireccionIdDesdeNombre(row.direccion_nombre)
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

  const [modulosRows, menuRows] = await Promise.all([
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

  for (const modulo of permisos.modulos) {
    modulos[modulo.clave] = modulo.permisos;
  }
  for (const item of permisos.menu) {
    menu[item.clave] = Boolean(item.puedeIngresar);
  }

  return {
    role: permisos.role,
    modulos,
    menu
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
  let onlineUtc;
  try {
    onlineUtc = await getOfficialUtcDate();
  } catch (error) {
    console.error('No se pudo sincronizar hora oficial en linea para auditoria, se usa hora UTC local:', error?.message || error);
    onlineUtc = new Date();
  }

  const fechaAuditoria = toMySqlUtcDateTime(onlineUtc);

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
    `INSERT INTO auditoria_eventos (
      user_id, username, role, direccion_nombre, accion, modulo, recurso, metodo, ruta,
      status_code, exito, ip, user_agent, request_query, request_body, response_body, error_mensaje, fecha
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.userId,
      payload.username,
      payload.role,
      payload.direccionNombre,
      payload.accion,
      payload.modulo,
      payload.recurso,
      payload.metodo,
      payload.ruta,
      payload.statusCode,
      payload.exito,
      payload.ip,
      payload.userAgent,
      payload.requestQuery,
      payload.requestBody,
      payload.responseBody,
      payload.errorMensaje,
      fechaAuditoria
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

  if (filters.modulo) {
    where.push('modulo = ?');
    params.push(String(filters.modulo));
  }
  if (filters.accion) {
    where.push('accion = ?');
    params.push(String(filters.accion));
  }
  if (filters.userId) {
    where.push('user_id = ?');
    params.push(Number(filters.userId));
  }
  if (filters.role) {
    where.push('role = ?');
    params.push(String(filters.role));
  }
  if (filters.success === 'true' || filters.success === true) {
    where.push('exito = true');
  } else if (filters.success === 'false' || filters.success === false) {
    where.push('exito = false');
  }
  if (filters.desde) {
    where.push('fecha >= ?');
    params.push(`${String(filters.desde)} 00:00:00`);
  }
  if (filters.hasta) {
    where.push('fecha <= ?');
    params.push(`${String(filters.hasta)} 23:59:59`);
  }
  if (filters.search) {
    where.push('(username LIKE ? OR ruta LIKE ? OR recurso LIKE ? OR error_mensaje LIKE ?)');
    const text = `%${String(filters.search).trim()}%`;
    params.push(text, text, text, text);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRows = await query(
    `SELECT COUNT(*) AS total
     FROM auditoria_eventos
     ${whereClause}`,
    params
  );
  const total = Number(totalRows[0]?.total || 0);

  const rows = await query(
    `SELECT id, user_id, username, role, direccion_nombre, accion, modulo, recurso, metodo, ruta,
            status_code, exito, ip, user_agent, error_mensaje,
            CONCAT(DATE_FORMAT(DATE_SUB(fecha, INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%s'), '-05:00') AS fecha
     FROM auditoria_eventos
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
  let onlineUtc;
  try {
    onlineUtc = await getOfficialUtcDate();
  } catch (error) {
    console.error('No se pudo sincronizar hora oficial en linea para resumen de auditoria, se usa hora UTC local:', error?.message || error);
    onlineUtc = new Date();
  }

  const onlineUtcMySql = toMySqlUtcDateTime(onlineUtc);

  const activeWindowMinutesRaw = Number(filters.activeWindowMinutes || 30);
  const activeWindowMinutes = Math.min(24 * 60, Math.max(5, activeWindowMinutesRaw));
  const recentLimitRaw = Number(filters.recentLimit || 20);
  const recentLimit = Math.min(100, Math.max(5, recentLimitRaw));

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
          AND fecha >= DATE_SUB(?, INTERVAL ? MINUTE)
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
    [onlineUtcMySql, activeWindowMinutes]
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
    generatedAt: onlineUtc.toISOString(),
    activos: activosRows.map((row) => {
      const item = toCamelRow(row);
      item.usuarioActivo = Boolean(item.usuarioActivo);
      return item;
    }),
    ultimosInicios: ultimosIniciosRows.map((row) => toCamelRow(row))
  };
}

export async function getEventoAuditoriaById(id) {
  const rows = await query(
    `SELECT id, user_id, username, role, direccion_nombre, accion, modulo, recurso, metodo, ruta,
            status_code, exito, ip, user_agent, request_query, request_body, response_body, error_mensaje,
            CONCAT(DATE_FORMAT(DATE_SUB(fecha, INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%s'), '-05:00') AS fecha
     FROM auditoria_eventos
     WHERE id = ?
     LIMIT 1`,
    [Number(id)]
  );
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
  const responsable = await resolverResponsable(data);
  const direccion = await resolverDireccionEncargada(data);
  const codigoOlympo = String(data.codigoOlympo || data.codigo_olympo || '').trim()
    || `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const riesgoComentario = String(data.riesgoComentario || data.riesgo_comentario || '').trim();

  const result = await query(
    `INSERT INTO subtareas (
      direccion_encargada, nombre, codigo_olympo, partida_presupuestaria,
      presupuesto_2026_inicial, costo_2026, cuatrimestre, plazo_contrato,
      pac_no_pac, procedimiento_sugerido, responsable_id, responsable, activo, observaciones,
      proceso_en_riesgo, riesgo_comentario, fecha_inicio, fecha_fin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      direccion,
      data.nombre,
      codigoOlympo,
      data.partidaPresupuestaria || null,
      data.presupuesto ?? data.presupuesto2026Inicial ?? 0,
      data.costoReforma2 ?? data.costo2026 ?? 0,
      data.cuatrimestre || null,
      data.plazoContrato || null,
      String(data.pacNoPac || data.tipoPlan || 'PAC'),
      data.procedimientoSugerido || null,
      responsable.id,
      responsable.nombre,
      data.activo ?? true,
      data.observaciones || null,
      Boolean(data.procesoEnRiesgo ?? data.proceso_en_riesgo),
      riesgoComentario || null,
      data.fechaInicio || null,
      data.fechaFin || null
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
    nombre: 'nombre',
    codigoOlympo: 'codigo_olympo',
    partidaPresupuestaria: 'partida_presupuestaria',
    presupuesto: 'presupuesto_2026_inicial',
    costoReforma2: 'costo_2026',
    cuatrimestre: 'cuatrimestre',
    plazoContrato: 'plazo_contrato',
    tipoPlan: 'pac_no_pac',
    procedimientoSugerido: 'procedimiento_sugerido',
    observaciones: 'observaciones',
    procesoEnRiesgo: 'proceso_en_riesgo',
    riesgoComentario: 'riesgo_comentario',
    activo: 'activo',
    fechaInicio: 'fecha_inicio',
    fechaFin: 'fecha_fin'
  };

  Object.entries(fieldMap).forEach(([camel, sql]) => {
    if (data[camel] !== undefined) {
      sets.push(`${sql} = ?`);
      values.push(data[camel]);
    }
  });

  if (data.direccionId !== undefined || data.direccionNombre !== undefined || data.direccionEncargada !== undefined) {
    sets.push('direccion_encargada = ?');
    values.push(await resolverDireccionEncargada(data));
  }

  if (data.responsableId !== undefined || data.responsableNombre !== undefined || data.responsable !== undefined) {
    const responsable = await resolverResponsable(data);
    sets.push('responsable_id = ?');
    values.push(responsable.id);
    sets.push('responsable = ?');
    values.push(responsable.nombre);
  }

  if (!sets.length) return getSubtareaById(id);
  values.push(id);

  await query(`UPDATE subtareas SET ${sets.join(', ')} WHERE id = ?`, values);
  return getSubtareaById(id);
}

export async function deleteSubtarea(idOrCode) {
  const id = await resolveSubtareaId(idOrCode);
  if (!id) return;
  await query('DELETE FROM subtareas WHERE id = ?', [id]);
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
    `SELECT se.id, se.subtarea_id, se.etapa_id, se.aplica, se.fecha_tentativa, se.fecha_reforma,
            COALESCE(sg.estado, 'pendiente') AS estado,
            COALESCE(sg.fecha_planificada, se.fecha_reforma, se.fecha_tentativa) AS fecha_planificada,
            sg.fecha_real, sg.responsable_id, sg.observaciones,
            COALESCE(sg.responsable, s.responsable) AS responsable_nombre,
            COALESCE(sg.responsable_id, s.responsable_id) AS responsable_id_ref,
            ep.nombre AS etapa_nombre, ep.orden, ep.es_personalizada
     FROM subtareas_etapas se
     JOIN subtareas s ON s.id = se.subtarea_id
     JOIN etapas_pac ep ON se.etapa_id = ep.id
     LEFT JOIN seguimiento_etapas sg ON sg.subtarea_id = se.subtarea_id AND sg.etapa_id = se.etapa_id
     WHERE se.subtarea_id = ?
     ORDER BY ep.orden`,
    [subtareaId]
  );
  return rows.map((row) => {
    const item = toCamelRow(row);
    item.responsableId = row.responsable_id_ref ? Number(row.responsable_id_ref) : null;
    // Normalizar todas las fechas al formato yyyy-MM-dd
    function toISODate(val) {
      if (!val) return null;
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    }
    const fechaTentativa = toISODate(item.fechaTentativa);
    const fechaReforma = toISODate(item.fechaReforma);
    const fechaPlanificada = toISODate(item.fechaPlanificada);
    const fechaReal = toISODate(item.fechaReal);
    // Si no hay fechaTentativa, usar fechaPlanificada; si tampoco, dejar vacío
    item.fechaTentativa = fechaTentativa || fechaPlanificada || '';
    item.fechaReforma = fechaReforma || '';
    item.fechaPlanificada = fechaPlanificada;
    item.fechaReal = fechaReal;
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
  console.log(`[setSubtareaEtapas] Iniciando con ${etapas?.length || 0} etapas para subtarea ${subtareaId}`);
  
  const existentes = await query(
    'SELECT etapa_id, estado, fecha_real FROM seguimiento_etapas WHERE subtarea_id = ?',
    [subtareaId]
  );
  const existentesPorEtapa = new Map(
    existentes.map((row) => [Number(row.etapa_id), row])
  );

  // Resolver responsables ANTES de la transacción para evitar problemas de concurrencia
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

    etapasEnriquecidas.push({
      etapaId,
      aplica: Boolean(etapa.aplica),
      fechaTentativa: normalizarFechaManual(etapa.fechaTentativa) || normalizarFechaManual(etapa.fechaPlanificada) || null,
      fechaReforma: normalizarFechaManual(etapa.fechaReforma ?? etapa.fechaTentativa ?? etapa.fechaPlanificada) || null,
      estadoFinal,
      fechaRealFinal,
      responsableId: responsable.id,
      responsableNombre: responsable.nombre,
      observaciones: etapa.observaciones ? normalizeTextEncoding(etapa.observaciones, { trim: true }) : null
    });
  }

  console.log(`[setSubtareaEtapas] Enriquecidas ${etapasEnriquecidas.length} etapas`);

  // Obtener conexión directa para usar transacción
  const conn = await getPool().getConnection();
  
  try {
    // Iniciar transacción para garantizar que todos los cambios se guarden juntos
    await conn.beginTransaction();
    console.log(`[setSubtareaEtapas] Transacción iniciada`);

    let procesadas = 0;
    for (const etapa of etapasEnriquecidas) {
      // Usar la conexión de transacción
      await conn.execute(
        `INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa, fecha_reforma)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE aplica = VALUES(aplica), fecha_reforma = VALUES(fecha_reforma)`,
        [subtareaId, etapa.etapaId, etapa.aplica, etapa.fechaTentativa, etapa.fechaReforma]
      );

      await conn.execute(
        `INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_planificada, fecha_real, responsable_id, observaciones, responsable)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           estado = VALUES(estado),
           fecha_planificada = VALUES(fecha_planificada),
           fecha_real = VALUES(fecha_real),
           responsable_id = VALUES(responsable_id),
           observaciones = VALUES(observaciones),
           responsable = COALESCE(VALUES(responsable), responsable)`,
        [
          subtareaId,
          etapa.etapaId,
          etapa.estadoFinal,
          etapa.fechaReforma || etapa.fechaTentativa,
          etapa.fechaRealFinal,
          etapa.responsableId,
          etapa.observaciones,
          etapa.responsableNombre
        ]
      );
      procesadas++;
    }

    // Confirmar transacción
    await conn.commit();
    console.log(`[setSubtareaEtapas] Transacción confirmada. ${procesadas} etapas procesadas`);
  } catch (error) {
    // Deshacer todos los cambios en caso de error
    console.error(`[setSubtareaEtapas] Error durante transacción:`, error);
    await conn.rollback();
    throw error;
  } finally {
    // Liberar la conexión
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
    'SELECT estado, fecha_real FROM seguimiento_etapas WHERE subtarea_id = ? AND etapa_id = ? LIMIT 1',
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
    `INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa, fecha_reforma)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE aplica = VALUES(aplica), fecha_reforma = VALUES(fecha_reforma)`,
    [
      subtarea.id,
      etapaId,
      true,
      data.fechaPlanificada || data.fechaTentativa || null,
      data.fechaReforma || data.fechaPlanificada || data.fechaTentativa || null
    ]
  );

  await query(
    `INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_planificada, fecha_real, responsable_id, observaciones, responsable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       fecha_planificada = VALUES(fecha_planificada),
       fecha_real = VALUES(fecha_real),
       responsable_id = VALUES(responsable_id),
       observaciones = VALUES(observaciones),
       responsable = COALESCE(VALUES(responsable), responsable)`,
    [
      subtarea.id,
      etapaId,
      estadoFinal,
      data.fechaReforma || data.fechaPlanificada || data.fechaTentativa || null,
      fechaRealFinal,
      responsable.id,
      data.observaciones ? normalizeTextEncoding(data.observaciones, { trim: true }) : null,
      responsable.nombre || subtarea.responsableNombre || null
    ]
  );

  const etapas = await getSubtareaEtapas(subtarea.id);
  return etapas.find((e) => Number(e.etapaId) === Number(etapaId)) || null;
}

export async function crearEtapaPersonalizada(nombre) {
  const maxRow = await query('SELECT COALESCE(MAX(orden), 0) AS max_orden FROM etapas_pac');
  const orden = Number(maxRow[0]?.max_orden || 0) + 1;
  const result = await query(
    'INSERT INTO etapas_pac (nombre, orden, es_personalizada) VALUES (?, ?, true)',
    [nombre, orden]
  );
  const rows = await query('SELECT id, nombre, orden, es_personalizada FROM etapas_pac WHERE id = ?', [result.insertId]);
  return toCamelRow(rows[0]);
}

export async function obtenerTodasEtapas() {
  const rows = await query('SELECT id, nombre, orden, es_personalizada FROM etapas_pac ORDER BY orden');
  return rows.map(toCamelRow);
}

export async function getDatabaseSnapshot() {
  const [subtareas, etapas, subtareasEtapas, seguimiento, notificaciones] = await Promise.all([
    query('SELECT * FROM subtareas ORDER BY id'),
    query('SELECT * FROM etapas_pac ORDER BY orden'),
    query('SELECT * FROM subtareas_etapas ORDER BY subtarea_id, etapa_id'),
    query('SELECT * FROM seguimiento_etapas ORDER BY subtarea_id, etapa_id'),
    query('SELECT * FROM notificaciones ORDER BY fecha DESC LIMIT 100')
  ]);

  return {
    direcciones: [],
    responsables: [],
    actividades: subtareas.map(toCamelRow),
    tareas: [],
    hitosContratacion: [],
    subtareas: subtareas.map(toCamelRow),
    etapas: etapas.map(toCamelRow),
    subtareasEtapas: subtareasEtapas.map(toCamelRow),
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

export async function getSeguimientosDiarios(subtareaId, etapaId, dias = 30) {
  const rows = await query(
    `SELECT id, subtarea_id, etapa_id, fecha, comentario, tiene_alerta, responsable_id, responsable, created_at, updated_at,
            responsable AS responsable_nombre
     FROM seguimientos_diarios
     WHERE subtarea_id = ? AND etapa_id = ?
       AND fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY fecha DESC, created_at DESC
     LIMIT 100`,
    [subtareaId, etapaId, dias]
  );
  return rows.map(toCamelRow);
}

export async function getSeguimientosResumenPorSubtarea(subtareaId, dias = 3650) {
  const rows = await query(
    `SELECT etapa_id,
            COUNT(*) AS total,
            MAX(CASE WHEN tiene_alerta = true THEN 1 ELSE 0 END) AS tiene_alerta
     FROM seguimientos_diarios
     WHERE subtarea_id = ?
       AND fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY etapa_id`,
    [subtareaId, dias]
  );

  return rows.map((row) => ({
    etapaId: Number(row.etapa_id),
    total: Number(row.total || 0),
    tieneAlerta: Boolean(row.tiene_alerta)
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

  const alertRows = filteredSubtareaIds.length
    ? await query(
      `SELECT sd.fecha
       FROM seguimientos_diarios sd
       WHERE sd.tiene_alerta = true
         AND sd.subtarea_id IN (${filteredSubtareaIds.map(() => '?').join(', ')})
       ORDER BY sd.fecha ASC`,
      filteredSubtareaIds
    )
    : [];

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
  const result = await query(
    `INSERT INTO seguimientos_diarios
     (subtarea_id, etapa_id, fecha, comentario, tiene_alerta, responsable_id, responsable, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      data.subtareaId,
      data.etapaId,
      data.fecha || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date()),
      normalizeTextEncoding(data.comentario || '', { trim: true }),
      Boolean(data.tieneAlerta),
      responsable.id,
      responsable.nombre
    ]
  );
  return result.insertId;
}

export async function updateSeguimientoDiario(id, data) {
  const updates = [];
  const values = [];
  if (data.comentario !== undefined) {
    updates.push('comentario = ?');
    values.push(normalizeTextEncoding(data.comentario || '', { trim: true }));
  }
  if (data.tieneAlerta !== undefined) {
    updates.push('tiene_alerta = ?');
    values.push(Boolean(data.tieneAlerta));
  }
  if (data.responsableId !== undefined || data.responsableNombre !== undefined || data.responsable !== undefined) {
    const responsable = await resolverResponsable(data || {});
    updates.push('responsable_id = ?');
    values.push(responsable.id);
    updates.push('responsable = ?');
    values.push(responsable.nombre);
  }
  if (!updates.length) return;
  updates.push('updated_at = UTC_TIMESTAMP()');
  values.push(id);
  await query(`UPDATE seguimientos_diarios SET ${updates.join(', ')} WHERE id = ?`, values);
}

export async function deleteSeguimientoDiario(id) {
  const result = await query('DELETE FROM seguimientos_diarios WHERE id = ?', [id]);
  if (!result.affectedRows) throw new Error('Seguimiento no encontrado');
}

export async function getAllVersiones() {
  const [tot] = await query('SELECT COUNT(*) AS total FROM subtareas');
  const [pres] = await query('SELECT COALESCE(SUM(presupuesto_2026_inicial), 0) AS total FROM subtareas');
  return [{
    id: 1,
    nombre: 'Versión única',
    estado: 'aprobado',
    totalActividades: tot.total,
    presupuestoTotal: pres.total
  }];
}

export async function getVersionById(id) {
  const all = await getAllVersiones();
  return all.find((v) => Number(v.id) === Number(id)) || null;
}

export async function getVersionActual() {
  return (await getAllVersiones())[0] || null;
}

export async function getActividadesByVersion() {
  return getAllSubtareas();
}

export async function crearNuevaReforma() {
  throw new Error('Módulo de versiones deshabilitado en este esquema simplificado');
}

export async function aprobarVersion() {
  return;
}

export async function getCambiosReforma() {
  return [];
}

export async function deleteVersion() {
  return;
}

export const getAllActividades = getAllSubtareas;
export const getActividadById = getSubtareaById;
export const createActividad = createSubtarea;
export const updateActividad = updateSubtarea;
export const deleteActividad = deleteSubtarea;
export const getActividadEtapas = getSubtareaEtapas;
export const setActividadEtapas = setSubtareaEtapas;
