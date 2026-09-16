import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiarOpcionA() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR ETAPAS - SOLO PROCESOS COINCIDENTES (Opción A)');
  console.log('═══════════════════════════════════════════════════════\n');

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    // 1. Leer backup
    console.log('1️⃣ Leyendo backup...');
    const backupSQL = fs.readFileSync('backup_poa_pac_2026-08-28T17-06-32.sql', 'utf-8');
    console.log(`   ✅ ${(backupSQL.length / 1024 / 1024).toFixed(1)}MB\n`);

    // 2. Extraer INSERT INTO subtareas
    console.log('2️⃣ Extrayendo procesos del backup...');
    const regexSubtareas = /INSERT INTO subtareas \(([^)]+)\) VALUES\s*([\s\S]*?);/i;
    const matchSubtareas = backupSQL.match(regexSubtareas);

    if (!matchSubtareas) {
      throw new Error('No se encontró INSERT INTO subtareas');
    }

    const colsStr = matchSubtareas[1];
    const valuesStr = matchSubtareas[2];

    // Parsear columnas
    const cols = colsStr.split(',').map(c => c.trim().replace(/`/g, ''));
    const idxId = cols.indexOf('id');
    const idxCodigoOlympo = cols.indexOf('codigo_olympo');

    // Dividir por filas (cada fila es un conjunto de paréntesis)
    // Usar regex que respete paréntesis anidados y comillas
    const filas = [];
    let current = '';
    let parenLevel = 0;
    let inQuotes = false;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      const prev = i > 0 ? valuesStr[i - 1] : '';

      if (char === "'" && prev !== '\\') {
        inQuotes = !inQuotes;
      } else if (char === '(' && !inQuotes) {
        parenLevel++;
      } else if (char === ')' && !inQuotes) {
        parenLevel--;
        if (parenLevel === 0 && current.trim()) {
          filas.push(current);
          current = '';
          continue;
        }
      }

      current += char;
    }

    // Procesar filas y extraer codigo_olympo
    const procesosBackup = new Map(); // codigo_olympo -> { id, codigo_olympo }

    for (const fila of filas) {
      const valores = [];
      let actual = '';
      let inQuotes = false;

      for (let i = 0; i < fila.length; i++) {
        const char = fila[i];
        const prev = i > 0 ? fila[i - 1] : '';

        if (char === "'" && prev !== '\\') {
          inQuotes = !inQuotes;
          actual += char;
        } else if (char === ',' && !inQuotes) {
          valores.push(actual.trim());
          actual = '';
        } else {
          actual += char;
        }
      }
      valores.push(actual.trim());

      if (valores.length > Math.max(idxId, idxCodigoOlympo)) {
        const id = parseInt(valores[idxId]);
        let codigo = valores[idxCodigoOlympo]?.replace(/^'|'$/g, '').trim();

        if (id && codigo && codigo !== 'NULL') {
          procesosBackup.set(codigo, { id, codigo });
        }
      }
    }

    console.log(`   ✅ ${procesosBackup.size} procesos extraídos del backup\n`);

    // 3. Obtener procesos de Reforma 10
    console.log('3️⃣ Obteniendo procesos de Reforma 10...');
    const [procesosR10] = await conn.query(
      'SELECT id, codigo_olympo FROM procesos WHERE version_id = 14 AND activo = 1'
    );

    console.log(`   ✅ ${procesosR10.length} procesos en Reforma 10\n`);

    // 4. Encontrar coincidencias
    console.log('4️⃣ Encontrando coincidencias...');
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
      console.log('⚠️  No hay coincidencias. Verifica los códigos.\n');
      process.exit(0);
    }

    // 5. Extraer etapas del backup
    console.log('5️⃣ Extrayendo etapas del backup...');
    const regexEtapas = /INSERT INTO subtareas_etapas \(([^)]+)\) VALUES\s*([\s\S]*?);/i;
    const matchEtapas = backupSQL.match(regexEtapas);

    if (!matchEtapas) {
      throw new Error('No se encontraron etapas en el backup');
    }

    const colsEtapas = matchEtapas[1].split(',').map(c => c.trim().replace(/`/g, ''));
    const idxSubtareaId = colsEtapas.indexOf('subtarea_id');
    const idxEtapaId = colsEtapas.indexOf('etapa_id');
    const idxFechaTentativa = colsEtapas.indexOf('fecha_tentativa');
    const idxFechaReforma = colsEtapas.indexOf('fecha_reforma');
    const idxFechaReforma3 = colsEtapas.indexOf('fecha_reforma_3');
    const idxFechaPlanificada = colsEtapas.indexOf('fecha_planificada');
    const idxAplica = colsEtapas.indexOf('aplica');

    // Parsear etapas
    const etapasBackup = [];
    const valuesEtapas = matchEtapas[2];
    current = '';
    parenLevel = 0;
    inQuotes = false;

    for (let i = 0; i < valuesEtapas.length; i++) {
      const char = valuesEtapas[i];
      const prev = i > 0 ? valuesEtapas[i - 1] : '';

      if (char === "'" && prev !== '\\') {
        inQuotes = !inQuotes;
      } else if (char === '(' && !inQuotes) {
        parenLevel++;
      } else if (char === ')' && !inQuotes) {
        parenLevel--;
        if (parenLevel === 0 && current.trim()) {
          const valores = [];
          let actual = '';
          inQuotes = false;

          for (let j = 0; j < current.length; j++) {
            const c = current[j];
            const p = j > 0 ? current[j - 1] : '';

            if (c === "'" && p !== '\\') {
              inQuotes = !inQuotes;
              actual += c;
            } else if (c === ',' && !inQuotes) {
              valores.push(actual.trim());
              actual = '';
            } else {
              actual += c;
            }
          }
          valores.push(actual.trim());

          if (valores.length > Math.max(idxSubtareaId, idxEtapaId)) {
            etapasBackup.push(valores);
          }

          current = '';
          continue;
        }
      }
      current += char;
    }

    console.log(`   ✅ ${etapasBackup.length} etapas extraídas\n`);

    // 6. Copiar etapas para procesos coincidentes
    console.log('6️⃣ Copiando etapas a Reforma 10...\n');

    let etapasCopias = 0;
    const mapBackupToR10 = new Map(coincidencias.map(c => [c.idBackup, c.idReforma10]));

    for (const etapa of etapasBackup) {
      const subtareaIdBackup = parseInt(etapa[idxSubtareaId]);
      const subtareaIdR10 = mapBackupToR10.get(subtareaIdBackup);

      if (subtareaIdR10) {
        const etapaId = parseInt(etapa[idxEtapaId]);
        const fechaTentativa = etapa[idxFechaTentativa]?.replace(/^'|'$/g, '') || null;
        const fechaReforma = etapa[idxFechaReforma]?.replace(/^'|'$/g, '') || null;
        const fechaReforma3 = etapa[idxFechaReforma3]?.replace(/^'|'$/g, '') || null;
        const fechaPlanificada = etapa[idxFechaPlanificada]?.replace(/^'|'$/g, '') || null;
        const aplica = parseInt(etapa[idxAplica]) || 1;

        try {
          await conn.query(
            'INSERT IGNORE INTO subtareas_etapas (subtarea_id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [subtareaIdR10, etapaId, fechaTentativa, fechaReforma, fechaReforma3, fechaPlanificada, aplica]
          );
          etapasCopias++;
        } catch (e) {
          // Ignorar duplicados
        }
      }
    }

    console.log(`   ✅ ${etapasCopias} etapas insertadas\n`);

    // 7. Extraer y copiar seguimientos
    console.log('7️⃣ Extrayendo seguimientos del backup...');
    const regexSeguimiento = /INSERT INTO seguimiento_etapas \(([^)]+)\) VALUES\s*([\s\S]*?);/i;
    const matchSeguimiento = backupSQL.match(regexSeguimiento);

    if (!matchSeguimiento) {
      console.log('   ⚠️  No se encontraron seguimientos\n');
    } else {
      const colsSeguimiento = matchSeguimiento[1].split(',').map(c => c.trim().replace(/`/g, ''));
      const idxSubtareaIdSeg = colsSeguimiento.indexOf('subtarea_id');
      const idxEtapaIdSeg = colsSeguimiento.indexOf('etapa_id');
      const idxEstado = colsSeguimiento.indexOf('estado');
      const idxFechaReal = colsSeguimiento.indexOf('fecha_real');
      const idxObservaciones = colsSeguimiento.indexOf('observaciones');
      const idxResponsable = colsSeguimiento.indexOf('responsable');
      const idxCreatedAt = colsSeguimiento.indexOf('created_at');
      const idxUpdatedAt = colsSeguimiento.indexOf('updated_at');

      const valuesSeguimiento = matchSeguimiento[2];
      current = '';
      parenLevel = 0;
      inQuotes = false;
      let seguimientoCopias = 0;

      for (let i = 0; i < valuesSeguimiento.length; i++) {
        const char = valuesSeguimiento[i];
        const prev = i > 0 ? valuesSeguimiento[i - 1] : '';

        if (char === "'" && prev !== '\\') {
          inQuotes = !inQuotes;
        } else if (char === '(' && !inQuotes) {
          parenLevel++;
        } else if (char === ')' && !inQuotes) {
          parenLevel--;
          if (parenLevel === 0 && current.trim()) {
            const valores = [];
            let actual = '';
            inQuotes = false;

            for (let j = 0; j < current.length; j++) {
              const c = current[j];
              const p = j > 0 ? current[j - 1] : '';

              if (c === "'" && p !== '\\') {
                inQuotes = !inQuotes;
                actual += c;
              } else if (c === ',' && !inQuotes) {
                valores.push(actual.trim());
                actual = '';
              } else {
                actual += c;
              }
            }
            valores.push(actual.trim());

            const subtareaIdBackup = parseInt(valores[idxSubtareaIdSeg]);
            const subtareaIdR10 = mapBackupToR10.get(subtareaIdBackup);

            if (subtareaIdR10 && valores.length > Math.max(idxEtapaIdSeg, idxEstado)) {
              const etapaId = parseInt(valores[idxEtapaIdSeg]);
              const estado = valores[idxEstado]?.replace(/^'|'$/g, '') || 'pendiente';
              const fechaReal = valores[idxFechaReal]?.replace(/^'|'$/g, '') || null;
              const observaciones = valores[idxObservaciones]?.replace(/^'|'$/g, '') || null;
              const responsable = valores[idxResponsable]?.replace(/^'|'$/g, '') || null;
              const createdAt = valores[idxCreatedAt]?.replace(/^'|'$/g, '') || new Date();
              const updatedAt = valores[idxUpdatedAt]?.replace(/^'|'$/g, '') || new Date();

              try {
                await conn.query(
                  'INSERT IGNORE INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_real, observaciones, responsable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  [subtareaIdR10, etapaId, estado, fechaReal, observaciones, responsable, createdAt, updatedAt]
                );
                seguimientoCopias++;
              } catch (e) {
                // Ignorar
              }
            }

            current = '';
            continue;
          }
        }
        current += char;
      }

      console.log(`   ✅ ${seguimientoCopias} seguimientos insertados\n`);
    }

    // 8. Verificar
    console.log('8️⃣ Verificando resultado...');
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
    console.log(`   ✅ Procesos coincidentes: ${coincidencias.length}`);
    console.log(`   ✅ Etapas copiadas: ${etapasCopias}`);
    console.log(`   ✅ Total etapas en Reforma 10: ${etapasTotal[0].cnt}`);
    console.log(`   ✅ Total seguimientos en Reforma 10: ${seguimientosTotal[0].cnt}\n`);

    console.log('🎯 Próximos pasos:');
    console.log('   1. Recarga el navegador (Ctrl+F5)');
    console.log('   2. ${coincidencias.length} procesos ahora tienen etapas del backup');
    console.log('   3. Los otros procesos no tienen etapas (nueva función)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

copiarOpcionA().then(() => process.exit(0));
