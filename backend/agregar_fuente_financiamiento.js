import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function agregar() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('📝 Agregando columna fuente_financiamiento a tabla PROCESOS...\n');

    try {
      await connection.query(
        `ALTER TABLE procesos ADD COLUMN fuente_financiamiento VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER partida_presupuestaria`
      );
      console.log('✅ Columna fuente_financiamiento agregada correctamente');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna fuente_financiamiento ya existe');
      } else {
        throw error;
      }
    }

    // Verificar que está en la tabla
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'procesos' AND COLUMN_NAME = 'fuente_financiamiento'"
    );

    if (columns.length > 0) {
      console.log('✅ Verificado: fuente_financiamiento existe en procesos');
    } else {
      console.log('❌ Error: fuente_financiamiento no se encontró');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

agregar();
