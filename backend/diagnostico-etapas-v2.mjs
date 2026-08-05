import mysql from 'mysql2/promise';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

async function diagnostico() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // Buscar el proceso
    const [procesos] = await conn.execute(`
      SELECT id, nombre FROM subtareas
      WHERE nombre LIKE '%Adquisición de equipamiento audiovisual%'
      LIMIT 1
    `);

    if (procesos.length === 0) {
      console.log('Proceso no encontrado');
      return;
    }

    const proceso = procesos[0];
    console.log(`\n=== PROCESO: ${proceso.nombre} (ID: ${proceso.id}) ===\n`);

    // Primero verificar en subtareas_etapas
    console.log('Buscando en tabla subtareas_etapas...\n');
    const [etapasSubtareas] = await conn.execute(`
      SELECT
        se.id,
        se.etapa_id,
        ep.nombre,
        se.fecha_programada,
        se.estado
      FROM subtareas_etapas se
      LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
      WHERE se.subtarea_id = ?
      ORDER BY se.fecha_programada ASC
    `, [proceso.id]);

    console.log(`Total de etapas en subtareas_etapas: ${etapasSubtareas.length}\n`);

    if (etapasSubtareas.length > 0) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      let etapasEnRetraso = 0;

      console.log('ETAPAS CON RETRASO:');
      console.log('─'.repeat(120));

      for (const etapa of etapasSubtareas) {
        if (etapa.fecha_programada) {
          const fechaProgramada = new Date(etapa.fecha_programada);
          fechaProgramada.setHours(0, 0, 0, 0);

          if (fechaProgramada < hoy && etapa.estado !== 'completado') {
            etapasEnRetraso++;
            const dias = Math.floor((hoy - fechaProgramada) / (1000 * 60 * 60 * 24));
            console.log(`✗ ${etapa.nombre}`);
            console.log(`  Fecha programada: ${fechaProgramada.toISOString().split('T')[0]} (${dias} días de retraso)`);
            console.log(`  Estado: ${etapa.estado}`);
            console.log();
          }
        }
      }

      console.log('─'.repeat(120));
      console.log(`Total de etapas en retraso: ${etapasEnRetraso}`);
    }

    // También verificar en seguimiento_etapas
    console.log('\n\nBuscando en tabla seguimiento_etapas...\n');
    const [etapasSeguimiento] = await conn.execute(`
      SELECT
        se.id,
        se.etapa_id,
        ep.nombre,
        se.fecha_planificada,
        se.estado
      FROM seguimiento_etapas se
      LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
      WHERE se.subtarea_id = ?
      ORDER BY se.fecha_planificada ASC
    `, [proceso.id]);

    console.log(`Total de etapas en seguimiento_etapas: ${etapasSeguimiento.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

diagnostico();
