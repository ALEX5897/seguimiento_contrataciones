import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '172.16.1.80',
      user: 'usr-cont',
      password: 'mas_TER$*25@',
      database: 'poa_pac'
    });

    console.log('📊 REFORMA 8 2026 - DESGLOSE DETALLADO\n');

    const [result] = await conn.query(`
      SELECT
        SUM(CASE WHEN sv.activo = 1 THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN sv.activo = 0 THEN 1 ELSE 0 END) as inactivos,
        COUNT(*) as total
      FROM subtareas_versiones sv
      WHERE sv.version_id = 12
    `);

    console.log(`Reforma 8 2026 (version_id=12):`);
    console.log(`  ✅ Activos:   ${result[0].activos}`);
    console.log(`  ❌ Inactivos: ${result[0].inactivos}`);
    console.log(`  📊 Total:     ${result[0].total}`);

    // Mostrar algunos procesos inactivos si los hay
    if (result[0].inactivos > 0) {
      const [inactivos] = await conn.query(`
        SELECT s.nombre, sv.activo
        FROM subtareas_versiones sv
        JOIN subtareas s ON sv.subtarea_id = s.id
        WHERE sv.version_id = 12 AND sv.activo = 0
        LIMIT 10
      `);

      console.log(`\n📋 Primeros inactivos:`);
      inactivos.forEach((row, i) => {
        console.log(`  ${i+1}. ${row.nombre}`);
      });
    }

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
