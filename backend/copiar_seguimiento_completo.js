import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function copiarSeguimientoCompleto() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 COPIAR ETAPAS Y SEGUIMIENTO COMPLETO');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Verificar cuál tabla tiene más datos de seguimiento
    console.log('1️⃣ Verificando datos disponibles...\n');

    const [subtareasConEtapas] = await conn.query(
      'SELECT COUNT(*) as cnt FROM subtareas_etapas'
    );

    const [seguimientosDisponibles] = await conn.query(
      'SELECT COUNT(*) as cnt FROM seguimiento_etapas'
    );

    console.log(`   Etapas encontradas: ${subtareasConEtapas[0].cnt}`);
    console.log(`   Seguimientos encontrados: ${seguimientosDisponibles[0].cnt}`);

    if (subtareasConEtapas[0].cnt === 0) {
      console.log('\n⚠️  No hay etapas cargadas en SUBTAREAS_ETAPAS');
      console.log('   Se necesita cargar primero el catálogo de etapas.\n');
      process.exit(0);
    }

    // 2. Obtener reforma activa
    console.log('\n2️⃣ Obteniendo reforma activa...');
    const [versionActiva] = await conn.query('SELECT id, numero_reforma FROM versiones WHERE activa = 1');
    const reformaActivaId = versionActiva[0].id;
    const numeroReformaActiva = versionActiva[0].numero_reforma;
    console.log(`   ✅ Reforma ${numeroReformaActiva} (ID ${reformaActivaId})`);

    // 3. Obtener todos los procesos de Reforma activa
    console.log(`\n3️⃣ Obteniendo procesos de Reforma ${numeroReformaActiva}...`);
    const [procesosActivos] = await conn.query(
      'SELECT id, codigo_olympo FROM procesos WHERE version_id = ? AND activo = 1',
      [reformaActivaId]
    );

    console.log(`   ✅ ${procesosActivos.length} procesos encontrados`);

    // 4. Para cada proceso, buscar la subtarea base por código Olympo
    console.log('\n4️⃣ Copiando etapas y seguimiento...\n');

    let etapasCopias = 0;
    let seguimientoCopias = 0;
    let procesosConDatos = 0;
    let procesosNoEncontrados = 0;

    for (let i = 0; i < procesosActivos.length; i++) {
      const proceso = procesosActivos[i];

      // Buscar subtarea antigua con el mismo código Olympo
      const [subtareaBase] = await conn.query(
        'SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1',
        [proceso.codigo_olympo]
      );

      if (subtareaBase.length === 0) {
        procesosNoEncontrados++;
        continue;
      }

      const subtareaBaseId = subtareaBase[0].id;

      // Obtener TODAS las etapas de la subtarea base
      const [etapasBase] = await conn.query(
        'SELECT id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica FROM subtareas_etapas WHERE subtarea_id = ?',
        [subtareaBaseId]
      );

      if (etapasBase.length === 0) {
        continue;
      }

      procesosConDatos++;

      // Copiar cada etapa
      for (const etapaBase of etapasBase) {
        // Verificar si la etapa ya existe en el proceso de Reforma activa
        const [etapaExiste] = await conn.query(
          'SELECT id FROM subtareas_etapas WHERE subtarea_id = ? AND etapa_id = ?',
          [proceso.id, etapaBase.etapa_id]
        );

        if (etapaExiste.length === 0) {
          // Insertar etapa
          try {
            await conn.query(
              'INSERT INTO subtareas_etapas (subtarea_id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                proceso.id,
                etapaBase.etapa_id,
                etapaBase.fecha_tentativa,
                etapaBase.fecha_reforma,
                etapaBase.fecha_reforma_3,
                etapaBase.fecha_planificada,
                etapaBase.aplica
              ]
            );
            etapasCopias++;
          } catch (e) {
            // Ignorar duplicados
          }
        }

        // Copiar TODOS los seguimientos de esa etapa
        const [seguimientosBase] = await conn.query(
          'SELECT estado, fecha_real, observaciones, responsable, created_at, updated_at FROM seguimiento_etapas WHERE subtarea_id = ? AND etapa_id = ?',
          [subtareaBaseId, etapaBase.etapa_id]
        );

        for (const seg of seguimientosBase) {
          try {
            await conn.query(
              'INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_real, observaciones, responsable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [
                proceso.id,
                etapaBase.etapa_id,
                seg.estado,
                seg.fecha_real,
                seg.observaciones,
                seg.responsable,
                seg.created_at || new Date(),
                seg.updated_at || new Date()
              ]
            );
            seguimientoCopias++;
          } catch (e) {
            // Ignorar duplicados
          }
        }
      }

      if ((i + 1) % 50 === 0) {
        console.log(`   ⏳ ${i + 1}/${procesosActivos.length} procesos procesados`);
      }
    }

    // 5. Verificar resultado
    console.log(`\n5️⃣ Verificando resultado...`);

    const [etapasEnReforma] = await conn.query(
      'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
      [reformaActivaId]
    );

    const [seguimientosEnReforma] = await conn.query(
      'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
      [reformaActivaId]
    );

    // Mostrar muestra de datos copiados
    const [muestraEtapas] = await conn.query(`
      SELECT DISTINCT
        se.subtarea_id,
        se.etapa_id,
        ep.nombre as etapa_nombre,
        seg.estado,
        seg.observaciones,
        COUNT(*) as registros
      FROM subtareas_etapas se
      LEFT JOIN etapas_catalogo ep ON ep.id = se.etapa_id
      LEFT JOIN seguimiento_etapas seg ON seg.subtarea_id = se.subtarea_id AND seg.etapa_id = se.etapa_id
      WHERE se.subtarea_id IN (
        SELECT id FROM procesos WHERE version_id = ?
      )
      GROUP BY se.subtarea_id, se.etapa_id, ep.nombre, seg.estado, seg.observaciones
      LIMIT 5
    `, [reformaActivaId]);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ COPIA DE SEGUIMIENTO COMPLETADA');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 RESUMEN:');
    console.log(`   ✅ Reforma activa: Reforma ${numeroReformaActiva}`);
    console.log(`   ✅ Total procesos: ${procesosActivos.length}`);
    console.log(`   ✅ Procesos con datos: ${procesosConDatos}`);
    console.log(`   ✅ Procesos sin datos en base: ${procesosNoEncontrados}`);
    console.log(`   ✅ Etapas copiadas: ${etapasCopias}`);
    console.log(`   ✅ Seguimientos copiados: ${seguimientoCopias}`);
    console.log(`\n   📊 En Reforma ${numeroReformaActiva}:`);
    console.log(`      Total etapas: ${etapasEnReforma[0].cnt}`);
    console.log(`      Total seguimientos: ${seguimientosEnReforma[0].cnt}`);

    if (muestraEtapas.length > 0) {
      console.log(`\n   📌 Muestra de datos copiados:`);
      muestraEtapas.slice(0, 3).forEach((e, idx) => {
        console.log(`\n      ${idx + 1}. Etapa: ${e.etapa_nombre || 'Sin nombre'}`);
        console.log(`         Estado: ${e.estado || 'Sin estado'}`);
        const obs = e.observaciones ? e.observaciones.substring(0, 50) + '...' : 'Sin observaciones';
        console.log(`         Observación: ${obs}`);
      });
    }

    console.log('\n\n🎯 Próximos pasos:');
    console.log('   1. Recarga el navegador (Ctrl+F5)');
    console.log('   2. Los procesos ahora tienen todas las etapas y seguimiento\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

copiarSeguimientoCompleto();
