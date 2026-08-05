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
    console.log('\n=== DIAGNÓSTICO TICS ===\n');

    // 1. Buscar usuario TICS
    const [usuarios] = await connection.execute(
      "SELECT id, username, nombre, role FROM usuarios WHERE username LIKE '%tics%' OR nombre LIKE '%tics%' LIMIT 5"
    );
    console.log('Usuarios TICS encontrados:');
    usuarios.forEach(u => console.log(`  - ID: ${u.id}, Username: ${u.username}, Nombre: ${u.nombre}, Role: ${u.role}`));

    if (usuarios.length === 0) {
      console.log('  No se encontraron usuarios TICS');
      await connection.end();
      return;
    }

    const usuarioTics = usuarios[0];
    console.log(`\nAnalizando usuario: ${usuarioTics.username} (ID: ${usuarioTics.id})\n`);

    // 2. Direcciones asignadas al usuario
    const [direccionesAsignadas] = await connection.execute(
      `SELECT d.id, d.nombre
       FROM usuarios_direcciones ud
       JOIN direcciones_catalogo d ON d.id = ud.direccion_id
       WHERE ud.usuario_id = ?`,
      [usuarioTics.id]
    );
    console.log('Direcciones asignadas a este usuario:');
    if (direccionesAsignadas.length === 0) {
      console.log('  ¡NINGUNA dirección asignada!');
    } else {
      direccionesAsignadas.forEach(d => console.log(`  - ID: ${d.id}, Nombre: ${d.nombre}`));
    }

    // 3. Procesos que debería ver (por dirección)
    console.log('\nProcesos que debería ver según dirección asignada:');
    if (direccionesAsignadas.length > 0) {
      const dirIds = direccionesAsignadas.map(d => d.id);
      const placeholders = dirIds.map(() => '?').join(',');

      const [procesos] = await connection.execute(
        `SELECT id, nombre, direccion_encargada FROM subtareas WHERE activo = 1 ORDER BY nombre LIMIT 5`,
        dirIds
      );

      console.log(`  Total procesos que debería ver: ${procesos.length}`);
      procesos.forEach(p => console.log(`    - ${p.nombre} (${p.direccion_encargada})`));
    }

    // 4. Procesos que está viendo (todos activos)
    const [procesosViendo] = await connection.execute(
      `SELECT id, nombre, direccion_encargada FROM subtareas WHERE activo = 1 LIMIT 10`
    );
    console.log('\nProcesos activos en el sistema:');
    procesosViendo.forEach(p => console.log(`  - ${p.nombre} (${p.direccion_encargada})`));

    // 5. Direcciones disponibles en sistema
    const [direccionesDisponibles] = await connection.execute(
      `SELECT id, nombre FROM direcciones_catalogo ORDER BY nombre`
    );
    console.log('\nDirecciones disponibles en el sistema:');
    direccionesDisponibles.forEach(d => console.log(`  - ID: ${d.id}, ${d.nombre}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

diagnostico();
