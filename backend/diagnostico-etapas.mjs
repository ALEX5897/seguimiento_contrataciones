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

    // Obtener todas las etapas del proceso
    const [etapas] = await conn.execute(`
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

    console.log(`Total de etapas: ${etapas.length}\n`);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let etapasEnRetraso = 0;
    let precontractualRetraso = 0;

    console.log('ETAPAS CON RETRASO:');
    console.log('─'.repeat(100));

    for (const etapa of etapas) {
      if (etapa.fecha_planificada) {
        const fechaProgramada = new Date(etapa.fecha_planificada);
        fechaProgramada.setHours(0, 0, 0, 0);

        if (fechaProgramada < hoy && etapa.estado !== 'completado') {
          etapasEnRetraso++;

          // Verificar si es precontractual
          const nombreNorm = (etapa.nombre || '').toLowerCase();
          const esPrecontractual = nombreNorm.includes('solicitud de publicación') ||
                                  nombreNorm.includes('publicación') ||
                                  nombreNorm.includes('entrega de proformas') ||
                                  nombreNorm.includes('estudio de mercado') ||
                                  nombreNorm.includes('certificación presupuestaria') ||
                                  nombreNorm.includes('certificación pac') ||
                                  nombreNorm.includes('autorización de inicio') ||
                                  nombreNorm.includes('elaboración de pliegos') ||
                                  nombreNorm.includes('resolución de inicio') ||
                                  nombreNorm.includes('fecha publicación') ||
                                  nombreNorm.includes('preguntas') ||
                                  nombreNorm.includes('respuestas') ||
                                  nombreNorm.includes('fecha límite') ||
                                  nombreNorm.includes('convalidaciones') ||
                                  nombreNorm.includes('calificación');

          if (esPrecontractual) {
            precontractualRetraso++;
          }

          const dias = Math.floor((hoy - fechaProgramada) / (1000 * 60 * 60 * 24));
          console.log(`✗ ${etapa.nombre}`);
          console.log(`  Fecha programada: ${fechaProgramada.toISOString().split('T')[0]} (${dias} días de retraso)`);
          console.log(`  Estado: ${etapa.estado}`);
          console.log();
        }
      }
    }

    console.log('─'.repeat(100));
    console.log(`\nTotal de etapas en retraso: ${etapasEnRetraso}`);
    console.log(`Etapas precontractual en retraso: ${precontractualRetraso}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

diagnostico();
