import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend\.env' });

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  console.log('🔄 INICIANDO MIGRACIÓN DE RESPONSABLES\n');

  console.log('1️⃣ Agregando columna responsable_id en procesos...');
  await connection.execute('ALTER TABLE procesos ADD COLUMN responsable_id INT').catch(() => console.log('   ℹ️  Ya existe'));
  console.log('   ✅ Listo');

  console.log('\n2️⃣ Agregando Foreign Key...');
  await connection.execute('ALTER TABLE procesos ADD CONSTRAINT fk_procesos_responsable FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL').catch(() => console.log('   ℹ️  Ya existe'));
  console.log('   ✅ Listo');

  console.log('\n3️⃣ Agregando índice...');
  await connection.execute('ALTER TABLE procesos ADD INDEX idx_procesos_responsable_id (responsable_id)').catch(() => console.log('   ℹ️  Ya existe'));
  console.log('   ✅ Listo');

  console.log('\n4️⃣ Eliminando responsable_id de seguimiento_etapas...');
  await connection.execute('ALTER TABLE seguimiento_etapas DROP COLUMN responsable_id').catch(() => console.log('   ℹ️  No existe'));
  console.log('   ✅ Listo');

  console.log('\n✅ MIGRACIÓN COMPLETADA');
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await connection.end();
}
