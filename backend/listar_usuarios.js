import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  const [usuarios] = await conn.execute('SELECT id, nombre, username FROM usuarios LIMIT 20');
  
  console.log('📋 USUARIOS EN EL SISTEMA:\n');
  usuarios.forEach(u => {
    console.log(`ID: ${u.id.toString().padEnd(3)} | Nombre: ${u.nombre.padEnd(40)} | Usuario: ${u.username}`);
  });

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await conn.end();
}
