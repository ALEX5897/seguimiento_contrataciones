import mysql from 'mysql2/promise';

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '172.16.1.80',
      user: 'usr-cont',
      password: 'mas_TER$*25@',
      database: 'poa_pac'
    });

    console.log('🔍 PROCESOS SIN VINCULAR A REFORMA 8\n');

    // Procesos en SUBTAREAS que NO están en Reforma 8
    const [faltantes] = await conn.query(`
      SELECT COUNT(*) as total
      FROM subtareas s
      WHERE s.id NOT IN (
        SELECT DISTINCT subtarea_id FROM subtareas_versiones WHERE version_id = 12
      )
    `);

    console.log(`📊 Procesos en SUBTAREAS pero NO en Reforma 8: ${faltantes[0].total}`);

    // Ver dónde están
    const [dondeestan] = await conn.query(`
      SELECT v.nombre, COUNT(*) as cantidad
      FROM subtareas s
      LEFT JOIN subtareas_versiones sv ON s.id = sv.subtarea_id
      LEFT JOIN versiones v ON sv.version_id = v.id
      WHERE s.id NOT IN (
        SELECT DISTINCT subtarea_id FROM subtareas_versiones WHERE version_id = 12
      )
      GROUP BY sv.version_id
      ORDER BY cantidad DESC
    `);

    console.log('\n📍 Están en estas versiones:');
    dondeestan.forEach(row => {
      if (row.nombre) {
        console.log(`  - ${row.nombre}: ${row.cantidad}`);
      } else {
        console.log(`  - SIN VERSIÓN: ${row.cantidad}`);
      }
    });

    // Contar sin versión
    const [sinversion] = await conn.query(`
      SELECT COUNT(*) as total
      FROM subtareas s
      WHERE s.id NOT IN (
        SELECT DISTINCT subtarea_id FROM subtareas_versiones
      )
    `);

    console.log(`\n⚠️  Procesos sin NINGUNA versión: ${sinversion[0].total}`);

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
