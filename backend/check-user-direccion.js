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
  console.log('🔍 Verificando usuario "direccion"\n');

  // Obtener usuario
  const [usuario] = await conn.query(
    'SELECT id, username, direccion_nombre FROM usuarios WHERE username = ?',
    ['direccion']
  );

  if (usuario.length === 0) {
    console.log('❌ Usuario "direccion" no encontrado');
    process.exit(1);
  }

  const u = usuario[0];
  console.log(`✅ Usuario encontrado:`);
  console.log(`   ID: ${u.id}`);
  console.log(`   Username: ${u.username}`);
  console.log(`   Dirección: "${u.direccion_nombre}"\n`);

  // Obtener direcciones asignadas
  const [direcciones] = await conn.query(
    `SELECT ud.usuario_id, d.id, d.nombre
     FROM usuarios_direcciones ud
     JOIN direcciones d ON ud.direccion_id = d.id
     WHERE ud.usuario_id = ?`,
    [u.id]
  );

  console.log(`📍 Direcciones asignadas (${direcciones.length}):`);
  if (direcciones.length === 0) {
    console.log('   ❌ NINGUNA asignada!');
  } else {
    direcciones.forEach(d => {
      console.log(`   - ${d.nombre}`);
    });
  }

  // Buscar en BD qué direcciones existen
  console.log('\n📋 Direcciones disponibles en BD:');
  const [todas] = await conn.query('SELECT id, nombre FROM direcciones');
  todas.forEach(d => {
    console.log(`   ID: ${d.id} | "${d.nombre}"`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
