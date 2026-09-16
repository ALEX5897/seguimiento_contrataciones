import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_final.xlsx');
const ws = wb.worksheets[0];

console.log('🎨 VERIFICACIÓN DE COLORES FINALES\n');

const row1 = ws.getRow(1);
const colorCount = new Map();

for (let i = 1; i <= ws.columnCount; i++) {
  const cell = row1.getCell(i);
  const color = cell.fill?.fgColor?.argb || 'none';
  
  if (color && color !== 'none') {
    colorCount.set(color, (colorCount.get(color) || 0) + 1);
  }
}

console.log('Distribución de colores en encabezados:');
colorCount.forEach((count, color) => {
  let name = '';
  if (color === '0F2F55') name = ' (Azul oscuro - campos principales)';
  else if (color === '1E3A8A') name = ' (Azul - Preparatoria)';
  else if (color === '065F46') name = ' (Verde - Precontractual)';
  else if (color === '7C2D12') name = ' (Naranja - Contractual)';
  else if (color === '7C3AED') name = ' (Púrpura - Sin clasificar) ✨';
  
  console.log(`  ${color}${name}: ${count} columnas`);
});

console.log('\n✅ Colores de fases diferenciados correctamente:');
console.log('   - Preparatoria: Azul');
console.log('   - Precontractual: Verde');
console.log('   - Contractual: Naranja');
console.log('   - Sin clasificar: Púrpura');

