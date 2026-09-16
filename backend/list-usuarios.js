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
  console.log('👥 Usuarios del sistema\n');

  const [usuarios] = await conn.query(
    'SELECT id, username, nombre, role, direccion_nombre FROM usuarios LIMIT 20'
  );

  console.log('Usuarios:');
  usuarios.forEach(u => {
    console.log(`  ID: ${u.id} | ${u.username} | ${u.nombre} | Role: ${u.role} | Dir: ${u.direccion_nombre}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
