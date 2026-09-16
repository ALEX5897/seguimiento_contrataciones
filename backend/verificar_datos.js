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
    console.log('Verificando datos en BD...\n');

    const [etapas] = await conn.query(
      'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = 14)'
    );

    const [seg] = await conn.query(
      'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = 14)'
    );

    const [allEtapas] = await conn.query('SELECT COUNT(*) as cnt FROM subtareas_etapas');
    const [allSeg] = await conn.query('SELECT COUNT(*) as cnt FROM seguimiento_etapas');

    console.log('En Reforma 10 (version_id = 14):');
    console.log(`  Etapas: ${etapas[0].cnt}`);
    console.log(`  Seguimientos: ${seg[0].cnt}`);

    console.log('\nTotal en BD:');
    console.log(`  Etapas: ${allEtapas[0].cnt}`);
    console.log(`  Seguimientos: ${allSeg[0].cnt}`);

    // Ver si hay datos en general
    const [muestraEtapas] = await conn.query('SELECT subtarea_id, etapa_id FROM subtareas_etapas LIMIT 5');
    const [muestraSeg] = await conn.query('SELECT subtarea_id, etapa_id, estado FROM seguimiento_etapas LIMIT 5');

    if (muestraEtapas.length > 0) {
      console.log('\nMuestra de etapas:');
      muestraEtapas.forEach(e => {
        console.log(`  subtarea_id=${e.subtarea_id}, etapa_id=${e.etapa_id}`);
      });
    }

  } finally {
    await conn.release();
    await pool.end();
  }
})();
