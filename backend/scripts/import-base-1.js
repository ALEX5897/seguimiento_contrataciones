import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'poa_pac',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

const EXCEL_FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../../Documentos base/base_1.xlsx');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
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

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
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

function buildHeaderIndex(headers) {
  const idx = {};
  headers.forEach((header, i) => {
    idx[normalizeText(header)] = i;
  });
  return idx;
}

function resolveIndex(headerIndex, aliases) {
  for (const alias of aliases) {
    const found = headerIndex[normalizeText(alias)];
    if (found !== undefined) return found;
  }
  return -1;
}

async function truncateAllTables() {
  const tables = await query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableNames = tables.map((row) => Object.values(row)[0]);

  await query('SET FOREIGN_KEY_CHECKS = 0');
  for (const tableName of tableNames) {
    await query(`TRUNCATE TABLE \`${tableName}\``);
  }
  await query('SET FOREIGN_KEY_CHECKS = 1');

  return tableNames.length;
}

async function main() {
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No se encontró ninguna hoja en el archivo Excel');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (rows.length < 3) {
    throw new Error('El archivo no contiene suficientes filas (encabezado fila 2 y datos desde fila 3)');
  }

  const headersRow2 = (rows[1] || []).map((h) => (h ?? '').toString().trim());
  const headerIndex = buildHeaderIndex(headersRow2);

  const idxDireccion = resolveIndex(headerIndex, ['Direccion encargada', 'Dirección encargada', 'Direccion']);
  const idxSubtarea = resolveIndex(headerIndex, ['SUBTAREA', 'Subtarea']);
  const idxCodigo = resolveIndex(headerIndex, ['CODIGO_OLIMPO', 'Código Olympo', 'Codigo Olympo']);
  const idxPartida = resolveIndex(headerIndex, ['PARTIDA_PRESUPUESTARIA', 'Partida Presupuestaria']);
  const idxPresupuesto = resolveIndex(headerIndex, ['PRESUPUESTO_2026_INICIAL', 'Presupuesto 2026 Inicial']);
  const idxCosto = resolveIndex(headerIndex, ['COSTO 2026', 'Costo 2026', 'COSTO 2026 REFORMA 2']);
  const idxPacNoPac = resolveIndex(headerIndex, ['PAC - NO PAC', 'PAC-NO PAC', 'TIPO PLAN']);
  const idxResponsable = resolveIndex(headerIndex, ['RESPONSABLE', 'Responsable']);
  const idxCuatrimestre = resolveIndex(headerIndex, ['CUATRIMESTRE', 'Cuatrimestre']);
  const idxPlazoContrato = resolveIndex(headerIndex, ['PLAZO DE CONTRATO', 'Plazo de contrato']);
  const idxProcedimiento = resolveIndex(headerIndex, ['PROCEDIMIENTO SUGERIDO', 'Procedimiento sugerido']);
  const idxObservaciones = resolveIndex(headerIndex, ['OBSERVACIONES', 'Observaciones']);

  if (idxSubtarea === -1 || idxCodigo === -1) {
    throw new Error('No se encontraron columnas obligatorias SUBTAREA y/o CODIGO_OLIMPO en fila 2');
  }

  const usedIndexes = new Set([
    idxDireccion, idxSubtarea, idxCodigo, idxPartida, idxPresupuesto, idxCosto,
    idxPacNoPac, idxResponsable, idxCuatrimestre, idxPlazoContrato, idxProcedimiento, idxObservaciones
  ].filter((v) => v >= 0));

  const stageColumns = headersRow2
    .map((header, index) => ({ header: (header || '').trim(), index }))
    .filter((item) => item.index >= 7 && item.index <= 56)
    .filter((item) => item.header && !usedIndexes.has(item.index));

  const truncated = await truncateAllTables();

  for (let i = 0; i < stageColumns.length; i++) {
    await query('INSERT INTO etapas_pac (nombre, orden, es_personalizada) VALUES (?, ?, true)', [stageColumns[i].header, i + 1]);
  }

  const etapas = await query('SELECT id, nombre FROM etapas_pac ORDER BY orden');
  const etapaIdByName = new Map(etapas.map((e) => [e.nombre, e.id]));

  let totalFilas = 0;
  let importadas = 0;
  let omitidas = 0;

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r] || [];
    totalFilas += 1;

    const codigoOlympo = String(row[idxCodigo] || '').trim();
    const nombreSubtarea = String(row[idxSubtarea] || '').trim();
    if (!codigoOlympo || !nombreSubtarea) {
      omitidas += 1;
      continue;
    }

    const direccion = idxDireccion >= 0 ? String(row[idxDireccion] || '').trim() || 'Sin dirección' : 'Sin dirección';
    const responsable = idxResponsable >= 0 ? String(row[idxResponsable] || '').trim() || null : null;

    await query(
      `INSERT INTO subtareas (
        direccion_encargada, nombre, codigo_olympo, partida_presupuestaria,
        presupuesto_2026_inicial, costo_2026, cuatrimestre, plazo_contrato,
        pac_no_pac, procedimiento_sugerido, responsable, activo, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)
      ON DUPLICATE KEY UPDATE
        direccion_encargada = VALUES(direccion_encargada),
        nombre = VALUES(nombre),
        partida_presupuestaria = VALUES(partida_presupuestaria),
        presupuesto_2026_inicial = VALUES(presupuesto_2026_inicial),
        costo_2026 = VALUES(costo_2026),
        cuatrimestre = VALUES(cuatrimestre),
        plazo_contrato = VALUES(plazo_contrato),
        pac_no_pac = VALUES(pac_no_pac),
        procedimiento_sugerido = VALUES(procedimiento_sugerido),
        responsable = VALUES(responsable),
        activo = true,
        observaciones = VALUES(observaciones)`,
      [
        direccion,
        nombreSubtarea,
        codigoOlympo,
        idxPartida >= 0 ? String(row[idxPartida] || '').trim() || null : null,
        idxPresupuesto >= 0 ? toNumber(row[idxPresupuesto]) : 0,
        idxCosto >= 0 ? toNumber(row[idxCosto]) : 0,
        idxCuatrimestre >= 0 ? String(row[idxCuatrimestre] || '').trim() || null : null,
        idxPlazoContrato >= 0 ? String(row[idxPlazoContrato] || '').trim() || null : null,
        idxPacNoPac >= 0 ? String(row[idxPacNoPac] || '').trim() || 'PAC' : 'PAC',
        idxProcedimiento >= 0 ? String(row[idxProcedimiento] || '').trim() || null : null,
        responsable,
        idxObservaciones >= 0 ? String(row[idxObservaciones] || '').trim() : ''
      ]
    );

    const subtareaRows = await query('SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1', [codigoOlympo]);
    if (!subtareaRows.length) {
      omitidas += 1;
      continue;
    }
    const subtareaId = subtareaRows[0].id;

    for (const { header, index } of stageColumns) {
      const etapaId = etapaIdByName.get(header);
      if (!etapaId) continue;

      const rawValue = row[index];
      const fechaTentativa = toDate(rawValue);
      const aplica = rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '';

      await query(
        `INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE aplica = VALUES(aplica), fecha_tentativa = VALUES(fecha_tentativa)`,
        [subtareaId, etapaId, aplica ? 1 : 0, fechaTentativa]
      );

      await query(
        `INSERT INTO seguimiento_etapas (
          subtarea_id, etapa_id, estado, fecha_planificada, fecha_real, responsable, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          estado = VALUES(estado),
          fecha_planificada = VALUES(fecha_planificada),
          fecha_real = VALUES(fecha_real),
          responsable = VALUES(responsable),
          observaciones = VALUES(observaciones)`,
        [subtareaId, etapaId, 'pendiente', fechaTentativa, null, responsable, '']
      );
    }

    importadas += 1;
  }

  const [totalSubtareas] = await query('SELECT COUNT(*) AS total FROM subtareas');
  const [totalEtapas] = await query('SELECT COUNT(*) AS total FROM etapas_pac');
  const [totalAsignaciones] = await query('SELECT COUNT(*) AS total FROM subtareas_etapas');

  console.log(`Archivo importado: ${EXCEL_FILE}`);
  console.log(`Hoja procesada: ${sheetName}`);
  console.log(`Tablas truncadas: ${truncated}`);
  console.log(`Filas analizadas: ${totalFilas}`);
  console.log(`Filas importadas: ${importadas}`);
  console.log(`Filas omitidas: ${omitidas}`);
  console.log(`Subtareas cargadas: ${totalSubtareas.total}`);
  console.log(`Etapas creadas (H2:BE2): ${totalEtapas.total}`);
  console.log(`Asignaciones subtarea-etapa: ${totalAsignaciones.total}`);

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error en importación base_1:', error.message);
    process.exit(1);
  });
