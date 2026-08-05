import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_debug.xlsx');
const ws = wb.worksheets[0];

const row2 = ws.getRow(2);
const values = [];
row2.eachCell({ includeEmpty: false }, (cell) => {
  if (cell.value) values.push(cell.value);
});

console.log(`Total valores en fila 2: ${values.length}`);
console.log(`Total columnas en worksheet: ${ws.columnCount}\n`);

// Contar grupos
let currentGroup = '';
let groupCount = 0;
const groups = [];

for (let i = 1; i <= ws.columnCount; i++) {
  const cell1 = ws.getRow(1).getCell(i);
  const value1 = cell1.value || '';
  
  if (value1 && value1.includes('Etapas')) {
    if (value1 !== currentGroup) {
      if (currentGroup) {
        groups.push({ name: currentGroup, count: groupCount });
      }
      currentGroup = value1;
      groupCount = 0;
    }
    groupCount++;
  } else if (currentGroup && !value1) {
    groupCount++;
  }
}

if (currentGroup) {
  groups.push({ name: currentGroup, count: groupCount });
}

console.log('Grupos de fases:');
groups.forEach(g => console.log(`  ${g.name}: ${g.count} columnas`));

