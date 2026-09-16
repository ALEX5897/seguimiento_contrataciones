import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiarFinal() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR ETAPAS Y SEGUIMIENTO - OPCIÓN A (FINAL)');
  console.log('═══════════════════════════════════════════════════════\n');

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  const conn = await pool.getConnection();

  try {
    // 1. Leer backup
    console.log('1️⃣ Leyendo backup...');
    const fileStream = fs.createReadStream('backup_poa_pac_2026-08-28T17-06-32.sql');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const procesosBackup = new Map();
    const etapasBackup = [];
    const seguimientosBackup = [];

    let inSubtareas = false;
    let inSubtareasEtapas = false;
    let inSeguimiento = false;
    let subtareasColIdx = {};
    let etapasColIdx = {};
    let seguimientoColIdx = {};

    for await (const line of rl) {
      const trimmed = line.trim();

      if (trimmed.startsWith('INSERT INTO subtareas (')) {
        inSubtareas = true;
        inSubtareasEtapas = false;
        inSeguimiento = false;

        const colsMatch = trimmed.match(/\(([^)]+)\)/);
        if (colsMatch) {
          const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
          cols.forEach((col, idx) => {
            subtareasColIdx[col] = idx;
          });
        }
        continue;
      }

      if (trimmed.startsWith('INSERT INTO subtareas_etapas (')) {
        inSubtareas = false;
        inSubtareasEtapas = true;
        inSeguimiento = false;

        const colsMatch = trimmed.match(/\(([^)]+)\)/);
        if (colsMatch) {
          const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
          cols.forEach((col, idx) => {
            etapasColIdx[col] = idx;
          });
        }
        continue;
      }

      if (trimmed.startsWith('INSERT INTO seguimiento_etapas (')) {
        inSubtareas = false;
        inSubtareasEtapas = false;
        inSeguimiento = true;

        const colsMatch = trimmed.match(/\(([^)]+)\)/);
        if (colsMatch) {
          const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
          cols.forEach((col, idx) => {
            seguimientoColIdx[col] = idx;
          });
        }
        continue;
      }

      if (trimmed.match(/^\(\d+/)) {
        if (inSubtareas) {
          const row = parseCSVRow(trimmed);
          if (row) {
            const id = parseInt(row[subtareasColIdx['id']]);
            let codigo = row[subtareasColIdx['codigo_olympo']]?.trim() || '';
            codigo = codigo.replace(/^'|'$/g, '');

            if (id && codigo) {
              procesosBackup.set(codigo, { id, codigo });
            }
          }
        } else if (inSubtareasEtapas) {
          const row = parseCSVRow(trimmed);
          if (row) {
            etapasBackup.push(row);
          }
        } else if (inSeguimiento) {
          const row = parseCSVRow(trimmed);
          if (row) {
            seguimientosBackup.push(row);
          }
        }
      }
    }

    console.log(`   ✅ ${procesosBackup.size} procesos extraídos`);
    console.log(`   ✅ ${etapasBackup.length} etapas extraídas`);
    console.log(`   ✅ ${seguimientosBackup.length} seguimientos extraídos\n`);

    // 2. Copiar usando SQL puro (con JOIN para obtener el ID correcto de subtareas)
    console.log('2️⃣ Copiando etapas y seguimientos...\n');

    // Crear tabla temporal con datos del backup
    await conn.query('DROP TEMPORARY TABLE IF EXISTS tmp_procesos_backup');
    await conn.query(`
      CREATE TEMPORARY TABLE tmp_procesos_backup (
        backup_id INT PRIMARY KEY,
        codigo_olympo VARCHAR(100),
        INDEX(codigo_olympo)
      )
    `);

    for (const [codigo, proc] of procesosBackup) {
      await conn.query(
        'INSERT INTO tmp_procesos_backup (backup_id, codigo_olympo) VALUES (?, ?)',
        [proc.id, codigo]
      );
    }

    console.log(`   ✅ Tabla temporal de procesos creada\n`);
    let etapasCopias = 0;

    for (const etapa of etapasBackup) {
      const subtareaIdBackup = parseInt(etapa[etapasColIdx['subtarea_id']]);
      const etapaId = parseInt(etapa[etapasColIdx['etapa_id']]);

      // Obtener el código_olympo del proceso backup
      const procesoBackup = Array.from(procesosBackup.values()).find(p => p.id === subtareaIdBackup);
      if (!procesoBackup) continue;

      // Obtener el subtarea_id de Reforma 10 correspondiente
      const [subtareaR10] = await conn.query(
        'SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1',
        [procesoBackup.codigo]
      );

      if (subtareaR10.length > 0) {
        try {
          const [res] = await conn.query(
            'INSERT IGNORE INTO subtareas_etapas (subtarea_id, etapa_id, aplica) VALUES (?, ?, 1)',
            [subtareaR10[0].id, etapaId]
          );

          if (res.affectedRows > 0) {
            etapasCopias++;
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (etapasCopias % 1000 === 0 && etapasCopias > 0) {
        process.stdout.write('.');
      }
    }

    console.log(`\n   ✅ ${etapasCopias} etapas copiadas\n`);

    // Copiar seguimientos
    let seguimientoCopias = 0;

    for (const seg of seguimientosBackup) {
      const subtareaIdBackup = parseInt(seg[seguimientoColIdx['subtarea_id']]);
      const etapaId = parseInt(seg[seguimientoColIdx['etapa_id']]);
      const estado = seg[seguimientoColIdx['estado']]?.trim().replace(/^'|'$/g, '') || 'pendiente';

      const procesoBackup = Array.from(procesosBackup.values()).find(p => p.id === subtareaIdBackup);
      if (!procesoBackup) continue;

      const [subtareaR10] = await conn.query(
        'SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1',
        [procesoBackup.codigo]
      );

      if (subtareaR10.length > 0) {
        try {
          const [res] = await conn.query(
            'INSERT IGNORE INTO seguimiento_etapas (subtarea_id, etapa_id, estado) VALUES (?, ?, ?)',
            [subtareaR10[0].id, etapaId, estado]
          );

          if (res.affectedRows > 0) {
            seguimientoCopias++;
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (seguimientoCopias % 1000 === 0 && seguimientoCopias > 0) {
        process.stdout.write('.');
      }
    }

    console.log(`\n   ✅ ${seguimientoCopias} seguimientos copiados\n`);

    // 3. Verificar
    console.log('3️⃣ Verificando resultado...');
    const [etapasTotal] = await conn.query(
      'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM subtareas WHERE codigo_olympo IN (SELECT codigo_olympo FROM procesos WHERE version_id = 14))'
    );

    const [seguimientosTotal] = await conn.query(
      'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM subtareas WHERE codigo_olympo IN (SELECT codigo_olympo FROM procesos WHERE version_id = 14))'
    );

    console.log(`   Etapas en Reforma 10: ${etapasTotal[0].cnt}`);
    console.log(`   Seguimientos en Reforma 10: ${seguimientosTotal[0].cnt}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ COPIA COMPLETADA');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🎯 Próximos pasos:');
    console.log('   1. Recarga el navegador (Ctrl+F5)');
    console.log('   2. Los procesos ahora tienen etapas y seguimiento del backup');
    console.log('   3. Verifica que los datos se muestren correctamente\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

function parseCSVRow(line) {
  const cleaned = line.replace(/,$/, '').replace(/;$/, '').trim();
  if (!cleaned.startsWith('(') || !cleaned.endsWith(')')) {
    return null;
  }

  const content = cleaned.substring(1, cleaned.length - 1);
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prev = i > 0 ? content[i - 1] : '';

    if (char === "'" && prev !== '\\') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

copiarFinal().then(() => process.exit(0));
