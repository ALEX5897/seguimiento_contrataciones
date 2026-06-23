import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const baseDir = 'Documentos base';

// Read the main file
const updateFile = path.join(baseDir, 'update_datos.xlsx');
const workbook = XLSX.readFile(updateFile);

console.log('\n=== ESTRUCTURA DE update_datos.xlsx ===');
console.log('Hojas disponibles:', workbook.SheetNames);

// Read all sheets
workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`\n--- Hoja: ${sheetName} ---`);
  console.log(`Total de registros: ${data.length}`);

  if (data.length > 0) {
    console.log('Columnas:', Object.keys(data[0]));
    console.log('Primeros 3 registros:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  }
});

// Also check other files to find olympo codes
console.log('\n\n=== BUSCANDO INFORMACIÓN DE CÓDIGO OLYMPO ===');

const filesToCheck = [
  'final.xlsx',
  'base_1.xlsx',
  'PAC - POA 2026 - Subtarea 02022026.xlsx',
  'POA 2026 - Subtarea 02022026.xlsx'
];

filesToCheck.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`\nArchivo: ${file}`);
    try {
      const wb = XLSX.readFile(filePath);
      console.log('  Hojas:', wb.SheetNames);

      // Check first sheet
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length > 0) {
        console.log('  Columnas:', Object.keys(data[0]));
        // Show first row
        console.log('  Primer registro:', JSON.stringify(data[0], null, 2));
      }
    } catch (e) {
      console.log('  Error al leer:', e.message);
    }
  }
});
