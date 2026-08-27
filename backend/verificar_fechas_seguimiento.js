import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificar() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('📊 Columnas en tabla SEGUIMIENTO_ETAPAS:\n');
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'seguimiento_etapas' AND TABLE_SCHEMA = ? ORDER BY ORDINAL_POSITION",
      [process.env.DB_NAME]
    );

    columns.forEach((c, i) => console.log(`  ${i+1}. ${c.COLUMN_NAME}`));

    console.log('\n📊 Columnas en tabla SUBTAREAS_ETAPAS:\n');
    const [columns2] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'subtareas_etapas' AND TABLE_SCHEMA = ? ORDER BY ORDINAL_POSITION",
      [process.env.DB_NAME]
    );

    columns2.forEach((c, i) => console.log(`  ${i+1}. ${c.COLUMN_NAME}`));

    // Ejemplo de registro
    console.log('\n📋 Ejemplo de registro en SEGUIMIENTO_ETAPAS:\n');
    const [example] = await connection.query(
      "SELECT * FROM seguimiento_etapas LIMIT 1"
    );

    if (example.length > 0) {
      const reg = example[0];
      console.log(`  ID: ${reg.id}`);
      console.log(`  Subtarea ID: ${reg.subtarea_id}`);
      console.log(`  Etapa ID: ${reg.etapa_id}`);
      console.log(`  Estado: ${reg.estado}`);
      console.log(`  Fecha Planificada: ${reg.fecha_planificada}`);
      console.log(`  Fecha Real: ${reg.fecha_real}`);
      console.log(`  Observaciones: ${reg.observaciones}`);
    } else {
      console.log('  (No hay registros)');
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

verificar();
