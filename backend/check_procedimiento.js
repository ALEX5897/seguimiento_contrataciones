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

    console.log('=== Procesos con procedimiento_sugerido NO NULL ===');
    const [result1] = await conn.execute(
      `SELECT COUNT(*) as total
       FROM procesos
       WHERE activo = 1 AND procedimiento_sugerido IS NOT NULL AND procedimiento_sugerido != ''`
    );
    console.log(result1);

    console.log('\n=== Ejemplos con procedimiento_sugerido y tipo_contratacion ===');
    const [result2] = await conn.execute(
      `SELECT procedimiento_sugerido, tipo_contratacion
       FROM procesos
       WHERE activo = 1
       LIMIT 10`
    );
    console.log(result2);

    await conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
