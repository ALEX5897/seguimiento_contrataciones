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

    console.log('🔍 Diagnosticando estructura de subtareas...\n');

    // 1. Ver estructura de subtareas
    console.log('🔹 Estructura de tabla subtareas:');
    const [subtareasColumns] = await connection.query('SHOW COLUMNS FROM subtareas');
    subtareasColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    // 2. Ver estructura de subtareas_etapas
    console.log('\n🔹 Estructura de tabla subtareas_etapas:');
    const [subtareasEtapasColumns] = await connection.query('SHOW COLUMNS FROM subtareas_etapas');
    subtareasEtapasColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    // 3. Ver estructura de subtareas_versiones
    console.log('\n🔹 Estructura de tabla subtareas_versiones:');
    const [subtareasVersionesColumns] = await connection.query('SHOW COLUMNS FROM subtareas_versiones');
    subtareasVersionesColumns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    // 4. Contar subtareas por versión
    console.log('\n📊 Subtareas por versión:');
    const [subtareasVersiones] = await connection.query(`
      SELECT version_id, COUNT(*) as total FROM subtareas_versiones
      GROUP BY version_id
      ORDER BY version_id
    `);
    subtareasVersiones.forEach(row => {
      const version = row.version_id === 1 ? '(Reforma Base)' : row.version_id === 12 ? '(Reforma 8)' : '';
      console.log(`  - Version ${row.version_id} ${version}: ${row.total}`);
    });

    // 5. Ver ejemplo de subtarea y su seguimiento
    console.log('\n🔹 Ejemplo de subtarea y seguimiento:');
    const [ejemploSubtarea] = await connection.query(`
      SELECT s.id, s.nombre, sv.version_id
      FROM subtareas s
      JOIN subtareas_versiones sv ON sv.subtarea_id = s.id
      WHERE sv.version_id = 1
      LIMIT 1
    `);

    if (ejemploSubtarea.length > 0) {
      const subtareaId = ejemploSubtarea[0].id;
      console.log(`   Subtarea: ${ejemploSubtarea[0].nombre} (ID: ${subtareaId})`);

      // Ver etapas asociadas
      const [etapas] = await connection.query(`
        SELECT se.id, se.etapa_id, se.estado FROM subtareas_etapas se
        WHERE se.subtarea_id = ?
        LIMIT 3
      `, [subtareaId]);

      console.log(`   Etapas: ${etapas.length}`);
      etapas.forEach((e, idx) => {
        console.log(`     ${idx + 1}. Etapa ${e.etapa_id} - Estado: ${e.estado}`);
      });

      // Ver seguimiento
      const [seguimientos] = await connection.query(`
        SELECT se.id, se.estado, se.fecha_real FROM seguimiento_etapas se
        WHERE se.subtarea_id = ?
        LIMIT 3
      `, [subtareaId]);

      console.log(`   Seguimientos: ${seguimientos.length}`);
      seguimientos.forEach((s, idx) => {
        console.log(`     ${idx + 1}. Estado: ${s.estado}, Fecha: ${s.fecha_real}`);
      });
    }

    // 6. Buscar si hay procesos vinculados a subtareas
    console.log('\n🔍 Buscando vinculación procesos-subtareas:');
    const [vinculacion] = await connection.query(`
      SELECT DISTINCT p.version_id, COUNT(DISTINCT p.id) as procesos
      FROM procesos p
      JOIN subtareas_versiones sv ON sv.version_id = p.version_id
      WHERE p.subtarea = sv.subtarea_id
      GROUP BY p.version_id
    `);

    if (vinculacion.length > 0) {
      console.log('   Procesos vinculados por coincidencia de subtarea:');
      vinculacion.forEach(row => {
        const version = row.version_id === 1 ? '(Reforma Base)' : row.version_id === 12 ? '(Reforma 8)' : '';
        console.log(`     - Version ${row.version_id} ${version}: ${row.procesos}`);
      });
    } else {
      console.log('   No se encontró vinculación directa');
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
