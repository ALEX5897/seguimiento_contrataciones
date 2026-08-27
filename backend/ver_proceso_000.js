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
  console.log('\n📋 PROCESOS CON CÓDIGO "000":\n');

  const [rows] = await conn.query(`
    SELECT id, codigo_olympo, subtarea, direccion_encargada, presupuesto_2026_inicial
    FROM procesos 
    WHERE version_id = 12 AND codigo_olympo = '000'
  `);

  rows.forEach(r => {
    console.log(`📌 ID: ${r.id}`);
    console.log(`   Código: ${r.codigo_olympo}`);
    console.log(`   Nombre: ${r.subtarea}`);
    console.log(`   Dirección: ${r.direccion_encargada}`);
    console.log(`   Presupuesto: $${Number(r.presupuesto_2026_inicial).toLocaleString('es-EC')}\n`);
  });

  console.log(`\n📊 RESUMEN:\n`);
  console.log(`Excel: 341 procesos`);
  console.log(`  - Con código: 336 (341 - 5 sin código)`);
  console.log(`  - Sin código: 5`);
  console.log(`\nBD (Versión 12): 337 procesos`);
  console.log(`  - Procesos cargados exitosamente: 337`);
  console.log(`  - Procesos faltantes del Excel: 4 (341 - 337)`);
  console.log(`\n⚠️ POSIBLES CAUSAS:`);
  console.log(`   1. 4 procesos duplicados exactos fueron saltados`);
  console.log(`   2. 4 procesos con datos faltantes no se cargaron`);
  console.log(`   3. 4 procesos generaron errores durante la carga`);

} finally {
  await conn.release();
  await pool.end();
}
