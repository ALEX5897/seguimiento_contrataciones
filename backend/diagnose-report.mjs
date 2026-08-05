import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_prueba.xlsx');
const ws = wb.worksheets[0];

console.log('📊 DIAGNÓSTICO DETALLADO DEL REPORTE\n');

// Analizar fila 1 (fases)
const row1Phases = [];
const row1 = ws.getRow(1);
row1.eachCell({ includeEmpty: false }, (cell, col) => {
  if (cell.value) {
    row1Phases.push({ col, value: cell.value });
  }
});

console.log('FILA 1 - Fases encontradas:');
row1Phases.forEach(p => console.log(`  Col ${p.col}: "${p.value}"`));

// Analizar fila 2 (verificables)
const row2Items = [];
const row2 = ws.getRow(2);
row2.eachCell({ includeEmpty: false }, (cell, col) => {
  row2Items.push({ col, value: cell.value });
});

console.log(`\nFILA 2 - Total de verificables: ${row2Items.length}`);
console.log('Primeros 10:');
row2Items.slice(0, 10).forEach(p => console.log(`  Col ${p.col}: "${p.value}"`));
console.log('Últimos 5:');
row2Items.slice(-5).forEach(p => console.log(`  Col ${p.col}: "${p.value}"`));

// Analizar si hay columnas sin datos
console.log('\n🔍 Columnas sin datos en fila 3:');
const row3 = ws.getRow(3);
let emptyCount = 0;
for (let col = 1; col <= ws.columnCount; col++) {
  const cell = row3.getCell(col);
  if (!cell.value) emptyCount++;
}
console.log(`  Total columnas vacías en fila 3: ${emptyCount}/${ws.columnCount}`);

