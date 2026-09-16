import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '@Alex.1995',
      database: 'test_migracion'
    });

    console.log('Ejecutando migración: remover columna estado de tabla procesos...\n');

    await connection.execute('ALTER TABLE procesos DROP COLUMN estado');

    console.log('✅ Migración ejecutada exitosamente');
    console.log('Columna "estado" removida de tabla procesos');

    // Verificar estructura de la tabla
    const [columns] = await connection.execute('DESCRIBE procesos');
    console.log('\nNuevas columnas de procesos:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
