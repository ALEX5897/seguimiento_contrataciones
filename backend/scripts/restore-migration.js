import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (!args[0]) {
  console.error('❌ Uso: node restore-migration.js <archivo_migracion.sql>');
  console.error('   Ejemplo: node restore-migration.js migrations/2026-09-16T15-55-58_complete_migration.sql');
  process.exit(1);
}

const migrationFile = path.isAbsolute(args[0])
  ? args[0]
  : path.join(__dirname, '..', args[0]);

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Archivo no encontrado: ${migrationFile}`);
  process.exit(1);
}

console.log(`📂 Leyendo: ${migrationFile}`);
const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '@Alex.1995',
  multipleStatements: true
});

try {
  console.log('⏳ Ejecutando migración...');
  await connection.query(migrationSQL);
  console.log('✅ Migración restaurada exitosamente');
  await connection.end();
} catch (error) {
  console.error('❌ Error al restaurar migración:', error.message);
  await connection.end();
  process.exit(1);
}
