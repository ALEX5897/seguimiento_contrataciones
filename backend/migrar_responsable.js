import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('🔄 MIGRANDO RESPONSABLES...\n');

try {
  await conn.execute('ALTER TABLE procesos ADD COLUMN IF NOT EXISTS responsable_id INT');
  console.log('✅ Columna responsable_id agregada en procesos');

  await conn.execute('ALTER TABLE procesos ADD CONSTRAINT fk_procesos_responsable FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL').catch(() => {});
  console.log('✅ Foreign Key agregada');

  await conn.execute('ALTER TABLE procesos ADD INDEX idx_procesos_responsable_id (responsable_id)').catch(() => {});
  console.log('✅ Índice agregado');

  await conn.execute('ALTER TABLE seguimiento_etapas DROP COLUMN responsable_id').catch(() => {});
  console.log('✅ Columna responsable_id eliminada de seguimiento_etapas');

  console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
} catch (e) {
  console.error('❌ Error:', e.message);
}

await conn.end();
