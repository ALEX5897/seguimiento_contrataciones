import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificar() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('✓ Verificando sincronización de seguimiento...\n');

    // 1. Contar procesos con seguimiento en Reforma Base
    const [baseWithFollowUp] = await connection.query(`
      SELECT COUNT(DISTINCT p.id) as procesos_con_seguimiento
      FROM procesos p
      JOIN subtareas_versiones sv ON sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
      JOIN seguimiento_etapas se ON se.subtarea_id = sv.subtarea_id_original
      WHERE p.version_id = 1
    `);

    console.log(`📊 Reforma Base (v1 = Reforma Base):`);
    console.log(`   Procesos con seguimiento vinculado: ${baseWithFollowUp[0].procesos_con_seguimiento}\n`);

    // 2. Contar procesos con seguimiento en Reforma 8
    const [ref8WithFollowUp] = await connection.query(`
      SELECT COUNT(DISTINCT p.id) as procesos_con_seguimiento
      FROM procesos p
      JOIN subtareas_versiones sv ON sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
      JOIN seguimiento_etapas se ON se.subtarea_id = sv.subtarea_id_original
      WHERE p.version_id = 12
    `);

    console.log(`📊 Reforma 8 (v12 = Reforma 8):`);
    console.log(`   Procesos con seguimiento vinculado: ${ref8WithFollowUp[0].procesos_con_seguimiento}\n`);

    // 3. Ejemplos concretos
    console.log(`🔹 Ejemplo de Procesos con Seguimiento:\n`);
    const [ejemplos] = await connection.query(`
      SELECT
        p.id as proceso_id, p.codigo_olympo, p.version_id as version,
        COUNT(DISTINCT se.id) as registros_seguimiento
      FROM procesos p
      JOIN subtareas_versiones sv ON sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
      JOIN seguimiento_etapas se ON se.subtarea_id = sv.subtarea_id_original
      WHERE p.version_id IN (1, 12)
      GROUP BY p.id, p.codigo_olympo, p.version_id
      ORDER BY p.version_id, p.codigo_olympo
      LIMIT 6
    `);

    ejemplos.forEach(row => {
      const version = row.version === 1 ? 'Reforma Base' : 'Reforma 8';
      console.log(`${row.codigo_olympo} (${version})`);
      console.log(`  ID: ${row.proceso_id}, Seguimientos: ${row.registros_seguimiento}\n`);
    });

    // 4. Resumen de disponibilidad
    console.log(`\n✓ Resumen de disponibilidad de seguimiento:\n`);
    const [summary] = await connection.query(`
      SELECT
        p.version_id,
        v.numero_reforma,
        v.nombre,
        COUNT(DISTINCT p.id) as total_procesos,
        COUNT(DISTINCT CASE
          WHEN EXISTS (
            SELECT 1 FROM subtareas_versiones sv
            JOIN seguimiento_etapas se ON se.subtarea_id = sv.subtarea_id_original
            WHERE sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
          ) THEN p.id
        END) as con_seguimiento
      FROM procesos p
      JOIN versiones v ON v.id = p.version_id
      WHERE p.version_id IN (1, 12)
      GROUP BY p.version_id
    `);

    summary.forEach(row => {
      const porcentaje = row.total_procesos > 0
        ? ((row.con_seguimiento / row.total_procesos) * 100).toFixed(1)
        : '0.0';
      console.log(`Reforma ${row.numero_reforma}: ${row.con_seguimiento}/${row.total_procesos} procesos con seguimiento (${porcentaje}%)`);
    });

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

verificar();
