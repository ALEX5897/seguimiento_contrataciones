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

    // Obtener etapas habilitadas del proceso
    const [etapasHabilitadas] = await conn.execute(`
      SELECT
        se.id,
        se.etapa_id,
        ep.nombre,
        se.aplica,
        se.fecha_tentativa,
        se.fecha_reforma,
        se.fecha_reforma_3
      FROM subtareas_etapas se
      LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
      WHERE se.subtarea_id = ? AND se.aplica = 1
      ORDER BY se.fecha_reforma ASC
    `, [proceso.id]);

    console.log(`Total de etapas habilitadas: ${etapasHabilitadas.length}\n`);

    if (etapasHabilitadas.length > 0) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      let etapasEnRetraso = 0;

      console.log('ETAPAS CON RETRASO (fecha_reforma < hoy y no completadas):');
      console.log('─'.repeat(130));

      for (const etapa of etapasHabilitadas) {
        // Obtener estado de esta etapa en seguimiento_etapas
        const [seguimiento] = await conn.execute(`
          SELECT estado FROM seguimiento_etapas
          WHERE subtarea_id = ? AND etapa_id = ?
          LIMIT 1
        `, [proceso.id, etapa.etapa_id]);

        const estado = seguimiento.length > 0 ? seguimiento[0].estado : 'sin_registrar';

        const fechaToUse = etapa.fecha_reforma_3 || etapa.fecha_reforma || etapa.fecha_tentativa;

        if (fechaToUse) {
          const fechaProgramada = new Date(fechaToUse);
          fechaProgramada.setHours(0, 0, 0, 0);

          if (fechaProgramada < hoy && estado !== 'completado') {
            etapasEnRetraso++;
            const dias = Math.floor((hoy - fechaProgramada) / (1000 * 60 * 60 * 24));
            console.log(`✗ ${etapa.nombre}`);
            console.log(`  Fecha programada: ${fechaToUse} (${dias} días de retraso)`);
            console.log(`  Estado: ${estado}`);
            console.log();
          }
        }
      }

      console.log('─'.repeat(130));
      console.log(`Total de etapas en retraso: ${etapasEnRetraso}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

diagnostico();
