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
  console.log('INSPECCIÓN COMPLETA DE LA BASE DE DATOS');
  console.log('='.repeat(100));

  try {
    // 1. Total de registros en subtareas
    const totalSubtareas = await query(`
      SELECT COUNT(*) as total FROM subtareas
    `);
    console.log('\n1. TOTAL DE REGISTROS EN TABLA SUBTAREAS');
    console.log(`   → ${totalSubtareas[0].total} registros`);

    // 2. Subtareas activas
    const subtareasActivas = await query(`
      SELECT COUNT(*) as total FROM subtareas WHERE activo = 1
    `);
    console.log('\n2. SUBTAREAS ACTIVAS (activo = 1)');
    console.log(`   → ${subtareasActivas[0].total} registros`);

    // 3. Subtareas por estado
    const subtareasPorEstado = await query(`
      SELECT activo, COUNT(*) as total FROM subtareas GROUP BY activo ORDER BY activo
    `);
    console.log('\n3. SUBTAREAS POR ESTADO (activo)');
    for (const row of subtareasPorEstado) {
      console.log(`   → Estado ${row.activo}: ${row.total} registros`);
    }

    // 4. Subtareas PAC vs NO PAC
    const subtareasPAC = await query(`
      SELECT pac_no_pac, COUNT(*) as total FROM subtareas GROUP BY pac_no_pac ORDER BY pac_no_pac
    `);
    console.log('\n4. SUBTAREAS POR TIPO (PAC / NO PAC)');
    for (const row of subtareasPAC) {
      console.log(`   → ${row.pac_no_pac || 'SIN ESPECIFICAR'}: ${row.total} registros`);
    }

    // 5. Presupuesto total
    const presupuestoTotal = await query(`
      SELECT
        SUM(costo_2026) as total_costo,
        SUM(CASE WHEN presupuesto_2026_inicial > 0 THEN presupuesto_2026_inicial ELSE 0 END) as total_presupuesto
      FROM subtareas
    `);
    console.log('\n5. PRESUPUESTO TOTAL');
    console.log(`   → Costo 2026: $${presupuestoTotal[0].total_costo || 0}`);
    console.log(`   → Presupuesto 2026 Inicial: $${presupuestoTotal[0].total_presupuesto || 0}`);

    // 6. Tabla seguimiento_etapas
    const totalEtapas = await query(`
      SELECT COUNT(*) as total FROM seguimiento_etapas
    `);
    console.log('\n6. TOTAL DE ETAPAS EN TABLA SEGUIMIENTO_ETAPAS');
    console.log(`   → ${totalEtapas[0].total} etapas`);

    // 7. Etapas por estado
    const etapasPorEstado = await query(`
      SELECT estado, COUNT(*) as total FROM seguimiento_etapas GROUP BY estado ORDER BY total DESC
    `);
    console.log('\n7. ETAPAS POR ESTADO');
    for (const row of etapasPorEstado) {
      console.log(`   → ${row.estado}: ${row.total} etapas`);
    }

    // 8. Información de tablas disponibles
    const tablas = await query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()
    `);
    console.log('\n8. TABLAS DISPONIBLES EN LA BASE DE DATOS');
    for (const row of tablas) {
      console.log(`   → ${row.TABLE_NAME}`);
    }

    // 9. Subtareas con más de 0 costo_2026
    const subtareasConCosto = await query(`
      SELECT COUNT(*) as total FROM subtareas WHERE costo_2026 > 0
    `);
    console.log('\n9. SUBTAREAS CON COSTO > 0');
    console.log(`   → ${subtareasConCosto[0].total} registros`);

    // 10. Top 10 subtareas por costo
    const top10 = await query(`
      SELECT nombre, costo_2026, pac_no_pac, activo FROM subtareas
      ORDER BY costo_2026 DESC LIMIT 10
    `);
    console.log('\n10. TOP 10 SUBTAREAS POR COSTO');
    for (let i = 0; i < top10.length; i++) {
      console.log(`   ${i + 1}. ${top10[i].nombre} - $${top10[i].costo_2026} (${top10[i].pac_no_pac}, activo=${top10[i].activo})`);
    }

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

inspeccionar();
