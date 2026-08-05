import ExcelJS from 'exceljs';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('../reporte_final.xlsx');
const ws = wb.worksheets[0];

console.log('✅ VERIFICACIÓN FINAL\n');
console.log(`Total columnas: ${ws.columnCount}\n`);

const row2 = ws.getRow(2);
const values = [];
row2.eachCell({ includeEmpty: false }, (cell) => {
  if (cell.value) values.push(cell.value);
});

console.log(`Total elementos en fila 2: ${values.length}`);

// Contar estructuras
const campos = values.slice(0, 3);
const verificables = values.slice(3);

console.log(`  - Campos principales: ${campos.length}`);
console.log(`  - Verificables: ${verificables.length}\n`);

// Verificar duplicados
const valueCount = new Map();
values.forEach(v => {
  valueCount.set(v, (valueCount.get(v) || 0) + 1);
});

let duplicates = 0;
valueCount.forEach((count, value) => {
  if (count > 1) {
    duplicates++;
  }
});

if (duplicates === 0) {
  console.log('🎉 ¡ÉXITO! No hay verificables duplicados.');
  console.log(`Estructura correcta: 3 campos + ${verificables.length} verificables = ${values.length} total`);
} else {
  console.log(`⚠️ Aún hay ${duplicates} verificables duplicados`);
}

