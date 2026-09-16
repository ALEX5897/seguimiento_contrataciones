#!/usr/bin/env node

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = await mysql.createPool({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

const conn = await pool.getConnection();

try {
  console.log('🔧 Configurando usuario TICS\n');

  const hashedPassword = await bcrypt.hash('tics2026', 10);

  const [result] = await conn.query(
    'UPDATE usuarios SET password_hash = ? WHERE username = ?',
    [hashedPassword, 'TICS']
  );

  if (result.affectedRows > 0) {
    console.log('✅ Contraseña actualizada');
    console.log('   Usuario: TICS');
    console.log('   Contraseña: tics2026\n');
  } else {
    console.log('❌ Usuario no encontrado');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
