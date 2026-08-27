import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function copiarSeguimiento() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('🔄 Iniciando copia de seguimiento desde Reforma Base a Reforma 8...\n');

    // Obtener IDs de versiones
    const [versionesRes] = await connection.query(`
      SELECT id, numero_reforma, nombre FROM versiones
      WHERE numero_reforma IN (0, 8)
      ORDER BY numero_reforma ASC
    `);

    const reformaBase = versionesRes.find(v => v.numero_reforma === 0);
    const reforma8 = versionesRes.find(v => v.numero_reforma === 8);

    if (!reformaBase || !reforma8) {
      console.log('❌ Error: No se encontraron Reforma Base o Reforma 8');
      await connection.end();
      process.exit(1);
    }

    console.log(`📌 Reforma Base: ID ${reformaBase.id} (${reformaBase.nombre})`);
    console.log(`📌 Reforma 8: ID ${reforma8.id} (${reforma8.nombre})\n`);

    // Paso 1: Obtener subtareas_versiones de Reforma Base que tengan seguimiento
    const [subtareasBase] = await connection.query(`
      SELECT sv.id, sv.codigo_olympo, sv.subtarea_id_original
      FROM subtareas_versiones sv
      WHERE sv.version_id = ? AND sv.codigo_olympo IS NOT NULL
      AND EXISTS (SELECT 1 FROM seguimiento_etapas se WHERE se.subtarea_id = sv.id)
      ORDER BY sv.codigo_olympo
    `, [reformaBase.id]);

    console.log(`📋 Subtareas en Reforma Base con código y seguimiento: ${subtareasBase.length}\n`);

    let subtareasCreadas = 0;
    let seguimientoCopiad = 0;
    let sinEquivalente = 0;
    let yaExistente = 0;

    // Paso 2: Para cada subtarea en Reforma Base, crear equivalente en Reforma 8 y copiar seguimiento
    for (const subtareaBase of subtareasBase) {
      // Buscar proceso equivalente en Reforma 8 con el mismo código olympo
      const [procesosRef8] = await connection.query(`
        SELECT id FROM procesos
        WHERE version_id = ? AND codigo_olympo = ?
      `, [reforma8.id, subtareaBase.codigo_olympo]);

      if (procesosRef8.length === 0) {
        sinEquivalente++;
        continue;
      }

      // Verificar si ya existe una subtarea_versiones en Reforma 8
      const [subtareaRef8] = await connection.query(`
        SELECT id FROM subtareas_versiones
        WHERE version_id = ? AND codigo_olympo = ?
      `, [reforma8.id, subtareaBase.codigo_olympo]);

      let subtareaRef8Id;

      if (subtareaRef8.length === 0) {
        // Crear nueva subtarea_versiones en Reforma 8 basada en la de Reforma Base
        const [createResult] = await connection.query(`
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
        `, [reforma8.id, subtareaBase.id]);

        subtareaRef8Id = createResult.insertId;
        subtareasCreadas++;
        console.log(`📌 Creada subtarea_versiones en Reforma 8 para ${subtareaBase.codigo_olympo} (ID: ${subtareaRef8Id})`);
      } else {
        subtareaRef8Id = subtareaRef8[0].id;
        yaExistente++;
      }

      // Obtener seguimientos de Reforma Base
      const [seguimientosBase] = await connection.query(`
        SELECT etapa_id, estado, fecha_planificada, fecha_real,
               responsable_id, responsable, observaciones
        FROM seguimiento_etapas
        WHERE subtarea_id = ?
      `, [subtareaBase.id]);

      if (seguimientosBase.length === 0) {
        continue;
      }

      // Verificar si ya tiene seguimiento
      const [seguimientosRef8] = await connection.query(`
        SELECT COUNT(*) as count FROM seguimiento_etapas
        WHERE subtarea_id = ?
      `, [subtareaRef8Id]);

      if (seguimientosRef8[0].count > 0) {
        console.log(`⚠️  ${subtareaBase.codigo_olympo}: Ya tiene ${seguimientosRef8[0].count} registros - SALTANDO`);
        continue;
      }

      // Copiar seguimientos
      for (const seg of seguimientosBase) {
        await connection.query(`
          INSERT INTO seguimiento_etapas (
            subtarea_id, etapa_id, estado, fecha_planificada, fecha_real,
            responsable_id, responsable, observaciones
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          subtareaRef8Id,
          seg.etapa_id,
          seg.estado,
          seg.fecha_planificada,
          seg.fecha_real,
          seg.responsable_id,
          seg.responsable,
          seg.observaciones
        ]);
      }

      seguimientoCopiad++;
      console.log(`✅ ${subtareaBase.codigo_olympo}: ${seguimientosBase.length} registros copiados`);
    }

    console.log(`\n📊 RESUMEN:\n`);
    console.log(`   ✅ Subtareas_versiones creadas: ${subtareasCreadas}`);
    console.log(`   ✅ Procesos con seguimiento copiado: ${seguimientoCopiad}`);
    console.log(`   📋 Subtareas Base con seguimiento: ${subtareasBase.length}`);
    console.log(`   ⚠️  Sin equivalente en Reforma 8: ${sinEquivalente}`);
    console.log(`   ⏭️  Ya existentes en Reforma 8: ${yaExistente}`);

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

copiarSeguimiento();
