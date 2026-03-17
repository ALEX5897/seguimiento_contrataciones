import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Excel file
const filePath = path.join(__dirname, '../../Documentos base/PAC - POA 2026 - Subtarea 02022026.xlsx');
const workbook = XLSX.readFile(filePath);

// Get first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

console.log(`Sheet: ${sheetName}`);
console.log(`Total rows: ${data.length}`);
console.log('\nColumns found:');
if (data.length > 0) {
  Object.keys(data[0]).forEach((col, idx) => {
    console.log(`  ${idx + 1}. ${col}`);
  });
}

// Function to normalize date
function normalizeDate(value) {
  if (!value) return null;
  
  // If it's an Excel serial date
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  // If it's already a string date
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
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// Map the data to our format
const mappedData = data.slice(0, 15).map(row => {
  // Try to find column names (flexible matching)
  const nombreKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('nombre') || 
    k.toLowerCase().includes('actividad') ||
    k.toLowerCase().includes('descripci')
  );
  
  const codigoKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('codigo') || 
    k.toLowerCase().includes('olympo')
  );
  
  const partidaKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('partida') || 
    k.toLowerCase().includes('presupuest')
  );
  
  const fuenteKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('fuente') || 
    k.toLowerCase().includes('financ')
  );
  
  const presupuestoKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('monto') || 
    k.toLowerCase().includes('valor') ||
    k.toLowerCase().includes('presup')
  );
  
  const responsableKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('responsable') || 
    k.toLowerCase().includes('encargado')
  );
  
  const fechaInicioKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('inicio') || 
    k.toLowerCase().includes('fecha') && k.toLowerCase().includes('inicio')
  );
  
  const fechaFinKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('fin') || 
    k.toLowerCase().includes('fecha') && k.toLowerCase().includes('fin') ||
    k.toLowerCase().includes('termino')
  );
  
  const estadoKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('estado') || 
    k.toLowerCase().includes('status')
  );
  
  const observacionesKey = Object.keys(row).find(k => 
    k.toLowerCase().includes('observ') || 
    k.toLowerCase().includes('nota') ||
    k.toLowerCase().includes('comentario')
  );
  
  return {
    nombre: row[nombreKey] || null,
    codigo_olympo: row[codigoKey] || null,
    partida_presupuestaria: row[partidaKey] || null,
    fuente_financiamiento: row[fuenteKey] || null,
    presupuesto: normalizeNumber(row[presupuestoKey]),
    responsable: row[responsableKey] || null,
    fecha_inicio: normalizeDate(row[fechaInicioKey]),
    fecha_fin: normalizeDate(row[fechaFinKey]),
    estado: row[estadoKey] || 'pendiente',
    observaciones: row[observacionesKey] || null
  };
}).filter(item => item.nombre); // Only keep rows with a name

console.log('\n\nJSON Output:');
console.log(JSON.stringify(mappedData, null, 2));
