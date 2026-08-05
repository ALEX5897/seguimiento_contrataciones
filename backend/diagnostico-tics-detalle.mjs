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

async function diagnostico() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    console.log('\n=== BÚSQUEDA DE PROCESOS PROBLEMÁTICOS ===\n');

    // Buscar procesos con "Servicio" o "facilidades"
    const [procesosProblem] = await connection.execute(
      `SELECT id, nombre, direccion_encargada FROM subtareas
       WHERE activo = 1 AND (nombre LIKE '%facilidades%' OR nombre LIKE '%Servicio%' OR nombre LIKE '%Turísticas%')
       ORDER BY nombre`
    );

    console.log('Procesos con "facilidades", "Servicio" o "Turísticas":');
    if (procesosProblem.length === 0) {
      console.log('  No se encontraron');
    } else {
      procesosProblem.forEach(p => {
        console.log(`  - ID: ${p.id}`);
        console.log(`    Nombre: ${p.nombre}`);
        console.log(`    Dirección: ${p.direccion_encargada}`);
      });
    }

    // Buscar todas las direcciones únicas en subtareas
    console.log('\nTodas las direcciones asignadas en procesos:');
    const [direccionesEnProcesos] = await connection.execute(
      `SELECT DISTINCT direccion_encargada FROM subtareas WHERE activo = 1 ORDER BY direccion_encargada`
    );
    direccionesEnProcesos.forEach(d => console.log(`  - ${d.direccion_encargada}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

diagnostico();
