import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 VERIFICAR COINCIDENCIA DE CÓDIGOS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Procesos de Reforma 10
    const [r10] = await conn.query(
      'SELECT COUNT(*) as cnt FROM procesos WHERE version_id = 14 AND activo = 1'
    );

    console.log(`Reforma 10: ${r10[0].cnt} procesos`);
    console.log('Primeros 20 códigos:\n');

    const [r10Codigos] = await conn.query(
      'SELECT codigo_olympo FROM procesos WHERE version_id = 14 AND activo = 1 ORDER BY codigo_olympo LIMIT 20'
    );

    r10Codigos.forEach((p, i) => {
      console.log(`   ${(i + 1).toString().padStart(2)}. ${p.codigo_olympo}`);
    });

    // Contar AUTO-SN
    const [autoSN] = await conn.query(
      'SELECT COUNT(*) as cnt FROM procesos WHERE version_id = 14 AND codigo_olympo LIKE "AUTO-SN-%"'
    );

    console.log(`\n📌 Procesos con código AUTO-SN-X: ${autoSN[0].cnt}`);

    // Comparar con códigos que típicamente estarían en el backup
    console.log('\n📌 Tipos de códigos en Reforma 10:');
    const [tipos] = await conn.query(
      'SELECT SUBSTRING(codigo_olympo, 1, 3) as prefijo, COUNT(*) as cnt FROM procesos WHERE version_id = 14 AND activo = 1 GROUP BY prefijo ORDER BY cnt DESC LIMIT 10'
    );

    tipos.forEach(t => {
      console.log(`   ${t.prefijo}...: ${t.cnt} procesos`);
    });

  } finally {
    await conn.release();
    await pool.end();
  }
})();
