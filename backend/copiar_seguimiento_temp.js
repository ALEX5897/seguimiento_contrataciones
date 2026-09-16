import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiar() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR SEGUIMIENTO - USANDO TABLAS TEMPORALES');
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
    const backupSQL = fs.readFileSync('backup_poa_pac_2026-08-28T17-06-32.sql', 'utf-8');
    console.log(`   ✅ ${(backupSQL.length / 1024 / 1024).toFixed(1)}MB\n`);

    // 2. Extraer y ejecutar los inserts
    console.log('2️⃣ Creando tablas temporales...');

    // Limpiar tablas temporales si existen
    await conn.query('DROP TEMPORARY TABLE IF EXISTS tmp_subtareas').catch(() => {});
    await conn.query('DROP TEMPORARY TABLE IF EXISTS tmp_subtareas_etapas').catch(() => {});
    await conn.query('DROP TEMPORARY TABLE IF EXISTS tmp_seguimiento_etapas').catch(() => {});

    // Crear tablas temporales (misma estructura)
    await conn.query(`
      CREATE TEMPORARY TABLE tmp_subtareas (
        id INT PRIMARY KEY,
        codigo_olympo VARCHAR(100),
        nombre TEXT,
        INDEX(codigo_olympo)
      )
    `);

    await conn.query(`
      CREATE TEMPORARY TABLE tmp_subtareas_etapas (
        id INT PRIMARY KEY,
        subtarea_id INT,
        etapa_id INT,
        fecha_tentativa DATE,
        fecha_reforma DATE,
        fecha_reforma_3 DATE,
        fecha_planificada DATE,
        aplica TINYINT,
        INDEX(subtarea_id, etapa_id)
      )
    `);

    await conn.query(`
      CREATE TEMPORARY TABLE tmp_seguimiento_etapas (
        id INT PRIMARY KEY,
        subtarea_id INT,
        etapa_id INT,
        estado VARCHAR(50),
        fecha_real DATE,
        observaciones TEXT,
        responsable VARCHAR(255),
        created_at DATETIME,
        updated_at DATETIME,
        INDEX(subtarea_id, etapa_id)
      )
    `);

    console.log('   ✅ Tablas temporales creadas\n');

    // 3. Parsear y cargar datos del backup
    console.log('3️⃣ Extrayendo datos del backup...\n');

    // Extraer subtareas
    const regexSubtareas = /INSERT INTO subtareas \(([^)]+)\) VALUES\s*([\s\S]*?);/i;
    const matchSubtareas = backupSQL.match(regexSubtareas);

    if (!matchSubtareas) {
      throw new Error('No se encontró INSERT INTO subtareas en el backup');
    }

    const colsSubtareas = matchSubtareas[1].split(',').map(c => c.trim().replace(/`/g, ''));
    const idxId = colsSubtareas.indexOf('id');
    const idxCodigoOlympo = colsSubtareas.indexOf('codigo_olympo');

    const valuesSubtareas = matchSubtareas[2];
    const rowsSubtareas = [];
    const regexRow = /\(([^)]+)\)/g;
    let match;

    while ((match = regexRow.exec(valuesSubtareas)) !== null) {
      const rowStr = match[1];
      // Parse CSV values (simple approach)
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        const prev = i > 0 ? rowStr[i - 1] : '';

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

      if (values.length > Math.max(idxId, idxCodigoOlympo)) {
        const id = parseInt(values[idxId]);
        let codigo = values[idxCodigoOlympo]?.replace(/^'|'$/g, '').trim();

        if (id && codigo && codigo !== 'NULL') {
          rowsSubtareas.push([id, codigo]);
        }
      }
    }

    // Insertar en tabla temporal
    if (rowsSubtareas.length > 0) {
      for (const row of rowsSubtareas) {
        await conn.query('INSERT IGNORE INTO tmp_subtareas (id, codigo_olympo) VALUES (?, ?)', row);
      }
      console.log(`   ✅ ${rowsSubtareas.length} procesos del backup cargados`);
    }

    // Extraer subtareas_etapas
    const regexEtapas = /INSERT INTO subtareas_etapas \(([^)]+)\) VALUES\s*([\s\S]*?);/i;
    const matchEtapas = backupSQL.match(regexEtapas);

    if (matchEtapas) {
      const colsEtapas = matchEtapas[1].split(',').map(c => c.trim().replace(/`/g, ''));
      const idxSubtareaId = colsEtapas.indexOf('subtarea_id');
      const idxEtapaId = colsEtapas.indexOf('etapa_id');

      const valuesEtapas = matchEtapas[2];
      const regexRowE = /\(([^)]+)\)/g;

      let countEtapas = 0;
      while ((match = regexRowE.exec(valuesEtapas)) !== null && countEtapas < 20000) {
        const values = match[1].split(',').map(v => v.trim()).slice(0, Math.max(idxSubtareaId, idxEtapaId) + 1);

        if (values.length > Math.max(idxSubtareaId, idxEtapaId)) {
          const subtareaId = parseInt(values[idxSubtareaId]);
          const etapaId = parseInt(values[idxEtapaId]);

          if (subtareaId && etapaId) {
            await conn.query('INSERT IGNORE INTO tmp_subtareas_etapas (subtarea_id, etapa_id) VALUES (?, ?)', [subtareaId, etapaId]);
            countEtapas++;
          }
        }
      }
      console.log(`   ✅ ${countEtapas} etapas del backup cargadas`);
    }

    // Extraer seguimiento_etapas
    const regexSeguimiento = /INSERT INTO seguimiento_etapas \(([^)]+)\) VALUES\s*([\s\S]*?);/i;
    const matchSeguimiento = backupSQL.match(regexSeguimiento);

    if (matchSeguimiento) {
      const colsSeguimiento = matchSeguimiento[1].split(',').map(c => c.trim().replace(/`/g, ''));
      const idxSubtareaIdSeg = colsSeguimiento.indexOf('subtarea_id');
      const idxEtapaIdSeg = colsSeguimiento.indexOf('etapa_id');
      const idxEstado = colsSeguimiento.indexOf('estado');

      const valuesSeguimiento = matchSeguimiento[2];
      const regexRowS = /\(([^)]+)\)/g;

      let countSeguimientos = 0;
      while ((match = regexRowS.exec(valuesSeguimiento)) !== null && countSeguimientos < 20000) {
        const values = match[1].split(',').map(v => v.trim()).slice(0, Math.max(idxSubtareaIdSeg, idxEtapaIdSeg, idxEstado) + 1);

        if (values.length > Math.max(idxSubtareaIdSeg, idxEtapaIdSeg)) {
          const subtareaId = parseInt(values[idxSubtareaIdSeg]);
          const etapaId = parseInt(values[idxEtapaIdSeg]);
          const estado = values[idxEstado]?.replace(/^'|'$/g, '') || 'pendiente';

          if (subtareaId && etapaId) {
            await conn.query('INSERT IGNORE INTO tmp_seguimiento_etapas (subtarea_id, etapa_id, estado) VALUES (?, ?, ?)', [subtareaId, etapaId, estado]);
            countSeguimientos++;
          }
        }
      }
      console.log(`   ✅ ${countSeguimientos} seguimientos del backup cargados\n`);
    }

    // 4. Copiar a tablas principales usando JOIN
    console.log('4️⃣ Copiando a Reforma 10...\n');

    const versionId = 14;

    const etapasCopias = await conn.query(`
      INSERT IGNORE INTO subtareas_etapas (subtarea_id, etapa_id, aplica)
      SELECT p.id, te.etapa_id, 1
      FROM tmp_subtareas ts
      JOIN tmp_subtareas_etapas te ON te.subtarea_id = ts.id
      JOIN procesos p ON p.codigo_olympo = ts.codigo_olympo AND p.version_id = ?
    `, [versionId]);

    console.log(`   ✅ Etapas: ${etapasCopias[0].affectedRows} insertadas`);

    const seguimientoCopias = await conn.query(`
      INSERT IGNORE INTO seguimiento_etapas (subtarea_id, etapa_id, estado)
      SELECT p.id, tse.etapa_id, tse.estado
      FROM tmp_subtareas ts
      JOIN tmp_seguimiento_etapas tse ON tse.subtarea_id = ts.id
      JOIN procesos p ON p.codigo_olympo = ts.codigo_olympo AND p.version_id = ?
    `, [versionId]);

    console.log(`   ✅ Seguimientos: ${seguimientoCopias[0].affectedRows} insertados\n`);

    // 5. Verificar
    console.log('5️⃣ Verificando...');
    const [etapasTotal] = await conn.query(
      `SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)`,
      [versionId]
    );

    const [seguimientosTotal] = await conn.query(
      `SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)`,
      [versionId]
    );

    console.log(`   Etapas en Reforma 10: ${etapasTotal[0].cnt}`);
    console.log(`   Seguimientos en Reforma 10: ${seguimientosTotal[0].cnt}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ COPIA COMPLETADA');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

copiar().then(() => process.exit(0));
