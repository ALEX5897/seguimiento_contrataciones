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

async function verificarEtapasContrato() {
  try {
    const conn = await pool.getConnection();

    console.log('🔍 Verificando presencia de etapa "contrato" en procesos...\n');

    // Obtener todos los procesos activos con presupuesto
    const [procesos] = await conn.query(`
      SELECT id, nombre, pac_no_pac
      FROM subtareas
      WHERE activo = 1 AND presupuesto_2026_inicial > 0
      ORDER BY id
    `);

    console.log(`Total de procesos activos con presupuesto: ${procesos.length}\n`);

    let sinEtapaContrato = [];
    let conEtapaContrato = [];

    // Para cada proceso, verificar si tiene la etapa "contrato"
    for (const proceso of procesos) {
      const [etapas] = await conn.query(`
        SELECT DISTINCT ec.nombre, ec.clasificacion
        FROM subtareas_etapas se
        JOIN etapas_catalogo ec ON se.etapa_id = ec.id
        WHERE se.subtarea_id = ? AND se.aplica = 1
      `, [proceso.id]);

      const tieneContrato = etapas.some(e => {
        const nombreNorm = (e.nombre || '').toLowerCase().trim();
        return nombreNorm.includes('contrato') || nombreNorm.includes('contratacion');
      });

      if (tieneContrato) {
        conEtapaContrato.push(proceso);
      } else {
        sinEtapaContrato.push(proceso);
      }
    }

    console.log(`✅ Procesos CON etapa "contrato": ${conEtapaContrato.length}`);
    console.log(`❌ Procesos SIN etapa "contrato": ${sinEtapaContrato.length}\n`);

    if (sinEtapaContrato.length > 0) {
      console.log('📋 Procesos SIN etapa "contrato":');
      console.log('='.repeat(100));
      sinEtapaContrato.forEach((p, idx) => {
        console.log(`${idx + 1}. [ID: ${p.id}] ${p.nombre} (${p.pac_no_pac})`);
      });
      console.log('='.repeat(100));

      console.log('\n💡 RECOMENDACIÓN:');
      console.log('Estos procesos NO tienen asignada la etapa "contrato" en subtareas_etapas.');
      console.log('Puede ser que:');
      console.log('1. No tengan la etapa asignada en la tabla subtareas_etapas');
      console.log('2. Tengan la etapa con aplica=0\n');

      // Mostrar detalle de etapas que tiene cada proceso sin contrato
      console.log('📊 Detalle de etapas de procesos SIN "contrato":\n');
      for (let i = 0; i < Math.min(5, sinEtapaContrato.length); i++) {
        const proceso = sinEtapaContrato[i];
        const [etapas] = await conn.query(`
          SELECT DISTINCT ec.nombre, se.aplica
          FROM subtareas_etapas se
          JOIN etapas_catalogo ec ON se.etapa_id = ec.id
          WHERE se.subtarea_id = ?
          ORDER BY ec.nombre
        `, [proceso.id]);

        console.log(`[${proceso.id}] ${proceso.nombre}`);
        if (etapas.length === 0) {
          console.log('  └─ ❌ SIN ETAPAS ASIGNADAS');
        } else {
          etapas.forEach((e, idx) => {
            const aplicaLabel = e.aplica === 1 ? '✅' : '❌';
            const prefix = idx === etapas.length - 1 ? '└─' : '├─';
            console.log(`  ${prefix} ${aplicaLabel} ${e.nombre}`);
          });
        }
        console.log();
      }
      if (sinEtapaContrato.length > 5) {
        console.log(`... y ${sinEtapaContrato.length - 5} procesos más sin mostrar detalle.\n`);
      }

      // Query para verificar qué etapas con "contrato" existen en el catálogo
      console.log('\n📋 Etapas "contrato" disponibles en el catálogo:\n');
      const [etapasContratoCatalogo] = await conn.query(`
        SELECT id, nombre, clasificacion
        FROM etapas_catalogo
        WHERE nombre LIKE '%contrato%' OR nombre LIKE '%contratacion%'
        ORDER BY nombre
      `);

      if (etapasContratoCatalogo.length > 0) {
        etapasContratoCatalogo.forEach((e) => {
          console.log(`  • [${e.id}] ${e.nombre} (${e.clasificacion})`);
        });
      } else {
        console.log('  ⚠️ No hay etapas con "contrato" en el catálogo');
      }
    } else {
      console.log('✨ PERFECTO: Todos los procesos tienen la etapa "contrato" asignada.\n');
    }

    await conn.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarEtapasContrato();
