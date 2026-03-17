import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../../Documentos base/PAC - POA 2026 - Subtarea 02022026.xlsx');
const workbook = XLSX.readFile(filePath);

// Read "Matriz PAC POA 2026" sheet with header row option
const sheetName = 'Matriz PAC POA 2026';
const worksheet = workbook.Sheets[sheetName];

// Convert to array of arrays to handle merged cells better
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

console.log('Total rows:', rawData.length);
console.log('\nFirst 10 rows:');
rawData.slice(0, 10).forEach((row, idx) => {
  console.log(`Row ${idx}:`, row.slice(0, 15)); // First 15 columns
});

console.log('\n\nLooking for header row...');
// Find the header row
let headerRow = -1;
for (let i = 0; i < Math.min(20, rawData.length); i++) {
  const row = rawData[i];
  const rowText = row.join(' ').toLowerCase();
  if (rowText.includes('subtarea') || rowText.includes('nombre') || rowText.includes('actividad')) {
    console.log(`Potential header at row ${i}:`, row.slice(0, 20));
    headerRow = i;
  }
}

if (headerRow >= 0) {
  console.log('\n\nData rows (first 3):');
  for (let i = headerRow + 1; i < Math.min(headerRow + 4, rawData.length); i++) {
    console.log(`Row ${i}:`, rawData[i].slice(0, 15));
  }
}
