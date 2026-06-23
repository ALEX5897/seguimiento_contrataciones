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
  console.log('ESTADÍSTICAS DEL DASHBOARD - SOLO ETAPAS CON FECHA ASIGNADA');
  console.log('='.repeat(100));

  try {
    // Procesos activos válidos
    const procesosActivos = await query(`SELECT COUNT(*) as total FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0`);
    const procesosPAC = await query(`SELECT COUNT(*) as total FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC'`);
    const procesosNOPAC = await query(`SELECT COUNT(*) as total FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC'`);
    
    // ETAPAS CON FECHA ASIGNADA
    const totalEtapasConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    
    const etapasCompletadasConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado = 'completado' AND se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    
    const etapasAtrasadasConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada') AND se.fecha_real IS NULL AND se.fecha_planificada < CURDATE() AND se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    
    const etapasEnProgresoConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado IN ('pendiente', 'en_curso', 'en_revision', 'bloqueada') AND se.fecha_real IS NULL AND se.fecha_planificada >= CURDATE() AND se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0)`);
    
    // ETAPAS PAC Y NO PAC CON FECHA
    const etapasPACConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC')`);
    
    const etapasNOPACConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC')`);
    
    // ETAPAS COMPLETADAS PAC Y NO PAC CON FECHA
    const etapasCompletadasPACConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado = 'completado' AND se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'PAC')`);
    
    const etapasCompletadasNOPACConFecha = await query(`SELECT COUNT(*) as total FROM seguimiento_etapas se WHERE se.estado = 'completado' AND se.fecha_planificada IS NOT NULL AND se.subtarea_id IN (SELECT id FROM subtareas s WHERE s.activo = 1 AND COALESCE(s.presupuesto_2026_inicial, 0) > 0 AND s.pac_no_pac = 'NO PAC')`);

    // Cálculos
    const totalVal = totalEtapasConFecha[0].total || 1;
    const pctTotal = Math.round((etapasCompletadasConFecha[0].total / totalVal) * 100);
    const pctAtrasadas = Math.round((etapasAtrasadasConFecha[0].total / totalVal) * 100);
    const pctEnProgreso = Math.round((etapasEnProgresoConFecha[0].total / totalVal) * 100);
    const pctPAC = Math.round((etapasCompletadasPACConFecha[0].total / (etapasPACConFecha[0].total || 1)) * 100);
    const pctNOPAC = Math.round((etapasCompletadasNOPACConFecha[0].total / (etapasNOPACConFecha[0].total || 1)) * 100);

    console.log('\n✓ PROCESOS ACTIVOS VÁLIDOS');
    console.log(`  → Total: ${procesosActivos[0].total}`);
    console.log(`  → PAC: ${procesosPAC[0].total} procesos`);
    console.log(`  → NO PAC: ${procesosNOPAC[0].total} procesos`);

    console.log('\n✓ ETAPAS CON FECHA ASIGNADA (TOTAL)');
    console.log(`  → Total de etapas: ${totalEtapasConFecha[0].total}`);
    console.log(`  → Completadas: ${etapasCompletadasConFecha[0].total}`);
    console.log(`  → Atrasadas (pendientes con retraso): ${etapasAtrasadasConFecha[0].total}`);
    console.log(`  → En progreso (pendientes sin retraso): ${etapasEnProgresoConFecha[0].total}`);

    console.log('\n✓ ETAPAS CON FECHA POR TIPO');
    console.log(`  → PAC: ${etapasPACConFecha[0].total} etapas (${etapasCompletadasPACConFecha[0].total} completadas)`);
    console.log(`  → NO PAC: ${etapasNOPACConFecha[0].total} etapas (${etapasCompletadasNOPACConFecha[0].total} completadas)`);

    console.log('\n✓ PORCENTAJES DE CUMPLIMIENTO');
    console.log(`  → Total: ${pctTotal}%`);
    console.log(`  → PAC: ${pctPAC}%`);
    console.log(`  → NO PAC: ${pctNOPAC}%`);

    console.log('\n✓ DISTRIBUCIÓN DE ETAPAS CON FECHA');
    console.log(`  → Completadas: ${pctTotal}% (${etapasCompletadasConFecha[0].total})`);
    console.log(`  → Atrasadas: ${pctAtrasadas}% (${etapasAtrasadasConFecha[0].total})`);
    console.log(`  → En progreso: ${pctEnProgreso}% (${etapasEnProgresoConFecha[0].total})`);

    console.log('\n' + '='.repeat(100) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

obtenerEstadisticas();
