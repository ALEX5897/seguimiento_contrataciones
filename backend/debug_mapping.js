import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

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
    // Procesos del backup
    const fileStream = fs.createReadStream('backup_poa_pac_2026-08-28T17-06-32.sql');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const procesosBackup = new Map();
    let inSubtareas = false;
    let colIdx = {};

    for await (const line of rl) {
      if (line.includes('INSERT INTO subtareas (')) {
        inSubtareas = true;
        const colsMatch = line.match(/\(([^)]+)\)/);
        if (colsMatch) {
          const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
          cols.forEach((col, idx) => { colIdx[col] = idx; });
        }
        continue;
      }

      if (line.match(/^\(\d+/)) {
        if (inSubtareas) {
          const cleaned = line.replace(/,$/, '').replace(/;$/, '').trim();
          const content = cleaned.substring(1, cleaned.length - 1);
          const values = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const prev = i > 0 ? content[i - 1] : '';
            if (char === "'" && prev !== '\\') {
              inQuotes = !inQuotes;
              current += char;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const id = parseInt(values[colIdx['id']]);
          let codigo = values[colIdx['codigo_olympo']]?.trim() || '';
          codigo = codigo.replace(/^'|'$/g, '');

          if (id && codigo) {
            procesosBackup.set(codigo, { id, codigo });
          }
        }
      }

      if (line.includes('INSERT INTO subtareas_etapas')) {
        inSubtareas = false;
        break;
      }
    }

    console.log(`Procesos en backup: ${procesosBackup.size}\n`);

    // Procesos en Reforma 10
    const [procesosR10] = await conn.query(
      'SELECT id, codigo_olympo FROM procesos WHERE version_id = 14 LIMIT 10'
    );

    console.log('Primeros 10 procesos de Reforma 10:');
    procesosR10.forEach((p, i) => {
      const enBackup = procesosBackup.has(p.codigo_olympo) ? '✓' : '✗';
      const idBackup = procesosBackup.get(p.codigo_olympo)?.id || '?';
      console.log(`  ${String(i + 1).padStart(2)}. ID=${p.id}, codigo='${p.codigo_olympo}' ${enBackup} (backup_id=${idBackup})`);
    });

    // Contar coincidencias
    let coincidencias = 0;
    const [allR10] = await conn.query('SELECT codigo_olympo FROM procesos WHERE version_id = 14');
    for (const p of allR10) {
      if (procesosBackup.has(p.codigo_olympo)) {
        coincidencias++;
      }
    }

    console.log(`\nTotal coincidencias: ${coincidencias}`);

  } finally {
    await conn.release();
    await pool.end();
  }
})();
