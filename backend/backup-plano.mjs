import mysql from 'mysql2/promise';
import fs from 'fs';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

async function backupPlano() {
  let conn;
  try {
    console.log('Conectando a la base de datos...');
    conn = await mysql.createConnection(dbConfig);

    // Obtener todas las tablas
    const [tables] = await conn.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [dbConfig.database]);

    console.log(`Encontradas ${tables.length} tablas`);

    let sqlContent = `-- Backup PLANO de la base de datos ${dbConfig.database}\n`;
    sqlContent += `-- Generado: ${new Date().toISOString()}\n`;
    sqlContent += `-- Sin restricciones de integridad referencial\n\n`;
    sqlContent += `USE ${dbConfig.database};\n\n`;

    // Para cada tabla, obtener estructura simplificada y datos
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`Procesando tabla: ${tableName}`);

      // Obtener estructura de la tabla SIMPLIFICADA (sin foreign keys)
      const [createTableResult] = await conn.execute(`SHOW CREATE TABLE ${tableName}`);
      let createTableSQL = createTableResult[0]['Create Table'];

      // Remover las restricciones de clave foránea
      createTableSQL = createTableSQL
        .replace(/,\s*CONSTRAINT\s+`[^`]*`\s+FOREIGN KEY\s+\([^)]*\)\s+REFERENCES\s+[^\n]*/g, '')
        .replace(/,\s*CONSTRAINT\s+`[^`]*`\s+PRIMARY KEY\s+\([^)]*\)/g, '')
        .replace(/\s+ON\s+DELETE\s+[A-Z]+\s+ON\s+UPDATE\s+[A-Z]+/g, '')
        .replace(/PRIMARY KEY\s+\([^)]*\),/g, '');

      sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlContent += createTableSQL + ';\n\n';

      // Obtener datos de la tabla
      const [rows] = await conn.execute(`SELECT * FROM ${tableName}`);

      if (rows.length > 0) {
        // Generar INSERT statements
        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');

        for (const row of rows) {
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
          }).join(', ');

          sqlContent += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
        }
        sqlContent += '\n';
      }
    }

    // Guardar archivo
    const backupPath = 'backup_poa_pac_plano.sql';
    fs.writeFileSync(backupPath, sqlContent);

    const fileSizeKb = (fs.statSync(backupPath).size / 1024).toFixed(2);
    console.log(`\n✓ Backup plano completado exitosamente`);
    console.log(`Archivo: ${backupPath}`);
    console.log(`Tamaño: ${fileSizeKb} KB`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

backupPlano();
