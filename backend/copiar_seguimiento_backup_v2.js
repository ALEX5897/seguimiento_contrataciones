import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiarSeguimientoDelBackup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR SEGUIMIENTO DEL BACKUP (sin restaurar BD)');
  console.log('═══════════════════════════════════════════════════════\n');

  let pool1;
  let pool2;

  try {
    // 1. Conectar a BD principal (Reforma 10)
    console.log('1️⃣ Conectando a BD principal...');
    pool1 = await mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('   ✅ Conectado\n');

    const conn1 = await pool1.getConnection();

    try {
      // 2. Obtener Reforma 10 ID y procesos
      console.log('2️⃣ Obteniendo Reforma 10...');
      const [versionReforma] = await conn1.query(
        'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
      );

      if (versionReforma.length === 0) {
        throw new Error('Reforma 10 no encontrada');
      }

      const versionId = versionReforma[0].id;
      console.log(`   ✅ ID: ${versionId}`);

      const [procesosReforma10] = await conn1.query(
        'SELECT id, codigo_olympo FROM procesos WHERE version_id = ? AND activo = 1',
        [versionId]
      );

      const mapaCodigosR10 = new Map(
        procesosReforma10.map(p => [p.codigo_olympo, p.id])
      );

      console.log(`   ✅ ${procesosReforma10.length} procesos en Reforma 10\n`);

      // 3. Procesar archivo SQL del backup
      console.log('3️⃣ Analizando archivo de backup...');
      const backupPath = 'backup_poa_pac_2026-08-28T17-06-32.sql';

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Archivo ${backupPath} no encontrado`);
      }

      // Leer el archivo línea por línea para extraer datos
      const contenidoBackup = fs.readFileSync(backupPath, 'utf-8');
      console.log(`   ✅ Archivo leído (${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(1)}MB)\n`);

      // 4. Extraer datos de subtareas del backup
      console.log('4️⃣ Extrayendo datos del backup...');

      // Regex para encontrar INSERT INTO subtareas
      const regexSubtareas = /INSERT INTO subtareas \([^)]+\) VALUES\s*([\s\S]*?);/i;
      const matchSubtareas = contenidoBackup.match(regexSubtareas);

      if (!matchSubtareas) {
        throw new Error('No se encontraron datos de subtareas en el backup');
      }

      // Parsear valores
      const valoresStr = matchSubtareas[1];
      const filas = valoresStr.split(/\),\s*\(/);

      let procesosBackupMap = new Map();
      let contador = 0;

      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i]
          .replace(/^\(/, '')
          .replace(/\)$/, '')
          .trim();

        if (!fila) continue;

        // Parsear valores CSV
        const valores = [];
        let actual = '';
        let enComillas = false;

        for (let j = 0; j < fila.length; j++) {
          const char = fila[j];
          const prev = j > 0 ? fila[j - 1] : '';

          if (char === "'" && prev !== '\\') {
            enComillas = !enComillas;
          } else if (char === ',' && !enComillas) {
            valores.push(actual.trim());
            actual = '';
            continue;
          }
          actual += char;
        }
        valores.push(actual.trim());

        if (valores.length >= 4) {
          const id = parseInt(valores[0]);
          const codigoOlympo = valores[3]?.replace(/^'|'$/g, '').trim();

          if (codigoOlympo) {
            procesosBackupMap.set(id, { id, codigoOlympo });
            contador++;
          }
        }
      }

      console.log(`   ✅ ${contador} procesos del backup analizados\n`);

      // 5. Conectar a BD temporal (leer backup directamente)
      console.log('5️⃣ Leyendo etapas y seguimiento del backup...\n');

      let etapasCopias = 0;
      let seguimientoCopias = 0;
      let procesosConDatos = 0;
      let procesosNoEncontrados = 0;

      // Regex para subtareas_etapas
      const regexEtapas = /INSERT INTO subtareas_etapas \([^)]+\) VALUES\s*([\s\S]*?);/i;
      const matchEtapas = contenidoBackup.match(regexEtapas);

      if (!matchEtapas) {
        console.log('   ⚠️  No hay etapas en el backup\n');
      } else {
        // Extraer etapas
        const valoresEtapasStr = matchEtapas[1];
        const filasEtapas = valoresEtapasStr.split(/\),\s*\(/);

        console.log(`   📌 Procesando ${filasEtapas.length} registros de etapas...\n`);

        const mapEtapasPorSubtarea = new Map();

        for (let i = 0; i < filasEtapas.length; i++) {
          const fila = filasEtapas[i]
            .replace(/^\(/, '')
            .replace(/\)$/, '')
            .trim();

          if (!fila) continue;

          const valores = [];
          let actual = '';
          let enComillas = false;

          for (let j = 0; j < fila.length; j++) {
            const char = fila[j];
            if (char === "'" && (j === 0 || fila[j - 1] !== '\\')) {
              enComillas = !enComillas;
            } else if (char === ',' && !enComillas) {
              valores.push(actual.trim());
              actual = '';
              continue;
            }
            actual += char;
          }
          valores.push(actual.trim());

          if (valores.length >= 3) {
            const subtareaId = parseInt(valores[1]);
            const etapaId = parseInt(valores[2]);

            const procesoBackup = procesosBackupMap.get(subtareaId);
            if (procesoBackup) {
              const procesoR10Id = mapaCodigosR10.get(procesoBackup.codigoOlympo);

              if (procesoR10Id) {
                if (!mapEtapasPorSubtarea.has(procesoR10Id)) {
                  mapEtapasPorSubtarea.set(procesoR10Id, []);
                }
                mapEtapasPorSubtarea.get(procesoR10Id).push({
                  subtareaId,
                  etapaId,
                  fila: valores
                });
              }
            }
          }
        }

        console.log(`   ✅ ${mapEtapasPorSubtarea.size} procesos con etapas encontrados\n`);

        // 6. Copiar etapas a BD principal
        console.log('6️⃣ Copiando etapas a Reforma 10...\n');

        for (const [procesoR10Id, etapas] of mapEtapasPorSubtarea) {
          for (const etapa of etapas) {
            try {
              const [existe] = await conn1.query(
                'SELECT id FROM subtareas_etapas WHERE subtarea_id = ? AND etapa_id = ?',
                [procesoR10Id, etapa.etapaId]
              );

              if (existe.length === 0) {
                await conn1.query(
                  'INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica) VALUES (?, ?, ?)',
                  [procesoR10Id, etapa.etapaId, 1]
                );
                etapasCopias++;
              }
            } catch (e) {
              // Ignorar duplicados
            }
          }
        }

        console.log(`   ✅ ${etapasCopias} etapas copiadas\n`);
      }

      // 7. Leer y copiar seguimiento
      console.log('7️⃣ Copiando seguimiento...\n');

      const regexSeguimiento = /INSERT INTO seguimiento_etapas \([^)]+\) VALUES\s*([\s\S]*?);/i;
      const matchSeguimiento = contenidoBackup.match(regexSeguimiento);

      if (matchSeguimiento) {
        const valuesSeguimientoStr = matchSeguimiento[1];
        const filasSeguimiento = valuesSeguimientoStr.split(/\),\s*\(/);

        console.log(`   📌 Procesando ${filasSeguimiento.length} registros de seguimiento...\n`);

        let processadosSeg = 0;

        for (let i = 0; i < filasSeguimiento.length; i++) {
          const fila = filasSeguimiento[i]
            .replace(/^\(/, '')
            .replace(/\)$/, '')
            .trim();

          if (!fila) continue;

          const valores = [];
          let actual = '';
          let enComillas = false;

          for (let j = 0; j < fila.length; j++) {
            const char = fila[j];
            if (char === "'" && (j === 0 || fila[j - 1] !== '\\')) {
              enComillas = !enComillas;
            } else if (char === ',' && !enComillas) {
              valores.push(actual.trim());
              actual = '';
              continue;
            }
            actual += char;
          }
          valores.push(actual.trim());

          if (valores.length >= 3) {
            const subtareaIdBackup = parseInt(valores[1]);
            const etapaId = parseInt(valores[2]);
            const estado = valores[3]?.replace(/^'|'$/g, '').trim() || 'pendiente';

            const procesoBackup = procesosBackupMap.get(subtareaIdBackup);
            if (procesoBackup) {
              const procesoR10Id = mapaCodigosR10.get(procesoBackup.codigoOlympo);

              if (procesoR10Id) {
                try {
                  const [existe] = await conn1.query(
                    'SELECT id FROM seguimiento_etapas WHERE subtarea_id = ? AND etapa_id = ? LIMIT 1',
                    [procesoR10Id, etapaId]
                  );

                  if (existe.length === 0) {
                    await conn1.query(
                      'INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado) VALUES (?, ?, ?)',
                      [procesoR10Id, etapaId, estado]
                    );
                    seguimientoCopias++;
                  }
                } catch (e) {
                  // Ignorar
                }
              }
            }
          }

          processadosSeg++;
          if (processadosSeg % 5000 === 0) {
            console.log(`   ⏳ ${processadosSeg}/${filasSeguimiento.length} registros...`);
          }
        }

        console.log(`   ✅ ${seguimientoCopias} seguimientos copiados\n`);
      }

      // 8. Verificar resultado
      console.log('8️⃣ Verificando resultado final...\n');

      const [etapasFinales] = await conn1.query(
        'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
        [versionId]
      );

      const [seguimientosFinales] = await conn1.query(
        'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
        [versionId]
      );

      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ COPIA COMPLETADA');
      console.log('═══════════════════════════════════════════════════════\n');

      console.log('📊 RESUMEN:');
      console.log(`   Etapas copiadas: ${etapasCopias}`);
      console.log(`   Seguimientos copiados: ${seguimientoCopias}`);
      console.log(`   Total etapas en Reforma 10: ${etapasFinales[0].cnt}`);
      console.log(`   Total seguimientos en Reforma 10: ${seguimientosFinales[0].cnt}\n`);

      console.log('🎯 Próximos pasos:');
      console.log('   1. Recarga el navegador (Ctrl+F5)');
      console.log('   2. Verifica que los procesos muestren sus etapas y seguimiento');
      console.log('   3. Confirma que los estados (completado/pendiente) se vean correctamente\n');

    } finally {
      await conn1.release();
      await pool1.end();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

copiarSeguimientoDelBackup().then(() => process.exit(0));
