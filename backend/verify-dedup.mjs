import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_fixed.xlsx');
const ws = wb.worksheets[0];

console.log('🔍 VERIFICACIÓN DE DEDUPLICACIÓN\n');
console.log(`Total columnas: ${ws.columnCount}\n`);

// Contar columnas por grupo
const row1 = ws.getRow(1);
const row2 = ws.getRow(2);

let fases = [];
let currentPhase = '';
let startCol = 0;
for (let i = 1; i <= ws.columnCount; i++) {
  const phaseCell = row1.getCell(i);
  if (phaseCell.value) {
    if (currentPhase && startCol > 0) {
      fases.push({ name: currentPhase, start: startCol, end: i - 1 });
    }
    currentPhase = phaseCell.value;
    startCol = i;
  }
}
if (currentPhase && startCol > 0) {
  fases.push({ name: currentPhase, start: startCol, end: ws.columnCount });
}

console.log('Estructura de fases:');
fases.forEach(f => {
  const count = f.end - f.start + 1;
  console.log(`  ${f.name}: columnas ${f.start}-${f.end} (${count} verificables)`);
});

// Verificar duplicados en fila 2
const row2Values = [];
row2.eachCell({ includeEmpty: false }, (cell) => {
  if (cell.value) row2Values.push(cell.value);
});

const valueCount = new Map();
row2Values.forEach(v => {
  valueCount.set(v, (valueCount.get(v) || 0) + 1);
});

let duplicates = 0;
valueCount.forEach((count, value) => {
  if (count > 1) {
    duplicates++;
  }
});

console.log(`\nTotal verificables en fila 2: ${row2Values.length}`);
console.log(`Verificables duplicados: ${duplicates}`);

if (duplicates === 0) {
  console.log('\n✅ ¡SIN DUPLICADOS! El fix funcionó correctamente.');
} else {
  console.log(`\n⚠️  Aún hay ${duplicates} verificables duplicados.`);
}

