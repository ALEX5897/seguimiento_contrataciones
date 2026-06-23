import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, values = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql, values);
    return rows;
  } finally {
    conn.release();
  }
}

async function inspeccionar() {
  console.log('='.repeat(100));
  console.log('ANÁLISIS DETALLADO DE ETAPAS Y SEGUIMIENTO');
  console.log('='.repeat(100));

  try {
    // 1. Etapas atrasadas
    const etapasAtrasadas = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas
      WHERE estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada')
      AND fecha_planificada < CURDATE()
      AND fecha_real IS NULL
    `);
    console.log('\n1. ETAPAS ATRASADAS (pendientes con fecha < hoy)');
    console.log(`   → ${etapasAtrasadas[0].total} etapas`);

    // 2. Etapas en progreso
    const etapasEnProgreso = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas
      WHERE estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada')
      AND (fecha_planificada >= CURDATE() OR fecha_planificada IS NULL)
      AND fecha_real IS NULL
    `);
    console.log('\n2. ETAPAS EN PROGRESO (sin retraso)');
    console.log(`   → ${etapasEnProgreso[0].total} etapas`);

    // 3. Etapas por tipo de etapa
    const etapasPorTipo = await query(`
      SELECT nombre, COUNT(*) as total FROM seguimiento_etapas
      GROUP BY nombre ORDER BY total DESC LIMIT 15
    `);
    console.log('\n3. TOP 15 ETAPAS POR TIPO');
    for (let i = 0; i < etapasPorTipo.length; i++) {
      console.log(`   ${i + 1}. ${etapasPorTipo[i].nombre}: ${etapasPorTipo[i].total} registros`);
    }

    // 4. Etapas con retrasos más significativos
    const retrasos = await query(`
      SELECT
        s.nombre as proceso,
        se.nombre as etapa,
        se.fecha_planificada,
        DATEDIFF(CURDATE(), se.fecha_planificada) as dias_retraso
      FROM seguimiento_etapas se
      JOIN subtareas s ON se.subtarea_id = s.id
      WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada')
      AND se.fecha_planificada < CURDATE()
      AND se.fecha_real IS NULL
      ORDER BY se.fecha_planificada ASC
      LIMIT 15
    `);
    console.log('\n4. ETAPAS CON MAYORES RETRASOS (Top 15)');
    for (let i = 0; i < retrasos.length; i++) {
      console.log(`   ${i + 1}. ${retrasos[i].proceso.substring(0, 50)}...`);
      console.log(`      → Etapa: ${retrasos[i].etapa}`);
      console.log(`      → Fecha planificada: ${retrasos[i].fecha_planificada}`);
      console.log(`      → Días de retraso: ${retrasos[i].dias_retraso}`);
    }

    // 5. Procesos sin etapas
    const procesosSinEtapas = await query(`
      SELECT COUNT(*) as total FROM subtareas s
      WHERE NOT EXISTS (
        SELECT 1 FROM seguimiento_etapas se WHERE se.subtarea_id = s.id
      )
    `);
    console.log('\n5. PROCESOS SIN ETAPAS');
    console.log(`   → ${procesosSinEtapas[0].total} procesos`);

    // 6. Distribuci´n de completitud
    const completitud = await query(`
      SELECT
        s.id,
        s.nombre,
        COUNT(se.id) as total_etapas,
        SUM(CASE WHEN se.estado = 'completado' THEN 1 ELSE 0 END) as etapas_completadas,
        ROUND(SUM(CASE WHEN se.estado = 'completado' THEN 1 ELSE 0 END) * 100 / COUNT(se.id), 2) as pct_completitud
      FROM subtareas s
      LEFT JOIN seguimiento_etapas se ON se.subtarea_id = s.id
      WHERE s.activo = 1
      GROUP BY s.id
      ORDER BY pct_completitud DESC
      LIMIT 20
    `);
    console.log('\n6. TOP 20 PROCESOS ACTIVOS CON MAYOR COMPLETITUD');
    for (let i = 0; i < completitud.length; i++) {
      const pct = completitud[i].pct_completitud || 0;
      console.log(`   ${i + 1}. ${completitud[i].nombre.substring(0, 60)}...`);
      console.log(`      → Etapas: ${completitud[i].etapas_completadas}/${completitud[i].total_etapas} (${pct}%)`);
    }

    // 7. Procesos con menor completitud
    const menorCompletitud = await query(`
      SELECT
        s.id,
        s.nombre,
        COUNT(se.id) as total_etapas,
        SUM(CASE WHEN se.estado = 'completado' THEN 1 ELSE 0 END) as etapas_completadas,
        ROUND(SUM(CASE WHEN se.estado = 'completado' THEN 1 ELSE 0 END) * 100 / COUNT(se.id), 2) as pct_completitud
      FROM subtareas s
      LEFT JOIN seguimiento_etapas se ON se.subtarea_id = s.id
      WHERE s.activo = 1 AND COUNT(se.id) > 0
      GROUP BY s.id
      ORDER BY pct_completitud ASC
      LIMIT 15
    `);
    console.log('\n7. TOP 15 PROCESOS ACTIVOS CON MENOR COMPLETITUD');
    for (let i = 0; i < menorCompletitud.length; i++) {
      const pct = menorCompletitud[i].pct_completitud || 0;
      console.log(`   ${i + 1}. ${menorCompletitud[i].nombre.substring(0, 60)}...`);
      console.log(`      → Etapas: ${menorCompletitud[i].etapas_completadas}/${menorCompletitud[i].total_etapas} (${pct}%)`);
    }

    // 8. Estadísticas de responsables
    const responsables = await query(`
      SELECT responsable, COUNT(*) as total FROM subtareas
      WHERE responsable IS NOT NULL AND responsable != ''
      GROUP BY responsable ORDER BY total DESC LIMIT 10
    `);
    console.log('\n8. TOP 10 RESPONSABLES CON MÁS PROCESOS');
    for (let i = 0; i < responsables.length; i++) {
      console.log(`   ${i + 1}. ${responsables[i].responsable}: ${responsables[i].total} procesos`);
    }

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

inspeccionar();
