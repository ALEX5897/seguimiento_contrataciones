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
  console.log('🔍 Test: Qué ve cada dirección\n');

  // 1. Versión activa
  const [activa] = await conn.query(
    'SELECT id, nombre FROM versiones WHERE activa = 1'
  );

  const versionId = activa[0].id;
  console.log(`✅ Versión Activa: ${activa[0].nombre} (ID: ${versionId})\n`);

  // 2. Direcciones únicas en versión activa
  const [direcciones] = await conn.query(
    `SELECT DISTINCT direccion_encargada
     FROM subtareas_versiones
     WHERE version_id = ?
     ORDER BY direccion_encargada`,
    [versionId]
  );

  console.log(`📍 Direcciones con procesos (${direcciones.length}):\n`);

  for (const dir of direcciones) {
    const [procesos] = await conn.query(
      `SELECT COUNT(*) as total
       FROM subtareas_versiones
       WHERE version_id = ? AND direccion_encargada = ?`,
      [versionId, dir.direccion_encargada]
    );

    console.log(`  "${dir.direccion_encargada}": ${procesos[0].total} procesos`);
  }

  console.log('\n💡 Si ves procesos aquí pero no en el frontend:');
  console.log('   1. El nombre de dirección en BD NO coincide exactamente');
  console.log('   2. El usuario no tiene esa dirección asignada');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
