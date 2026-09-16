import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
});

try {
  console.log('🔧 RESTAURANDO BASE DE DATOS...');

  const backupFile = path.join(__dirname, 'backup_poa_pac_2026-08-28T17-06-32.sql');

  if (!fs.existsSync(backupFile)) {
    console.log('❌ Archivo de backup no encontrado:', backupFile);
    process.exit(1);
  }

  console.log('📂 Leyendo archivo SQL...');
  const sqlContent = fs.readFileSync(backupFile, 'utf8');

  console.log('⏳ Importando SQL a MySQL (esto puede tomar un momento)...');

  // Dividir por statements y ejecutar
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements`);

  for (let i = 0; i < statements.length; i++) {
    if (i % 50 === 0) {
      console.log(`  Ejecutando statement ${i + 1}/${statements.length}...`);
    }
    try {
      await conn.query(statements[i]);
    } catch (err) {
      if (err.code === 'ER_DB_CREATE_EXISTS' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        // Ignorar errores de objeto ya existente
      } else {
        console.error(`Error en statement ${i}: ${err.message}`);
      }
    }
  }

  console.log('✅ Backup restaurado exitosamente');

  // Verificar tablas de permisos
  console.log('\nVerificando tablas de permisos...');
  const [tables] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE '%permiso%'",
    [process.env.DB_NAME]
  );

  console.log('Tablas encontradas:');
  tables.forEach(t => console.log('  ✓', t.TABLE_NAME));

  // Contar registros en permisos_modulos_catalogo
  try {
    const [result] = await conn.query('SELECT COUNT(*) as count FROM permisos_modulos_catalogo');
    console.log(`\n✅ Tabla permisos_modulos_catalogo: ${result[0].count} registros`);
  } catch (err) {
    console.log('⚠️ Tabla permisos_modulos_catalogo aún no disponible');
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
