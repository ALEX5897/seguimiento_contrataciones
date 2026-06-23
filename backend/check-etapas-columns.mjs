import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function getColumns() {
  const conn = await pool.getConnection();
  try {
    const [columns] = await conn.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='seguimiento_etapas' AND TABLE_SCHEMA=DATABASE()");
    console.log('Columnas de seguimiento_etapas:');
    for (const col of columns) {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    }

    console.log('\nPrimeros registros:');
    const [rows] = await conn.execute('SELECT * FROM seguimiento_etapas LIMIT 3');
    console.log(rows);
  } finally {
    conn.release();
    await pool.end();
  }
}

getColumns();
