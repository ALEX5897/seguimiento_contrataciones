import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '.env');
dotenv.config({ path: ENV_PATH });

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function actualizarProcesosAInactivo() {
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Faltan variables de entorno para la conexión MySQL');
  }

  const pool = await mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: 'utf8mb4'
  });

  try {
    console.log('📋 Iniciando actualización de procesos a estado INACTIVO...');

    // Obtener cantidad actual de procesos activos
    const [countBefore] = await pool.query('SELECT COUNT(*) AS total FROM subtareas WHERE activo = true');
    const procesosActivos = countBefore[0]?.total || 0;

    console.log(`   - Procesos activos encontrados: ${procesosActivos}`);

    if (procesosActivos === 0) {
      console.log('✓ No hay procesos activos para desactivar');
      return;
    }

    // Actualizar todos los procesos a inactivo
    const [result] = await pool.query(
      'UPDATE subtareas SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE activo = true'
    );

    const procesosActualizados = result.affectedRows || 0;
    console.log(`✓ ${procesosActualizados} procesos han sido pasados a estado INACTIVO`);

    // Verificar resultado
    const [countAfter] = await pool.query('SELECT COUNT(*) AS total FROM subtareas WHERE activo = false');
    const procesosInactivos = countAfter[0]?.total || 0;
    console.log(`✓ Total de procesos inactivos ahora: ${procesosInactivos}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

actualizarProcesosAInactivo()
  .then(() => {
    console.log('\n✅ Operación completada exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ La operación falló:', error.message, '\n');
    process.exit(1);
  });
