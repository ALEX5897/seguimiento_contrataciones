import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiarOpcionAv2() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR ETAPAS - SOLO PROCESOS COINCIDENTES (v2)');
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
    // 1. Leer backup línea por línea
    console.log('1️⃣ Analizando backup (leyendo línea por línea)...');

    const fileStream = fs.createReadStream('backup_poa_pac_2026-08-28T17-06-32.sql', { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

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

      // Detectar sección de subtareas
      if (trimmed.startsWith('INSERT INTO subtareas (')) {
        inSubtareas = true;
        inSubtareasEtapas = false;
        inSeguimiento = false;

        // Extraer índices de columnas
        const colsMatch = trimmed.match(/\(([^)]+)\)/);
        if (colsMatch) {
          const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
          cols.forEach((col, idx) => {
            subtareasColIdx[col] = idx;
          });
        }
        continue;
      }

      // Detectar sección de subtareas_etapas
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

      // Detectar sección de seguimiento_etapas
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

      // Procesar filas de data
      if (trimmed.match(/^\(\d+/)) {
        if (inSubtareas) {
          // Parsear fila de subtareas
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

    console.log(`   ✅ ${procesosBackup.size} procesos del backup extraídos`);
    console.log(`   ✅ ${etapasBackup.length} etapas extraídas`);
    console.log(`   ✅ ${seguimientosBackup.length} seguimientos extraídos\n`);

    // 2. Obtener procesos de Reforma 10
    console.log('2️⃣ Obteniendo procesos de Reforma 10...');
    const [procesosR10] = await conn.query(
      'SELECT id, codigo_olympo FROM procesos WHERE version_id = 14 AND activo = 1'
    );

    console.log(`   ✅ ${procesosR10.length} procesos en Reforma 10\n`);

    // 3. Encontrar coincidencias
    console.log('3️⃣ Encontrando coincidencias...');
    const coincidencias = [];

    for (const p of procesosR10) {
      if (procesosBackup.has(p.codigo_olympo)) {
        coincidencias.push({
          idBackup: procesosBackup.get(p.codigo_olympo).id,
          idReforma10: p.id,
          codigo: p.codigo_olympo
        });
      }
    }

    console.log(`   ✅ ${coincidencias.length} procesos coinciden\n`);

    if (coincidencias.length === 0) {
      console.log('⚠️  No hay coincidencias.\n');
      process.exit(0);
    }

    // 4. Copiar etapas
    console.log('4️⃣ Copiando etapas...');
    const mapBackupToR10 = new Map(coincidencias.map(c => [c.idBackup, c.idReforma10]));

    let etapasCopias = 0;

    for (const etapa of etapasBackup) {
      const subtareaIdBackup = parseInt(etapa[etapasColIdx['subtarea_id']]);
      const subtareaIdR10 = mapBackupToR10.get(subtareaIdBackup);

      if (subtareaIdR10) {
        const etapaId = parseInt(etapa[etapasColIdx['etapa_id']]);

        try {
          await conn.query(
            'INSERT IGNORE INTO subtareas_etapas (subtarea_id, etapa_id, aplica) VALUES (?, ?, 1)',
            [subtareaIdR10, etapaId]
          );
          etapasCopias++;
        } catch (e) {
          // Ignorar
        }
      }
    }

    console.log(`   ✅ ${etapasCopias} etapas insertadas\n`);

    // 5. Copiar seguimientos
    console.log('5️⃣ Copiando seguimientos...');
    let seguimientoCopias = 0;

    for (const seg of seguimientosBackup) {
      const subtareaIdBackup = parseInt(seg[seguimientoColIdx['subtarea_id']]);
      const subtareaIdR10 = mapBackupToR10.get(subtareaIdBackup);

      if (subtareaIdR10) {
        const etapaId = parseInt(seg[seguimientoColIdx['etapa_id']]);
        const estado = seg[seguimientoColIdx['estado']]?.trim() || 'pendiente';

        try {
          await conn.query(
            'INSERT IGNORE INTO seguimiento_etapas (subtarea_id, etapa_id, estado) VALUES (?, ?, ?)',
            [subtareaIdR10, etapaId, estado]
          );
          seguimientoCopias++;
        } catch (e) {
          // Ignorar
        }
      }
    }

    console.log(`   ✅ ${seguimientoCopias} seguimientos insertados\n`);

    // 6. Verificar
    console.log('6️⃣ Verificando resultado...');
    const [etapasTotal] = await conn.query(
      'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = 14)'
    );

    const [seguimientosTotal] = await conn.query(
      'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = 14)'
    );

    console.log(`   Etapas en Reforma 10: ${etapasTotal[0].cnt}`);
    console.log(`   Seguimientos en Reforma 10: ${seguimientosTotal[0].cnt}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ COPIA COMPLETADA (OPCIÓN A)');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📊 RESUMEN:');
    console.log(`   ✅ Procesos en backup: ${procesosBackup.size}`);
    console.log(`   ✅ Procesos en Reforma 10: ${procesosR10.length}`);
    console.log(`   ✅ Procesos coincidentes: ${coincidencias.length}`);
    console.log(`   ✅ Etapas copiadas: ${etapasCopias}`);
    console.log(`   ✅ Seguimientos copiados: ${seguimientoCopias}\n`);

    console.log('🎯 Próximos pasos:');
    console.log('   1. Recarga el navegador (Ctrl+F5)');
    console.log(`   2. ${coincidencias.length} procesos ahora tienen etapas del backup`);
    console.log(`   3. Los otros ${procesosR10.length - coincidencias.length} procesos no tienen etapas\n`);

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

copiarOpcionAv2().then(() => process.exit(0));
