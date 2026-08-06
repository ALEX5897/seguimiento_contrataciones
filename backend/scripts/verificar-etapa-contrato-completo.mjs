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

async function verificarCompleto() {
  try {
    const conn = await pool.getConnection();

    console.log('🔍 Verificación COMPLETA de etapa CONTRATO en procesos activos con presupuesto\n');

    // Obtener etapa CONTRATO
    const [etapasContrato] = await conn.query(`
      SELECT id FROM etapas_catalogo WHERE nombre = 'CONTRATO' LIMIT 1
    `);

    const etapaContratoId = etapasContrato[0].id;

    // Procesos activos con presupuesto
    const [procesos] = await conn.query(`
      SELECT id, nombre, pac_no_pac
      FROM subtareas
      WHERE activo = 1 AND presupuesto_2026_inicial > 0
      ORDER BY id
    `);

    console.log(`Total de procesos activos con presupuesto: ${procesos.length}\n`);

    let conContratoAplicable = [];
    let conContratoDeshabilitada = [];
    let sinContratoAsignada = [];

    for (const proceso of procesos) {
      const [etapas] = await conn.query(`
        SELECT aplica
        FROM subtareas_etapas
        WHERE subtarea_id = ? AND etapa_id = ?
        LIMIT 1
      `, [proceso.id, etapaContratoId]);

      if (etapas.length === 0) {
        // No tiene la etapa asignada
        sinContratoAsignada.push(proceso);
      } else if (etapas[0].aplica === 1) {
        // Tiene la etapa con aplica = 1
        conContratoAplicable.push(proceso);
      } else {
        // Tiene la etapa con aplica = 0
        conContratoDeshabilitada.push(proceso);
      }
    }

    console.log(`✅ Con etapa CONTRATO aplicable (aplica=1): ${conContratoAplicable.length}`);
    console.log(`⚠️  Con etapa CONTRATO deshabilitada (aplica=0): ${conContratoDeshabilitada.length}`);
    console.log(`❌ Sin etapa CONTRATO asignada: ${sinContratoAsignada.length}\n`);

    if (conContratoDeshabilitada.length > 0) {
      console.log('📋 Procesos con etapa CONTRATO DESHABILITADA (aplica=0):');
      console.log('='.repeat(100));
      conContratoDeshabilitada.forEach((p, idx) => {
        console.log(`${idx + 1}. [ID: ${p.id}] ${p.nombre} (${p.pac_no_pac})`);
      });
      console.log('='.repeat(100));
      console.log();
    }

    if (sinContratoAsignada.length > 0) {
      console.log('📋 Procesos SIN etapa CONTRATO asignada:');
      console.log('='.repeat(100));
      sinContratoAsignada.forEach((p, idx) => {
        console.log(`${idx + 1}. [ID: ${p.id}] ${p.nombre} (${p.pac_no_pac})`);
      });
      console.log('='.repeat(100));
      console.log();
    }

    const totalProblemas = conContratoDeshabilitada.length + sinContratoAsignada.length;
    console.log(`\n🔴 TOTAL DE PROCESOS CON PROBLEMAS: ${totalProblemas}\n`);

    if (totalProblemas > 0) {
      console.log('💡 ACCIÓN REQUERIDA:');
      console.log(`   - Habilitar ${conContratoDeshabilitada.length} procesos (aplica=0 → aplica=1)`);
      console.log(`   - Asignar ${sinContratoAsignada.length} procesos (nueva asignación)\n`);
    }

    await conn.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarCompleto();
