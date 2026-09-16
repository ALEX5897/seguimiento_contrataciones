import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const envLoaded = dotenv.config({ path: '.env' });
if (envLoaded.error) {
  console.error('Error cargando .env:', envLoaded.error);
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  console.log('🔄 INICIANDO MIGRACIÓN DE RESPONSABLES\n');

  // 1. Agregar columna responsable_id en procesos
  console.log('1️⃣ Agregando columna responsable_id en tabla procesos...');
  try {
    await connection.execute('ALTER TABLE procesos ADD COLUMN responsable_id INT');
    console.log('   ✅ Columna agregada');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('   ℹ️  Columna ya existe');
    } else {
      throw err;
    }
  }

  // 2. Agregar Foreign Key
  console.log('\n2️⃣ Agregando Foreign Key...');
  try {
    await connection.execute(`
      ALTER TABLE procesos 
      ADD CONSTRAINT fk_procesos_responsable 
      FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    console.log('   ✅ Foreign Key agregada');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('   ℹ️  Foreign Key ya existe');
    } else {
      console.log('   ⚠️  Error:', err.message);
    }
  }

  // 3. Agregar índice
  console.log('\n3️⃣ Agregando índice...');
  try {
    await connection.execute(`
      ALTER TABLE procesos 
      ADD INDEX idx_procesos_responsable_id (responsable_id)
    `);
    console.log('   ✅ Índice agregado');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('   ℹ️  Índice ya existe');
    } else {
      console.log('   ⚠️  Error:', err.message);
    }
  }

  // 4. Eliminar columna responsable_id de seguimiento_etapas
  console.log('\n4️⃣ Eliminando responsable_id de seguimiento_etapas...');
  try {
    await connection.execute('ALTER TABLE seguimiento_etapas DROP COLUMN responsable_id');
    console.log('   ✅ Columna eliminada');
  } catch (err) {
    if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('   ℹ️  Columna no existe');
    } else {
      console.log('   ⚠️  Error:', err.message);
    }
  }

  // 5. Verificación final
  console.log('\n5️⃣ Verificando resultado...');
  const [procColumns] = await connection.execute('SHOW COLUMNS FROM procesos WHERE Field = "responsable_id"');
  const [etapasColumns] = await connection.execute('SHOW COLUMNS FROM seguimiento_etapas WHERE Field = "responsable_id"');

  console.log('   ✅ procesos.responsable_id:', procColumns.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE');
  console.log('   ✅ seguimiento_etapas.responsable_id:', etapasColumns.length > 0 ? '❌ AÚN EXISTE' : '✅ ELIMINADA');

  console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');

} catch (error) {
  console.error('\n❌ Error durante la migración:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
