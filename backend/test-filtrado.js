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
  console.log('🔍 Test de Filtrado para usuario TICS\n');

  // 1. Datos del usuario
  const direccionUsuario = 'DPEI / Jefatura de TICS';
  console.log(`👤 Usuario: TICS`);
  console.log(`📍 Dirección: "${direccionUsuario}"\n`);

  // 2. Procesos de esa dirección en versión activa
  const [procesos] = await conn.query(
    `SELECT id, codigo_olympo, subtarea, direccion_encargada
     FROM subtareas_versiones
     WHERE version_id = 1 AND direccion_encargada = ?`,
    [direccionUsuario]
  );

  console.log(`✅ Procesos encontrados: ${procesos.length}`);
  if (procesos.length > 0) {
    console.log('\nPrimeros 3:');
    procesos.slice(0, 3).forEach(p => {
      console.log(`  - ${p.codigo_olympo}: ${p.subtarea.substring(0, 40)}`);
    });
  } else {
    console.log('\n❌ PROBLEMA: No hay procesos con esa dirección exacta');
    
    // Mostrar qué direcciones diferentes existen
    const [dirs] = await conn.query(
      `SELECT DISTINCT direccion_encargada FROM subtareas_versiones WHERE version_id = 1`
    );
    console.log('\nDirecciones en BD:');
    dirs.forEach(d => {
      console.log(`  "${d.direccion_encargada}"`);
    });
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
