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

// Row 4 is the header (0-indexed)
const headers = rawData[4] || [];

// Stage-related keywords
const stageKeywords = [
  'etapa', 'fase', 'stage', 'hito', 'milestone',
  'especificaciones', 'términos', 'referencia',
  'certificación', 'presupuestaria',
  'publicación', 'portal',
  'preguntas', 'respuestas',
  'análisis', 'analisis', 'ofertas',
  'adjudicación', 'adjudicacion',
  'contratación', 'contratacion',
  'ejecución', 'ejecucion',
  'elaboración', 'elaboracion',
  'ínfima', 'infima', 'cuantía', 'cuantia',
  'catálogo', 'catalogo',
  'licitación', 'licitacion',
  'subasta', 'inversa',
  'proce', 'procedimiento'
];

// Find columns that might contain stage information
const stageColumns = [];
headers.forEach((header, idx) => {
  if (!header) return;
  const headerLower = header.toString().toLowerCase();
  
  // Check if header contains any stage keyword
  const matchesKeyword = stageKeywords.some(keyword => 
    headerLower.includes(keyword)
  );
  
  if (matchesKeyword) {
    stageColumns.push({
      index: idx,
      name: header
    });
  }
});

// Find the name/codigo columns for reference
const nombreIdx = headers.findIndex(h => 
  h && (h.toString().toLowerCase().includes('nombre') || 
        h.toString().toLowerCase().includes('subtarea') ||
        h.toString().toLowerCase().includes('actividad'))
);

const codigoIdx = headers.findIndex(h => 
  h && (h.toString().toLowerCase().includes('codigo') || 
        h.toString().toLowerCase().includes('olympo'))
);

// Normalize stage names
function normalizeStage(columnName) {
  const colLower = columnName.toString().toLowerCase().trim();
  
  // Map column names to standard PAC stages
  if (colLower.includes('términos de referencia') || colLower.includes('terminos de referencia') || 
      colLower.includes('especificaciones técnicas') || colLower.includes('especificaciones tecnicas')) {
    return 'Elaboración de Especificaciones Técnicas o Términos de Referencia';
  }
  
  if (colLower.includes('certificacion presupuestaria') || colLower.includes('certificación presupuestaria')) {
    return 'Certificación Presupuestaria';
  }
  
  if (colLower.includes('pliegos') || colLower.includes('elaboracion de pliegos')) {
    return 'Aprobación de Pliegos';
  }
  
  if (colLower.includes('publicación') || colLower.includes('publicacion') || 
      colLower.includes('infima cuantia') || colLower.includes('ínfima cuantía')) {
    return 'Publicación en Portal';
  }
  
  if (colLower.includes('preguntas') && colLower.includes('respuestas')) {
    return 'Preguntas y Respuestas';
  }
  
  if (colLower.includes('preguntas') && !colLower.includes('respuestas')) {
    return 'Preguntas y Respuestas';
  }
  
  if (colLower.includes('análisis') || colLower.includes('analisis')) {
    return 'Análisis de Ofertas';
  }
  
  if (colLower.includes('adjudicacion') || colLower.includes('adjudicación')) {
    return 'Adjudicación';
  }
  
  if (colLower.includes('contratación') || colLower.includes('contratacion')) {
    // But exclude "procedimiento sugerido"
    if (colLower.includes('procedimiento sugerido')) {
      return null;
    }
    return 'Contratación';
  }
  
  if (colLower.includes('ejecución') || colLower.includes('ejecucion')) {
    return 'Ejecución';
  }
  
  // Don't normalize these
  if (colLower.includes('partida presupuestaria')) {
    return null;
  }
  
  if (colLower.includes('procedimiento sugerido')) {
    return null;
  }
  
  if (colLower.includes('catalogo')) {
    return null;
  }
  
  return null;
}

// Extract stages found
const stagesFoundSet = new Set();
const stageColumnsMap = new Map(); // Map normalized stage -> column name

stageColumns.forEach(col => {
  const normalized = normalizeStage(col.name);
  if (normalized) {
    stagesFoundSet.add(normalized);
    if (!stageColumnsMap.has(normalized)) {
      stageColumnsMap.set(normalized, []);
    }
    stageColumnsMap.get(normalized).push(col.name);
  }
});

// Get column mapping for output
const columnNameMapping = {};
stageColumnsMap.forEach((colNames, stageName) => {
  columnNameMapping[stageName] = colNames;
});

// Analyze first 10 activities
const activitiesWithStages = [];
for (let i = 5; i < Math.min(15, rawData.length); i++) {
  const row = rawData[i];
  if (!row || row.length === 0) continue;
  
  const nombre = nombreIdx >= 0 ? row[nombreIdx] : null;
  const codigo = codigoIdx >= 0 ? row[codigoIdx] : null;
  
  if (!nombre && !codigo) continue;
  
  const etapas = [];
  
  // Check each stage column
  stageColumns.forEach(col => {
    const value = row[col.index];
    if (value) {
      const normalized = normalizeStage(col.name);
      if (normalized && !etapas.includes(normalized)) {
        etapas.push(normalized);
      }
    }
  });
  
  activitiesWithStages.push({
    codigo_olympo: codigo ? codigo.toString() : null,
    nombre: nombre ? nombre.toString() : null,
    etapas: etapas
  });
}

// Build result - extract unique raw column names
const allRawColumnNames = new Set();
stageColumnsMap.forEach((colNames) => {
  colNames.forEach(name => allRawColumnNames.add(name));
});

const result = {
  stagesFound: Array.from(stagesFoundSet).sort(),
  columnNames: Array.from(allRawColumnNames).sort(),
  activitiesWithStages: activitiesWithStages.slice(0, 10)
};

// Output as JSON only
console.log(JSON.stringify(result, null, 2));
