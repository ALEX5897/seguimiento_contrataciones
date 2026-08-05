import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_test.xlsx');
const ws = wb.worksheets[0];

console.log('📊 ESTRUCTURA DEL REPORTE\n');
console.log(`Columnas totales: ${ws.columnCount}`);

const row1 = ws.getRow(1);
const row2 = ws.getRow(2);

let faseCount = 0;
let lastFase = '';
row1.eachCell({ includeEmpty: false }, (cell) => {
  if (cell.value && cell.value.includes('Etapas')) {
    if (cell.value !== lastFase) {
      faseCount++;
      lastFase = cell.value;
    }
  }
});

console.log(`Fases encontradas: ${faseCount}`);
console.log(`Esperado: 4 (preparatoria, precontractual, contractual, sin_clasificar)\n`);

const row2Values = [];
row2.eachCell({ includeEmpty: false }, (cell) => {
  if (cell.value) row2Values.push(cell.value);
});

console.log(`Elementos en fila 2: ${row2Values.length}`);
console.log(`Desglose:`);
console.log(`  - Primeros 3 (campos): ${row2Values.slice(0, 3).join(', ')}`);
console.log(`  - Resto (verificables): ${row2Values.length - 3}`);

if (ws.columnCount <= 65) {
  console.log('\n✅ Estructura correcta (menos de 65 columnas)');
} else {
  console.log(`\n⚠️ Todavía hay muchas columnas (${ws.columnCount}), se esperaban ~58`);
}

