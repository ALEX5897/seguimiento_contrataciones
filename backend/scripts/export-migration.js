import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../migrations');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '@Alex.1995',
  database: process.env.DB_NAME || 'test_migracion'
});

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const migrationFile = path.join(migrationsDir, `${timestamp}_complete_migration.sql`);

let migrationSQL = `-- Complete Database Migration
-- Generated: ${new Date().toISOString()}
-- Database: ${process.env.DB_NAME || 'test_migracion'}

SET FOREIGN_KEY_CHECKS=0;

`;

try {
  // Get all tables
  const [tables] = await connection.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
    [process.env.DB_NAME || 'test_migracion']
  );

  console.log(`📊 Encontradas ${tables.length} tablas`);

  for (const { TABLE_NAME } of tables) {
    console.log(`  ├─ Extrayendo: ${TABLE_NAME}`);

    // Get CREATE TABLE statement
    const [createTable] = await connection.execute(
      `SHOW CREATE TABLE ${TABLE_NAME}`
    );

    migrationSQL += `\n-- Table: ${TABLE_NAME}\n`;
    migrationSQL += `DROP TABLE IF EXISTS ${TABLE_NAME};\n`;
    migrationSQL += createTable[0]['Create Table'] + ';\n';

    // Get table data
    const [rows] = await connection.execute(`SELECT * FROM ${TABLE_NAME}`);

    if (rows.length > 0) {
      migrationSQL += `\n-- Data for ${TABLE_NAME}\n`;

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return val;
        });

        migrationSQL += `INSERT INTO ${TABLE_NAME} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
    }
  }

  migrationSQL += `\nSET FOREIGN_KEY_CHECKS=1;\n`;
  migrationSQL += `\n-- Migration completed: ${new Date().toISOString()}\n`;

  fs.writeFileSync(migrationFile, migrationSQL, 'utf8');

  const sizeKB = (migrationSQL.length / 1024).toFixed(2);
  console.log(`\n✅ Migración creada exitosamente`);
  console.log(`📁 Archivo: ${migrationFile}`);
  console.log(`📦 Tamaño: ${sizeKB} KB`);
  console.log(`📊 Tablas: ${tables.length}`);

  await connection.end();
} catch (error) {
  console.error('❌ Error durante la migración:', error.message);
  process.exit(1);
}
