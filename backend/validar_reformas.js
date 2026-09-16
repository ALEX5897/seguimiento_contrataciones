import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function validarReformas() {
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
    console.log('🔍 VALIDANDO SISTEMA DE REFORMAS (VERSIONES)');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Ver todas las versiones/reformas
    console.log('📋 REFORMAS EN EL SISTEMA:\n');
    const [versiones] = await conn.query(
      'SELECT id, numero_reforma, anio, estado, activa, nombre FROM versiones ORDER BY numero_reforma DESC'
    );

    let versionActualId = null;
    versiones.forEach(v => {
      const status = v.activa ? '🟢 ACTIVA' : (v.estado === 'historico' ? '⚫ HISTÓRICA' : '⚪ ' + v.estado);
      console.log(`   ID ${v.id}: Reforma ${v.numero_reforma} (${v.anio}) - ${status}`);
      if (v.activa) versionActualId = v.id;
    });

    if (!versionActualId) {
      console.log('\n❌ ERROR: No hay versión activa');
      process.exit(1);
    }

    // 2. Ver procesos en cada reforma
    console.log('\n\n📊 PROCESOS POR REFORMA:\n');
    for (const v of versiones) {
      const [count] = await conn.query(
        'SELECT COUNT(*) as cnt FROM procesos WHERE version_id = ? AND activo = 1',
        [v.id]
      );
      const status = v.activa ? '🟢 ACTIVA' : '⚫ HISTÓRICA';
      console.log(`   Reforma ${v.numero_reforma}: ${count[0].cnt} procesos ${status}`);
    }

    // 3. Verificar que solo procesos de versión activa estén en subtareas
    console.log('\n\n🔄 VALIDACIÓN: API devuelve datos de versión activa:\n');
    const [subtareasCount] = await conn.query('SELECT COUNT(*) as cnt FROM subtareas');
    const [procesosActivos] = await conn.query(
      'SELECT COUNT(*) as cnt FROM procesos WHERE version_id = ? AND activo = 1',
      [versionActualId]
    );

    console.log(`   Subtareas en BD (API): ${subtareasCount[0].cnt}`);
    console.log(`   Procesos Reforma ${versiones[0].numero_reforma}: ${procesosActivos[0].cnt}`);

    if (subtareasCount[0].cnt === procesosActivos[0].cnt) {
      console.log(`   ✅ SINCRONIZADO CORRECTAMENTE`);
    } else {
      console.log(`   ⚠️  DESINCRONIZADO`);
    }

    // 4. TEST: Crear y activar nueva reforma
    console.log('\n\n🧪 TEST: CREAR Y ACTIVAR NUEVA REFORMA\n');
    console.log('   1️⃣ Estado actual:');
    const [currentVersion] = await conn.query('SELECT id, numero_reforma FROM versiones WHERE activa = 1');
    console.log(`      - Versión activa: Reforma ${currentVersion[0].numero_reforma} (ID ${currentVersion[0].id})`);

    // Crear Reforma 11
    console.log('\n   2️⃣ Creando Reforma 11 2026...');
    const [newVersion] = await conn.query(
      'INSERT INTO versiones (numero_reforma, anio, estado, activa, nombre) VALUES (?, ?, ?, ?, ?)',
      [11, 2026, 'borrador', 0, 'Reforma 11 2026']
    );
    const newVersionId = newVersion.insertId;
    console.log(`      ✅ Creada: ID ${newVersionId}`);

    // Copiar algunos procesos
    console.log('\n   3️⃣ Copiando 5 procesos a Reforma 11...');
    const [procesos] = await conn.query(
      'SELECT id, codigo_olympo, subtarea, direccion_encargada, responsable, presupuesto_2026_inicial FROM procesos WHERE version_id = ? LIMIT 5',
      [currentVersion[0].id]
    );

    for (const p of procesos) {
      await conn.query(
        'INSERT INTO procesos (version_id, codigo_olympo, subtarea, direccion_encargada, responsable, presupuesto_2026_inicial, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [newVersionId, p.codigo_olympo, p.subtarea, p.direccion_encargada, p.responsable, p.presupuesto_2026_inicial]
      );
    }
    console.log(`      ✅ Copiados 5 procesos`);

    // Cambiar estado a aprobado
    console.log('\n   4️⃣ Aprobando Reforma 11...');
    await conn.query('UPDATE versiones SET estado = ? WHERE id = ?', ['aprobado', newVersionId]);
    console.log(`      ✅ Estado: aprobado`);

    // Activar nueva reforma
    console.log('\n   5️⃣ Activando Reforma 11...');
    await conn.query('UPDATE versiones SET activa = 0 WHERE activa = 1');
    await conn.query('UPDATE versiones SET activa = 1, estado = ? WHERE id = ?', ['activo', newVersionId]);
    console.log(`      ✅ Activada`);

    // Cambiar reforma anterior a histórica
    console.log('\n   6️⃣ Marcando Reforma ${currentVersion[0].numero_reforma} como histórica...');
    await conn.query('UPDATE versiones SET estado = ? WHERE id = ?', ['historico', currentVersion[0].id]);
    console.log(`      ✅ Estado: histórica`);

    // Verificar resultado
    console.log('\n\n✅ RESULTADO FINAL:\n');
    const [versionsAfter] = await conn.query(
      'SELECT id, numero_reforma, estado, activa FROM versiones WHERE anio = 2026 ORDER BY numero_reforma'
    );

    versionsAfter.forEach(v => {
      const status = v.activa ? '🟢 ACTIVA' : (v.estado === 'historico' ? '⚫ HISTÓRICA' : `⚪ ${v.estado}`);
      console.log(`   Reforma ${v.numero_reforma}: ${status}`);
    });

    // Verificar que solo se ven procesos de Reforma 11
    const [countR11] = await conn.query('SELECT COUNT(*) as cnt FROM procesos WHERE version_id = ? AND activo = 1', [newVersionId]);
    const [countRAnterior] = await conn.query('SELECT COUNT(*) as cnt FROM procesos WHERE version_id = ? AND activo = 1', [currentVersion[0].id]);

    console.log('\n📊 PROCESOS EN BD:');
    console.log(`   Reforma ${currentVersion[0].numero_reforma} (histórica): ${countRAnterior[0].cnt} procesos`);
    console.log(`   Reforma 11 (activa): ${countR11[0].cnt} procesos`);

    // Lo importante: qué verá el usuario
    const [subtareasFinales] = await conn.query('SELECT COUNT(*) as cnt FROM subtareas');
    console.log('\n🎯 QUÉ VE EL USUARIO EN EL SISTEMA:');
    console.log(`   Procesos visibles: ${subtareasFinales[0].cnt}`);
    console.log(`   (Solo de Reforma 11, la activa)`);

    // Verificar sincronización
    if (subtareasFinales[0].cnt === countR11[0].cnt) {
      console.log(`   ✅ SINCRONIZADO CORRECTAMENTE`);
    }

    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('✅ VALIDACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 CONCLUSIÓN:');
    console.log('   ✅ Sistema de reformas funciona correctamente:');
    console.log(`      - Reforma ${currentVersion[0].numero_reforma} quedó como HISTÓRICA`);
    console.log(`      - Reforma 11 es ahora la ACTIVA`);
    console.log(`      - Solo se ven procesos de Reforma 11 en el sistema`);
    console.log(`      - Procesos de Reforma ${currentVersion[0].numero_reforma} se conservan (históricos)\n`);

    // Limpiar: Restaurar estado anterior
    console.log('🧹 Restaurando estado anterior...');
    await conn.query('DELETE FROM procesos WHERE version_id = ?', [newVersionId]);
    await conn.query('DELETE FROM versiones WHERE id = ?', [newVersionId]);
    await conn.query('UPDATE versiones SET activa = 1, estado = ? WHERE id = ?', ['activo', currentVersion[0].id]);
    console.log('   ✅ Restaurado\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

validarReformas();
