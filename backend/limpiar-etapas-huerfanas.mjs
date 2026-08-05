import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function limpiar() {
  let connection;
  try {
    console.log('🔗 Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Conectado a: ' + DB_NAME + '\n');

    // Encontrar etapas huérfanas
    console.log('🔍 Buscando etapas huérfanas (en catálogo pero no en etapas_pac)...');
    const [huerfanas] = await connection.query(`
      SELECT ec.id, ec.nombre
      FROM etapas_catalogo ec
      LEFT JOIN etapas_pac ep ON ec.id = ep.id
      WHERE ep.id IS NULL
    `);

    if (huerfanas.length === 0) {
      console.log('✓ No hay etapas huérfanas\n');
    } else {
      console.log(`⚠️  Encontradas ${huerfanas.length} etapas huérfanas:\n`);
      huerfanas.forEach(e => console.log(`   - ID: ${e.id}, Nombre: ${e.nombre}`));

      console.log(`\n🗑️  Eliminando ${huerfanas.length} etapas huérfanas...`);
      await connection.query('DELETE FROM etapas_catalogo WHERE id NOT IN (SELECT id FROM etapas_pac)');
      console.log('✓ Eliminadas\n');
    }

    console.log('✅ Limpieza completada!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

limpiar();
