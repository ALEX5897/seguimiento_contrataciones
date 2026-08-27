import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarVersionActual() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('📊 Analizando versión actual...\n');

    // Obtener versión actual
    const [versionRes] = await connection.query(`
      SELECT id, numero_reforma, nombre, activa FROM versiones WHERE activa = 1
    `);

    if (versionRes.length === 0) {
      console.log('❌ No hay versión activa');
      await connection.end();
      process.exit(0);
    }

    const version = versionRes[0];
    console.log(`Versión actual: ${version.nombre} (Reforma ${version.numero_reforma}, ID: ${version.id})\n`);

    // Contar procesos en versión actual
    const [totalRes] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos WHERE version_id = ?
    `, [version.id]);

    const [activosRes] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos WHERE version_id = ? AND activo = 1
    `, [version.id]);

    const [inactivosRes] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos WHERE version_id = ? AND activo = 0
    `, [version.id]);

    const [sinPresupuestoRes] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos
      WHERE version_id = ?
      AND (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
    `, [version.id]);

    const [sinPresupuestoActivosRes] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos
      WHERE version_id = ?
      AND (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
      AND activo = 1
    `, [version.id]);

    console.log(`📋 Procesos en versión actual:`);
    console.log(`   Total: ${totalRes[0].count}`);
    console.log(`   Activos: ${activosRes[0].count}`);
    console.log(`   Inactivos: ${inactivosRes[0].count}`);
    console.log(`\n💰 Sin presupuesto:`);
    console.log(`   Total: ${sinPresupuestoRes[0].count}`);
    console.log(`   Activos (deberían desactivarse): ${sinPresupuestoActivosRes[0].count}`);

    // Mostrar otras versiones
    console.log(`\n📌 Otras versiones en BD:\n`);
    const [todasVersiones] = await connection.query(`
      SELECT v.id, v.numero_reforma, v.nombre, v.activa,
             COUNT(p.id) as procesos
      FROM versiones v
      LEFT JOIN procesos p ON p.version_id = v.id
      GROUP BY v.id
      ORDER BY v.numero_reforma DESC
    `);

    todasVersiones.forEach(v => {
      const activa = v.activa ? '✅ ACTIVA' : '❌ Inactiva';
      console.log(`   Reforma ${v.numero_reforma}: ${v.nombre} (${activa})`);
      console.log(`   → ${v.procesos} procesos\n`);
    });

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

verificarVersionActual();
