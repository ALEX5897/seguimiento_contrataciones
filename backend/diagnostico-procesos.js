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
  console.log('🔍 Diagnóstico de Procesos\n');

  // 1. Versión activa
  const [activa] = await conn.query(
    'SELECT id, nombre FROM versiones WHERE activa = 1'
  );

  if (activa.length === 0) {
    console.log('❌ No hay versión activa');
    process.exit(1);
  }

  const versionActuaId = activa[0].id;
  const versionActuaNombre = activa[0].nombre;

  console.log(`✅ Versión Activa: ${versionActuaNombre} (ID: ${versionActuaId})\n`);

  // 2. Procesos en versión activa
  const [procesos] = await conn.query(
    `SELECT id, codigo_olympo, subtarea, direccion_encargada, activo
     FROM subtareas_versiones
     WHERE version_id = ?
     ORDER BY id`,
    [versionActuaId]
  );

  console.log(`📊 Procesos en ${versionActuaNombre}:`);
  console.log(`   Total: ${procesos.length}`);

  if (procesos.length === 0) {
    console.log('   ⚠️ ADVERTENCIA: Esta versión NO tiene procesos!');
    console.log('\n💡 Soluciones:');
    console.log('   1. Cargar procesos desde Excel');
    console.log('   2. O duplicar procesos de otra versión');
  } else {
    console.log(`   Muestra primeros 5:`);
    procesos.slice(0, 5).forEach((p, i) => {
      console.log(`      ${i+1}. ${p.codigo_olympo} - ${p.subtarea.substring(0, 40)}`);
    });

    // 3. Por dirección
    console.log('\n📍 Procesos por Dirección:');
    const [porDir] = await conn.query(
      `SELECT direccion_encargada, COUNT(*) as total
       FROM subtareas_versiones
       WHERE version_id = ?
       GROUP BY direccion_encargada`,
      [versionActuaId]
    );

    porDir.forEach(d => {
      console.log(`   ${d.direccion_encargada}: ${d.total} procesos`);
    });
  }

  // 4. Verificar tabla antigua
  console.log('\n🔍 Tabla antigua (subtareas):');
  const [antigua] = await conn.query(
    'SELECT COUNT(*) as total FROM subtareas WHERE activo != 0'
  );
  console.log(`   Procesos activos: ${antigua[0].total}`);

  console.log('\n✨ Diagnóstico completado');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
