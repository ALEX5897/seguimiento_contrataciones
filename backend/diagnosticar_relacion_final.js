import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function diagnosticar() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('🔍 Diagnosticando relación real...\n');

    // Ver cómo se vinculan seguimiento_etapas
    console.log('🔹 Ejemplo de seguimiento_etapas:\n');
    const [seguimientoEjemplo] = await connection.query(`
      SELECT se.id, se.subtarea_id, se.etapa_id, se.estado,
             s.id as s_id, s.codigo_olympo, s.nombre
      FROM seguimiento_etapas se
      JOIN subtareas s ON s.id = se.subtarea_id
      WHERE se.subtarea_id <= 10
      LIMIT 5
    `);

    seguimientoEjemplo.forEach(row => {
      console.log(`Seguimiento ID ${row.id}:`);
      console.log(`  → Vinculado a Subtarea ID ${row.subtarea_id}`);
      console.log(`  → Subtarea: ${row.nombre} (${row.codigo_olympo})\n`);
    });

    // Verificar qué subtareas están en Reforma Base
    console.log('\n🔹 Subtareas en tabla subtareas vs versiones:\n');
    const [subtareasReal] = await connection.query(`
      SELECT COUNT(DISTINCT s.id) as total_subtareas,
             COUNT(DISTINCT sv.id) as sv_reforma_base,
             COUNT(DISTINCT sv2.id) as sv_reforma_8
      FROM subtareas s
      LEFT JOIN subtareas_versiones sv ON sv.subtarea_id_original = s.id AND sv.version_id = 1
      LEFT JOIN subtareas_versiones sv2 ON sv2.subtarea_id_original = s.id AND sv2.version_id = 12
    `);

    console.log(`Total subtareas en tabla: ${subtareasReal[0].total_subtareas}`);
    console.log(`Subtareas_versiones en Reforma Base: ${subtareasReal[0].sv_reforma_base}`);
    console.log(`Subtareas_versiones en Reforma 8: ${subtareasReal[0].sv_reforma_8}`);

    // Ver un ejemplo
    console.log('\n🔹 Ejemplo de relación:\n');
    const [ejemplo] = await connection.query(`
      SELECT
        s.id, s.codigo_olympo, s.nombre,
        sv1.id as sv1_id, sv1.version_id as v1,
        sv2.id as sv2_id, sv2.version_id as v2,
        COUNT(se.id) as seguimientos
      FROM subtareas s
      LEFT JOIN subtareas_versiones sv1 ON sv1.subtarea_id_original = s.id AND sv1.version_id = 1
      LEFT JOIN subtareas_versiones sv2 ON sv2.subtarea_id_original = s.id AND sv2.version_id = 12
      LEFT JOIN seguimiento_etapas se ON se.subtarea_id = s.id
      GROUP BY s.id
      HAVING COUNT(se.id) > 0
      LIMIT 3
    `);

    ejemplo.forEach(row => {
      console.log(`Subtarea ID ${row.id}: ${row.nombre} (${row.codigo_olympo})`);
      console.log(`  Seguimientos: ${row.seguimientos}`);
      console.log(`  En Reforma Base: ${row.sv1_id ? 'SÍ (SV ID ' + row.sv1_id + ')' : 'NO'}`);
      console.log(`  En Reforma 8: ${row.sv2_id ? 'SÍ (SV ID ' + row.sv2_id + ')' : 'NO'}\n`);
    });

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

diagnosticar();
