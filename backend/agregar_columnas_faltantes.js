import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function agregarColumnas() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('📝 Agregando columnas faltantes...\n');

    // Columnas a agregar en SUBTAREAS
    const columnasSubtareas = [
      { nombre: 'codigo_unico_proceso', sql: "VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER codigo_olympo" },
      { nombre: 'estado', sql: "ENUM('pendiente', 'en_proceso', 'completado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente' AFTER codigo_unico_proceso" },
      { nombre: 'gestion_gasto_o_proyecto', sql: "ENUM('Gasto', 'Proyecto') COLLATE utf8mb4_unicode_ci DEFAULT 'Gasto' AFTER pac_no_pac" },
      { nombre: 'tipo_contratacion', sql: "VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER gestion_gasto_o_proyecto" },
      { nombre: 'fuente_financiamiento', sql: "VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER partida_presupuestaria" },
      { nombre: 'avance_general', sql: "INT DEFAULT 0 AFTER procedimiento_sugerido" }
    ];

    console.log('🔧 Actualizando tabla SUBTAREAS:\n');
    for (const col of columnasSubtareas) {
      try {
        await connection.query(
          `ALTER TABLE subtareas ADD COLUMN ${col.nombre} ${col.sql}`
        );
        console.log(`  ✅ Agregada columna: ${col.nombre}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ℹ️  Columna ya existe: ${col.nombre}`);
        } else {
          console.error(`  ❌ Error agregando ${col.nombre}:`, error.message);
        }
      }
    }

    // Columnas a agregar en SUBTAREAS_VERSIONES
    const columnasVersiones = [
      { nombre: 'nombre', sql: "VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER id" },
      { nombre: 'codigo_unico_proceso', sql: "VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER codigo_olympo" },
      { nombre: 'estado', sql: "ENUM('pendiente', 'en_proceso', 'completado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente' AFTER codigo_unico_proceso" },
      { nombre: 'gestion_gasto_o_proyecto', sql: "ENUM('Gasto', 'Proyecto') COLLATE utf8mb4_unicode_ci DEFAULT 'Gasto' AFTER pac_no_pac" },
      { nombre: 'tipo_contratacion', sql: "VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER gestion_gasto_o_proyecto" },
      { nombre: 'fuente_financiamiento', sql: "VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER partida_presupuestaria" },
      { nombre: 'avance_general', sql: "INT DEFAULT 0 AFTER procedimiento_sugerido" }
    ];

    console.log('\n🔧 Actualizando tabla SUBTAREAS_VERSIONES:\n');
    for (const col of columnasVersiones) {
      try {
        await connection.query(
          `ALTER TABLE subtareas_versiones ADD COLUMN ${col.nombre} ${col.sql}`
        );
        console.log(`  ✅ Agregada columna: ${col.nombre}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ℹ️  Columna ya existe: ${col.nombre}`);
        } else {
          console.error(`  ❌ Error agregando ${col.nombre}:`, error.message);
        }
      }
    }

    console.log('\n✅ Migración completada');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

agregarColumnas();
