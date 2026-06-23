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

async function obtenerEstadisticas() {
  console.log('='.repeat(100));
  console.log('ESTADÍSTICAS DEL DASHBOARD - CONSULTAS DIRECTAS A BD');
  console.log('='.repeat(100));

  try {
    // 1. Total de procesos activos (sin presupuesto 0, no desiertos)
    const procesosActivos = await query(`
      SELECT COUNT(*) as total FROM subtareas s
      WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0
    `);
    console.log('\n1. TOTAL DE PROCESOS ACTIVOS VÁLIDOS');
    console.log(`   → ${procesosActivos[0].total} procesos`);

    // 2. Procesos PAC y NO PAC
    const procesosPAC = await query(`
      SELECT COUNT(*) as total FROM subtareas s
      WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC'
    `);
    const procesosNOPAC = await query(`
      SELECT COUNT(*) as total FROM subtareas s
      WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC'
    `);
    console.log('\n2. PROCESOS POR TIPO (PAC / NO PAC)');
    console.log(`   → PAC: ${procesosPAC[0].total} procesos`);
    console.log(`   → NO PAC: ${procesosNOPAC[0].total} procesos`);

    // 3. Total de etapas de procesos válidos
    const totalEtapas = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.subtarea_id IN (
        SELECT id FROM subtareas s
        WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0
      )
    `);
    console.log('\n3. TOTAL DE ETAPAS DE PROCESOS VÁLIDOS');
    console.log(`   → ${totalEtapas[0].total} etapas`);

    // 4. Etapas completadas
    const etapasCompletadas = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.estado = 'completado'
        AND se.subtarea_id IN (SELECT id FROM subtareas s
          WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)
    `);
    console.log('\n4. ETAPAS COMPLETADAS');
    console.log(`   → ${etapasCompletadas[0].total} etapas`);

    // 5. Etapas atrasadas (pendientes con fecha < hoy)
    const etapasAtrasadas = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada')
        AND se.fecha_real IS NULL
        AND (se.fecha_planificada < CURDATE() OR se.fecha_tentativa < CURDATE())
        AND se.subtarea_id IN (SELECT id FROM subtareas s
          WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)
    `);
    console.log('\n5. ETAPAS ATRASADAS (pendientes con fecha < hoy)');
    console.log(`   → ${etapasAtrasadas[0].total} etapas`);

    // 6. Etapas en progreso (pendientes sin retraso)
    const etapasEnProgreso = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada')
        AND se.fecha_real IS NULL
        AND NOT (se.fecha_planificada < CURDATE() OR se.fecha_tentativa < CURDATE())
        AND se.subtarea_id IN (SELECT id FROM subtareas s
          WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)
    `);
    console.log('\n6. ETAPAS EN PROGRESO (pendientes sin retraso)');
    console.log(`   → ${etapasEnProgreso[0].total} etapas`);

    // 7. Etapas PAC y NO PAC
    const etapasPAC = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.subtarea_id IN (SELECT id FROM subtareas s
        WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC')
    `);
    const etapasNOPAC = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.subtarea_id IN (SELECT id FROM subtareas s
        WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC')
    `);
    console.log('\n7. ETAPAS POR TIPO (PAC / NO PAC)');
    console.log(`   → PAC: ${etapasPAC[0].total} etapas`);
    console.log(`   → NO PAC: ${etapasNOPAC[0].total} etapas`);

    // 8. Etapas completadas PAC y NO PAC
    const etapasCompletadasPAC = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.estado = 'completado'
        AND se.subtarea_id IN (SELECT id FROM subtareas s
          WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC')
    `);
    const etapasCompletadasNOPAC = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas se
      WHERE se.estado = 'completado'
        AND se.subtarea_id IN (SELECT id FROM subtareas s
          WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC')
    `);
    console.log('\n8. ETAPAS COMPLETADAS POR TIPO (PAC / NO PAC)');
    console.log(`   → PAC: ${etapasCompletadasPAC[0].total} etapas completadas`);
    console.log(`   → NO PAC: ${etapasCompletadasNOPAC[0].total} etapas completadas`);

    // 9. Porcentajes
    const totalVal = totalEtapas[0].total || 1;
    const pctTotal = Math.round((etapasCompletadas[0].total / totalVal) * 100);
    const pctPAC = Math.round((etapasCompletadasPAC[0].total / (etapasPAC[0].total || 1)) * 100);
    const pctNOPAC = Math.round((etapasCompletadasNOPAC[0].total / (etapasNOPAC[0].total || 1)) * 100);

    console.log('\n9. PORCENTAJES DE CUMPLIMIENTO');
    console.log(`   → Total: ${pctTotal}%`);
    console.log(`   → PAC: ${pctPAC}%`);
    console.log(`   → NO PAC: ${pctNOPAC}%`);

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

obtenerEstadisticas();
