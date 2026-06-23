import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function obtenerResumen() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('\n=== RESUMEN DE PROCESOS ===\n');

    // 1. Suma total de presupuesto - procesos activos con presupuesto > 0, no desiertos
    const [resMontoTotal] = await connection.execute(`
      SELECT COALESCE(SUM(presupuesto_2026_inicial), 0) as monto_total
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
    `);
    console.log(`1. Monto total presupuesto: $${resMontoTotal[0].monto_total.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`);

    // 2. Suma de presupuesto de procesos PAC
    const [resMontoPAC] = await connection.execute(`
      SELECT COALESCE(SUM(presupuesto_2026_inicial), 0) as monto_pac
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
        AND UPPER(pac_no_pac) = 'PAC'
    `);
    console.log(`2. Monto presupuesto PAC: $${resMontoPAC[0].monto_pac.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`);

    // 3. Suma de presupuesto de procesos NO PAC
    const [resMontoNoPAC] = await connection.execute(`
      SELECT COALESCE(SUM(presupuesto_2026_inicial), 0) as monto_no_pac
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
        AND UPPER(pac_no_pac) = 'NO PAC'
    `);
    console.log(`3. Monto presupuesto NO PAC: $${resMontoNoPAC[0].monto_no_pac.toLocaleString('es-EC', { minimumFractionDigits: 2 })}`);

    // 4. Cantidad de procesos PAC
    const [resCantPAC] = await connection.execute(`
      SELECT COUNT(*) as cantidad
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
        AND UPPER(pac_no_pac) = 'PAC'
    `);
    console.log(`4. Cantidad procesos PAC: ${resCantPAC[0].cantidad}`);

    // 5. Cantidad de procesos NO PAC
    const [resCantNoPAC] = await connection.execute(`
      SELECT COUNT(*) as cantidad
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
        AND UPPER(pac_no_pac) = 'NO PAC'
    `);
    console.log(`5. Cantidad procesos NO PAC: ${resCantNoPAC[0].cantidad}`);

    // 6. Procesos con la última etapa en estado completo
    const [resProcesosCompletados] = await connection.execute(`
      SELECT COUNT(DISTINCT s.id) as cantidad
      FROM subtareas s
      WHERE s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND EXISTS (
          SELECT 1
          FROM (
            SELECT se.subtarea_id, se.etapa_id,
                   ROW_NUMBER() OVER (PARTITION BY se.subtarea_id ORDER BY ep.orden DESC) as rn
            FROM subtareas_etapas se
            JOIN etapas_pac ep ON ep.id = se.etapa_id
            WHERE se.aplica = 1
          ) last_etapa
          JOIN seguimiento_etapas sg ON sg.subtarea_id = last_etapa.subtarea_id
                                     AND sg.etapa_id = last_etapa.etapa_id
          WHERE last_etapa.subtarea_id = s.id
            AND last_etapa.rn = 1
            AND sg.estado = 'completo'
        )
    `);
    console.log(`6. Procesos con última etapa completa: ${resProcesosCompletados[0].cantidad}`);

    // 7. Procesos con al menos 1 etapa pendiente o tarde
    const [resProcesosConPendientes] = await connection.execute(`
      SELECT COUNT(DISTINCT s.id) as cantidad
      FROM subtareas s
      WHERE s.activo = 1
        AND s.presupuesto_2026_inicial > 0
        AND EXISTS (
          SELECT 1
          FROM subtareas_etapas se
          JOIN seguimiento_etapas sg ON sg.subtarea_id = se.subtarea_id AND sg.etapa_id = se.etapa_id
          WHERE se.subtarea_id = s.id
            AND se.aplica = 1
            AND sg.estado IN ('pendiente', 'atraso')
        )
    `);
    console.log(`7. Procesos con etapas pendientes o tarde: ${resProcesosConPendientes[0].cantidad}`);

    // 8. Procesos en estado de riesgo
    const [resProcesosRiesgo] = await connection.execute(`
      SELECT COUNT(*) as cantidad
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
        AND proceso_en_riesgo = 1
    `);
    console.log(`8. Procesos en estado de riesgo: ${resProcesosRiesgo[0].cantidad}`);

    // 9. Procesos con observación de riesgo (riesgo_comentario no vacío)
    const [resProcesosObservacionRiesgo] = await connection.execute(`
      SELECT COUNT(*) as cantidad
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial > 0
        AND riesgo_comentario IS NOT NULL
        AND TRIM(riesgo_comentario) != ''
    `);
    console.log(`9. Procesos con observación de riesgo: ${resProcesosObservacionRiesgo[0].cantidad}`);

    // 10. Procesos en estado desierto (activo = 2)
    const [resProcesoDesierto] = await connection.execute(`
      SELECT COUNT(*) as cantidad
      FROM subtareas
      WHERE activo = 2
    `);
    console.log(`10. Procesos en estado desierto: ${resProcesoDesierto[0].cantidad}`);

    // 11. Procesos con presupuesto 0
    const [resProcesosPresupuesto0] = await connection.execute(`
      SELECT COUNT(*) as cantidad
      FROM subtareas
      WHERE activo = 1
        AND presupuesto_2026_inicial <= 0
    `);
    console.log(`11. Procesos activos con presupuesto 0: ${resProcesosPresupuesto0[0].cantidad}`);

    console.log('\n=== FIN DEL RESUMEN ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

obtenerResumen();
