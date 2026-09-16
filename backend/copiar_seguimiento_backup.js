import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

const execAsync = promisify(exec);

async function copiarSeguimientoDelBackup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR ETAPAS Y SEGUIMIENTO DESDE BACKUP');
  console.log('═══════════════════════════════════════════════════════\n');

  let pool;

  try {
    // 1. Crear conexión a BD principal
    console.log('1️⃣ Conectando a BD principal...');
    pool = await mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('   ✅ Conectado\n');

    const conn = await pool.getConnection();

    try {
      // 2. Obtener Reforma 10 ID
      console.log('2️⃣ Obteniendo Reforma 10 2026...');
      const [versionReforma] = await conn.query(
        'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
      );

      if (versionReforma.length === 0) {
        throw new Error('Reforma 10 no encontrada');
      }

      const versionId = versionReforma[0].id;
      console.log(`   ✅ ID: ${versionId}\n`);

      // 3. Obtener códigos Olympo de Reforma 10
      console.log('3️⃣ Leyendo códigos de Reforma 10...');
      const [procesosReforma10] = await conn.query(
        'SELECT id, codigo_olympo FROM procesos WHERE version_id = ? AND activo = 1',
        [versionId]
      );

      const mapaCodigosR10 = new Map(
        procesosReforma10.map(p => [p.codigo_olympo, p.id])
      );

      console.log(`   ✅ ${procesosReforma10.length} procesos en Reforma 10\n`);

      // 4. Restaurar backup en BD temporal
      console.log('4️⃣ Restaurando backup en BD temporal...');
      console.log('   Este proceso puede tomar algunos minutos...\n');

      const bdTemporal = 'poa_pac_backup_temporal';
      const passwordEsc = process.env.DB_PASSWORD ? `-p"${process.env.DB_PASSWORD}"` : '';

      try {
        await execAsync(
          `mysql -h${process.env.DB_HOST} -u${process.env.DB_USER} ${passwordEsc} -e "DROP DATABASE IF EXISTS ${bdTemporal};"`
        );
      } catch (e) {
        // Ignorar
      }

      await execAsync(
        `mysql -h${process.env.DB_HOST} -u${process.env.DB_USER} ${passwordEsc} -e "CREATE DATABASE ${bdTemporal};"`
      );

      await execAsync(
        `mysql -h${process.env.DB_HOST} -u${process.env.DB_USER} ${passwordEsc} ${bdTemporal} < backup_poa_pac_2026-08-28T17-06-32.sql`,
        { maxBuffer: 50 * 1024 * 1024, timeout: 300000 }
      );

      console.log('   ✅ Backup restaurado\n');

      // 5. Conectar a BD temporal
      console.log('5️⃣ Conectando a BD temporal...');
      const poolTemp = await mysql.createPool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: bdTemporal
      });

      const connTemp = await poolTemp.getConnection();

      try {
        console.log('   ✅ Conectado\n');

        // 6. Copiar etapas y seguimiento
        console.log('6️⃣ Copiando etapas y seguimiento...\n');

        let etapasCopias = 0;
        let seguimientoCopias = 0;
        let procesosConDatos = 0;
        let procesosNoEncontrados = 0;

        const [procesosBackup] = await connTemp.query(
          'SELECT id, codigo_olympo FROM subtareas ORDER BY id'
        );

        console.log(`   Procesando ${procesosBackup.length} procesos del backup...\n`);

        for (const procesoBackup of procesosBackup) {
          const procesoR10Id = mapaCodigosR10.get(procesoBackup.codigo_olympo);

          if (!procesoR10Id) {
            procesosNoEncontrados++;
            continue;
          }

          const [etapasBackup] = await connTemp.query(
            'SELECT id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica FROM subtareas_etapas WHERE subtarea_id = ?',
            [procesoBackup.id]
          );

          if (etapasBackup.length === 0) {
            continue;
          }

          procesosConDatos++;

          for (const etapaBackup of etapasBackup) {
            const [etapaExiste] = await conn.query(
              'SELECT id FROM subtareas_etapas WHERE subtarea_id = ? AND etapa_id = ?',
              [procesoR10Id, etapaBackup.etapa_id]
            );

            if (etapaExiste.length === 0) {
              try {
                await conn.query(
                  'INSERT INTO subtareas_etapas (subtarea_id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [
                    procesoR10Id,
                    etapaBackup.etapa_id,
                    etapaBackup.fecha_tentativa,
                    etapaBackup.fecha_reforma,
                    etapaBackup.fecha_reforma_3,
                    etapaBackup.fecha_planificada,
                    etapaBackup.aplica
                  ]
                );
                etapasCopias++;
              } catch (e) {
                // Ignorar duplicados
              }
            }

            const [seguimientosBackup] = await connTemp.query(
              'SELECT estado, fecha_real, observaciones, responsable, created_at, updated_at FROM seguimiento_etapas WHERE subtarea_id = ? AND etapa_id = ?',
              [procesoBackup.id, etapaBackup.etapa_id]
            );

            for (const seg of seguimientosBackup) {
              try {
                await conn.query(
                  'INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_real, observaciones, responsable, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  [
                    procesoR10Id,
                    etapaBackup.etapa_id,
                    seg.estado,
                    seg.fecha_real,
                    seg.observaciones,
                    seg.responsable,
                    seg.created_at || new Date(),
                    seg.updated_at || new Date()
                  ]
                );
                seguimientoCopias++;
              } catch (e) {
                // Ignorar
              }
            }
          }

          if (procesosConDatos % 50 === 0) {
            console.log(`   ⏳ ${procesosConDatos} procesos procesados...`);
          }
        }

        console.log(`\n7️⃣ Resumen:\n`);
        console.log(`   Procesos del backup: ${procesosBackup.length}`);
        console.log(`   Procesos coincidentes: ${procesosConDatos}`);
        console.log(`   Procesos no encontrados: ${procesosNoEncontrados}`);
        console.log(`   Etapas copiadas: ${etapasCopias}`);
        console.log(`   Seguimientos copiados: ${seguimientoCopias}\n`);

        const [etapasEnR10] = await conn.query(
          'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
          [versionId]
        );

        const [seguimientosEnR10] = await conn.query(
          'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
          [versionId]
        );

        console.log('8️⃣ Verificando Reforma 10:');
        console.log(`   Etapas: ${etapasEnR10[0].cnt}`);
        console.log(`   Seguimientos: ${seguimientosEnR10[0].cnt}\n`);

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ COPIA COMPLETADA');
        console.log('═══════════════════════════════════════════════════════\n');

      } finally {
        await connTemp.release();
        await poolTemp.end();

        console.log('9️⃣ Limpiando BD temporal...');
        try {
          await execAsync(
            `mysql -h${process.env.DB_HOST} -u${process.env.DB_USER} ${passwordEsc} -e "DROP DATABASE ${bdTemporal};"`
          );
          console.log('   ✅ Eliminada\n');
        } catch (e) {
          console.log('   ⚠️  No se pudo eliminar (continuando)\n');
        }
      }

    } finally {
      await conn.release();
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

copiarSeguimientoDelBackup().then(() => process.exit(0));
