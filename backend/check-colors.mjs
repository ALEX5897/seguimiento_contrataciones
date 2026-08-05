import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_completo.xlsx');
const ws = wb.worksheets[0];

console.log('🎨 VERIFICACIÓN DE COLORES EN ENCABEZADOS\n');

const row1 = ws.getRow(1);
const colorCount = new Map();
let emptyCount = 0;

for (let i = 1; i <= ws.columnCount; i++) {
  const cell = row1.getCell(i);
  const color = cell.fill?.fgColor?.argb || 'none';
  
  if (!color || color === 'none') {
    emptyCount++;
  } else {
    colorCount.set(color, (colorCount.get(color) || 0) + 1);
  }
}

console.log(`Columnas sin color en fila 1: ${emptyCount}`);
console.log(`Total de columnas: ${ws.columnCount}\n`);

console.log('Distribución de colores:');
colorCount.forEach((count, color) => {
  let name = '';
  if (color === '0F2F55') name = ' (azul oscuro - campos)';
  else if (color === '1E3A8A') name = ' (azul - preparatoria)';
  else if (color === '065F46') name = ' (verde - precontractual)';
  else if (color === '7C2D12') name = ' (naranja - contractual)';
  else if (color === '808080') name = ' (gris - sin fase)';
  
  console.log(`  ${color}${name}: ${count} columnas`);
});

if (emptyCount === 0) {
  console.log('\n✅ Todas las columnas tienen asignado un color en fila 1');
} else {
  console.log(`\n⚠️ Hay ${emptyCount} columnas sin color`);
}

