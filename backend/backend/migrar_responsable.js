import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('🔄 MIGRANDO RESPONSABLES...\n');

try {
  // 1. Agregar columna
  try {
    await conn.execute('ALTER TABLE procesos ADD COLUMN responsable_id INT');
    console.log('✅ Columna responsable_id agregada en procesos');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Columna responsable_id ya existe');
    } else {
      throw e;
    }
  }

  // 2. Foreign key
  try {
    await conn.execute('ALTER TABLE procesos ADD CONSTRAINT fk_procesos_responsable FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL');
    console.log('✅ Foreign Key agregada');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  Foreign Key ya existe');
    }
  }

  // 3. Índice
  try {
    await conn.execute('ALTER TABLE procesos ADD INDEX idx_procesos_responsable_id (responsable_id)');
    console.log('✅ Índice agregado');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  Índice ya existe');
    }
  }

  // 4. Eliminar de seguimiento_etapas
  try {
    await conn.execute('ALTER TABLE seguimiento_etapas DROP COLUMN responsable_id');
    console.log('✅ Columna responsable_id eliminada de seguimiento_etapas');
  } catch (e) {
    if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('ℹ️  Columna responsable_id no existe en seguimiento_etapas');
    }
  }

  console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
} catch (e) {
  console.error('❌ Error:', e.message);
}

await conn.end();
