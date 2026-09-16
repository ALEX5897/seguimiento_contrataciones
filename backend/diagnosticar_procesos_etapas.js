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

    console.log('🔍 Diagnosticando procesos vs etapas en Reforma 8...\n');

    // 1. Ver qué usa getActividadesByVersion para buscar etapas
    console.log('🔹 Procesos en Reforma 8:\n');
    const [procesosRef8] = await connection.query(`
      SELECT p.id, p.codigo_olympo, p.subtarea_id_original, p.activo
      FROM procesos p
      WHERE p.version_id = 12 AND p.activo = 1
      LIMIT 5
    `);

    procesosRef8.forEach(row => {
      console.log(`Proceso ID ${row.id}: ${row.codigo_olympo}`);
      console.log(`  subtarea_id_original: ${row.subtarea_id_original || 'NULL'}`);
      console.log(`  Si busca etapas con ID ${row.id}: ???`);
      console.log(`  Si busca etapas con subtarea_id_original ${row.subtarea_id_original || row.id}: ???\n`);
    });

    // 2. Buscar la subtarea que corresponde a cada proceso por código
    console.log('🔹 Buscando subtarea por código olympo:\n');
    const [procesosConSubtarea] = await connection.query(`
      SELECT
        p.id as proceso_id,
        p.codigo_olympo,
        p.subtarea_id_original,
        sv.subtarea_id_original as sv_subtarea_original,
        s.id as subtarea_id,
        (SELECT COUNT(*) FROM subtareas_etapas WHERE subtarea_id = s.id) as etapas_count
      FROM procesos p
      LEFT JOIN subtareas_versiones sv ON sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
      LEFT JOIN subtareas s ON s.id = sv.subtarea_id_original
      WHERE p.version_id = 12 AND p.activo = 1
      LIMIT 5
    `);

    procesosConSubtarea.forEach(row => {
      console.log(`Proceso ID ${row.proceso_id}: ${row.codigo_olympo}`);
      console.log(`  subtarea_id_original en proceso: ${row.subtarea_id_original || 'NULL'}`);
      console.log(`  subtarea_id_original en subtareas_versiones: ${row.sv_subtarea_original || 'NULL'}`);
      console.log(`  ID de subtarea: ${row.subtarea_id || 'NULL'}`);
      console.log(`  Etapas vinculadas: ${row.etapas_count || 0}\n`);
    });

    // 3. Ver cuántos procesos en Reforma 8 tienen acceso a etapas
    const [conAccesoEtapas] = await connection.query(`
      SELECT COUNT(DISTINCT p.id) as procesos_con_etapas
      FROM procesos p
      JOIN subtareas_versiones sv ON sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
      JOIN subtareas s ON s.id = sv.subtarea_id_original
      JOIN subtareas_etapas se ON se.subtarea_id = s.id
      WHERE p.version_id = 12 AND p.activo = 1
    `);

    console.log(`\n📊 Procesos en Reforma 8 con acceso a etapas: ${conAccesoEtapas[0].procesos_con_etapas}`);

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

diagnosticar();
