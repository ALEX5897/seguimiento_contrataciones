import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function desactivarSinPresupuesto() {
  let connection;
  try {
    console.log('🔍 Conectando a base de datos...\n');

    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('✓ Conectado a BD\n');

    // 1. Identificar procesos sin presupuesto
    console.log('📊 Analizando procesos sin presupuesto...\n');

    const [procesos] = await connection.query(`
      SELECT p.id, p.subtarea, p.codigo_olympo, p.direccion_encargada, p.presupuesto_2026_inicial, p.activo
      FROM procesos p
      WHERE (p.presupuesto_2026_inicial IS NULL OR p.presupuesto_2026_inicial = 0)
      AND p.activo = 1
      ORDER BY p.codigo_olympo
    `);

    console.log(`Total procesos sin presupuesto (activos): ${procesos.length}\n`);

    if (procesos.length === 0) {
      console.log('✅ No hay procesos sin presupuesto');
      await connection.end();
      process.exit(0);
    }

    // Mostrar procesos a desactivar
    console.log('📋 Procesos a desactivar:\n');
    procesos.forEach((p, idx) => {
      console.log(`${idx + 1}. ID: ${p.id}`);
      console.log(`   Nombre: ${p.subtarea}`);
      console.log(`   Código: ${p.codigo_olympo}`);
      console.log(`   Dirección: ${p.direccion_encargada || 'N/A'}`);
      console.log(`   Presupuesto: ${p.presupuesto_2026_inicial || '0'}`);
      console.log();
    });

    // 2. Desactivar procesos
    console.log('⏳ Desactivando procesos...\n');

    const idsADesactivar = procesos.map(p => p.id);

    if (idsADesactivar.length > 0) {
      const placeholders = idsADesactivar.map(() => '?').join(',');

      const [result] = await connection.query(
        `UPDATE procesos SET activo = 0 WHERE id IN (${placeholders})`,
        idsADesactivar
      );

      console.log(`✅ Procesos desactivados: ${result.affectedRows}\n`);

      // 3. Verificar cambios
      console.log('✓ Verificando cambios...\n');

      const [procesosDesactivados] = await connection.query(`
        SELECT id, nombre, codigo_olympo, activo
        FROM procesos
        WHERE id IN (${placeholders})
      `, idsADesactivar);

      procesosDesactivados.forEach((p) => {
        const estado = p.activo ? 'Activo' : 'Inactivo';
        console.log(`  ${p.codigo_olympo} (${p.nombre}): ${estado}`);
      });

      console.log(`\n✅ Cambios aplicados exitosamente`);
    }

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

desactivarSinPresupuesto();
