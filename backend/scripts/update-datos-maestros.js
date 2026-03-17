import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const EXCEL_FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../../Documentos base/update_datos.xlsx');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'poa_pac',
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: true
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return date.toISOString().slice(0, 10);
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-') return null;

    const isoCandidate = new Date(trimmed);
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString().slice(0, 10);
    }

    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      const date = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

async function ensureColumn(table, column, definition) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );

  if (Number(rows[0]?.total || 0) === 0) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`+ Columna agregada: ${table}.${column}`);
  }
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const normalized = (rows[i] || []).map((cell) => normalizeText(cell));
    if (normalized.includes('CODIGO OLIMPO')) {
      return i;
    }
  }
  return -1;
}

async function main() {
  console.log('=== Update Datos Maestros ===');
  console.log('Archivo:', EXCEL_FILE);
  console.log('Base de datos:', process.env.DB_NAME || 'poa_pac');

  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex === -1) {
    throw new Error('No se encontró encabezado con CODIGO_OLIMPO en el Excel');
  }

  await ensureColumn('subtareas', 'responsable_directivo', 'VARCHAR(255) NULL');
  await ensureColumn('subtareas', 'correo_responsable_directivo', 'VARCHAR(255) NULL');

  const headers = (rows[headerRowIndex] || []).map((cell) => String(cell || '').trim());
  const headerMap = new Map(headers.map((header, index) => [normalizeText(header), index]));

  const idxCodigo = headerMap.get('CODIGO OLIMPO');
  const idxResponsableDirectivo = headerMap.get('RESPONSABLE DIRECTIVO');
  const idxCorreoResponsable = headerMap.get('CORREO RESPONSABLE DIRECTIVO');
  const idxDireccion = headerMap.get('DIRECCION');
  const idxProcedimiento = headerMap.get('PROCEDIMIENTO SUGERIDO');
  const idxPacNoPac = headerMap.get('PAC NO PAC');

  if (idxCodigo === undefined) {
    throw new Error('No existe la columna CODIGO_OLIMPO');
  }

  const etapas = await query('SELECT id, nombre FROM etapas_pac ORDER BY orden');
  const etapaIdByHeader = new Map();
  for (const etapa of etapas) {
    etapaIdByHeader.set(normalizeText(etapa.nombre), etapa.id);
  }

  const stageColumns = [];
  headers.forEach((header, index) => {
    const etapaId = etapaIdByHeader.get(normalizeText(header));
    if (etapaId) {
      stageColumns.push({ index, etapaId, etapaNombre: header });
    }
  });

  const codigosArchivo = [];
  let filasLeidas = 0;
  let subtareasActualizadas = 0;
  let etapasActualizadas = 0;
  let noEncontrados = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const codigoOlympo = String(row[idxCodigo] || '').trim();
    if (!codigoOlympo) continue;

    filasLeidas += 1;
    codigosArchivo.push(codigoOlympo);

    const responsableDirectivo = idxResponsableDirectivo !== undefined
      ? String(row[idxResponsableDirectivo] || '').trim() || null
      : null;
    const correoResponsable = idxCorreoResponsable !== undefined
      ? String(row[idxCorreoResponsable] || '').trim() || null
      : null;
    const direccion = idxDireccion !== undefined
      ? String(row[idxDireccion] || '').trim() || null
      : null;
    const procedimiento = idxProcedimiento !== undefined
      ? String(row[idxProcedimiento] || '').trim() || null
      : null;
    const pacNoPac = idxPacNoPac !== undefined
      ? String(row[idxPacNoPac] || '').trim() || null
      : null;

    const subtareas = await query('SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1', [codigoOlympo]);
    if (!subtareas.length) {
      noEncontrados += 1;
      continue;
    }

    const subtareaId = subtareas[0].id;

    await query(
      `UPDATE subtareas
       SET responsable = COALESCE(?, responsable),
           responsable_directivo = ?,
           correo_responsable_directivo = ?,
           direccion_encargada = COALESCE(?, direccion_encargada),
           procedimiento_sugerido = COALESCE(?, procedimiento_sugerido),
           pac_no_pac = COALESCE(?, pac_no_pac),
           activo = 1,
           updated_at = NOW()
       WHERE id = ?`,
      [
        responsableDirectivo,
        responsableDirectivo,
        correoResponsable,
        direccion,
        procedimiento,
        pacNoPac,
        subtareaId
      ]
    );

    subtareasActualizadas += 1;

    for (const stage of stageColumns) {
      const fecha = toDate(row[stage.index]);
      if (!fecha) continue;

      await query(
        `INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa)
         VALUES (?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE
           aplica = VALUES(aplica),
           fecha_tentativa = VALUES(fecha_tentativa)`,
        [subtareaId, stage.etapaId, fecha]
      );

      await query(
        `INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_planificada, fecha_real, responsable, observaciones)
         VALUES (?, ?, 'completado', ?, ?, ?, 'Actualizado desde update_datos.xlsx')
         ON DUPLICATE KEY UPDATE
           estado = 'completado',
           fecha_planificada = VALUES(fecha_planificada),
           fecha_real = VALUES(fecha_real),
           responsable = VALUES(responsable)`,
        [
          subtareaId,
          stage.etapaId,
          fecha,
          fecha,
          responsableDirectivo
        ]
      );

      etapasActualizadas += 1;
    }
  }

  if (codigosArchivo.length) {
    const placeholders = codigosArchivo.map(() => '?').join(',');
    await query(
      `UPDATE subtareas
       SET activo = 0, updated_at = NOW()
       WHERE codigo_olympo NOT IN (${placeholders})`,
      codigosArchivo
    );
  }

  const inactivas = await query('SELECT COUNT(*) AS total FROM subtareas WHERE activo = 0');

  console.log('\n=== Resumen ===');
  console.log(`Filas leídas en Excel: ${filasLeidas}`);
  console.log(`Subtareas actualizadas: ${subtareasActualizadas}`);
  console.log(`Etapas marcadas como completadas: ${etapasActualizadas}`);
  console.log(`Códigos no encontrados: ${noEncontrados}`);
  console.log(`Subtareas inactivas tras sincronización: ${inactivas[0]?.total || 0}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('ERROR:', error.message);
    await pool.end();
    process.exit(1);
  });
