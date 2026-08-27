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

    console.log('🔍 Diagnosticando relación subtareas-etapas...\n');

    // 1. Ver estructura de subtareas_etapas
    console.log('🔹 Tabla subtareas_etapas:');
    const [seColumns] = await connection.query('SHOW COLUMNS FROM subtareas_etapas');
    seColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    // 2. Contar registros en subtareas_etapas
    const [seCount] = await connection.query(`
      SELECT COUNT(*) as total FROM subtareas_etapas
    `);
    console.log(`\n  Total registros: ${seCount[0].total}\n`);

    // 3. Ver ejemplo de subtarea con etapas
    console.log('🔹 Ejemplo de subtarea con etapas:\n');
    const [ejemplo] = await connection.query(`
      SELECT
        s.id, s.codigo_olympo, s.nombre,
        COUNT(se.id) as etapas_count
      FROM subtareas s
      LEFT JOIN subtareas_etapas se ON se.subtarea_id = s.id
      GROUP BY s.id
      HAVING etapas_count > 0
      ORDER BY etapas_count DESC
      LIMIT 3
    `);

    ejemplo.forEach(row => {
      console.log(`Subtarea ID ${row.id}: ${row.nombre} (${row.codigo_olympo})`);
      console.log(`  Etapas vinculadas: ${row.etapas_count}`);
    });

    // 4. Verificar para una subtarea específica con seguimiento
    console.log('\n🔹 Subtarea específica con seguimiento:\n');
    const [especifica] = await connection.query(`
      SELECT
        s.id, s.codigo_olympo,
        (SELECT COUNT(*) FROM subtareas_etapas WHERE subtarea_id = s.id) as etapas_count,
        (SELECT COUNT(*) FROM seguimiento_etapas WHERE subtarea_id = s.id) as seguimientos_count
      FROM subtareas s
      WHERE EXISTS (SELECT 1 FROM seguimiento_etapas WHERE subtarea_id = s.id)
      ORDER BY seguimientos_count DESC
      LIMIT 3
    `);

    especifica.forEach(row => {
      console.log(`Subtarea ID ${row.id} (${row.codigo_olympo})`);
      console.log(`  Etapas en subtareas_etapas: ${row.etapas_count}`);
      console.log(`  Seguimientos en seguimiento_etapas: ${row.seguimientos_count}\n`);
    });

    // 5. Ver si hay un mismatch
    console.log('🔹 Análisis: Subtareas con seguimiento pero sin etapas:\n');
    const [mismatch] = await connection.query(`
      SELECT COUNT(*) as total FROM subtareas s
      WHERE EXISTS (SELECT 1 FROM seguimiento_etapas WHERE subtarea_id = s.id)
      AND NOT EXISTS (SELECT 1 FROM subtareas_etapas WHERE subtarea_id = s.id)
    `);

    console.log(`  Subtareas sin etapas pero con seguimiento: ${mismatch[0].total}`);

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

diagnosticar();
