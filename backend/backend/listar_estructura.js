import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const [tables] = await conn.execute('SHOW TABLES');

console.log('📋 TABLAS RELACIONADAS CON PROCESOS Y RESPONSABLES:\n');

for (const row of tables) {
  const tableName = Object.values(row)[0];

  if (['procesos', 'actividades', 'usuarios', 'etapas', 'subtareas', 'tareas', 'direcciones'].some(t => tableName.includes(t))) {
    console.log(`\n🔹 Tabla: ${tableName}`);
    const [columns] = await conn.execute(`DESCRIBE ${tableName}`);
    columns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})${col.Key ? ' [KEY]' : ''}`);
    });
  }
}

await conn.end();
