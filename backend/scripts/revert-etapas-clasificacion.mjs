import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../.env');

dotenv.config({ path: ENV_PATH });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function revertEtapas() {
  const connection = await pool.getConnection();
  try {
    console.log('Revertiendo etapas a sin_clasificar...');

    // IDs de las etapas que deben volver a sin_clasificar
    const etapasIds = [6, 7, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 39, 48, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66];

    const [result] = await connection.execute(
      `UPDATE etapas_catalogo SET clasificacion = ? WHERE id IN (${etapasIds.join(',')})`,
      ['sin_clasificar']
    );

    console.log(`✅ ${result.affectedRows} etapas revertidas a sin_clasificar`);

    const [clasificadas] = await connection.execute(
      'SELECT COUNT(*) as total FROM etapas_catalogo WHERE clasificacion = ?',
      ['precontractual']
    );

    const [sinClasificar] = await connection.execute(
      'SELECT COUNT(*) as total FROM etapas_catalogo WHERE clasificacion = ?',
      ['sin_clasificar']
    );

    console.log(`Total precontractuales: ${clasificadas[0].total}`);
    console.log(`Total sin_clasificar: ${sinClasificar[0].total}`);

  } catch (error) {
    console.error('Error revertiendo etapas:', error);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

revertEtapas();
