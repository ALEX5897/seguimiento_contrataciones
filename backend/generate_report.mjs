import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10)
});

async function obtenerDatos() {
  const connection = await pool.getConnection();

  try {
    // Obtener todas las subtareas (procesos) con sus etapas
    const [subtareas] = await connection.execute(`
      SELECT s.*,
             s.direccion_encargada AS direccion_nombre
      FROM subtareas s
      WHERE s.activo = 1
      ORDER BY s.direccion_encargada, s.nombre
    `);

    // Obtener etapas para cada subtarea
    const [etapas] = await connection.execute(`
      SELECT se.subtarea_id, ep.nombre, ep.orden, sg.estado, sg.fecha_planificada, sg.fecha_real
      FROM subtareas_etapas se
      JOIN etapas_pac ep ON ep.id = se.etapa_id
      LEFT JOIN seguimiento_etapas sg ON sg.subtarea_id = se.subtarea_id AND sg.etapa_id = se.etapa_id
      WHERE se.aplica = 1
      ORDER BY se.subtarea_id, ep.orden
    `);

    // Crear mapa de etapas por subtarea
    const etapasPorSubtarea = {};
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const etapa of etapas) {
      if (!etapasPorSubtarea[etapa.subtarea_id]) {
        etapasPorSubtarea[etapa.subtarea_id] = [];
      }

      // Calcular días de atraso
      let diasAtraso = 0;
      if (etapa.fecha_planificada && etapa.estado && etapa.estado.toLowerCase() === 'pendiente') {
        const fechaPlaneada = new Date(etapa.fecha_planificada);
        fechaPlaneada.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((hoy.getTime() - fechaPlaneada.getTime()) / (1000 * 60 * 60 * 24));
        diasAtraso = diffDays > 0 ? diffDays : 0;
      }

      etapasPorSubtarea[etapa.subtarea_id].push({
        nombre: etapa.nombre,
        estado: etapa.estado || 'pendiente',
        diasAtraso: diasAtraso
      });
    }

    // Procesar datos por dirección
    const datosPorDireccion = {};

    for (const subtarea of subtareas) {
      const direccionNombre = subtarea.direccion_nombre || 'Sin dirección';

      if (!datosPorDireccion[direccionNombre]) {
        datosPorDireccion[direccionNombre] = [];
      }

      // Obtener estado y días tarde máximo
      let etapasDelSubtarea = etapasPorSubtarea[subtarea.id] || [];

      // Filtrar etapas que NO contengan "ERP" (sin importar mayúsculas)
      etapasDelSubtarea = etapasDelSubtarea.filter(
        e => !e.nombre || !e.nombre.toLowerCase().includes('erp')
      );

      // Obtener la última etapa (con mayor orden/fecha)
      const ultimaEtapa = etapasDelSubtarea.length > 0
        ? etapasDelSubtarea[etapasDelSubtarea.length - 1]
        : null;

      let estado = 'En progreso';
      let diasTarde = '';

      // Si la última etapa está completada, estado es "Contratado"
      if (ultimaEtapa && ultimaEtapa.estado && ultimaEtapa.estado.toLowerCase() === 'completado') {
        estado = 'Contratado';
      } else {
        // Si hay etapas pendientes con atraso, mostrar "Pendiente" con días
        const etapasPendienteConAtraso = etapasDelSubtarea.filter(
          e => e.estado && e.estado.toLowerCase() === 'pendiente' && e.diasAtraso > 0
        );

        if (etapasPendienteConAtraso.length > 0) {
          // Obtener el máximo de días tarde
          const maxDiasTarde = Math.max(...etapasPendienteConAtraso.map(e => e.diasAtraso));
          diasTarde = maxDiasTarde;
          estado = 'Pendiente';
        }
      }

      datosPorDireccion[direccionNombre].push({
        nombre: subtarea.nombre,
        pacNoPac: subtarea.pac_no_pac || 'No PAC',
        cuatrimestre: subtarea.cuatrimestre || '',
        estado: estado,
        diasTarde: diasTarde,
        monto: Number(subtarea.presupuesto_2026_inicial) || 0
      });
    }

    connection.release();
    return datosPorDireccion;
  } catch (error) {
    connection.release();
    throw error;
  }
}

async function generarExcel(datosPorDireccion) {
  const workbook = new ExcelJS.Workbook();

  // Crear una hoja por dirección
  for (const [direccionNombre, procesos] of Object.entries(datosPorDireccion)) {
    // Sanitizar nombre de hoja: máximo 31 caracteres y sin caracteres especiales
    let nombreHoja = direccionNombre
      .replace(/[\\*?:[\]\/]/g, '-') // Reemplazar caracteres no permitidos
      .substring(0, 31);
    const worksheet = workbook.addWorksheet(nombreHoja);

    // Encabezados
    worksheet.columns = [
      { header: 'Nombre del Proceso', key: 'nombre', width: 40 },
      { header: 'PAC/No PAC', key: 'pacNoPac', width: 12 },
      { header: 'Cuatrimestre', key: 'cuatrimestre', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Días Tarde', key: 'diasTarde', width: 12 },
      { header: 'Monto', key: 'monto', width: 15 }
    ];

    // Formato de encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };

    // Agregar datos
    for (const proceso of procesos) {
      worksheet.addRow({
        nombre: proceso.nombre,
        pacNoPac: proceso.pacNoPac,
        cuatrimestre: proceso.cuatrimestre,
        estado: proceso.estado,
        diasTarde: proceso.diasTarde,
        monto: proceso.monto
      });
    }

    // Formato de moneda para columna de monto
    worksheet.getColumn('monto').numFmt = '$#,##0.00';

    // Aplicar autofilter si hay datos
    if (procesos.length > 0) {
      worksheet.autoFilter = { from: 'A1', to: `F${procesos.length + 1}` };
    }
  }

  // Guardar archivo
  const outputPath = path.join(__dirname, '..', 'Reporte_Procesos.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Reporte generado exitosamente: ${outputPath}`);

  return outputPath;
}

async function main() {
  try {
    console.log('⏳ Consultando datos de la base de datos...');
    const datosPorDireccion = await obtenerDatos();

    console.log('📊 Generando reporte en Excel...');
    await generarExcel(datosPorDireccion);

    console.log('✨ Proceso completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
