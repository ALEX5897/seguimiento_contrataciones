import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function crearFechaPlani() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('📝 Creando campo fecha_planificada en SUBTAREAS_ETAPAS...\n');

    // Agregar columna
    try {
      await connection.query(
        `ALTER TABLE subtareas_etapas ADD COLUMN fecha_planificada DATE DEFAULT NULL AFTER fecha_reforma_3`
      );
      console.log('✅ Columna fecha_planificada creada');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna fecha_planificada ya existe');
      } else {
        throw error;
      }
    }

    // Copiar valores de fecha_reforma_3 a fecha_planificada
    console.log('\n📋 Copiando valores de fecha_reforma_3 a fecha_planificada...\n');

    const [result] = await connection.query(
      `UPDATE subtareas_etapas SET fecha_planificada = fecha_reforma_3 WHERE fecha_reforma_3 IS NOT NULL`
    );

    console.log(`✅ ${result.affectedRows} registros actualizados`);

    // Verificar resultado
    const [verify] = await connection.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN fecha_planificada IS NOT NULL THEN 1 ELSE 0 END) as con_fecha
       FROM subtareas_etapas`
    );

    const stats = verify[0];
    console.log(`\n📊 Estadísticas:`);
    console.log(`  Total de etapas: ${stats.total}`);
    console.log(`  Con fecha_planificada: ${stats.con_fecha}`);

    // Ejemplo
    console.log('\n📋 Ejemplo de registros:\n');
    const [examples] = await connection.query(
      `SELECT id, subtarea_id, etapa_id, fecha_reforma_3, fecha_planificada
       FROM subtareas_etapas
       WHERE fecha_planificada IS NOT NULL
       LIMIT 3`
    );

    examples.forEach((ex, i) => {
      console.log(`  ${i+1}. Etapa ${ex.etapa_id} (Subtarea ${ex.subtarea_id})`);
      console.log(`     Fecha Reforma 3: ${ex.fecha_reforma_3}`);
      console.log(`     Fecha Planificada: ${ex.fecha_planificada}`);
    });

    console.log('\n✅ Operación completada');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

crearFechaPlani();
