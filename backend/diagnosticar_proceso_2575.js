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

    console.log('🔍 Diagnosticando proceso 2575...\n');

    // Ver qué es el proceso 2575
    const [proceso] = await connection.query(`
      SELECT id, codigo_olympo, subtarea, subtarea_id_original, version_id
      FROM procesos WHERE id = 2575
    `);

    if (proceso.length === 0) {
      console.log('❌ Proceso 2575 no encontrado');
      await connection.end();
      process.exit(0);
    }

    const p = proceso[0];
    console.log(`📌 Proceso ID 2575:`);
    console.log(`   Código: ${p.codigo_olympo}`);
    console.log(`   Subtarea: ${p.subtarea}`);
    console.log(`   subtarea_id_original: ${p.subtarea_id_original || 'NULL'}`);
    console.log(`   version_id: ${p.version_id}\n`);

    // Si tiene código olympo, buscar subtarea_versiones
    if (p.codigo_olympo) {
      const [sv] = await connection.query(`
        SELECT id, subtarea_id_original
        FROM subtareas_versiones
        WHERE codigo_olympo = ? AND version_id = ?
      `, [p.codigo_olympo, p.version_id]);

      if (sv.length > 0) {
        console.log(`📋 subtareas_versiones encontrada:`);
        console.log(`   ID: ${sv[0].id}`);
        console.log(`   subtarea_id_original: ${sv[0].subtarea_id_original}\n`);

        // Verificar si hay etapas
        const [etapas] = await connection.query(`
          SELECT COUNT(*) as count FROM subtareas_etapas
          WHERE subtarea_id = ?
        `, [sv[0].subtarea_id_original]);

        console.log(`📊 Etapas vinculadas: ${etapas[0].count}`);
      } else {
        console.log(`⚠️  No se encontró subtareas_versiones para este código`);
      }
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
