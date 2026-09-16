import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '172.16.1.80',
      user: 'usr-cont',
      password: 'mas_TER$*25@',
      database: 'poa_pac'
    });

    console.log('📋 ESTRUCTURA DE TABLAS\n');

    // Columnas de subtareas_versiones
    const [cols1] = await conn.query(`
      DESCRIBE subtareas_versiones
    `);

    console.log('Tabla: subtareas_versiones');
    cols1.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });

    // Contar registros
    const [count] = await conn.query(`
      SELECT COUNT(*) as total FROM subtareas_versiones WHERE version_id = 12
    `);
    console.log(`\nRegistros en Reforma 8: ${count[0].total}`);

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
