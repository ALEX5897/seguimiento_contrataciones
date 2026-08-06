import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../.env');
dotenv.config({ path: ENV_PATH });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function habilitarEtapaContrato() {
  try {
    const conn = await pool.getConnection();

    console.log('🔧 Habilitando etapa CONTRATO en procesos deshabilitados...\n');

    // Obtener etapa CONTRATO
    const [etapasContrato] = await conn.query(`
      SELECT id FROM etapas_catalogo WHERE nombre = 'CONTRATO' LIMIT 1
    `);

    const etapaContratoId = etapasContrato[0].id;

    // Obtener procesos activos con presupuesto que tienen CONTRATO deshabilitada
    const [procesos] = await conn.query(`
      SELECT DISTINCT se.subtarea_id, s.nombre, s.pac_no_pac
      FROM subtareas_etapas se
      JOIN subtareas s ON se.subtarea_id = s.id
      WHERE se.etapa_id = ?
        AND se.aplica = 0
        AND s.activo = 1
        AND s.presupuesto_2026_inicial > 0
      ORDER BY se.subtarea_id
    `, [etapaContratoId]);

    console.log(`📊 Procesos a habilitar: ${procesos.length}\n`);

    if (procesos.length === 0) {
      console.log('✨ No hay procesos con etapa CONTRATO deshabilitada.\n');
      await conn.release();
      await pool.end();
      return;
    }

    let habilitados = 0;
    let errores = 0;

    // Habilitar cada proceso
    for (const proceso of procesos) {
      try {
        await conn.query(`
          UPDATE subtareas_etapas
          SET aplica = 1
          WHERE subtarea_id = ? AND etapa_id = ?
        `, [proceso.subtarea_id, etapaContratoId]);

        console.log(`✅ [${proceso.subtarea_id}] ${proceso.nombre}`);
        habilitados++;
      } catch (error) {
        console.log(`❌ [${proceso.subtarea_id}] ${proceso.nombre} - Error: ${error.message}`);
        errores++;
      }
    }

    console.log(`\n📈 Resumen:`);
    console.log(`   ✅ Habilitados correctamente: ${habilitados}`);
    console.log(`   ❌ Errores: ${errores}\n`);

    if (habilitados > 0) {
      console.log('✨ ¡Etapas habilitadas exitosamente!');
    }

    await conn.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

habilitarEtapaContrato();
