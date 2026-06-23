import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const baseDir = 'Documentos base';

// Read the source file with new budget data
console.log('Leyendo archivo de presupuesto base...');
const baseFile = path.join(baseDir, 'base_1.xlsx');
const baseWorkbook = XLSX.readFile(baseFile);
const baseSheet = baseWorkbook.Sheets[baseWorkbook.SheetNames[0]];
const baseData = XLSX.utils.sheet_to_json(baseSheet);

console.log(`Total de registros en base_1.xlsx: ${baseData.length}`);

// Create a map of Olympo codes to new budget values
const olympoMap = {};
baseData.forEach((row, index) => {
  const codigoOlympo = row['__EMPTY_2']?.toString().trim();
  const costo2026 = row['__EMPTY_4'];

  if (codigoOlympo && costo2026 !== undefined && costo2026 !== null && costo2026 !== '') {
    const valor = typeof costo2026 === 'string' ? parseFloat(costo2026) : costo2026;
    if (!isNaN(valor)) {
      olympoMap[codigoOlympo] = valor;
    }
  }
});

console.log(`Códigos Olympo encontrados: ${Object.keys(olympoMap).length}`);

// Read the update file
console.log('\nLeyendo archivo update_datos.xlsx...');
const updateFile = path.join(baseDir, 'update_datos.xlsx');
const updateWorkbook = XLSX.readFile(updateFile);
const updateSheet = updateWorkbook.Sheets['Hoja1'];
const updateData = XLSX.utils.sheet_to_json(updateSheet);

console.log(`Total de registros en update_datos.xlsx: ${updateData.length}`);

// Track changes
const cambios = [];
const sinCambios = [];
const noEncontrados = [];

// Update the data
updateData.forEach((row) => {
  const codigo = row['Código Olympo']?.toString().trim();
  const montoAnterior = row['Presupuesto con Reformas'];

  if (olympoMap[codigo] !== undefined) {
    const montoNuevo = olympoMap[codigo];

    if (montoAnterior !== montoNuevo) {
      cambios.push({
        codigo,
        anterior: montoAnterior,
        nuevo: montoNuevo,
        diferencia: montoNuevo - montoAnterior
      });
    } else {
      sinCambios.push({
        codigo,
        monto: montoAnterior
      });
    }
  } else {
    noEncontrados.push({
      codigo,
      monto: montoAnterior
    });
  }
});

console.log(`\nResultados:`);
console.log(`  Registros actualizados: ${cambios.length}`);
console.log(`  Registros sin cambios: ${sinCambios.length}`);
console.log(`  Códigos no encontrados: ${noEncontrados.length}`);

// Generate report
const reportePath = 'REPORTE_ACTUALIZACION.txt';
let reporte = 'REPORTE DE ACTUALIZACIÓN DE MONTOS PRESUPUESTARIOS\n';
reporte += '='.repeat(80) + '\n';
reporte += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
reporte += `Archivo a actualizar: update_datos.xlsx\n`;
reporte += `Fuente de datos: base_1.xlsx (Columna COSTO 2026)\n`;
reporte += '='.repeat(80) + '\n\n';

reporte += `RESUMEN GENERAL:\n`;
reporte += `-`.repeat(80) + '\n';
reporte += `  Total de registros procesados: ${updateData.length}\n`;
reporte += `  Registros a actualizar: ${cambios.length}\n`;
reporte += `  Registros sin cambios: ${sinCambios.length}\n`;
reporte += `  Códigos no encontrados: ${noEncontrados.length}\n\n`;

if (cambios.length > 0) {
  reporte += `REGISTROS A ACTUALIZAR (${cambios.length}):\n`;
  reporte += `-`.repeat(80) + '\n';
  cambios.forEach((cambio, index) => {
    reporte += `\n${index + 1}. Código Olympo: ${cambio.codigo}\n`;
    reporte += `   Monto ANTERIOR: ${cambio.anterior}\n`;
    reporte += `   Monto NUEVO:   ${cambio.nuevo}\n`;
    reporte += `   Diferencia:    ${cambio.diferencia >= 0 ? '+' : ''}${cambio.diferencia.toFixed(2)}\n`;
  });

  // Summary of total changes
  const totalAnterior = cambios.reduce((sum, c) => sum + (typeof c.anterior === 'number' ? c.anterior : 0), 0);
  const totalNuevo = cambios.reduce((sum, c) => sum + (typeof c.nuevo === 'number' ? c.nuevo : 0), 0);
  reporte += `\n${'-'.repeat(80)}\n`;
  reporte += `TOTALES DE REGISTROS ACTUALIZADOS:\n`;
  reporte += `  Total anterior: ${totalAnterior.toFixed(2)}\n`;
  reporte += `  Total nuevo:   ${totalNuevo.toFixed(2)}\n`;
  reporte += `  Diferencia:    ${(totalNuevo - totalAnterior) >= 0 ? '+' : ''}${(totalNuevo - totalAnterior).toFixed(2)}\n`;
}

if (sinCambios.length > 0) {
  reporte += `\n\nREGISTROS SIN CAMBIOS (${sinCambios.length}):\n`;
  reporte += `-`.repeat(80) + '\n';
  reporte += `Los siguientes códigos ya tienen el monto correcto y no necesitan actualización.\n\n`;
  sinCambios.slice(0, 30).forEach((reg, index) => {
    reporte += `${index + 1}. Código: ${reg.codigo} | Monto: ${reg.monto}\n`;
  });
  if (sinCambios.length > 30) {
    reporte += `\n... y ${sinCambios.length - 30} registros más sin cambios\n`;
  }
}

if (noEncontrados.length > 0) {
  reporte += `\n\nCÓDIGOS NO ENCONTRADOS EN LA FUENTE (${noEncontrados.length}):\n`;
  reporte += `-`.repeat(80) + '\n';
  reporte += `Los siguientes códigos NO se encuentran en base_1.xlsx y mantienen su monto actual.\n`;
  reporte += `Revisa si estos códigos deben agregarse a la fuente de datos.\n\n`;
  noEncontrados.slice(0, 30).forEach((reg, index) => {
    reporte += `${index + 1}. Código: ${reg.codigo} | Monto actual: ${reg.monto}\n`;
  });
  if (noEncontrados.length > 30) {
    reporte += `\n... y ${noEncontrados.length - 30} códigos más no encontrados\n`;
  }
}

reporte += '\n\n' + '='.repeat(80) + '\n';
reporte += 'PRÓXIMOS PASOS:\n';
reporte += '1. Cierra el archivo update_datos.xlsx si está abierto en Excel\n';
reporte += '2. Ejecuta: node actualizar-montos.mjs\n';
reporte += '3. El archivo update_datos.xlsx será actualizado con los nuevos montos\n';
reporte += '='.repeat(80) + '\n';

fs.writeFileSync(reportePath, reporte, 'utf8');
console.log(`\n✓ Reporte generado: ${reportePath}`);
console.log(`\nPara actualizar el archivo, cierra update_datos.xlsx y ejecuta:`);
console.log(`  node actualizar-montos.mjs`);
