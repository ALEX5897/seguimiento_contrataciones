import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { initMySQL, query } from '../data/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../../Documentos base/final.xlsx');

const SHEET_NAME = 'Matriz POA 2026';

const ETAPAS_OBJETIVO = [
  'Solicitud de certificación problemática',
  'Certificación POA/PAI',
  'Informe técnico',
  'Informe de necesidad',
  'Términos de referencia',
  'Especificaciones técnicas',
  'Mesa técnica',
  'Corrección',
  'Solicitud de autorización de informe',
  'Autorización del informe',
  'Solicitud de CATE',
  'CATE',
  'Solicitud de publicación',
  'Publicación de proformas',
  'Recepción de proformas',
  'Estudio de mercado',
  'Solicitud de certificación presupuestaria',
  'Certificación PAC'
];

const NORMALIZED_STAGE_MAP = {
  'solictud de certificacion programatica': 'Solicitud de certificación problemática',
  'solicitud de certificacion programatica': 'Solicitud de certificación problemática',
  'certificacion poa pai': 'Certificación POA/PAI',
  'informe tecnico': 'Informe técnico',
  'informe de necesidad': 'Informe de necesidad',
  'terminos de referencia especificaciones tecnicas': 'Términos de referencia',
  'terminos de referencia': 'Términos de referencia',
  'especificaciones tecnicas': 'Especificaciones técnicas',
  'mesa tecnica': 'Mesa técnica',
  'correccion': 'Corrección',
  'solicitud de autorizacion de informe de necesidad': 'Solicitud de autorización de informe',
  'autorizacion del informe': 'Autorización del informe',
  'solicitud de cate': 'Solicitud de CATE',
  'cate': 'CATE',
  'solicitud de publicacion': 'Solicitud de publicación',
  'publicacion proformas': 'Publicación de proformas',
  'recepcion proformas': 'Recepción de proformas',
  'estudio de mercado': 'Estudio de mercado',
  'solicitud de certificacion presupuestaria': 'Solicitud de certificación presupuestaria',
  'certificacion presuestaria': 'Certificación PAC',
  'certificacion pac': 'Certificación PAC',
  'solicitud de certicacion pac': 'Certificación PAC'
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
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
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return d.toISOString().slice(0, 10);
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-') return null;

    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) {
      return iso.toISOString().slice(0, 10);
    }

    const dmY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmY) {
      const d = new Date(Date.UTC(parseInt(dmY[3]), parseInt(dmY[2]) - 1, parseInt(dmY[1])));
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

async function getOrCreateDireccionId(nombre) {
  const trimmed = String(nombre || '').trim() || 'Sin dirección';
  const codigo = normalizeText(trimmed).slice(0, 40) || 'sin-direccion';

  const found = await query('SELECT id FROM direcciones WHERE nombre = ? LIMIT 1', [trimmed]);
  if (found.length) return found[0].id;

  await query('INSERT INTO direcciones (nombre, codigo) VALUES (?, ?)', [trimmed, `${codigo}-${Date.now()}`]);
  const inserted = await query('SELECT id FROM direcciones WHERE nombre = ? ORDER BY id DESC LIMIT 1', [trimmed]);
  return inserted[0].id;
}

async function getOrCreateResponsableId(nombre, direccionId) {
  const trimmed = String(nombre || '').trim() || 'Sin responsable';
  const found = await query('SELECT id FROM responsables WHERE nombre = ? LIMIT 1', [trimmed]);
  if (found.length) return found[0].id;

  const emailBase = normalizeText(trimmed).replace(/\s+/g, '.').slice(0, 30) || 'usuario';
  const email = `${emailBase}.${Date.now()}@quitoturismo.gob.ec`;
  await query('INSERT INTO responsables (nombre, email, direccion_id) VALUES (?, ?, ?)', [trimmed, email, direccionId]);
  const inserted = await query('SELECT id FROM responsables WHERE nombre = ? ORDER BY id DESC LIMIT 1', [trimmed]);
  return inserted[0].id;
}

async function getOrCreateActividadId(nombre, direccionId, tipoPlan, fechaInicio, fechaFin) {
  const trimmed = String(nombre || '').trim() || 'Actividad sin nombre';
  const found = await query(
    'SELECT id FROM actividades WHERE nombre = ? AND direccion_id = ? LIMIT 1',
    [trimmed, direccionId]
  );
  if (found.length) return found[0].id;

  await query(
    `INSERT INTO actividades (nombre, direccion_id, tipo_plan, presupuesto, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [trimmed, direccionId, String(tipoPlan || 'Plan Anual de Gasto Permanente'), fechaInicio, fechaFin]
  );

  const inserted = await query(
    'SELECT id FROM actividades WHERE nombre = ? AND direccion_id = ? ORDER BY id DESC LIMIT 1',
    [trimmed, direccionId]
  );
  return inserted[0].id;
}

async function main() {
  await initMySQL();

  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  if (!workbook.SheetNames.includes(SHEET_NAME)) {
    throw new Error(`No existe la hoja '${SHEET_NAME}' en ${EXCEL_FILE}`);
  }

  const sheet = workbook.Sheets[SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = rows[4] || [];

  const col = (headerName) => headers.findIndex((h) => normalizeText(h) === normalizeText(headerName));

  const idx = {
    direccion: col('Dirección'),
    tipoPlan: col('Tipo de Plan'),
    actividad: col('Nombre de la Actividad'),
    fechaInicioTarea: col('Fecha de Inicio (Tarea)'),
    fechaFinTarea: col('Fecha Fin (Tarea)'),
    subtarea: col('SubTarea'),
    codigoOlympo: col('Código Olympo'),
    partida: col('Partida Presupuestaria'),
    fuente: col('Fuente de Financiamiento'),
    presupuesto: col('Presupuesto con Reformas'),
    costoReforma2: col('COSTO 2026 REFORMA 2'),
    responsable: col('RESPONSABLE')
  };

  const stageColumns = new Map();
  headers.forEach((header, index) => {
    const normalizedHeader = normalizeText(header);
    const etapa = NORMALIZED_STAGE_MAP[normalizedHeader];
    if (etapa && !stageColumns.has(etapa)) {
      stageColumns.set(etapa, index);
    }
  });

  await query('DELETE FROM seguimiento_etapas');
  await query('DELETE FROM subtareas');
  await query('DELETE FROM etapas_pac');

  for (let i = 0; i < ETAPAS_OBJETIVO.length; i++) {
    await query('INSERT INTO etapas_pac (nombre, orden) VALUES (?, ?)', [ETAPAS_OBJETIVO[i], i + 1]);
  }

  const etapaRows = await query('SELECT id, nombre FROM etapas_pac ORDER BY orden');
  const etapaByName = new Map(etapaRows.map((e) => [e.nombre, e.id]));

  let inserted = 0;

  for (let r = 5; r < rows.length; r++) {
    const row = rows[r] || [];
    const codigoOlympo = String(row[idx.codigoOlympo] || '').trim();
    const nombreSubtarea = String(row[idx.subtarea] || '').trim();

    if (!codigoOlympo || !nombreSubtarea) continue;

    const direccionId = await getOrCreateDireccionId(row[idx.direccion]);
    const responsableId = await getOrCreateResponsableId(row[idx.responsable], direccionId);
    const actividadId = await getOrCreateActividadId(
      row[idx.actividad],
      direccionId,
      row[idx.tipoPlan],
      toDate(row[idx.fechaInicioTarea]),
      toDate(row[idx.fechaFinTarea])
    );

    await query(
      `INSERT INTO subtareas (
        codigo_olympo, nombre, actividad_id, responsable_id, partida_presupuestaria,
        fuente_financiamiento, presupuesto, costo_reforma_2, estado, avance_general, observaciones, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 0, '', NOW(), NOW())`,
      [
        codigoOlympo,
        nombreSubtarea,
        actividadId,
        responsableId,
        String(row[idx.partida] || '').trim() || null,
        String(row[idx.fuente] || '').trim() || null,
        toNumber(row[idx.presupuesto]),
        toNumber(row[idx.costoReforma2])
      ]
    );

    for (const etapaNombre of ETAPAS_OBJETIVO) {
      const etapaId = etapaByName.get(etapaNombre);
      const colIndex = stageColumns.get(etapaNombre);
      const fechaPlanificada = colIndex !== undefined ? toDate(row[colIndex]) : null;
      const estado = fechaPlanificada ? 'completado' : 'pendiente';

      await query(
        `INSERT INTO seguimiento_etapas (codigo_olympo, etapa_id, estado, fecha_planificada, fecha_real, responsable_id, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoOlympo,
          etapaId,
          estado,
          fechaPlanificada,
          null,
          responsableId,
          ''
        ]
      );
    }

    inserted += 1;
  }

  console.log(`Importación completada desde: ${EXCEL_FILE}`);
  console.log(`Subtareas importadas: ${inserted}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error importando matriz:', error.message);
    process.exit(1);
  });