import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'seguimiento_contratos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

async function removeOrdenDescripcion() {
  const connection = await pool.getConnection();

  try {
    console.log('🔧 Iniciando eliminación de columnas orden y descripcion...');

    // Eliminar columna orden
    try {
      console.log('Eliminando columna orden...');
      await connection.query('ALTER TABLE etapas_catalogo DROP COLUMN orden');
      console.log('✅ Columna orden eliminada');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Columna orden no existe (ignorando)');
      } else {
        throw error;
      }
    }

    // Eliminar columna descripcion
    try {
      console.log('Eliminando columna descripcion...');
      await connection.query('ALTER TABLE etapas_catalogo DROP COLUMN descripcion');
      console.log('✅ Columna descripcion eliminada');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  Columna descripcion no existe (ignorando)');
      } else {
        throw error;
      }
    }

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

removeOrdenDescripcion();
