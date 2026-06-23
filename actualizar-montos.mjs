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
  // The CODIGO_OLIMPO appears to be in column __EMPTY_2 based on the analysis
  // COSTO 2026 appears to be in __EMPTY_4
  const codigoOlympo = row['__EMPTY_2']?.toString().trim();
  const costo2026 = row['__EMPTY_4'];

  if (codigoOlympo && costo2026 !== undefined && costo2026 !== null && costo2026 !== '') {
    // Convert to number if it's a string
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
const datosActualizados = updateData.map((row) => {
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

    return {
      ...row,
      'Presupuesto con Reformas': montoNuevo
    };
  } else {
    noEncontrados.push({
      codigo,
      monto: montoAnterior
    });
    return row;
  }
});

console.log(`\nResultados:`);
console.log(`  Registros actualizados: ${cambios.length}`);
console.log(`  Registros sin cambios: ${sinCambios.length}`);
console.log(`  Códigos no encontrados: ${noEncontrados.length}`);

// Write back to Excel file (use temp file first)
const tempFile = path.join(baseDir, 'update_datos_TEMP.xlsx');
const newWorksheet = XLSX.utils.json_to_sheet(datosActualizados);
updateWorkbook.Sheets['Hoja1'] = newWorksheet;
XLSX.writeFile(updateWorkbook, tempFile);

// Replace original file
if (fs.existsSync(updateFile)) {
  fs.unlinkSync(updateFile);
}
fs.renameSync(tempFile, updateFile);

console.log(`\n✓ Archivo actualizado: ${updateFile}`);

// Generate report
const reportePath = path.join(baseDir, 'REPORTE_ACTUALIZACION.txt');
let reporte = 'REPORTE DE ACTUALIZACIÓN DE MONTOS PRESUPUESTARIOS\n';
reporte += '='.repeat(60) + '\n';
reporte += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
reporte += `Archivo actualizado: update_datos.xlsx\n`;
reporte += `Fuente de datos: base_1.xlsx (COSTO 2026)\n`;
reporte += '='.repeat(60) + '\n\n';

reporte += `RESUMEN GENERAL:\n`;
reporte += `-`.repeat(60) + '\n';
reporte += `  Total de registros procesados: ${updateData.length}\n`;
reporte += `  Registros actualizados: ${cambios.length}\n`;
reporte += `  Registros sin cambios: ${sinCambios.length}\n`;
reporte += `  Códigos no encontrados: ${noEncontrados.length}\n\n`;

if (cambios.length > 0) {
  reporte += `REGISTROS ACTUALIZADOS (${cambios.length}):\n`;
  reporte += `-`.repeat(60) + '\n';
  cambios.forEach((cambio, index) => {
    reporte += `\n${index + 1}. Código Olympo: ${cambio.codigo}\n`;
    reporte += `   Monto anterior: ${cambio.anterior}\n`;
    reporte += `   Monto nuevo:   ${cambio.nuevo}\n`;
    reporte += `   Diferencia:    ${cambio.diferencia >= 0 ? '+' : ''}${cambio.diferencia}\n`;
  });

  // Summary of total changes
  const totalAnterior = cambios.reduce((sum, c) => sum + c.anterior, 0);
  const totalNuevo = cambios.reduce((sum, c) => sum + c.nuevo, 0);
  reporte += `\n${'-'.repeat(60)}\n`;
  reporte += `Total anterior de registros actualizados: ${totalAnterior}\n`;
  reporte += `Total nuevo de registros actualizados:   ${totalNuevo}\n`;
  reporte += `Diferencia total: ${totalNuevo - totalAnterior >= 0 ? '+' : ''}${totalNuevo - totalAnterior}\n`;
}

if (sinCambios.length > 0) {
  reporte += `\n\nREGISTROS SIN CAMBIOS (${sinCambios.length}):\n`;
  reporte += `-`.repeat(60) + '\n';
  sinCambios.slice(0, 20).forEach((reg, index) => {
    reporte += `\n${index + 1}. Código Olympo: ${reg.codigo}\n`;
    reporte += `   Monto (sin cambios): ${reg.monto}\n`;
  });
  if (sinCambios.length > 20) {
    reporte += `\n... y ${sinCambios.length - 20} registros más sin cambios\n`;
  }
}

if (noEncontrados.length > 0) {
  reporte += `\n\nCÓDIGOS NO ENCONTRADOS EN LA FUENTE (${noEncontrados.length}):\n`;
  reporte += `-`.repeat(60) + '\n';
  noEncontrados.slice(0, 20).forEach((reg, index) => {
    reporte += `\n${index + 1}. Código Olympo: ${reg.codigo}\n`;
    reporte += `   Monto anterior: ${reg.monto}\n`;
  });
  if (noEncontrados.length > 20) {
    reporte += `\n... y ${noEncontrados.length - 20} códigos más no encontrados\n`;
  }
}

reporte += '\n\n' + '='.repeat(60) + '\n';
reporte += 'Fin del reporte\n';

fs.writeFileSync(reportePath, reporte, 'utf8');
console.log(`✓ Reporte generado: ${reportePath}`);
