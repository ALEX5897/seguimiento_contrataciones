import mysql from 'mysql2/promise';

async function check() {
  const pool = await mysql.createPool({
    host: '172.16.1.80',
    user: 'usr-cont',
    password: 'mas_TER$*25@',
    database: 'poa_pac'
  });

  try {
    const conn = await pool.getConnection();

    // Buscar todas las tablas
    console.log('=== TABLAS EN LA BASE DE DATOS ===');
    const [tables] = await conn.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='poa_pac' ORDER BY TABLE_NAME`
    );
    console.log(tables.map(t => t.TABLE_NAME).join('\n'));

    // Buscar columnas que contengan 'pac' en cualquier tabla
    console.log('\n=== COLUMNAS CON "PAC" EN SU NOMBRE ===');
    const [columns] = await conn.execute(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA='poa_pac' AND COLUMN_NAME LIKE '%pac%'
       ORDER BY TABLE_NAME, COLUMN_NAME`
    );
    console.log(columns);

    // Ver estructura de tabla procesos
    console.log('\n=== ESTRUCTURA TABLA PROCESOS (campos relevantes) ===');
    const [procesos] = await conn.execute(
      `SHOW COLUMNS FROM procesos WHERE Field LIKE '%pac%' OR Field LIKE '%plan%'`
    );
    console.log(procesos);

    // Ver un ejemplo completo
    console.log('\n=== EJEMPLO DE PROCESO CON PAC DETAILS ===');
    const [ejemplo] = await conn.execute(
      `SELECT id, codigo_olympo, pac_no_pac, tipo_contratacion, procedimiento_sugerido
       FROM procesos
       WHERE activo = 1
       LIMIT 1`
    );
    console.log(ejemplo);

    // Buscar si hay otra tabla con más detalles
    console.log('\n=== TABLA procesos_presupuesto (si existe) ===');
    try {
      const [presupuesto] = await conn.execute(
        `SHOW COLUMNS FROM procesos_presupuesto`
      );
      console.log('Columnas:', presupuesto.map(c => c.Field).join(', '));

      const [ejemploP] = await conn.execute(
        `SELECT * FROM procesos_presupuesto LIMIT 1`
      );
      if (ejemploP.length > 0) {
        console.log('Ejemplo:', ejemploP[0]);
      }
    } catch (e) {
      console.log('Tabla no existe o no hay datos');
    }

    await conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
