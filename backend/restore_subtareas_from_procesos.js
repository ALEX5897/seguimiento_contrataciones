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
  console.log('🔄 Restaurando datos de Reforma 10 en tabla SUBTAREAS...\n');

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
      // 1. Obtener procesos de la tabla PROCESOS (Reforma 10 - ID 14)
      console.log('1️⃣ Obteniendo procesos de Reforma 10...');
      const [procesosReforma10] = await connection.query(`
        SELECT
          id, codigo_olympo, subtarea as nombre, direccion_encargada,
          responsable, responsable_id, presupuesto_2026_inicial,
          costo_2026, pac_no_pac, partida_presupuestaria,
          plazo_contrato, procedimiento_sugerido,
          tipo_contratacion, estado, observaciones,
          fuente_financiamiento, activo
        FROM procesos
        WHERE version_id = 14 AND activo = 1
        ORDER BY codigo_olympo
      `);

      console.log(`✅ Se obtuvieron ${procesosReforma10.length} procesos\n`);

      // 2. Limpiar tabla subtareas
      console.log('2️⃣ Limpiando tabla SUBTAREAS...');
      await connection.query('SET FOREIGN_KEY_CHECKS=0');
      await connection.query('DELETE FROM subtareas');
      await connection.query('SET FOREIGN_KEY_CHECKS=1');
      console.log('✅ Tabla limpia\n');

      // 3. Insertar procesos en tabla subtareas
      console.log('3️⃣ Insertando procesos en tabla SUBTAREAS...');
      let inseridos = 0;

      for (const proceso of procesosReforma10) {
        try {
          await connection.query(`
            INSERT INTO subtareas (
              codigo_olympo, nombre, direccion_encargada, responsable,
              responsable_id, presupuesto_2026_inicial, costo_2026,
              pac_no_pac, partida_presupuestaria,
              plazo_contrato, procedimiento_sugerido, tipo_contratacion,
              estado, observaciones, fuente_financiamiento, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            proceso.codigo_olympo,
            proceso.nombre,
            proceso.direccion_encargada,
            proceso.responsable,
            proceso.responsable_id,
            proceso.presupuesto_2026_inicial,
            proceso.costo_2026,
            proceso.pac_no_pac,
            proceso.partida_presupuestaria,
            proceso.plazo_contrato,
            proceso.procedimiento_sugerido,
            proceso.tipo_contratacion,
            proceso.estado,
            proceso.observaciones,
            proceso.fuente_financiamiento,
            proceso.activo
          ]);
          inseridos++;
        } catch (error) {
          console.error(`  ❌ Error insertando ${proceso.codigo_olympo}:`, error.message);
        }
      }

      console.log(`✅ ${inseridos} procesos insertados\n`);

      // 4. Verificar resultados
      console.log('4️⃣ Verificando integridad de datos...');
      const [subtareasCount] = await connection.query(
        'SELECT COUNT(*) as total, SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos FROM subtareas'
      );

      console.log(`   Total en SUBTAREAS: ${subtareasCount[0].total}`);
      console.log(`   Activos: ${subtareasCount[0].activos}\n`);

      // 5. Mostrar primeros 5
      console.log('5️⃣ Primeros 5 procesos en SUBTAREAS:');
      const [primeros] = await connection.query(
        'SELECT id, codigo_olympo, nombre FROM subtareas LIMIT 5'
      );

      primeros.forEach((p, i) => {
        console.log(`   ${i+1}. [${p.id}] ${p.codigo_olympo} - ${p.nombre}`);
      });

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ RESTAURACIÓN COMPLETADA');
      console.log('═══════════════════════════════════════════════════════\n');

      console.log('🎯 Próximos pasos:');
      console.log('   1. Reinicia el servidor: Ctrl+C y luego npm start');
      console.log('   2. Recarga el navegador: Ctrl+F5');
      console.log('   3. Deberías ver 341 procesos de Reforma 10\n');

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
