import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '172.16.1.80',
      user: 'usr-cont',
      password: 'mas_TER$*25@',
      database: 'poa_pac'
    });

    console.log('💾 CREANDO BACKUP DE BD\n');

    // Obtener timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('-').slice(0, 5).join('-');
    const filename = `backup_poa_pac_${timestamp}.sql`;

    // Obtener todas las tablas
    const [tables] = await conn.query("SHOW TABLES");
    console.log(`📊 Total tablas: ${tables.length}`);

    let backup = '-- Backup de poa_pac\n';
    backup += `-- Fecha: ${now.toISOString()}\n`;
    backup += '-- ================================================\n\n';

    // Hacer dump de cada tabla
    for (const table of tables) {
      const tableName = table[Object.keys(table)[0]];

      // Obtener CREATE TABLE
      const [createResult] = await conn.query(`SHOW CREATE TABLE ${tableName}`);
      backup += `\n-- Tabla: ${tableName}\n`;
      backup += `DROP TABLE IF EXISTS ${tableName};\n`;
      backup += createResult[0]['Create Table'] + ';\n\n';

      // Obtener datos
      const [data] = await conn.query(`SELECT * FROM ${tableName}`);

      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        backup += `INSERT INTO ${tableName} (${columns.map(c => '`' + c + '`').join(', ')}) VALUES\n`;

        const values = data.map((row, idx) => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return "'" + val.replace(/'/g, "\\'") + "'";
            if (val instanceof Date) return "'" + val.toISOString().split('T')[0] + "'";
            return val;
          });
          return `(${vals.join(', ')})${idx === data.length - 1 ? ';' : ','}`;
        });

        backup += values.join('\n') + '\n';
      }

      console.log(`✅ ${tableName}: ${data.length} registros`);
    }

    // Guardar archivo
    const backupPath = `C:\\Users\\acasa\\OneDrive - QuitoTurismo\\Documentos\\Desarrollo\\Seguimiento_contrataciones\\backend\\${filename}`;
    fs.writeFileSync(backupPath, backup);

    console.log(`\n💾 Backup guardado: ${filename}`);
    console.log(`📁 Ubicación: backend/`);

    const stats = fs.statSync(backupPath);
    console.log(`📦 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
