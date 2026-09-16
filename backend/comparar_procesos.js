import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '172.16.1.80',
      user: 'usr-cont',
      password: 'mas_TER$*25@',
      database: 'poa_pac'
    });

    console.log('📊 COMPARACIÓN: SUBTAREAS vs REFORMA 8\n');

    // Total en subtareas
    const [total_subtareas] = await conn.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
             SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos
      FROM subtareas
    `);

    console.log('Tabla SUBTAREAS (base):');
    console.log(`  Total: ${total_subtareas[0].total}`);
    console.log(`  Activos: ${total_subtareas[0].activos}`);
    console.log(`  Inactivos: ${total_subtareas[0].inactivos}`);

    // Total en Reforma 8
    const [reforma8] = await conn.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
             SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos
      FROM subtareas_versiones
      WHERE version_id = 12
    `);

    console.log('\nReforma 8 (subtareas_versiones):');
    console.log(`  Total: ${reforma8[0].total}`);
    console.log(`  Activos: ${reforma8[0].activos}`);
    console.log(`  Inactivos: ${reforma8[0].inactivos}`);

    // Diferencia
    const faltantes = total_subtareas[0].total - reforma8[0].total;
    console.log(`\n⚠️  DIFERENCIA: ${faltantes} procesos faltantes en Reforma 8`);

    // ¿En qué versiones están los faltantes?
    const [versions_info] = await conn.query(`
      SELECT v.nombre, COUNT(*) as cantidad
      FROM subtareas s
      LEFT JOIN subtareas_versiones sv ON s.id = sv.subtarea_id_original
      LEFT JOIN versiones v ON sv.version_id = v.id
      GROUP BY sv.version_id, v.nombre
      ORDER BY cantidad DESC
    `);

    console.log('\n📍 Procesos por versión:');
    versions_info.forEach(row => {
      if (row.nombre) {
        console.log(`  ${row.nombre}: ${row.cantidad}`);
      } else {
        console.log(`  (SIN VERSIÓN): ${row.cantidad}`);
      }
    });

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
