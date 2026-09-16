const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'seguimiento_contrataciones'
    });

    console.log('=== ESTRUCTURA DE TABLA procesos ===\n');
    const [columns] = await connection.execute('DESCRIBE procesos');

    console.log('Columnas:');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n=== MUESTRA DE DATOS ===\n');
    const [rows] = await connection.execute('SELECT * FROM procesos LIMIT 1');
    if (rows.length > 0) {
      console.log('Primer registro:');
      Object.entries(rows[0]).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
