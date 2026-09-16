import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, './.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error) {
  console.warn('Advertencia: .env no encontrado en', ENV_PATH);
}

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('🔍 Diagnóstico del sistema de versiones...\n');

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
      console.log('📋 Verificando versión activa en BD...');
      const [versionActual] = await connection.query(
        `SELECT id, anio, numero_reforma, nombre, estado, activa FROM versiones WHERE activa = 1`
      );

      if (versionActual.length === 0) {
        console.log('❌ NO HAY VERSIÓN ACTIVA SETEADA EN LA BD\n');
      } else {
        console.log(`✅ Versión activa encontrada:`);
        console.log(`   ID: ${versionActual[0].id}`);
        console.log(`   Nombre: ${versionActual[0].nombre}`);
        console.log(`   Reforma: ${versionActual[0].numero_reforma}`);
        console.log(`   Estado: ${versionActual[0].estado}\n`);
      }

      // 2. Contar procesos en tabla procesos (nueva) vs subtareas (antigua)
      console.log('📊 Conteo de procesos en bases de datos...');
      const [procesosNueva] = await connection.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
         FROM procesos`
      );
      console.log(`   Tabla procesos (nueva):`);
      console.log(`     - Total: ${procesosNueva[0].total}`);
      console.log(`     - Activos: ${procesosNueva[0].activos}\n`);

      const [subtareasAntigua] = await connection.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
         FROM subtareas`
      );
      console.log(`   Tabla subtareas (antigua):`);
      console.log(`     - Total: ${subtareasAntigua[0].total}`);
      console.log(`     - Activos: ${subtareasAntigua[0].activos}\n`);

      // 3. Verificar procesos por versión
      console.log('📋 Procesos por versión en tabla procesos:');
      const [procesosPorVersion] = await connection.query(
        `SELECT v.numero_reforma, v.nombre, v.activa,
                COUNT(p.id) as total,
                SUM(CASE WHEN p.activo = 1 THEN 1 ELSE 0 END) as activos
         FROM versiones v
         LEFT JOIN procesos p ON v.id = p.version_id
         GROUP BY v.id
         ORDER BY v.numero_reforma`
      );

      procesosPorVersion.forEach((row) => {
        const estado = row.activa ? '✅' : '❌';
        console.log(`   ${estado} Reforma ${row.numero_reforma} - ${row.nombre}`);
        console.log(`      Total: ${row.total} | Activos: ${row.activos}`);
      });
      console.log();

      // 4. Verificar si tabla subtareas tiene datos antiguos
      console.log('📋 Verificando tabla subtareas antigua...');
      const [subtareasActivosAntigua] = await connection.query(
        `SELECT COUNT(*) as total FROM subtareas WHERE activo = 1`
      );
      console.log(`   Procesos activos en tabla antigua: ${subtareasActivosAntigua[0].total}\n`);

      // 5. Proponer solución
      console.log('═══════════════════════════════════════════════════════');
      console.log('💡 DIAGNÓSTICO Y SOLUCIÓN');
      console.log('═══════════════════════════════════════════════════════\n');

      if (versionActual.length === 0) {
        console.log('❌ PROBLEMA: No hay versión activa');
        console.log('✅ SOLUCIÓN: Vamos a activar Reforma 10 ahora...\n');

        // Activar Reforma 10
        const [reforma10] = await connection.query(
          `UPDATE versiones SET activa = 1 WHERE numero_reforma = 10 AND anio = 2026`
        );

        const [reforma10Check] = await connection.query(
          `SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026 AND activa = 1`
        );

        if (reforma10Check.length > 0) {
          console.log('✅ Reforma 10 activada correctamente en BD\n');
        }
      }

      // 6. Desactivar procesos antiguos
      console.log('🔴 Desactivando todos los procesos en tabla antigua...');
      const [resultDesactivar] = await connection.query(
        `UPDATE subtareas SET activo = 0`
      );
      console.log(`✅ ${resultDesactivar.affectedRows} procesos desactivados en tabla antigua\n`);

      // 7. Verificación final
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ VERIFICACIÓN FINAL');
      console.log('═══════════════════════════════════════════════════════\n');

      const [versionActivaFinal] = await connection.query(
        `SELECT id, numero_reforma, nombre FROM versiones WHERE activa = 1`
      );

      if (versionActivaFinal.length > 0) {
        console.log(`✅ Versión activa: ${versionActivaFinal[0].nombre}`);
      }

      const [procesosActivosFinal] = await connection.query(
        `SELECT COUNT(*) as total FROM procesos WHERE activo = 1 AND version_id =
         (SELECT id FROM versiones WHERE activa = 1)`
      );

      console.log(`✅ Procesos activos en versión activa: ${procesosActivosFinal[0].total}`);

      const [procesosAntiguosActivos] = await connection.query(
        `SELECT COUNT(*) as total FROM subtareas WHERE activo = 1`
      );
      console.log(`✅ Procesos activos en tabla antigua: ${procesosAntiguosActivos[0].total}`);

      console.log('\n🎉 El sistema debería mostrar ahora solo los procesos de Reforma 10');
      console.log('   Si aún ves datos antiguos, recarga la página en el navegador (Ctrl+F5)\n');

    } finally {
      await connection.release();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles:', error);
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
