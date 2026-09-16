import ExcelJS from 'exceljs';

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\acasa\\OneDrive - QuitoTurismo\\Documentos\\Desarrollo\\Seguimiento_contrataciones\\Matriz_Base_POA_2026_1.xlsx');

    const worksheet = workbook.getWorksheet(1);

    console.log('📊 MATRIZ_BASE_POA_2026_1.xlsx\n');
    console.log(`Worksheet: ${worksheet.name}`);

    let rowCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        rowCount++;
      }
    });

    console.log(`Total procesos (filas): ${rowCount}`);

    // Mostrar primeras 5 filas
    console.log('\nPrimeras 5 procesos:');
    let count = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && count < 5) {
        const values = row.values;
        console.log(`  ${rowNumber-1}. ${values?.[2] || values?.[1]}`); // Nombre o primera columna
        count++;
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
