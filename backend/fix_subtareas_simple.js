import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './.env' });

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    console.log('🔄 Restaurando SUBTAREAS desde PROCESOS (Reforma 10)...\n');

    // Desactivar foreign keys
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    console.log('✅ Foreign keys desactivadas');

    // Limpiar
    await conn.query('DELETE FROM subtareas');
    console.log('✅ Tabla SUBTAREAS limpia');

    // Insertar usando INSERT SELECT (solo columnas que SABEMOS que existen)
    const [result] = await conn.query(`
      INSERT INTO subtareas (
        codigo_olympo, nombre, direccion_encargada, responsable, responsable_id,
        presupuesto_2026_inicial, costo_2026, pac_no_pac, partida_presupuestaria,
        plazo_contrato, procedimiento_sugerido, activo
      )
      SELECT
        codigo_olympo, subtarea, direccion_encargada, responsable, responsable_id,
        presupuesto_2026_inicial, costo_2026, pac_no_pac, partida_presupuestaria,
        plazo_contrato, procedimiento_sugerido, activo
      FROM procesos
      WHERE version_id = 14 AND activo = 1
    `);

    console.log(`✅ ${result.affectedRows} procesos insertados`);

    // Reactivar foreign keys
    await conn.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('✅ Foreign keys reactivadas');

    // Verificar
    const [count] = await conn.query('SELECT COUNT(*) as total FROM subtareas');
    console.log(`\n📊 Total en SUBTAREAS: ${count[0].total}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ RESTAURACIÓN EXITOSA');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎯 Próximos pasos:');
    console.log('   1. Reinicia el servidor Node: Ctrl+C y luego npm start');
    console.log('   2. Recarga el navegador: Ctrl+F5');
    console.log('   3. Deberías ver 341 procesos de Reforma 10\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

main().then(() => process.exit(0));
