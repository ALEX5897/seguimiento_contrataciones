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
    console.log('Activando Reforma 10 2026...\n');

    // Desactivar otras
    await conn.query('UPDATE versiones SET activa = 0 WHERE activa = 1');

    // Activar Reforma 10
    await conn.query(
      'UPDATE versiones SET activa = 1, estado = "activo" WHERE numero_reforma = 10 AND anio = 2026'
    );

    // Marcar otras como históricas
    await conn.query(
      'UPDATE versiones SET estado = "historico" WHERE numero_reforma < 10 AND anio = 2026 AND estado != "historico"'
    );

    console.log('✅ Reforma 10 activada');

    // Verificar
    const [versiones] = await conn.query(
      'SELECT id, numero_reforma, estado, activa FROM versiones WHERE anio = 2026 ORDER BY numero_reforma DESC'
    );

    console.log('\n📊 Estado actual:\n');
    versiones.forEach(v => {
      const status = v.activa ? '🟢 ACTIVA' : (v.estado === 'historico' ? '⚫ HISTÓRICA' : `⚪ ${v.estado}`);
      console.log(`   Reforma ${v.numero_reforma}: ${status}`);
    });

  } finally {
    await conn.release();
    await pool.end();
  }
})();
