import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.resolve(__dirname, '../Matriz_Base_POA_2026_1.xlsx');

try {
  const workbook = XLSX.readFile(file, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  console.log('📊 ANÁLISIS DE ESTRUCTURA');
  console.log('==========================');
  console.log('Hojas disponibles:', workbook.SheetNames);
  console.log('Hoja actual:', sheetName);
  console.log('Total de filas:', rows.length - 1);

  const headers = rows[0] || [];
  console.log('\n📋 COLUMNAS DISPONIBLES (' + headers.length + '):');
  headers.forEach((h, idx) => {
    const name = String(h || '').trim();
    console.log(`  [${idx}] ${name}`);
  });

  console.log('\n📊 PRIMER REGISTRO COMPLETO:');
  const row1 = rows[1] || [];
  headers.forEach((h, i) => {
    const val = row1[i];
    if (val !== null && val !== undefined) {
      console.log(`  ${h}: ${String(val).substring(0, 100)}`);
    }
  });
} catch (error) {
  console.error('Error:', error.message);
  console.error(error);
}
