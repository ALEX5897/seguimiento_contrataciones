import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

function escapeCSV(value) {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Si contiene comas, comillas o saltos de línea, envolver entre comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

async function backupCSV() {
  let conn;
  try {
    console.log('Conectando a la base de datos...');
    conn = await mysql.createConnection(dbConfig);

    // Crear carpeta para CSVs
    const csvFolder = 'backup_csv';
    if (!fs.existsSync(csvFolder)) {
      fs.mkdirSync(csvFolder, { recursive: true });
    }

    // Obtener todas las tablas
    const [tables] = await conn.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [dbConfig.database]);

    console.log(`Encontradas ${tables.length} tablas\n`);

    let totalRows = 0;

    // Para cada tabla, generar CSV
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`Procesando tabla: ${tableName}`);

      // Obtener datos de la tabla
      const [rows] = await conn.execute(`SELECT * FROM ${tableName}`);

      if (rows.length === 0) {
        console.log(`  ↳ Sin datos`);
        continue;
      }

      // Obtener nombres de columnas
      const columns = Object.keys(rows[0]);

      // Generar CSV
      let csvContent = '';

      // Header con nombres de columnas
      csvContent += columns.map(col => escapeCSV(col)).join(',') + '\n';

      // Data rows
      for (const row of rows) {
        const values = columns.map(col => escapeCSV(row[col]));
        csvContent += values.join(',') + '\n';
      }

      // Guardar archivo CSV
      const csvPath = path.join(csvFolder, `${tableName}.csv`);
      fs.writeFileSync(csvPath, csvContent, 'utf-8');

      const fileSizeKb = (fs.statSync(csvPath).size / 1024).toFixed(2);
      console.log(`  ↳ ${rows.length} filas | ${fileSizeKb} KB`);
      totalRows += rows.length;
    }

    console.log(`\n✓ Backup CSV completado exitosamente`);
    console.log(`Carpeta: ${csvFolder}`);
    console.log(`Total de filas exportadas: ${totalRows}`);

    // Obtener tamaño total
    let totalSize = 0;
    const files = fs.readdirSync(csvFolder);
    files.forEach(file => {
      totalSize += fs.statSync(path.join(csvFolder, file)).size;
    });
    console.log(`Tamaño total: ${(totalSize / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

backupCSV();
