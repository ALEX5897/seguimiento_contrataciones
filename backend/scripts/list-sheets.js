import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../../Documentos base/PAC - POA 2026 - Subtarea 02022026.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Available sheets:', workbook.SheetNames);
console.log('\nDetailed info:\n');

workbook.SheetNames.forEach((name, idx) => {
  const worksheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  console.log(`Sheet ${idx + 1}: "${name}"`);
  console.log(`  Rows: ${data.length}`);
  if (data.length > 0) {
    console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
  }
  console.log('');
});
