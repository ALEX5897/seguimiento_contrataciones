import { initMySQL, query } from '../data/mysql.js';
import iconv from 'iconv-lite';

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

function repairMojibake(value = '') {
  let text = String(value || '');

  const decoded = decodeMojibake(text);
  if (noiseScore(decoded) < noiseScore(text)) {
    text = decoded;
  }

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

  return text.trim().replace(/\s+/g, ' ');
}

async function getExistingColumns(table, columns = []) {
  const rows = await query(
    `SELECT COLUMN_NAME AS columnName
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );

  const existing = new Set(rows.map((row) => row.columnName));
  return columns.filter((column) => existing.has(column));
}

async function fixTable(table, idCol, textCols) {
  const cols = await getExistingColumns(table, [idCol, ...textCols]);
  if (!cols.includes(idCol)) return 0;

  const columnsToFix = textCols.filter((col) => cols.includes(col));
  if (!columnsToFix.length) return 0;

  const rows = await query(`SELECT ${idCol}, ${columnsToFix.join(', ')} FROM ${table}`);
  let changed = 0;

  for (const row of rows) {
    const sets = [];
    const values = [];

    for (const col of columnsToFix) {
      const original = row[col];
      if (original === null || original === undefined) continue;
      const repaired = repairMojibake(original);
      if (repaired !== original) {
        sets.push(`${col} = ?`);
        values.push(repaired);
      }
    }

    if (sets.length > 0) {
      values.push(row[idCol]);
      await query(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${idCol} = ?`, values);
      changed += 1;
    }
  }

  return changed;
}

async function main() {
  await initMySQL();

  const subtareas = await fixTable('subtareas', 'id', [
    'nombre',
    'direccion_encargada',
    'responsable',
    'observaciones',
    'partida_presupuestaria',
    'fuente_financiamiento',
    'plazo_contrato',
    'procedimiento_sugerido',
    'cuatrimestre'
  ]);
  const usuarios = await fixTable('usuarios', 'id', ['nombre', 'direccion_nombre']);
  const direcciones = await fixTable('direcciones_catalogo', 'id', ['nombre']);
  const responsables = await fixTable('responsables_catalogo', 'id', ['nombre']);
  const etapas = await fixTable('etapas_pac', 'id', ['nombre']);
  const seguimientoEtapas = await fixTable('seguimiento_etapas', 'id', ['observaciones', 'responsable']);
  const seguimientosDiarios = await fixTable('seguimientos_diarios', 'id', ['comentario', 'responsable']);
  const notificaciones = await fixTable('notificaciones', 'id', ['asunto', 'mensaje', 'destinatario']);

  console.log(JSON.stringify({
    success: true,
    updatedRows: {
      subtareas,
      usuarios,
      direcciones_catalogo: direcciones,
      responsables_catalogo: responsables,
      etapas_pac: etapas,
      seguimiento_etapas: seguimientoEtapas,
      seguimientos_diarios: seguimientosDiarios,
      notificaciones
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
