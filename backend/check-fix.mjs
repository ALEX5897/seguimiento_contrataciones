import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_fix.xlsx');
const ws = wb.worksheets[0];

console.log('📊 VERIFICACIÓN DEL FIX\n');
console.log(`Total columnas: ${ws.columnCount}`);

const row2 = ws.getRow(2);
console.log('Columnas en fila 2:');
console.log('  Primeras 5:');
for (let i = 1; i <= 5; i++) {
  console.log(`    Col ${i}: ${row2.getCell(i).value}`);
}
console.log('  Últimas 5:');
for (let i = Math.max(1, ws.columnCount - 4); i <= ws.columnCount; i++) {
  console.log(`    Col ${i}: ${row2.getCell(i).value}`);
}

// Verificar si hay duplicación
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
    console.log(`\n⚠️  DUPLICADO: "${value}" aparece ${count} veces`);
    duplicates++;
  }
});

if (duplicates === 0) {
  console.log('\n✅ SIN DUPLICADOS - Fix exitoso!');
}

