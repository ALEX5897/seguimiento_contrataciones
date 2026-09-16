import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE = path.resolve(__dirname, '../Matriz_Base_POA_2026_1.xlsx');

try {
  console.log('Leyendo archivo Excel...');
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = rows[0] || [];

  console.log('\n=== COLUMNAS EN EL EXCEL ===');
  headers.forEach((header, index) => {
    console.log(`${index}: ${header}`);
  });

  console.log('\n=== BUSCANDO COLUMNAS PAC ===');
  headers.forEach((header, index) => {
    const lower = String(header).toLowerCase();
    if (lower.includes('pac') || lower.includes('plan') || lower.includes('tipo')) {
      console.log(`${index}: ${header}`);
    }
  });

  console.log('\n=== PRIMERAS 3 FILAS DE DATOS ===');
  for (let i = 1; i <= 3 && i < rows.length; i++) {
    const row = rows[i];
    console.log(`\nFila ${i}:`);

    // Mostrar columnas relevantes
    headers.forEach((header, index) => {
      if (String(header).toLowerCase().includes('pac') ||
          String(header).toLowerCase().includes('plan') ||
          String(header).toLowerCase().includes('tipo') ||
          index === 0 || index === 1) {
        console.log(`  ${header}: ${row[index]}`);
      }
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
