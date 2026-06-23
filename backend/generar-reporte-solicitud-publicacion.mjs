import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import path from 'path';

dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, values = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql, values);
    return rows;
  } finally {
    conn.release();
  }
}

async function generarReporte() {
  try {
    console.log('Buscando información de etapas...');

    // Primero, buscar la etapa "SOLICITUD DE PUBLICACION"
    const etapas = await query(`
      SELECT id, nombre FROM etapas_pac WHERE nombre LIKE '%SOLICITUD%PUBLICACION%'
    `);

    console.log('Etapas encontradas:', etapas);

    if (etapas.length === 0) {
      console.log('No se encontró la etapa "SOLICITUD DE PUBLICACION", buscando todas las etapas...');
      const todasLasEtapas = await query(`SELECT id, nombre FROM etapas_pac LIMIT 20`);
      console.log('Etapas disponibles:');
      todasLasEtapas.forEach(e => console.log(`  - ${e.id}: ${e.nombre}`));

      // Intentar buscar etapas que contengan "SOLICITUD"
      const solicitudEtapas = await query(`
        SELECT id, nombre FROM etapas_pac WHERE nombre LIKE '%SOLICITUD%'
      `);
      console.log('\nEtapas con "SOLICITUD":');
      solicitudEtapas.forEach(e => console.log(`  - ${e.id}: ${e.nombre}`));

      return;
    }

    const etapaId = etapas[0].id;
    const etapaNombre = etapas[0].nombre;

    console.log(`\nUsando etapa: ${etapaNombre} (ID: ${etapaId})`);

    // Obtener procesos activos con la etapa "SOLICITUD DE PUBLICACION"
    const procesos = await query(`
      SELECT
        s.id,
        s.nombre as proceso,
        s.pac_no_pac,
        se.estado as etapa_estado,
        se.fecha_planificada,
        se.fecha_real
      FROM subtareas s
      INNER JOIN seguimiento_etapas se ON s.id = se.subtarea_id
      WHERE s.activo = 1
        AND se.etapa_id = ?
      ORDER BY s.nombre ASC
    `, [etapaId]);

    console.log(`\nEncontrados ${procesos.length} procesos activos con la etapa ${etapaNombre}`);

    // Crear archivo Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Solicitud de Publicación');

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Proceso', key: 'proceso', width: 80 },
      { header: 'Tipo (PAC/NO PAC)', key: 'pac_no_pac', width: 15 },
      { header: 'Estado Etapa', key: 'etapa_estado', width: 15 },
      { header: 'Fecha Planificada', key: 'fecha_planificada', width: 15 },
      { header: 'Fecha Real', key: 'fecha_real', width: 15 }
    ];

    // Estilo del encabezado
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };

    // Agregar datos
    procesos.forEach((proceso, index) => {
      const rowNum = index + 2;
      worksheet.addRow({
        id: proceso.id,
        proceso: proceso.proceso,
        pac_no_pac: proceso.pac_no_pac,
        etapa_estado: proceso.etapa_estado,
        fecha_planificada: proceso.fecha_planificada,
        fecha_real: proceso.fecha_real
      });

      // Colorear según estado
      const row = worksheet.getRow(rowNum);
      if (proceso.etapa_estado === 'completado') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Verde
      } else if (proceso.etapa_estado === 'pendiente') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // Amarillo
      }
    });

    // Congelar la primera fila
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    // Guardar archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const rutaArchivo = path.join(process.cwd(), `../Reporte_Solicitud_Publicacion_${timestamp}.xlsx`);

    await workbook.xlsx.writeFile(rutaArchivo);

    console.log(`\n✓ Reporte generado exitosamente en: ${rutaArchivo}`);
    console.log(`\nResumen:`);
    console.log(`  - Total de procesos activos: ${procesos.length}`);
    console.log(`  - Completados: ${procesos.filter(p => p.etapa_estado === 'completado').length}`);
    console.log(`  - Pendientes: ${procesos.filter(p => p.etapa_estado === 'pendiente').length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

generarReporte();
