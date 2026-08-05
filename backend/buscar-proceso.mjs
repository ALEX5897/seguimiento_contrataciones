import mysql from 'mysql2/promise';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

async function buscar() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    const [procesos] = await conn.execute(`
      SELECT id, nombre FROM subtareas
      WHERE nombre LIKE '%equipamiento%' OR nombre LIKE '%audiovisual%'
      ORDER BY id
    `);

    console.log(`Procesos encontrados: ${procesos.length}\n`);
    procesos.forEach(p => {
      console.log(`ID: ${p.id} | ${p.nombre.substring(0, 80)}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

buscar();
