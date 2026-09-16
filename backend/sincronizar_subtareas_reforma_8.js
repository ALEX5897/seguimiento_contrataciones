import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function sincronizar() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('🔄 Sincronizando subtareas_versiones: Reforma Base → Reforma 8...\n');

    // Obtener IDs de versiones
    const [versionesRes] = await connection.query(`
      SELECT id, numero_reforma, nombre FROM versiones
      WHERE numero_reforma IN (0, 8)
    `);

    const reformaBase = versionesRes.find(v => v.numero_reforma === 0);
    const reforma8 = versionesRes.find(v => v.numero_reforma === 8);

    console.log(`📌 Reforma Base: ID ${reformaBase.id}`);
    console.log(`📌 Reforma 8: ID ${reforma8.id}\n`);

    // Obtener subtareas_versiones en Reforma Base
    const [svBase] = await connection.query(`
      SELECT id, subtarea_id_original, codigo_olympo FROM subtareas_versiones
      WHERE version_id = ? AND codigo_olympo IS NOT NULL AND codigo_olympo != ''
      ORDER BY codigo_olympo
    `, [reformaBase.id]);

    console.log(`📋 Subtareas_versiones en Reforma Base: ${svBase.length}`);

    // Obtener subtareas_versiones en Reforma 8
    const [svRef8Existentes] = await connection.query(`
      SELECT codigo_olympo FROM subtareas_versiones
      WHERE version_id = ?
    `, [reforma8.id]);

    const codigosRef8 = new Set(svRef8Existentes.map(sv => sv.codigo_olympo));
    console.log(`📋 Subtareas_versiones en Reforma 8: ${svRef8Existentes.length}\n`);

    // Crear mapa de procesos Reforma 8 por código
    const [procesosRef8] = await connection.query(`
      SELECT codigo_olympo FROM procesos
      WHERE version_id = ? AND codigo_olympo IS NOT NULL
    `, [reforma8.id]);

    const codigosProcesosRef8 = new Set(procesosRef8.map(p => p.codigo_olympo));

    let creadas = 0;
    let sinEquivalente = 0;
    let yaExistente = 0;

    // Para cada subtarea en Reforma Base
    for (const sv of svBase) {
      // Verificar si ya existe en Reforma 8
      if (codigosRef8.has(sv.codigo_olympo)) {
        yaExistente++;
        continue;
      }

      // Verificar si hay un proceso equivalente en Reforma 8
      if (!codigosProcesosRef8.has(sv.codigo_olympo)) {
        sinEquivalente++;
        continue;
      }

      // Crear la subtarea_versiones en Reforma 8 basándose en la de Reforma Base
      try {
        const [result] = await connection.query(`
          INSERT INTO subtareas_versiones (
            version_id, subtarea_id_original, codigo_olympo, subtarea, direccion_encargada,
            responsable, responsable_id, fecha_inicio, fecha_fin, plazo_contrato,
            pac_no_pac, procedimiento_sugerido, presupuesto_2026_inicial, costo_2026,
            partida_presupuestaria, cuatrimestre, activo, proceso_en_riesgo,
            riesgo_comentario, observaciones, estado_carga, fecha_creacion, fecha_actualizacion
          ) SELECT
            ?, subtarea_id_original, codigo_olympo, subtarea, direccion_encargada,
            responsable, responsable_id, fecha_inicio, fecha_fin, plazo_contrato,
            pac_no_pac, procedimiento_sugerido, presupuesto_2026_inicial, costo_2026,
            partida_presupuestaria, cuatrimestre, activo, proceso_en_riesgo,
            riesgo_comentario, observaciones, estado_carga, NOW(), NOW()
          FROM subtareas_versiones
          WHERE id = ?
        `, [reforma8.id, sv.id]);

        creadas++;
        if (creadas % 10 === 0 || creadas === 1) {
          console.log(`✅ ${sv.codigo_olympo}: Creada en Reforma 8 (${creadas}/${svBase.length - yaExistente - sinEquivalente})`);
        }
      } catch (error) {
        console.log(`❌ ${sv.codigo_olympo}: Error - ${error.message}`);
      }
    }

    console.log(`\n📊 RESUMEN:\n`);
    console.log(`   ✅ Subtareas_versiones creadas: ${creadas}`);
    console.log(`   📋 Subtareas Base procesadas: ${svBase.length}`);
    console.log(`   ⏭️  Ya existentes en Reforma 8: ${yaExistente}`);
    console.log(`   ⚠️  Sin proceso equivalente: ${sinEquivalente}`);

    // Verificar resultado
    console.log(`\n✓ Sincronización completada`);

    const [finalCount] = await connection.query(`
      SELECT COUNT(*) as total FROM subtareas_versiones WHERE version_id = ?
    `, [reforma8.id]);

    console.log(`  Total subtareas_versiones en Reforma 8 ahora: ${finalCount[0].total}`);

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

sincronizar();
