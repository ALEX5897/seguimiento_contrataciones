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
  const [versiones] = await conn.query(`SELECT id FROM versiones ORDER BY id DESC`);
  
  console.log('\n📊 CONTEO REAL DE PROCESOS POR VERSIÓN:\n');
  
  for (const v of versiones) {
    const [count] = await conn.query(
      `SELECT COUNT(*) as total FROM procesos WHERE version_id = ?`,
      [v.id]
    );
    console.log(`Versión ${v.id}: ${count[0].total} procesos`);
  }
} finally {
  await conn.release();
  await pool.end();
}
