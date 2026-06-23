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

async function query(sql) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql);
    return rows;
  } finally {
    conn.release();
  }
}

async function obtenerEstadisticas() {
  console.log('\n' + '='.repeat(100));
  console.log('ESTADÍSTICAS DEL DASHBOARD - CONSULTAS DIRECTAS A BD');
  console.log('='.repeat(100));

  try {
    const procesosActivos = await query(`SELECT COUNT(*) as total FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0`);
    const procesosPAC = await query(`SELECT COUNT(*) as total FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC'`);
    const procesosNOPAC = await query(`SELECT COUNT(*) as total FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC'`);
    
    const totalEtapas = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    const etapasCompletadas = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado = 'completado' AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    const etapasAtrasadas = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada') AND se.fecha_real IS NULL AND se.fecha_planificada < CURDATE() AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    const etapasEnProgreso = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada') AND se.fecha_real IS NULL AND (se.fecha_planificada IS NULL OR se.fecha_planificada >= CURDATE()) AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    
    const etapasPAC = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC')`);
    const etapasNOPAC = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC')`);
    
    const etapasCompletadasPAC = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado = 'completado' AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC')`);
    const etapasCompletadasNOPAC = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado = 'completado' AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC')`);

    const totalVal = totalEtapas[0].total || 1;
    const pctTotal = Math.round((etapasCompletadas[0].total / totalVal) * 100);
    const pctPAC = Math.round((etapasCompletadasPAC[0].total / (etapasPAC[0].total || 1)) * 100);
    const pctNOPAC = Math.round((etapasCompletadasNOPAC[0].total / (etapasNOPAC[0].total || 1)) * 100);

    console.log('\n✓ PROCESOS ACTIVOS VÁLIDOS');
    console.log(`  → Total: ${procesosActivos[0].total}`);
    console.log(`  → PAC: ${procesosPAC[0].total} procesos`);
    console.log(`  → NO PAC: ${procesosNOPAC[0].total} procesos`);

    console.log('\n✓ ETAPAS (TOTAL)');
    console.log(`  → Total de etapas: ${totalEtapas[0].total}`);
    console.log(`  → Completadas: ${etapasCompletadas[0].total}`);
    console.log(`  → Atrasadas (pendientes con retraso): ${etapasAtrasadas[0].total}`);
    console.log(`  → En progreso (pendientes sin retraso): ${etapasEnProgreso[0].total}`);

    console.log('\n✓ ETAPAS POR TIPO');
    console.log(`  → PAC: ${etapasPAC[0].total} etapas (${etapasCompletadasPAC[0].total} completadas)`);
    console.log(`  → NO PAC: ${etapasNOPAC[0].total} etapas (${etapasCompletadasNOPAC[0].total} completadas)`);

    console.log('\n✓ PORCENTAJES DE CUMPLIMIENTO');
    console.log(`  → Total: ${pctTotal}%`);
    console.log(`  → PAC: ${pctPAC}%`);
    console.log(`  → NO PAC: ${pctNOPAC}%`);

    console.log('\n' + '='.repeat(100) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

obtenerEstadisticas();
