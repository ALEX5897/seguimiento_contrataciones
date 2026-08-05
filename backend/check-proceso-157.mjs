import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const [rows] = await conn.execute('SELECT id, nombre, direccion_encargada FROM subtareas WHERE id = 157');
console.log('Proceso 157:');
if (rows.length > 0) {
  const p = rows[0];
  console.log(`  ID: ${p.id}`);
  console.log(`  Nombre: ${p.nombre}`);
  console.log(`  Dirección: ${p.direccion_encargada}`);
}

await conn.end();
