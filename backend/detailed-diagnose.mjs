import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_prueba.xlsx');
const ws = wb.worksheets[0];

console.log('Columnas 1-65 en fila 2:\n');
const row2 = ws.getRow(2);
for (let i = 1; i <= 65; i++) {
  const cell = row2.getCell(i);
  if (cell.value) {
    console.log(`Col ${i}: ${cell.value}`);
  }
}

console.log('\n\nVerificables duplicados:');
const col4Value = row2.getCell(4).value;
console.log(`Col 4 valor: ${col4Value}`);
// Buscar ese mismo valor en columnas posteriores
for (let i = 59; i <= 67; i++) {
  const cell = row2.getCell(i);
  if (cell.value === col4Value) {
    console.log(`  ¡DUPLICADO ENCONTRADO! Col ${i} también tiene: ${cell.value}`);
  }
}

