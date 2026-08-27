import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarDesactivados() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('📊 Verificando estado de procesos...\n');

    // Contar procesos activos
    const [activos] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos WHERE activo = 1
    `);

    // Contar procesos inactivos
    const [inactivos] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos WHERE activo = 0
    `);

    // Contar procesos sin presupuesto (activos)
    const [sinPresupuestoActivos] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos
      WHERE (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
      AND activo = 1
    `);

    // Contar procesos sin presupuesto (inactivos)
    const [sinPresupuestoInactivos] = await connection.query(`
      SELECT COUNT(*) as count FROM procesos
      WHERE (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
      AND activo = 0
    `);

    console.log(`✅ Procesos activos: ${activos[0].count}`);
    console.log(`❌ Procesos inactivos: ${inactivos[0].count}`);
    console.log(`\n💰 Procesos sin presupuesto:`);
    console.log(`   - Activos: ${sinPresupuestoActivos[0].count}`);
    console.log(`   - Inactivos: ${sinPresupuestoInactivos[0].count}`);
    console.log(`   - Total: ${sinPresupuestoActivos[0].count + sinPresupuestoInactivos[0].count}`);

    console.log('\n✅ Desactivación completada exitosamente');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

verificarDesactivados();
