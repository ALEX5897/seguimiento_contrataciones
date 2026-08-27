import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'procesos' AND TABLE_SCHEMA = ?",
      [process.env.DB_NAME]
    );

    console.log('Columnas en tabla PROCESOS:');
    columns.forEach(c => console.log(`  - ${c.COLUMN_NAME}`));

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

check();
