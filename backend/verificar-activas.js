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
  console.log('🔍 Verificando estado de versiones...\n');

  // Obtener todas las versiones
  const [versiones] = await conn.query(
    'SELECT id, nombre, estado, activa FROM versiones ORDER BY numero_reforma'
  );

  console.log('📊 Todas las versiones:');
  versiones.forEach(v => {
    const icono = v.activa ? '✅' : '❌';
    console.log(`  ${icono} ID:${v.id} | ${v.nombre} | Estado: ${v.estado} | Activa: ${v.activa}`);
  });

  // Verificar solo 1 activa
  const activas = versiones.filter(v => v.activa);
  console.log(`\n🔍 Total activas: ${activas.length}`);

  if (activas.length === 1) {
    console.log(`✅ CORRECTO: Solo "${activas[0].nombre}" está activa`);
  } else if (activas.length === 0) {
    console.log('⚠️ ADVERTENCIA: No hay versión activa');
  } else {
    console.log('❌ ERROR: Hay múltiples versiones activas!');
    activas.forEach(v => {
      console.log(`   - ${v.nombre}`);
    });
  }

  console.log('\n✨ Verificación completada');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
