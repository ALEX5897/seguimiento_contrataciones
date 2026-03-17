import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../../Documentos base/PAC - POA 2026 - Subtarea 02022026.xlsx');
const workbook = XLSX.readFile(filePath);

// Read "Matriz PAC POA 2026" sheet
const sheetName = 'Matriz PAC POA 2026';
const worksheet = workbook.Sheets[sheetName];

// Convert to array of arrays
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

// Row 4 is the header
const headers = rawData[4];
console.log('Headers found:', headers.length);
console.log('\nAll columns:');
headers.forEach((h, idx) => {
  if (h) console.log(`${idx}: ${h}`);
});

// Find key column indices
const findColumn = (searchTerms) => {
  return headers.findIndex(h => {
    if (!h) return false;
    const headerLower = h.toString().toLowerCase();
    return searchTerms.some(term => headerLower.includes(term.toLowerCase()));
  });
};

const colIndices = {
  direccion: findColumn(['Dirección', 'direccion']),
  tipoPlan: findColumn(['Tipo de Plan']),
  nombre: findColumn(['Nombre de la Tarea', 'Subtarea', 'tarea', 'actividad']),
  partidaPresupuestaria: findColumn(['Partida Presupuestaria', 'partida']),
  fuenteFinanciamiento: findColumn(['Fuente', 'financiamiento']),
  presupuesto: findColumn(['Presupuesto 2026', 'Presupuesto', 'monto', 'valor']),
  responsable: findColumn(['Responsable', 'responsable de la tarea']),
  fechaInicio: findColumn(['Fecha de inicio', 'inicio']),
  fechaFin: findColumn(['Fecha de fin', 'fin', 'culminación']),
  estado: findColumn(['Estado', 'estatus']),
  observaciones: findColumn(['Observaciones', 'notas'])
};

console.log('\n\nColumn indices found:');
console.log(JSON.stringify(colIndices, null, 2));

console.log('\n\nSample data rows (rows 5-8):');
for (let i = 5; i < Math.min(9, rawData.length); i++) {
  console.log(`\nRow ${i}:`);
  const row = rawData[i];
  Object.entries(colIndices).forEach(([key, idx]) => {
    if (idx >= 0) {
      console.log(`  ${key} (col ${idx}): ${row[idx]}`);
    }
  });
}
