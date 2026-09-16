import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiar() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR SEGUIMIENTO CON ESTRATEGIA SQL');
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
    // 1. Verificar que Reforma 10 existe
    console.log('1️⃣ Verificando Reforma 10...');
    const [versionReforma] = await conn.query(
      'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
    );

    if (versionReforma.length === 0) {
      throw new Error('Reforma 10 no encontrada');
    }

    const versionId = versionReforma[0].id;
    console.log(`   ✅ ID: ${versionId}\n`);

    // 2. Leer archivo SQL del backup
    console.log('2️⃣ Leyendo backup SQL...');
    const backupSQL = fs.readFileSync('backup_poa_pac_2026-08-28T17-06-32.sql', 'utf-8');
    console.log(`   ✅ ${(backupSQL.length / 1024 / 1024).toFixed(1)}MB leído\n`);

    // 3. Ejecutar el SQL del backup en una BD nueva
    console.log('3️⃣ Creando BD temporal para backup...');
    const bdTemp = 'poa_pac_backup_temp_' + Date.now();

    try {
      await conn.query(`CREATE DATABASE ${bdTemp}`);
      console.log(`   ✅ BD creada: ${bdTemp}\n`);

      // Crear conexión a BD temporal
      const connTemp = await pool.getConnection();

      try {
        // 4. Restaurar estructura de tablas necesarias
        console.log('4️⃣ Restaurando tablas...');

        // Ejecutar el SQL del backup
        const statements = backupSQL.split(';').filter(s => s.trim());

        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i].trim();

          if (!stmt) continue;

          // Ejecutar solo statements para tablas que necesitamos
          if (
            stmt.includes('DROP TABLE') ||
            stmt.includes('CREATE TABLE') ||
            (stmt.includes('INSERT INTO') && (
              stmt.includes('subtareas') ||
              stmt.includes('subtareas_etapas') ||
              stmt.includes('seguimiento_etapas')
            ))
          ) {
            try {
              // Cambiar database en el statement si es necesario
              const stmtWithDB = stmt.replace(/\bpoa_pac\b/g, bdTemp);

              await conn.query(stmtWithDB);

              if ((i + 1) % 10 === 0) {
                process.stdout.write('.');
              }
            } catch (e) {
              // Algunos statements pueden fallar, es ok
              if (!e.message.includes('already exists')) {
                // Ignorar errores de tablas ya existentes
              }
            }
          }
        }

        console.log('\n   ✅ Tablas restauradas\n');

        // 5. Hacer el matching y copiar
        console.log('5️⃣ Copiando datos...\n');

        // Obtener procesos del backup
        const [procesosBackup] = await conn.query(
          `SELECT id, codigo_olympo FROM ${bdTemp}.subtareas LIMIT 10`
        );

        console.log(`   Procesos del backup encontrados: ${procesosBackup.length}\n`);

        // Copiar etapas
        const copiaEtapas = `
          INSERT INTO subtareas_etapas (subtarea_id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica)
          SELECT
            p.id as subtarea_id,
            be.etapa_id,
            be.fecha_tentativa,
            be.fecha_reforma,
            be.fecha_reforma_3,
            be.fecha_planificada,
            be.aplica
          FROM ${bdTemp}.subtareas bs
          JOIN subtareas_etapas be ON be.subtarea_id = bs.id
          JOIN procesos p ON p.codigo_olympo = bs.codigo_olympo AND p.version_id = ${versionId}
          WHERE NOT EXISTS (
            SELECT 1 FROM subtareas_etapas se
            WHERE se.subtarea_id = p.id AND se.etapa_id = be.etapa_id
          )
          ON DUPLICATE KEY UPDATE aplica = VALUES(aplica)
        `;

        console.log('   Copiando etapas...');
        const resultEtapas = await conn.query(copiaEtapas);
        console.log(`   ✅ ${resultEtapas[0].affectedRows} etapas copiadas\n`);

        // Copiar seguimientos
        const copiaSeguimiento = `
          INSERT INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_real, observaciones, responsable, created_at, updated_at)
          SELECT
            p.id as subtarea_id,
            bse.etapa_id,
            bse.estado,
            bse.fecha_real,
            bse.observaciones,
            bse.responsable,
            bse.created_at,
            bse.updated_at
          FROM ${bdTemp}.subtareas bs
          JOIN seguimiento_etapas bse ON bse.subtarea_id = bs.id
          JOIN procesos p ON p.codigo_olympo = bs.codigo_olympo AND p.version_id = ${versionId}
          WHERE NOT EXISTS (
            SELECT 1 FROM seguimiento_etapas se
            WHERE se.subtarea_id = p.id AND se.etapa_id = bse.etapa_id
          )
          ON DUPLICATE KEY UPDATE estado = VALUES(estado)
        `;

        console.log('   Copiando seguimientos...');
        const resultSeguimiento = await conn.query(copiaSeguimiento);
        console.log(`   ✅ ${resultSeguimiento[0].affectedRows} seguimientos copiados\n`);

        // 6. Verificar resultado
        console.log('6️⃣ Verificando resultado...');
        const [etapasFinales] = await conn.query(
          'SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
          [versionId]
        );

        const [seguimientosFinales] = await conn.query(
          'SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ?)',
          [versionId]
        );

        console.log(`   Etapas en Reforma 10: ${etapasFinales[0].cnt}`);
        console.log(`   Seguimientos en Reforma 10: ${seguimientosFinales[0].cnt}\n`);

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ COPIA COMPLETADA');
        console.log('═══════════════════════════════════════════════════════\n');

      } finally {
        await connTemp.release();
      }

    } finally {
      // Eliminar BD temporal
      try {
        await conn.query(`DROP DATABASE ${bdTemp}`);
      } catch (e) {
        console.log('   ⚠️  BD temporal no eliminada (puede limpiarla manualmente)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

copiar().then(() => process.exit(0));
