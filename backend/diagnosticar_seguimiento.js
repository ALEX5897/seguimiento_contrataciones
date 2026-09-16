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

    console.log('🔍 Diagnosticando estructura de seguimiento...\n');

    // 1. Mostrar tablas disponibles
    const [tables] = await connection.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);

    console.log('📋 Tablas en la BD:');
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    // 2. Ver estructura de procesos
    console.log('\n🔹 Estructura de procesos:');
    const [procColumns] = await connection.query('SHOW COLUMNS FROM procesos');
    procColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    // 3. Verificar procesos en Reforma Base
    console.log('\n📊 Reforma Base (ID 1):');
    const [baseSummary] = await connection.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN subtarea_id_original IS NOT NULL THEN 1 ELSE 0 END) as con_subtarea,
        SUM(CASE WHEN subtarea_id_original IS NULL THEN 1 ELSE 0 END) as sin_subtarea
      FROM procesos WHERE version_id = 1
    `);
    console.log(`   Total: ${baseSummary[0].total}`);
    console.log(`   Con subtarea_id_original: ${baseSummary[0].con_subtarea}`);
    console.log(`   Sin subtarea_id_original: ${baseSummary[0].sin_subtarea}`);

    // 4. Verificar Reforma 8
    console.log('\n📊 Reforma 8 (ID 12):');
    const [ref8Summary] = await connection.query(`
      SELECT COUNT(*) as total FROM procesos WHERE version_id = 12
    `);
    console.log(`   Total: ${ref8Summary[0].total}`);

    // 5. Ver si hay seguimiento_etapas
    console.log('\n🔹 Tabla seguimiento_etapas:');
    try {
      const [seguimientoColumns] = await connection.query('SHOW COLUMNS FROM seguimiento_etapas');
      seguimientoColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

      const [seguimientoCount] = await connection.query(`
        SELECT COUNT(*) as total FROM seguimiento_etapas
      `);
      console.log(`\n   Total registros: ${seguimientoCount[0].total}`);

      // Ver si hay seguimiento vinculado a procesos de Reforma Base
      const [baseFollowUp] = await connection.query(`
        SELECT COUNT(*) as count FROM seguimiento_etapas se
        WHERE se.subtarea_id IN (
          SELECT subtarea_id_original FROM procesos WHERE version_id = 1
        )
      `);
      console.log(`   Registros para procesos Reforma Base: ${baseFollowUp[0].count}`);
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }

    // 6. Ver un ejemplo de proceso en Reforma Base
    console.log('\n🔹 Ejemplo de proceso en Reforma Base:');
    const [ejemplo] = await connection.query(`
      SELECT id, codigo_olympo, subtarea_id_original FROM procesos
      WHERE version_id = 1 AND codigo_olympo IS NOT NULL
      LIMIT 1
    `);
    if (ejemplo.length > 0) {
      console.log(`   ID: ${ejemplo[0].id}`);
      console.log(`   Código: ${ejemplo[0].codigo_olympo}`);
      console.log(`   Subtarea ID: ${ejemplo[0].subtarea_id_original}`);
    }

    // 7. Buscar tablas relacionadas
    console.log('\n🔹 Tablas de seguimiento disponibles:');
    const [seguimientoTables] = await connection.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%seguimiento%'
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);

    if (seguimientoTables.length === 0) {
      console.log('   ❌ No hay tablas con "seguimiento" en el nombre');
    } else {
      seguimientoTables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
    }

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

diagnosticar();
