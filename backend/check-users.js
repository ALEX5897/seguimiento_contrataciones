import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  // Verificar tablas de usuarios
  const [tables] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=?",
    [process.env.DB_NAME]
  );

  console.log('Tablas en la BD:');
  tables.forEach(t => console.log('  -', t.TABLE_NAME));

  // Verificar tabla de usuarios
  const hasUsuarios = tables.some(t => t.TABLE_NAME === 'usuarios');
  if (hasUsuarios) {
    const [users] = await conn.query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`\n✅ Tabla usuarios existe con ${users[0].count} registros`);

    if (users[0].count === 0) {
      console.log('\n⚠️ No hay usuarios. Necesita crear al menos un usuario admin.');
    }
  } else {
    console.log('\n❌ Tabla usuarios no existe');
  }
} finally {
  await conn.end();
}
