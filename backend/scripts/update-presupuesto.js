// update-presupuesto.js
// Actualiza costo_2026 y presupuesto_2026_inicial en subtareas
// usando el archivo update_datos.xlsx (columnas: CODIGO_OLIMPO, PRESUPUESTO)

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

function readExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, header: 1 });

  // Encontrar la fila de encabezados (la primera que contenga CODIGO_OLIMPO)
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const normalized = rows[i].map(v => String(v || '').toUpperCase().trim());
    if (normalized.includes('CODIGO_OLIMPO') || normalized.includes('CODIGO OLIMPO')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('No se encontró la fila de encabezados en el Excel');

  const headers = rows[headerIdx].map(v => String(v || '').toUpperCase().trim()
    .replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const codigoCol = headers.findIndex(h => h === 'CODIGO_OLIMPO' || h === 'CODIGO_OLYMPO');
  const presupuestoCol = headers.findIndex(h => h === 'PRESUPUESTO' || h === 'MONTO' || h === 'CANTIDAD');

  if (codigoCol === -1) throw new Error('Columna CODIGO_OLIMPO no encontrada. Columnas detectadas: ' + headers.join(', '));
  if (presupuestoCol === -1) throw new Error('Columna PRESUPUESTO no encontrada. Columnas detectadas: ' + headers.join(', '));

  const data = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const codigo = String(row[codigoCol] || '').trim();
    const presupuesto = parseFloat(row[presupuestoCol]);
    if (!codigo || isNaN(presupuesto)) continue;
    data.push({ codigo, presupuesto });
  }
  return data;
}

async function main() {
  console.log('=== Update Presupuesto ===');
  console.log('Archivo:', EXCEL_FILE);

  let data;
  try {
    data = readExcel(EXCEL_FILE);
  } catch (err) {
    console.error('Error leyendo Excel:', err.message);
    process.exit(1);
  }
  console.log(`Registros leídos del Excel: ${data.length}`);

  let actualizados = 0;
  let noEncontrados = [];
  let errores = [];

  for (const { codigo, presupuesto } of data) {
    try {
      const result = await query(
        `UPDATE subtareas
         SET costo_2026 = ?, presupuesto_2026_inicial = ?, updated_at = NOW()
         WHERE codigo_olympo = ?`,
        [presupuesto, presupuesto, codigo]
      );
      if (result.affectedRows > 0) {
        actualizados++;
        console.log(`  ✓ ${codigo} → $${presupuesto.toLocaleString()}`);
      } else {
        noEncontrados.push(codigo);
        console.warn(`  ✗ NO ENCONTRADO: ${codigo}`);
      }
    } catch (err) {
      errores.push({ codigo, error: err.message });
      console.error(`  ! ERROR en ${codigo}: ${err.message}`);
    }
  }

  console.log('\n=== Resumen ===');
  console.log(`Actualizados:     ${actualizados}`);
  console.log(`No encontrados:   ${noEncontrados.length}`);
  console.log(`Errores:          ${errores.length}`);

  if (noEncontrados.length > 0) {
    console.log('\nCódigos no encontrados en la BD:');
    noEncontrados.forEach(c => console.log('  -', c));
  }
  if (errores.length > 0) {
    console.log('\nErrores:');
    errores.forEach(({ codigo, error }) => console.log(`  - ${codigo}: ${error}`));
  }

  await pool.end();
  process.exit(errores.length > 0 ? 1 : 0);
}

main();
