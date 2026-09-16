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

    // Verificar valores de pac_no_pac
    console.log('=== VALORES ÚNICOS DE pac_no_pac ===');
    const [pacValues] = await conn.execute(
      `SELECT DISTINCT pac_no_pac, COUNT(*) as cantidad
       FROM procesos
       WHERE activo = 1
       GROUP BY pac_no_pac`
    );
    console.log(pacValues);

    // Verificar valores de tipo_contratacion
    console.log('\n=== VALORES ÚNICOS DE tipo_contratacion ===');
    const [tiposValues] = await conn.execute(
      `SELECT DISTINCT tipo_contratacion, COUNT(*) as cantidad
       FROM procesos
       WHERE activo = 1
       GROUP BY tipo_contratacion`
    );
    console.log(tiposValues);

    // Ver algunos ejemplos
    console.log('\n=== EJEMPLOS DE PROCESOS ===');
    const [ejemplos] = await conn.execute(
      `SELECT id, codigo_olympo, nombre, pac_no_pac, tipo_contratacion
       FROM procesos
       WHERE activo = 1
       LIMIT 10`
    );
    console.log(ejemplos);

    // Contar total
    console.log('\n=== CONTEOS ===');
    const [total] = await conn.execute(
      `SELECT COUNT(*) as total FROM procesos WHERE activo = 1`
    );
    console.log('Total procesos activos:', total[0].total);

    await conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

check();
