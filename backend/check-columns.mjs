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

async function query(sql, values = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql, values);
    return rows;
  } finally {
    conn.release();
  }
}

async function checkColumns() {
  try {
    const columns = await query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'subtareas'
      ORDER BY COLUMN_NAME
    `, [process.env.DB_NAME]);
    
    console.log('COLUMNAS EN TABLA SUBTAREAS:');
    columns.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
    
    // También muestra un ejemplo de registro
    const sample = await query(`SELECT * FROM subtareas LIMIT 1`);
    console.log('\nEJEMPLO DE REGISTRO:');
    if (sample.length > 0) {
      const first = sample[0];
      Object.keys(first).forEach(key => {
        console.log(`  ${key}: ${first[key]}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
