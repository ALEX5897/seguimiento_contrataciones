import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '@Alex.1995',
      database: 'test_migracion'
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
      console.log('Primer registro (campos):');
      Object.keys(rows[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
    } else {
      console.log('No hay datos en procesos');
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
