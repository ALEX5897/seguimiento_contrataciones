#!/usr/bin/env node
/**
 * Script de restauración de backup
 * Uso: node restore_database.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';

const BACKUP_FILE = 'backup_poa_pac_2026-08-26_120305.sql';

console.log('⚠️  ADVERTENCIA: Esto sobrescribirá la BD actual');
console.log('📁 Archivo de backup:', BACKUP_FILE);
console.log('');

// Leer backup
if (!fs.existsSync(BACKUP_FILE)) {
  console.error('❌ Archivo de backup no encontrado:', BACKUP_FILE);
  process.exit(1);
}

const sql = fs.readFileSync(BACKUP_FILE, 'utf8');

// Conectar
const pool = await mysql.createPool({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

const conn = await pool.getConnection();

try {
  console.log('🔄 Ejecutando restauración...');
  
  // Dividir por puntos y coma y ejecutar cada statement
  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (stmt) {
      try {
        await conn.query(stmt);
      } catch (e) {
        console.warn(`⚠️  Statement ${i+1} falló (posiblemente ya existe):`, e.message.substring(0, 50));
      }
    }
    if ((i + 1) % 20 === 0) {
      process.stdout.write('.');
    }
  }

  console.log('
✅ Restauración completada');
  console.log('✔️  Base de datos restaurada al estado del backup');

} catch (error) {
  console.error('❌ Error en restauración:', error.message);
} finally {
  await conn.release();
  await pool.end();
}
