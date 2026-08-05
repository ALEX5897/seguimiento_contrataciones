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

    // Obtener TODAS las etapas del proceso (sin filtro aplica)
    const [etapasAll] = await conn.execute(`
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
      WHERE se.subtarea_id = ?
      ORDER BY se.fecha_reforma ASC
      LIMIT 40
    `, [proceso.id]);

    console.log(`Total de etapas (todas): ${etapasAll.length}\n`);

    let etapasAplica0 = 0;
    let etapasAplica1 = 0;

    for (const etapa of etapasAll) {
      if (etapa.aplica === 0) etapasAplica0++;
      if (etapa.aplica === 1) etapasAplica1++;

      const fechaToUse = etapa.fecha_reforma_3 || etapa.fecha_reforma || etapa.fecha_tentativa;

      // Obtener estado
      const [seguimiento] = await conn.execute(`
        SELECT estado FROM seguimiento_etapas
        WHERE subtarea_id = ? AND etapa_id = ?
        LIMIT 1
      `, [proceso.id, etapa.etapa_id]);

      const estado = seguimiento.length > 0 ? seguimiento[0].estado : 'sin_registrar';

      console.log(`${etapa.aplica === 1 ? '✓' : '✗'} ${etapa.nombre} [aplica=${etapa.aplica}]`);
      console.log(`  Fecha: ${fechaToUse || 'sin fecha'} | Estado: ${estado}`);
    }

    console.log(`\nResumen: ${etapasAplica1} etapas habilitadas (aplica=1), ${etapasAplica0} deshabilitadas (aplica=0)`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

diagnostico();
