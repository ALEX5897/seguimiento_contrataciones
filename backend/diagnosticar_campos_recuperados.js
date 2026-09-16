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

    console.log('🔍 Verificando campos recuperados en tabla PROCESOS (Reforma 8 v12)...\n');

    // Obtener la version_id de Reforma 8
    const [versionResult] = await connection.query(
      "SELECT id FROM versiones WHERE numero_reforma = 8 LIMIT 1"
    );

    if (versionResult.length === 0) {
      console.log('❌ No se encontró Reforma 8');
      await connection.end();
      process.exit(0);
    }

    const versionId = versionResult[0].id;
    console.log(`✓ Reforma 8 tiene version_id: ${versionId}\n`);

    // Verificar campos en tabla procesos
    const [procesos] = await connection.query(
      `SELECT id, subtarea, codigo_olympo, codigo_unico_proceso,
              fuente_financiamiento, tipo_contratacion, procedimiento_sugerido,
              estado, activo, presupuesto_2026_inicial, partida_presupuestaria
       FROM procesos
       WHERE version_id = ? AND activo = 1
       LIMIT 1`,
      [versionId]
    );

    if (procesos.length === 0) {
      console.log('❌ No hay procesos activos en Reforma 8');
      await connection.end();
      process.exit(0);
    }

    const proceso = procesos[0];
    console.log('✅ Proceso de ejemplo encontrado:\n');
    console.log(`  ID: ${proceso.id}`);
    console.log(`  Nombre: ${proceso.subtarea}`);
    console.log(`  Código Olympo: ${proceso.codigo_olympo}`);
    console.log(`  Código Único: ${proceso.codigo_unico_proceso}`);
    console.log(`  Presupuesto: ${proceso.presupuesto_2026_inicial}`);
    console.log(`  Partida: ${proceso.partida_presupuestaria}`);
    console.log(`  Estado: ${proceso.estado}`);
    console.log(`  Activo: ${proceso.activo}`);
    console.log(`\n🔍 Campos Financiamiento y Contratación:`);
    console.log(`  Fuente Financiamiento: ${proceso.fuente_financiamiento || '(VACÍO)'}`);
    console.log(`  Tipo Contratación: ${proceso.tipo_contratacion || '(VACÍO)'}`);
    console.log(`  Procedimiento Sugerido: ${proceso.procedimiento_sugerido || '(VACÍO)'}`);

    // Contar cuántos procesos tienen estos campos vacíos
    const [countEmpty] = await connection.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN fuente_financiamiento IS NULL OR fuente_financiamiento = '' THEN 1 ELSE 0 END) as sin_fuente,
        SUM(CASE WHEN tipo_contratacion IS NULL OR tipo_contratacion = '' THEN 1 ELSE 0 END) as sin_tipo,
        SUM(CASE WHEN procedimiento_sugerido IS NULL OR procedimiento_sugerido = '' THEN 1 ELSE 0 END) as sin_procedimiento
       FROM procesos
       WHERE version_id = ? AND activo = 1`,
      [versionId]
    );

    const stats = countEmpty[0];
    console.log(`\n📊 Estadísticas de Campos (${stats.total} procesos activos):`);
    console.log(`  Con Fuente Financiamiento: ${stats.total - stats.sin_fuente} (${stats.sin_fuente} vacíos)`);
    console.log(`  Con Tipo Contratación: ${stats.total - stats.sin_tipo} (${stats.sin_tipo} vacíos)`);
    console.log(`  Con Procedimiento Sugerido: ${stats.total - stats.sin_procedimiento} (${stats.sin_procedimiento} vacíos)`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

diagnosticar();
