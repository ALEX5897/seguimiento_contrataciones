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
  console.log('\n📊 VERIFICACIÓN DETALLADA DE LA VERSIÓN 12:\n');

  // Total de procesos
  const [totalRows] = await conn.query(`
    SELECT COUNT(*) as total FROM procesos WHERE version_id = 12
  `);
  console.log(`✅ Total de procesos en versión 12: ${totalRows[0].total}`);

  // Procesos activos
  const [activosRows] = await conn.query(`
    SELECT COUNT(*) as total FROM procesos WHERE version_id = 12 AND activo = 1
  `);
  console.log(`✅ Procesos activos: ${activosRows[0].total}`);

  // Procesos inactivos
  const [inactivosRows] = await conn.query(`
    SELECT COUNT(*) as total FROM procesos WHERE version_id = 12 AND activo = 0
  `);
  console.log(`❌ Procesos inactivos: ${inactivosRows[0].total}`);

  // Procesos con código 000
  const [cod000Rows] = await conn.query(`
    SELECT COUNT(*) as total FROM procesos WHERE version_id = 12 AND codigo_olympo = '000'
  `);
  console.log(`📌 Procesos con código "000": ${cod000Rows[0].total}`);

  // Verificar si hay duplicados
  const [duplicadosRows] = await conn.query(`
    SELECT codigo_olympo, COUNT(*) as cantidad 
    FROM procesos 
    WHERE version_id = 12 
    GROUP BY codigo_olympo 
    HAVING COUNT(*) > 1
  `);
  console.log(`\n🔍 Duplicados encontrados: ${duplicadosRows.length}`);
  if (duplicadosRows.length > 0) {
    duplicadosRows.forEach(r => {
      console.log(`   - Código ${r.codigo_olympo}: ${r.cantidad} veces`);
    });
  }

  // Presupuesto total
  const [presupuestoRows] = await conn.query(`
    SELECT SUM(presupuesto_2026_inicial) as total FROM procesos WHERE version_id = 12
  `);
  console.log(`\n💰 Presupuesto total: $${Number(presupuestoRows[0].total || 0).toLocaleString('es-EC')}`);

} finally {
  await conn.release();
  await pool.end();
}
