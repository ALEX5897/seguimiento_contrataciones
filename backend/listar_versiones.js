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
  const [rows] = await conn.query(`
    SELECT id, anio, numero_reforma, nombre, activa, total_procesos, fecha_creacion
    FROM versiones
    ORDER BY id DESC
  `);

  console.log('\n📋 VERSIONES/REFORMAS EN LA BD:\n');
  rows.forEach(r => {
    const activo = r.activa ? '✅ ACTIVA' : '⭕ Inactiva';
    console.log(`ID: ${r.id} | Reforma: ${r.numero_reforma} | Año: ${r.anio} | Procesos: ${r.total_procesos} | ${activo}`);
    console.log(`   Nombre: ${r.nombre}`);
    console.log(`   Fecha: ${r.fecha_creacion}\n`);
  });
} finally {
  await conn.release();
  await pool.end();
}
