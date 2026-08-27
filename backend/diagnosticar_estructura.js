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

    console.log('🔍 Diagnosticando relación procesos-seguimiento...\n');

    // 1. Contar procesos vs subtareas_versiones
    console.log('📊 Procesos y Subtareas por Versión:\n');

    const [versionComparison] = await connection.query(`
      SELECT
        v.id,
        v.numero_reforma,
        v.nombre,
        COUNT(DISTINCT p.id) as procesos,
        COUNT(DISTINCT sv.id) as subtareas_version,
        COUNT(DISTINCT se.id) as registros_seguimiento
      FROM versiones v
      LEFT JOIN procesos p ON p.version_id = v.id
      LEFT JOIN subtareas_versiones sv ON sv.version_id = v.id
      LEFT JOIN seguimiento_etapas se ON se.subtarea_id = sv.id
      WHERE v.numero_reforma IN (0, 8)
      GROUP BY v.id, v.numero_reforma, v.nombre
      ORDER BY v.numero_reforma
    `);

    versionComparison.forEach(row => {
      console.log(`Reforma ${row.numero_reforma} (ID ${row.id}): ${row.nombre}`);
      console.log(`  Procesos: ${row.procesos}`);
      console.log(`  Subtareas_versiones: ${row.subtareas_version}`);
      console.log(`  Seguimientos: ${row.registros_seguimiento}\n`);
    });

    // 2. Ver ejemplo concreto
    console.log('🔹 Ejemplo - Proceso Base vinculado a Subtarea_versiones:\n');
    const [ejemplo] = await connection.query(`
      SELECT
        p.id as proceso_id,
        p.codigo_olympo,
        p.subtarea,
        sv.id as sv_id,
        sv.codigo_olympo as sv_codigo,
        COUNT(DISTINCT se.id) as seguimientos_count
      FROM procesos p
      LEFT JOIN subtareas_versiones sv ON sv.codigo_olympo = p.codigo_olympo AND sv.version_id = p.version_id
      LEFT JOIN seguimiento_etapas se ON se.subtarea_id = sv.id
      WHERE p.version_id = 1 AND p.codigo_olympo IS NOT NULL
      GROUP BY p.id, p.codigo_olympo, sv.id
      LIMIT 5
    `);

    if (ejemplo.length > 0) {
      console.log('Procesos encontrados:');
      ejemplo.forEach(row => {
        console.log(`  Proceso ID: ${row.proceso_id}, Código: ${row.codigo_olympo}`);
        console.log(`    -> Subtarea_versiones ID: ${row.sv_id}, Código: ${row.sv_codigo}`);
        console.log(`    -> Seguimientos: ${row.seguimientos_count}\n`);
      });
    }

    // 3. Comparar códigos
    console.log('\n🔹 Comparación de códigos Reforma Base:\n');
    const [codigoComparison] = await connection.query(`
      SELECT
        COUNT(DISTINCT p.codigo_olympo) as procesos_codigos,
        COUNT(DISTINCT sv.codigo_olympo) as sv_codigos,
        COUNT(DISTINCT CASE WHEN p.codigo_olympo = sv.codigo_olympo THEN p.codigo_olympo END) as coinciden
      FROM procesos p
      LEFT JOIN subtareas_versiones sv ON sv.version_id = p.version_id
      WHERE p.version_id = 1 AND p.codigo_olympo IS NOT NULL
    `);

    console.log(`Procesos con código: ${codigoComparison[0].procesos_codigos}`);
    console.log(`Subtareas_versiones con código: ${codigoComparison[0].sv_codigos}`);
    console.log(`Códigos coincidentes: ${codigoComparison[0].coinciden}`);

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

diagnosticar();
