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

async function debugProcesosPAC() {
  console.log('='.repeat(100));
  console.log('DEBUG: PROCESOS PAC vs NO PAC');
  console.log('='.repeat(100));

  try {
    // 1. Total de procesos válidos PAC
    const procesosPAC = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM subtareas s
      WHERE
        s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'PAC' OR s.pac_no_pac = 'PAC')
    `);
    console.log('\n1. TOTAL DE PROCESOS PAC VÁLIDOS');
    console.log(`   → ${procesosPAC[0].total} procesos`);

    // 2. Total de procesos válidos NO PAC
    const procesosNOPAC = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM subtareas s
      WHERE
        s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'NO PAC' OR s.pac_no_pac = 'NO PAC')
    `);
    console.log('\n2. TOTAL DE PROCESOS NO PAC VÁLIDOS');
    console.log(`   → ${procesosNOPAC[0].total} procesos`);

    // 3. Procesos PAC con etapas que tienen fecha asignada
    const procesosPACConFecha = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM subtareas s
      WHERE
        s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'PAC')
        AND EXISTS (
          SELECT 1 FROM seguimiento_etapas se
          WHERE se.subtarea_id = s.id
          AND COALESCE(se.fecha_planificada, '') != ''
        )
    `);
    console.log('\n3. PROCESOS PAC CON AL MENOS UNA ETAPA CON FECHA');
    console.log(`   → ${procesosPACConFecha[0].total} procesos`);

    // 4. Procesos NO PAC con etapas que tienen fecha asignada
    const procesosNOPACConFecha = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM subtareas s
      WHERE
        s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'NO PAC' OR s.pac_no_pac = 'NO PAC')
        AND EXISTS (
          SELECT 1 FROM seguimiento_etapas se
          WHERE se.subtarea_id = s.id
          AND (se.fecha_planificada IS NOT NULL AND se.fecha_planificada != ''
               OR se.fecha_tentativa IS NOT NULL AND se.fecha_tentativa != '')
        )
    `);
    console.log('\n4. PROCESOS NO PAC CON AL MENOS UNA ETAPA CON FECHA');
    console.log(`   → ${procesosNOPACConFecha[0].total} procesos`);

    // 5. Etapas PAC de procesos válidos PAC
    const etapasPACDeProcesosPAC = await query(`
      SELECT COUNT(*) as total
      FROM seguimiento_etapas se
      WHERE se.subtarea_id IN (
        SELECT id FROM subtareas s
        WHERE s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'PAC' OR s.pac_no_pac = 'PAC')
      )
      AND COALESCE(se.fecha_planificada, '') != ''
    `);
    console.log('\n5. ETAPAS (con fecha) DE PROCESOS PAC');
    console.log(`   → ${etapasPACDeProcesosPAC[0].total} etapas`);

    // 6. Etapas NO PAC de procesos válidos NO PAC
    const etapasNOPACDeProcessosNOPAC = await query(`
      SELECT COUNT(*) as total
      FROM seguimiento_etapas se
      WHERE se.subtarea_id IN (
        SELECT id FROM subtareas s
        WHERE s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'NO PAC' OR s.pac_no_pac = 'NO PAC')
      )
      AND COALESCE(se.fecha_planificada, '') != ''
    `);
    console.log('\n6. ETAPAS (con fecha) DE PROCESOS NO PAC');
    console.log(`   → ${etapasNOPACDeProcessosNOPAC[0].total} etapas`);

    // 7. Procesos PAC sin etapas con fecha
    const procesosPACSinFecha = await query(`
      SELECT s.id, s.nombre, COUNT(se.id) as etapas_totales
      FROM subtareas s
      LEFT JOIN seguimiento_etapas se ON se.subtarea_id = s.id
      WHERE
        s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND (s.pac_no_pac = 'PAC' OR s.pac_no_pac = 'PAC')
        AND NOT EXISTS (
          SELECT 1 FROM seguimiento_etapas se2
          WHERE se2.subtarea_id = s.id
          AND (se2.fecha_planificada IS NOT NULL AND se2.fecha_planificada != ''
               OR se2.fecha_tentativa IS NOT NULL AND se2.fecha_tentativa != '')
        )
      GROUP BY s.id, s.nombre
      LIMIT 5
    `);
    console.log('\n7. MUESTRA: PROCESOS PAC SIN ETAPAS CON FECHA (primeros 5)');
    console.log(`   → Total: ${procesosPACConFecha[0].total - procesosPACConFecha[0].total}`);
    for (const proc of procesosPACSinFecha) {
      console.log(`      - ${proc.nombre} (ID: ${proc.id}, etapas totales: ${proc.etapas_totales})`);
    }

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugProcesosPAC();
