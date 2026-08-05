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

async function ejecutarMigracion() {
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

    console.log('📋 Removiendo restricción de clave foránea...');

    try {
      await connection.query('ALTER TABLE `etapas_catalogo` DROP FOREIGN KEY `etapas_catalogo_ibfk_1`');
      console.log('✓ Restricción removida exitosamente\n');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  La restricción no existe o ya fue removida\n');
      } else {
        throw error;
      }
    }

    console.log('✅ Migración completada!');
    console.log('📝 Ahora puedes crear nuevas etapas en el catálogo.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

ejecutarMigracion();
