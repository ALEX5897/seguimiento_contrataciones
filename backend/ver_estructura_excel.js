import ExcelJS from 'exceljs';

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\acasa\\OneDrive - QuitoTurismo\\Documentos\\Desarrollo\\Seguimiento_contrataciones\\Matriz_Base_POA_2026_1.xlsx');

    const worksheet = workbook.getWorksheet(1);

    console.log('📋 ESTRUCTURA DEL EXCEL\n');

    // Header
    let headers = [];
    let headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers.push(cell.value);
    });

    console.log('Columnas:');
    headers.forEach((h, i) => {
      console.log(`  ${i+1}. ${h}`);
    });

    // Primera fila de datos
    console.log('\nPrimer proceso:');
    let firstRow = worksheet.getRow(2);
    firstRow.eachCell((cell, colNumber) => {
      if (headers[colNumber-1]) {
        console.log(`  ${headers[colNumber-1]}: ${cell.value}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
