import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac',
  waitForConnections: true,
  connectionLimit: 1
});

async function test() {
  try {
    const [rows] = await pool.query('DESC usuarios');
    console.log('=== Columnas de usuarios ===');
    rows.forEach(col => {
      if (col.Field.includes('fecha')) {
        console.log(`  ${col.Field}: ${col.Type} - NULL: ${col.Null}`);
      }
    });

    console.log('\n=== Primeros 3 usuarios ===');
    const [users] = await pool.query('SELECT id, username, fecha_inicio_rol, fecha_fin_rol FROM usuarios LIMIT 3');
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
