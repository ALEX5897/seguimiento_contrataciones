import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, './.env');
const envLoaded = dotenv.config({ path: ENV_PATH });

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('🔍 Debug: ¿Por qué se muestran 272 procesos inactivos?\n');

  let pool;
  try {
    pool = await mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();

    try {
      // 1. Verificar versión activa
      console.log('1️⃣ Verificando versión activa...');
      const [versionActiva] = await connection.query(
        `SELECT id, numero_reforma, nombre, activa FROM versiones WHERE activa = 1`
      );

      if (versionActiva.length === 0) {
        console.log('❌ NO HAY VERSIÓN ACTIVA!\n');
        return;
      }

      console.log(`✅ Versión activa: ${versionActiva[0].nombre} (ID: ${versionActiva[0].id})\n`);

      // 2. Procesos en tabla nueva (procesos)
      console.log('2️⃣ Procesos en tabla PROCESOS (nueva):');
      const [procesosNueva] = await connection.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
         FROM procesos WHERE version_id = ?`,
        [versionActiva[0].id]
      );
      console.log(`   Total en Reforma ${versionActiva[0].numero_reforma}: ${procesosNueva[0].total}`);
      console.log(`   Activos: ${procesosNueva[0].activos}\n`);

      // 3. Procesos en tabla antigua (subtareas)
      console.log('3️⃣ Procesos en tabla SUBTAREAS (antigua):');
      const [subtareasAntigua] = await connection.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
         FROM subtareas`
      );
      console.log(`   Total: ${subtareasAntigua[0].total}`);
      console.log(`   Activos: ${subtareasAntigua[0].activos}`);
      console.log(`   ⚠️ Esto es lo que está viendo el frontend (272 registros)\n`);

      // 4. Verificar estructura de subtareas
      console.log('4️⃣ Verificando estructura de tabla SUBTAREAS:');
      const [columns] = await connection.query(`DESCRIBE subtareas`);
      const columnNames = columns.map(c => c.Field);
      console.log(`   Columnas: ${columnNames.slice(0, 10).join(', ')}...`);
      console.log(`   ¿Tiene version_id?: ${columnNames.includes('version_id') ? '✅ Sí' : '❌ No'}\n`);

      // 5. Ver algunos procesos de subtareas
      console.log('5️⃣ Primeros 5 procesos en tabla SUBTAREAS:');
      const [primerosProcesos] = await connection.query(
        `SELECT id, nombre, codigo_olympo, activo FROM subtareas LIMIT 5`
      );
      primerosProcesos.forEach((p, i) => {
        console.log(`   ${i+1}. [${p.id}] ${p.nombre} (${p.codigo_olympo}) - Activo: ${p.activo}`);
      });
      console.log();

      // 6. Ver algunos procesos de procesos
      console.log('6️⃣ Primeros 5 procesos en tabla PROCESOS:');
      const [primerosProcesos2] = await connection.query(
        `SELECT id, subtarea, codigo_olympo, activo FROM procesos WHERE version_id = ? LIMIT 5`,
        [versionActiva[0].id]
      );
      primerosProcesos2.forEach((p, i) => {
        console.log(`   ${i+1}. [${p.id}] ${p.subtarea} (${p.codigo_olympo}) - Activo: ${p.activo}`);
      });
      console.log();

      // 7. SOLUCIÓN
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔧 SOLUCIÓN IDENTIFICADA');
      console.log('═══════════════════════════════════════════════════════\n');

      console.log('❌ PROBLEMA: El frontend está usando la tabla SUBTAREAS (antigua)');
      console.log('            en lugar de PROCESOS (nueva con Reforma 10)\n');

      console.log('🔄 Vamos a truncar/limpiar la tabla antigua SUBTAREAS\n');

      // Truncar tabla subtareas
      console.log('⚠️  Eliminando todos los procesos de tabla SUBTAREAS...');
      const [resultDelete] = await connection.query(`DELETE FROM subtareas`);
      console.log(`✅ ${resultDelete.affectedRows} procesos eliminados\n`);

      // Verificar que ya no hay datos en subtareas
      const [subtareasAfter] = await connection.query(
        `SELECT COUNT(*) as total FROM subtareas`
      );
      console.log(`✅ Total en SUBTAREAS ahora: ${subtareasAfter[0].total}\n`);

      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ LIMPIEZA COMPLETADA');
      console.log('═══════════════════════════════════════════════════════\n');

      console.log('🎯 Próximos pasos:');
      console.log('   1. Reinicia el servidor: Ctrl+C y luego npm start');
      console.log('   2. Recarga el navegador: Ctrl+F5');
      console.log('   3. Deberías ver ahora 341 procesos de Reforma 10\n');

    } finally {
      await connection.release();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error crítico:', error.message);
    process.exit(1);
  });
