import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function copiar() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 COPIAR SEGUIMIENTO - ESTRATEGIA DIRECTA SQL');
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
    // 1. Leer backup y crear tablas temporales
    console.log('1️⃣ Leyendo archivo backup...');
    const backupSQL = fs.readFileSync('backup_poa_pac_2026-08-28T17-06-32.sql', 'utf-8');
    console.log(`   ✅ ${(backupSQL.length / 1024 / 1024).toFixed(1)}MB\n`);

    // 2. Extraer solo los INSERT que necesitamos
    console.log('2️⃣ Procesando SQL del backup...');

    // Encontrar y ejecutar CREATE TABLE para las 3 tablas que necesitamos
    const tablesNeeded = ['subtareas', 'subtareas_etapas', 'seguimiento_etapas'];
    const statements = [];

    for (const tableName of tablesNeeded) {
      // Regex para encontrar DROP + CREATE de la tabla
      const regexCreate = new RegExp(`DROP TABLE IF EXISTS ${tableName}.*?CREATE TABLE \`${tableName}\`[^;]*;`, 'is');
      const match = backupSQL.match(regexCreate);

      if (match) {
        statements.push(match[0]);
      }

      // Regex para encontrar el INSERT de la tabla
      const regexInsert = new RegExp(`INSERT INTO ${tableName}[^;]*;`, 'is');
      const matchInsert = backupSQL.match(regexInsert);

      if (matchInsert) {
        statements.push(matchInsert[0]);
      }
    }

    // 3. Crear BD temporal con los datos
    const bdTemp = `backup_temp_${Date.now()}`;
    console.log(`3️⃣ Creando BD temporal: ${bdTemp}`);

    await conn.query(`CREATE DATABASE IF NOT EXISTS ${bdTemp}`);
    console.log('   ✅ BD creada\n');

    const connTemp = await conn.query(`USE ${bdTemp}`);

    // 4. Ejecutar statements en la BD temporal
    console.log('4️⃣ Cargando datos en BD temporal...\n');

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        const tableName = stmt.match(/(?:DROP|CREATE|INSERT INTO) `?(\w+)`?/i)?.[1];
        if (tableName) {
          console.log(`   ✅ ${tableName}`);
        }
      } catch (e) {
        // Algunos errores son aceptables (tablas ya existen, etc)
        if (!e.message.includes('already exists')) {
          console.log(`   ⚠️  ${e.message.substring(0, 80)}`);
        }
      }
    }

    console.log('\n5️⃣ Copiando etapas y seguimiento...\n');

    // 5. Copiar etapas desde BD temporal a BD principal
    const versionId = 14; // Reforma 10

    // Actualizar USE a DB principal
    await conn.query(`USE ${process.env.DB_NAME}`);

    // Copiar etapas
    const sqlEtapas = `
      INSERT IGNORE INTO subtareas_etapas (subtarea_id, etapa_id, fecha_tentativa, fecha_reforma, fecha_reforma_3, fecha_planificada, aplica)
      SELECT
        p.id,
        be.etapa_id,
        be.fecha_tentativa,
        be.fecha_reforma,
        be.fecha_reforma_3,
        be.fecha_planificada,
        be.aplica
      FROM ${bdTemp}.subtareas bs
      INNER JOIN ${bdTemp}.subtareas_etapas be ON be.subtarea_id = bs.id
      INNER JOIN procesos p ON p.codigo_olympo = bs.codigo_olympo AND p.version_id = ${versionId}
    `;

    const [resEtapas] = await conn.query(sqlEtapas);
    console.log(`   ✅ Etapas: ${resEtapas.affectedRows} registros insertados`);

    // Copiar seguimientos
    const sqlSeguimiento = `
      INSERT IGNORE INTO seguimiento_etapas (subtarea_id, etapa_id, estado, fecha_real, observaciones, responsable, created_at, updated_at)
      SELECT
        p.id,
        bse.etapa_id,
        bse.estado,
        bse.fecha_real,
        bse.observaciones,
        bse.responsable,
        bse.created_at,
        bse.updated_at
      FROM ${bdTemp}.subtareas bs
      INNER JOIN ${bdTemp}.seguimiento_etapas bse ON bse.subtarea_id = bs.id
      INNER JOIN procesos p ON p.codigo_olympo = bs.codigo_olympo AND p.version_id = ${versionId}
    `;

    const [resSeguimiento] = await conn.query(sqlSeguimiento);
    console.log(`   ✅ Seguimientos: ${resSeguimiento.affectedRows} registros insertados\n`);

    // 6. Verificar resultado
    console.log('6️⃣ Verificando resultado...');
    const [etapasTotal] = await conn.query(
      `SELECT COUNT(*) as cnt FROM subtareas_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ${versionId})`
    );

    const [seguimientosTotal] = await conn.query(
      `SELECT COUNT(*) as cnt FROM seguimiento_etapas WHERE subtarea_id IN (SELECT id FROM procesos WHERE version_id = ${versionId})`
    );

    console.log(`   Total etapas en Reforma 10: ${etapasTotal[0].cnt}`);
    console.log(`   Total seguimientos: ${seguimientosTotal[0].cnt}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ COPIA COMPLETADA');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🎯 Próximos pasos:');
    console.log('   1. Recarga el navegador (Ctrl+F5)');
    console.log('   2. Los procesos ahora tienen etapas y seguimiento\n');

    // 7. Limpiar BD temporal
    console.log('7️⃣ Limpiando...');
    try {
      await conn.query(`DROP DATABASE ${bdTemp}`);
      console.log('   ✅ BD temporal eliminada\n');
    } catch (e) {
      console.log('   ⚠️  BD temporal pendiente de eliminar\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await conn.release();
    await pool.end();
  }
}

copiar().then(() => process.exit(0));
