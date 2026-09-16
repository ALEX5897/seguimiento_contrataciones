import mysql from 'mysql2/promise';

async function check() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'acasa',
    password: 'acasa',
    database: 'seguimiento_contratos'
  });

  try {
    const conn = await pool.getConnection();

    console.log('=== PROCESOS 3604 ===');
    const [procesos] = await conn.execute('SELECT id, codigo_olympo, nombre FROM procesos WHERE id=3604');
    console.log(JSON.stringify(procesos, null, 2));

    if (procesos.length > 0) {
      const codigo = procesos[0].codigo_olympo;
      console.log('\n=== SUBTAREAS CON CÓDIGO: ' + codigo + ' ===');
      const [subtareas] = await conn.execute('SELECT id, codigo_olympo, nombre FROM subtareas WHERE codigo_olympo = ?', [codigo]);
      console.log(JSON.stringify(subtareas, null, 2));
    }

    await conn.release();
  } finally {
    await pool.end();
  }
}

check().catch(console.error);
