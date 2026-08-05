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

async function corregir() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    console.log('\n=== CORRIGIENDO DIRECCIONES DEL USUARIO TICS ===\n');

    // Obtener ID del usuario TICS
    const [usuarios] = await connection.execute(
      "SELECT id FROM usuarios WHERE username = 'TICS'"
    );

    if (usuarios.length === 0) {
      console.log('❌ Usuario TICS no encontrado');
      await connection.end();
      return;
    }

    const usuarioId = usuarios[0].id;
    console.log(`✓ Usuario TICS encontrado (ID: ${usuarioId})\n`);

    // Mostrar direcciones actuales
    const [direccionesActuales] = await connection.execute(
      `SELECT d.id, d.nombre
       FROM usuarios_direcciones ud
       JOIN direcciones_catalogo d ON d.id = ud.direccion_id
       WHERE ud.usuario_id = ?`,
      [usuarioId]
    );

    console.log('Direcciones actuales:');
    direccionesActuales.forEach(d => console.log(`  - ${d.nombre}`));

    // Eliminar todas las direcciones
    const [deleteResult] = await connection.execute(
      `DELETE FROM usuarios_direcciones WHERE usuario_id = ?`,
      [usuarioId]
    );
    console.log(`\n✓ Eliminadas ${deleteResult.affectedRows} direcciones`);

    // Asignar solo TICS
    const [insertResult] = await connection.execute(
      `INSERT INTO usuarios_direcciones (usuario_id, direccion_id) VALUES (?, 12)`,
      [usuarioId]
    );
    console.log(`✓ Asignada "DPEI / Jefatura de TICS" (ID: 12)\n`);

    // Verificar cambios
    const [direccionesNuevas] = await connection.execute(
      `SELECT d.id, d.nombre
       FROM usuarios_direcciones ud
       JOIN direcciones_catalogo d ON d.id = ud.direccion_id
       WHERE ud.usuario_id = ?`,
      [usuarioId]
    );

    console.log('Direcciones después de la corrección:');
    direccionesNuevas.forEach(d => console.log(`  ✓ ${d.nombre}`));

    console.log('\n✓ Corrección completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

corregir();
