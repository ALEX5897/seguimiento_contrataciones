import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || (process.env.NODE_ENV === 'production' ? '.env.production' : '.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error && ENV_PATH !== '.env') {
  dotenv.config();
}

const DB_HOST = process.env.DB_HOST || '172.16.1.80';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'usr-cont';
const DB_PASSWORD = process.env.DB_PASSWORD || 'mas_TER$*25@';
const DB_NAME = process.env.DB_NAME || 'poa_pac';
const ALLOW_MANUAL_COMPLETION_DATE = String(process.env.ALLOW_MANUAL_COMPLETION_DATE ?? 'true').toLowerCase() === 'true';

let pool;
let subtareasColumnsCache = null;

const DIRECCIONES_ID_NOMBRE = {
  1: 'Dirección de Asesoría Jurídica',
  2: 'DPEI / Jefatura de TICS',
  3: 'DAF / Jefatura Administrativa',
  4: 'DAF / Jefatura de Talento Humano',
  5: 'Dirección de Comercialización'
};

const MOJIBAKE_PATTERN = /[Ã�├┤│┬┐└┘╔╗╚╝╠╣╦╩╬▒░▓ÔÇ]/;

function countMojibake(value = '') {
  return (String(value).match(/[Ã�├┤│┬┐└┘╔╗╚╝╠╣╦╩╬▒░▓ÔÇ]/g) || []).length;
}

function noiseScore(value = '') {
  const text = String(value || '');
  const mojibake = countMojibake(text);
  const replacement = (text.match(/�/g) || []).length;
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

function normalizeTextEncoding(value, { trim = false, collapseWhitespace = false } = {}) {
  if (value === null || value === undefined) return value;

  let text = String(value);
  const decoded = decodeMojibake(text);
  if (noiseScore(decoded) < noiseScore(text)) {
    text = decoded;
  }

  const directReplacements = new Map([
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'],
    ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ'],
    ['ÔÇô', '–'], ['ÔÇ£', '“'], ['ÔÇ�', '”'], ['ÔÇÖ', '’'], ['ÔÇÿ', ' ']
  ]);

  for (const [bad, good] of directReplacements.entries()) {
    text = text.split(bad).join(good);
  }

  if (trim) text = text.trim();
  if (collapseWhitespace) text = text.replace(/\s+/g, ' ');
  return text;
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
    fecha_planificada: 'fechaPlanificada',
    fecha_real: 'fechaReal',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    responsable_nombre: 'responsableNombre',
    etapa_nombre: 'etapaNombre',
    direccion_nombre: 'direccionNombre',
    es_personalizada: 'esPersonalizada',
    tiene_alerta: 'tieneAlerta',
    fecha_leida: 'fechaLeida',
    tarea_id: 'tareaId',
    es_version_actual: 'esVersionActual',
    version_id: 'versionId',
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
  if (data.direccionEncargada) return normalizeTextEncoding(data.direccionEncargada, { trim: true, collapseWhitespace: true });
  if (data.direccionNombre) return normalizeTextEncoding(data.direccionNombre, { trim: true, collapseWhitespace: true });

  const id = Number(data.direccionId);
  if (Number.isInteger(id) && id > 0) {
    const rows = await query('SELECT nombre FROM direcciones_catalogo WHERE id = ? LIMIT 1', [id]);
    if (rows[0]?.nombre) return normalizeTextEncoding(rows[0].nombre, { trim: true, collapseWhitespace: true });
    if (DIRECCIONES_ID_NOMBRE[id]) return DIRECCIONES_ID_NOMBRE[id];
  }

  return 'Sin dirección';
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
    'created_at', 'updated_at'
  ]);
  for (const col of cols) {
    if (!allowed.has(col.name)) {
      await query(`ALTER TABLE subtareas DROP COLUMN \`${col.name}\``).catch(() => {});
    }
  }

  if (!new Set(cols.map((row) => row.name)).has('responsable_id')) {
    await query('ALTER TABLE subtareas ADD COLUMN responsable_id INT NULL AFTER procedimiento_sugerido').catch(() => {});
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
      UNIQUE KEY unique_subtarea_etapa (subtarea_id, etapa_id),
      FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
      FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

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
      role ENUM('admin','direccion','reporteria') NOT NULL,
      direccion_nombre VARCHAR(255) NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

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
}

