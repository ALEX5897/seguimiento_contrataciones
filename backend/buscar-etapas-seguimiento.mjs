import mysql from 'mysql2/promise';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

async function buscar() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // Verificar para cada ID
    const ids = [255, 256, 258];

    for (const id of ids) {
      const [proceso] = await conn.execute('SELECT nombre FROM subtareas WHERE id = ?', [id]);
      if (proceso.length === 0) continue;

      console.log(`\n=== PROCESO ID ${id}: ${proceso[0].nombre.substring(0, 70)} ===`);

      // Contar en subtareas_etapas
      const [subtareasEtapas] = await conn.execute(
        'SELECT COUNT(*) as count FROM subtareas_etapas WHERE subtarea_id = ?',
        [id]
      );

      // Contar en seguimiento_etapas
      const [seguimientoEtapas] = await conn.execute(
        'SELECT COUNT(*) as count FROM seguimiento_etapas WHERE subtarea_id = ?',
        [id]
      );

      console.log(`  Etapas en subtareas_etapas: ${subtareasEtapas[0].count}`);
      console.log(`  Etapas en seguimiento_etapas: ${seguimientoEtapas[0].count}`);

      // Si hay en seguimiento_etapas, mostrar algunas
      if (seguimientoEtapas[0].count > 0) {
        const [etapas] = await conn.execute(`
          SELECT se.etapa_id, ep.nombre, se.estado, se.fecha_planificada
          FROM seguimiento_etapas se
          LEFT JOIN etapas_pac ep ON se.etapa_id = ep.id
          WHERE se.subtarea_id = ?
          LIMIT 10
        `, [id]);

        console.log(`  Primeras 10 etapas:`);
        etapas.forEach((e, i) => {
          console.log(`    ${i+1}. ${e.nombre} | Estado: ${e.estado} | Fecha: ${e.fecha_planificada}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

buscar();
