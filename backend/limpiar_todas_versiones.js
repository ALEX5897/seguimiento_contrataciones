import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function limpiarTodasVersiones() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('🧹 Limpiando procesos sin presupuesto de TODAS las versiones...\n');

    // Obtener todas las versiones
    const [versiones] = await connection.query(`
      SELECT id, numero_reforma, nombre, activa FROM versiones ORDER BY numero_reforma DESC
    `);

    console.log('📋 Versiones encontradas:\n');

    for (const version of versiones) {
      const activa = version.activa ? '✅ ACTIVA' : '❌ Inactiva';

      // Contar procesos sin presupuesto activos
      const [sinPresRes] = await connection.query(`
        SELECT COUNT(*) as count FROM procesos
        WHERE version_id = ?
        AND (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
        AND activo = 1
      `, [version.id]);

      const countSinPres = sinPresRes[0].count;

      if (countSinPres > 0) {
        console.log(`Reforma ${version.numero_reforma}: ${version.nombre} (${activa})`);
        console.log(`   → ${countSinPres} procesos sin presupuesto (activos)`);

        // Desactivar
        const [result] = await connection.query(`
          UPDATE procesos SET activo = 0
          WHERE version_id = ?
          AND (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
          AND activo = 1
        `, [version.id]);

        console.log(`   ✅ Desactivados: ${result.affectedRows}\n`);
      } else {
        console.log(`Reforma ${version.numero_reforma}: ${version.nombre} (${activa})`);
        console.log(`   ✓ Sin cambios\n`);
      }
    }

    // Verificación final
    console.log('\n📊 VERIFICACIÓN FINAL:\n');

    for (const version of versiones) {
      const [totalRes] = await connection.query(`
        SELECT COUNT(*) as count FROM procesos WHERE version_id = ?
      `, [version.id]);

      const [activosRes] = await connection.query(`
        SELECT COUNT(*) as count FROM procesos WHERE version_id = ? AND activo = 1
      `, [version.id]);

      const [sinPresRes] = await connection.query(`
        SELECT COUNT(*) as count FROM procesos
        WHERE version_id = ?
        AND (presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0)
        AND activo = 1
      `, [version.id]);

      const total = totalRes[0].count;
      const activos = activosRes[0].count;
      const sinPres = sinPresRes[0].count;

      if (total > 0) {
        const activa = version.activa ? '✅' : '❌';
        console.log(`${activa} Reforma ${version.numero_reforma}: ${version.nombre}`);
        console.log(`   Total: ${total} | Activos: ${activos} | Sin presupuesto (activos): ${sinPres}`);
        if (sinPres === 0) {
          console.log(`   ✅ LIMPIO`);
        }
        console.log();
      }
    }

    console.log('✅ Limpieza completada exitosamente');
    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

limpiarTodasVersiones();