export async function initMySQL() {
  const bootstrap = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true
  });
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  pool = await mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  });

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
    item.direccionNombre = row.direccion_nombre;
    const direccionKey = String(row.direccion_nombre || '').trim().toLowerCase();
    item.direccionId = direccionIdPorNombre.get(direccionKey) || obtenerDireccionIdDesdeNombre(row.direccion_nombre);
    item.responsableId = row.responsable_id_ref ? Number(row.responsable_id_ref) : null;
    item.responsableNombre = row.responsable_nombre;
    item.tipoPlan = row.pac_no_pac;
    item.presupuesto = Number(row.presupuesto_2026_inicial ?? 0);
    item.costoReforma2 = Number(row.costo_2026 ?? 0);
    item.pacNoPac = row.pac_no_pac;
    item.presupuesto2026Inicial = Number(row.presupuesto_2026_inicial ?? 0);
    item.costo2026 = Number(row.costo_2026 ?? 0);
    item.avanceGeneral = 0;
    item.estado = 'pendiente';
    item.etapas = bySubtarea.get(row.id) || [];
    item.seguimientoEtapas = item.etapas
      .filter((e) => Number(e.aplica) === 1 || e.aplica === true || String(e.aplica).toLowerCase() === 'true')
      .map((etapa) => ({
        ...etapa,
        fechaPlanificada: etapa.fechaPlanificada || etapa.fechaTentativa || null,
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
    `SELECT id, username, nombre, password_hash, role, direccion_nombre, activo
     FROM usuarios
     WHERE username = ?
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
    `SELECT id, username, nombre, password_hash, role, direccion_nombre, activo
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
    `SELECT id, username, nombre, role, direccion_nombre, activo, created_at, updated_at
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
    `SELECT id, username, nombre, role, direccion_nombre, activo, created_at, updated_at
     FROM usuarios
     ORDER BY nombre`
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
    .toLowerCase()
    .replace(/\s+/g, '_');
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
  const role = String(data.role || '').trim();
  const direccionNombre = data.direccionNombre ? normalizeText(data.direccionNombre) : null;
  const activo = normalizeActivo(data.activo, true);

  if (!username || !nombre || !password) throw new Error('username, nombre y password son requeridos');
  if (!['admin', 'direccion', 'reporteria'].includes(role)) throw new Error('Rol inválido');
  if (role === 'direccion' && !direccionNombre) throw new Error('direccionNombre es requerido para rol dirección');

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO usuarios (username, nombre, password_hash, role, direccion_nombre, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [username, nombre, passwordHash, role, role === 'direccion' ? direccionNombre : null, activo]
  );

  return getUsuarioById(result.insertId);
}

export async function updateUsuario(id, data = {}) {
  const sets = [];
  const values = [];

  if (data.nombre !== undefined) {
    sets.push('nombre = ?');
    values.push(normalizeText(data.nombre));
  }
  if (data.role !== undefined) {
    const role = String(data.role || '').trim();
    if (!['admin', 'direccion', 'reporteria'].includes(role)) throw new Error('Rol inválido');
    sets.push('role = ?');
    values.push(role);
  }
  if (data.direccionNombre !== undefined) {
    sets.push('direccion_nombre = ?');
    values.push(data.direccionNombre ? normalizeText(data.direccionNombre) : null);
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
    `SELECT username, nombre, role, direccion_nombre
     FROM usuarios
     WHERE activo = true
     ORDER BY role, nombre`
  );

  const opciones = new Set(['admin']);

  for (const row of rows) {
    const role = String(row.role || '').trim();
    const username = normalizeUsername(row.username);
    const direccion = normalizeText(row.direccion_nombre || '');

    if (['admin', 'reporteria'].includes(role) && username) {
      opciones.add(username);
    }

    if (role === 'direccion' && direccion) {
      opciones.add(direccion);
    }
  }

  return Array.from(opciones).sort((a, b) => a.localeCompare(b, 'es'));
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

  const result = await query(
    `INSERT INTO subtareas (
      direccion_encargada, nombre, codigo_olympo, partida_presupuestaria,
      presupuesto_2026_inicial, costo_2026, cuatrimestre, plazo_contrato,
      pac_no_pac, procedimiento_sugerido, responsable_id, responsable, activo, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.observaciones || null
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
    presupuesto2026Inicial: 'presupuesto_2026_inicial',
    costoReforma2: 'costo_2026',
    costo2026: 'costo_2026',
    cuatrimestre: 'cuatrimestre',
    plazoContrato: 'plazo_contrato',
    pacNoPac: 'pac_no_pac',
    tipoPlan: 'pac_no_pac',
    procedimientoSugerido: 'procedimiento_sugerido',
    observaciones: 'observaciones',
    activo: 'activo'
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
  const str = String(fecha);
  // Si está en formato ISO (contiene T), extraer solo la parte de fecha
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  // Si ya está en formato yyyy-MM-dd, devolver como está
  return str;
}

export async function getSubtareaEtapas(subtareaId) {
  const rows = await query(
    `SELECT se.id, se.subtarea_id, se.etapa_id, se.aplica, se.fecha_tentativa,
            COALESCE(sg.estado, 'pendiente') AS estado,
            COALESCE(sg.fecha_planificada, se.fecha_tentativa) AS fecha_planificada,
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
    item.fechaTentativa = normalizarFechaSalida(item.fechaTentativa);
    item.fechaPlanificada = normalizarFechaSalida(item.fechaPlanificada);
    item.fechaReal = normalizarFechaSalida(item.fechaReal);
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
  
  // Si es un objeto Date, convertir a ISO
  if (fecha instanceof Date) {
    return fecha.toISOString().split('T')[0];
  }
  
  const valor = String(fecha).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor;
  }

  const soloFechaDesdeDateTime = valor.match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?$/);
  if (soloFechaDesdeDateTime?.[1]) {
    return soloFechaDesdeDateTime[1];
  }
  
  // Intentar parseo general (GMT, RFC, etc.)
  try {
    const parsed = new Date(valor);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    return null;
  }
  
  // Si contiene T, extraer solo la fecha
  if (valor.includes('T')) {
    const soloFecha = valor.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha) ? soloFecha : null;
  }

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
        `INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE aplica = VALUES(aplica), fecha_tentativa = VALUES(fecha_tentativa)`,
        [subtareaId, etapa.etapaId, etapa.aplica, etapa.fechaTentativa]
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
           responsable = VALUES(responsable)`,
        [
          subtareaId,
          etapa.etapaId,
          etapa.estadoFinal,
          etapa.fechaTentativa,
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
    `INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE aplica = VALUES(aplica), fecha_tentativa = VALUES(fecha_tentativa)`,
    [subtarea.id, etapaId, true, data.fechaPlanificada || null]
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
      data.fechaPlanificada || null,
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

export async function createSeguimientoDiario(data) {
  const responsable = await resolverResponsable(data || {});
  const result = await query(
    `INSERT INTO seguimientos_diarios
     (subtarea_id, etapa_id, fecha, comentario, tiene_alerta, responsable_id, responsable, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.subtareaId,
      data.etapaId,
      data.fecha || new Date().toISOString().slice(0, 10),
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
  updates.push('updated_at = NOW()');
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
