import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../../Documentos base/PAC - POA 2026 - Subtarea 02022026.xlsx');
const workbook = XLSX.readFile(filePath);

// Function to normalize date
function normalizeDate(value) {
  if (!value) return null;
  
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  if (typeof value === 'string') {
    const dateMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const [_, d, m, y] = dateMatch;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  
  return null;
}

// Function to normalize number
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// Read Matriz PAC POA 2026
const matrizSheet = workbook.Sheets['Matriz PAC POA 2026'];
const matrizData = XLSX.utils.sheet_to_json(matrizSheet, { header: 1, defval: null });

// Read Hoja6 for estado/observaciones
const hoja6Sheet = workbook.Sheets['Hoja6'];
const hoja6Data = XLSX.utils.sheet_to_json(hoja6Sheet, { defval: null });

console.log('Hoja6 data preview:');
console.log(JSON.stringify(hoja6Data.slice(0, 5), null, 2));

// Create estado/observaciones map
const estadoMap = new Map();
hoja6Data.forEach(row => {
  const subtarea = row['SubTarea'];
  if (subtarea) {
    estadoMap.set(subtarea, {
      estado: row['ESTADO al 25 de ferbero'] || 'pendiente',
      observaciones: row['OBSERVACIONES al 25 de febrero'] || null
    });
  }
});

// Extract data from Matriz (row 5 onwards, row 4 is header)
const results = [];
for (let i = 5; i < matrizData.length && results.length < 15; i++) {
  const row = matrizData[i];
  
  const subtarea = row[56]; // SubTarea column
  if (!subtarea) continue; // Skip rows without subtarea name
  
  const estadoInfo = estadoMap.get(subtarea) || { estado: 'pendiente', observaciones: null };
  
  const item = {
    nombre: subtarea,
    codigo_olympo: row[57] || null,
    partida_presupuestaria: row[59] || null,
    fuente_financiamiento: row[60] || null,
    presupuesto: normalizeNumber(row[61]),
    responsable: row[0] || null, // Dirección
    fecha_inicio: normalizeDate(row[36]) || normalizeDate(row[42]),
    fecha_fin: normalizeDate(row[37]) || normalizeDate(row[43]),
    estado: estadoInfo.estado,
    observaciones: estadoInfo.observaciones
  };
  
  results.push(item);
}

console.log('\n\nJSON Output:');
console.log(JSON.stringify(results, null, 2));
