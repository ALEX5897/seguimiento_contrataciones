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

async function verificarProcesoEspecifico() {
  try {
    const conn = await pool.getConnection();

    console.log('🔍 Buscando proceso: "Alquiler de instalaciones para las evaluaciones prácticas..."\n');

    // Buscar el proceso
    const [procesos] = await conn.query(`
      SELECT id, nombre, pac_no_pac, presupuesto_2026_inicial, activo
      FROM subtareas
      WHERE nombre LIKE '%Alquiler de instalaciones%evaluaciones%'
      LIMIT 1
    `);

    if (procesos.length === 0) {
      console.log('❌ Proceso no encontrado');
      await conn.release();
      await pool.end();
      process.exit(1);
    }

    const proceso = procesos[0];
    console.log(`✅ Proceso encontrado:`);
    console.log(`   ID: ${proceso.id}`);
    console.log(`   Nombre: ${proceso.nombre}`);
    console.log(`   PAC/NO PAC: ${proceso.pac_no_pac}`);
    console.log(`   Presupuesto: ${proceso.presupuesto_2026_inicial}`);
    console.log(`   Activo: ${proceso.activo}\n`);

    console.log('📋 Etapas asignadas a este proceso:\n');

    // Obtener todas las etapas asignadas
    const [etapas] = await conn.query(`
      SELECT
        se.id,
        se.etapa_id,
        ec.nombre,
        ec.clasificacion,
        se.aplica,
        se.fecha_tentativa,
        se.fecha_reforma
      FROM subtareas_etapas se
      LEFT JOIN etapas_catalogo ec ON se.etapa_id = ec.id
      WHERE se.subtarea_id = ?
      ORDER BY ec.nombre
    `, [proceso.id]);

    if (etapas.length === 0) {
      console.log('❌ Este proceso NO tiene etapas asignadas');
    } else {
      console.log(`Total de etapas asignadas: ${etapas.length}\n`);

      etapas.forEach((e, idx) => {
        const aplicaLabel = e.aplica === 1 ? '✅' : '❌';
        const prefix = idx === etapas.length - 1 ? '└─' : '├─';
        const fecha = e.fecha_tentativa ? ` (${e.fecha_tentativa})` : '';
        console.log(`${prefix} ${aplicaLabel} [${e.etapa_id}] ${e.nombre} (${e.clasificacion})${fecha}`);
      });

      // Verificar específicamente si tiene CONTRATO
      const tieneContrato = etapas.some(e =>
        e.nombre && e.nombre.toUpperCase().includes('CONTRATO')
      );

      console.log(`\n${tieneContrato ? '✅' : '❌'} ¿Tiene etapa CONTRATO? ${tieneContrato ? 'SÍ' : 'NO'}`);
    }

    console.log('\n---\n');

    // Verificar si hay etapa CONTRATO en el catálogo
    const [etapaContrato] = await conn.query(`
      SELECT id, nombre, clasificacion
      FROM etapas_catalogo
      WHERE nombre = 'CONTRATO'
    `);

    if (etapaContrato.length > 0) {
      const ec = etapaContrato[0];
      console.log(`📌 Etapa CONTRATO disponible en catálogo:`);
      console.log(`   ID: ${ec.id}`);
      console.log(`   Nombre: ${ec.nombre}`);
      console.log(`   Clasificación: ${ec.clasificacion}\n`);

      // Verificar si este proceso tiene esta etapa específica
      const [tieneEtapa] = await conn.query(`
        SELECT COUNT(*) as cantidad
        FROM subtareas_etapas
        WHERE subtarea_id = ? AND etapa_id = ?
      `, [proceso.id, ec.id]);

      if (tieneEtapa[0].cantidad > 0) {
        console.log(`✅ Este proceso SÍ tiene asignada la etapa CONTRATO (ID: ${ec.id})`);
      } else {
        console.log(`❌ Este proceso NO tiene asignada la etapa CONTRATO (ID: ${ec.id})`);
        console.log(`\n💡 Se debe agregar manualmente o con un script.\n`);
      }
    }

    await conn.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarProcesoEspecifico();
