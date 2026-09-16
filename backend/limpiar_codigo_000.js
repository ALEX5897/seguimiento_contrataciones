#!/usr/bin/env node
import mysql from 'mysql2/promise';

const pool = await mysql.createPool({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

const conn = await pool.getConnection();

try {
  await conn.beginTransaction();

  // Obtener el proceso con código "000"
  const [procesosCero] = await conn.query(
    'SELECT id, subtarea FROM procesos WHERE version_id = 12 AND codigo_olympo = "000"'
  );

  if (procesosCero.length > 0) {
    const procesoId = procesosCero[0].id;
    console.log(`\n🗑️  Eliminando proceso con código "000":`);
    console.log(`   ID: ${procesoId}`);
    console.log(`   Nombre: ${procesosCero[0].subtarea}\n`);

    // Eliminar registros relacionados
    await conn.query('DELETE FROM procesos_indicadores WHERE proceso_id = ?', [procesoId]);
    await conn.query('DELETE FROM procesos_presupuesto WHERE proceso_id = ?', [procesoId]);
    await conn.query('DELETE FROM procesos_contexto WHERE proceso_id = ?', [procesoId]);
    await conn.query('DELETE FROM procesos WHERE id = ?', [procesoId]);

    console.log(`✅ Eliminado correctamente\n`);
  }

  await conn.commit();

  // Verificar totales finales
  const [stats] = await conn.query(`
    SELECT COUNT(*) as total, SUM(presupuesto_2026_inicial) as presupuesto_total
    FROM procesos
    WHERE version_id = 12
  `);

  console.log(`📈 TOTALES FINALES EN VERSIÓN 12:`);
  console.log(`   ✅ Total procesos: ${stats[0].total}`);
  console.log(`   💰 Presupuesto: $${Number(stats[0].presupuesto_total || 0).toLocaleString('es-EC')}\n`);

  if (stats[0].total === 341) {
    console.log(`🎉 ¡PERFECTO! Los 341 procesos están cargados correctamente\n`);
  }

} catch (error) {
  await conn.rollback();
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await conn.release();
  await pool.end();
}
