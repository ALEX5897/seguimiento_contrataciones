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

async function updateEtapas() {
  const connection = await pool.getConnection();
  try {
    console.log('Actualizando etapas sin clasificar a precontractual...');

    const [result] = await connection.execute(
      'UPDATE etapas_catalogo SET clasificacion = ? WHERE clasificacion = ?',
      ['precontractual', 'sin_clasificar']
    );

    console.log(`✅ ${result.affectedRows} etapas actualizadas`);

    const [etapas] = await connection.execute(
      'SELECT COUNT(*) as total FROM etapas_catalogo WHERE clasificacion = ?',
      ['precontractual']
    );

    console.log(`Total de etapas precontractuales ahora: ${etapas[0].total}`);

  } catch (error) {
    console.error('Error actualizando etapas:', error);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

updateEtapas();
