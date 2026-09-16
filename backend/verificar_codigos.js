import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function verificar() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    const [versionReforma] = await conn.query(
      'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
    );
    const versionId = versionReforma[0].id;

    const [procesosR10] = await conn.query(
      'SELECT codigo_olympo FROM procesos WHERE version_id = ? LIMIT 20',
      [versionId]
    );

    console.log('📌 Primeros 20 códigos en Reforma 10:');
    procesosR10.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.codigo_olympo}`);
    });

    // Extraer del backup
    const contenido = fs.readFileSync('backup_poa_pac_2026-08-28T17-06-32.sql', 'utf-8');
    const regex = /INSERT INTO subtareas \([^)]+\) VALUES\s*([\s\S]*?);/i;
    const match = contenido.match(regex);

    if (match) {
      const valoresStr = match[1];
      const filas = valoresStr.split(/\),\s*\(/);

      console.log('\n📌 Primeros 20 códigos en Backup:');
      let count = 0;

      for (const fila of filas) {
        if (count >= 20) break;

        const f = fila.replace(/^\(/, '').replace(/\)$/, '').trim();
        if (!f) continue;

        const valores = f.split(',');
        if (valores.length >= 4) {
          const codigo = valores[3].replace(/^'|'$/g, '').trim();
          if (codigo) {
            console.log(`   ${count + 1}. ${codigo}`);
            count++;
          }
        }
      }
    }

  } finally {
    await conn.release();
    await pool.end();
  }
}

verificar().then(() => process.exit(0));
