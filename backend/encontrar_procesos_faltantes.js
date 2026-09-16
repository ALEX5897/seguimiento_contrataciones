import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const EXCEL_FILE = path.resolve(__dirname, '../Matriz_Base_POA_2026_1.xlsx');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('🔍 Buscando procesos duplicados/faltantes...\n');

  // Leer Excel
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = rows[0] || [];

  const col = (headerName) => {
    const normalized = normalizeText(headerName);
    return headers.findIndex((h) => normalizeText(h) === normalized);
  };

  // Analizar Excel
  const procesosEnExcel = [];
  const codigosVistos = new Set();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const subtarea = String(row[col('subtarea')] || '').trim();
    if (!subtarea) continue;

    const codigo = String(row[col('codigo_olympo')] || '').trim() || 'N/A';
    const subtareaCol = col('subtarea');

    procesosEnExcel.push({
      fila: r,
      codigo,
      subtarea,
      direccion: String(row[col('direccion')] || '').trim(),
      rowData: row
    });

    if (codigo === 'N/A') {
      console.log(`Fila ${r}: Sin código - ${subtarea.substring(0, 60)}`);
    }

    // Detectar duplicados
    if (codigosVistos.has(codigo)) {
      console.log(`⚠️  Fila ${r}: Código DUPLICADO "${codigo}" - ${subtarea.substring(0, 60)}`);
    }
    codigosVistos.add(codigo);
  }

  console.log(`\n✅ Total en Excel: ${procesosEnExcel.length} procesos`);
  console.log(`⚠️  Códigos "N/A": ${procesosEnExcel.filter(p => p.codigo === 'N/A').length}`);

  // Conectar a BD
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    // Obtener version_id
    const [versionReforma] = await conn.query(
      'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
    );
    const versionId = versionReforma[0].id;

    // Contar en BD
    const [countBD] = await conn.query(
      'SELECT COUNT(*) as total FROM procesos WHERE version_id = ?',
      [versionId]
    );

    console.log(`\n💾 Total en BD: ${countBD[0].total} procesos`);
    console.log(`❌ Faltantes: ${procesosEnExcel.length - countBD[0].total}\n`);

    // Encontrar cuáles faltaron
    console.log('Buscando procesos faltantes...\n');

    const procesosSubtareas = procesosEnExcel.map(p => p.subtarea);
    const [procesosBD] = await conn.query(
      'SELECT subtarea FROM procesos WHERE version_id = ?',
      [versionId]
    );

    const subtareasEnBD = new Set(procesosBD.map(p => p.subtarea));

    const faltantes = procesosEnExcel.filter(p => !subtareasEnBD.has(p.subtarea));

    console.log(`📋 Procesos faltantes (${faltantes.length}):\n`);
    faltantes.forEach((p, i) => {
      console.log(`${i + 1}. Fila ${p.fila}`);
      console.log(`   Código: ${p.codigo}`);
      console.log(`   Subtarea: ${p.subtarea}`);
      console.log(`   Dirección: ${p.direccion}\n`);
    });

    if (faltantes.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Necesitamos cargar ${faltantes.length} procesos más`);
      console.log('═══════════════════════════════════════════════════════\n');
    }

  } finally {
    await conn.release();
    await pool.end();
  }
}

main().then(() => process.exit(0));
