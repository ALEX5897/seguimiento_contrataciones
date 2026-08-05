import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import fs from 'fs';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

// Clasificación de etapas según la imagen proporcionada
const clasificacionEtapas = {
  preparatoria: [
    'informe de necesidad',
    'solicitud de autorización',
    'autorización',
    'tdr',
    'términos de referencia',
    'especificaciones técnicas'
  ],
  precontractual: [
    'solicitud de publicación',
    'publicación',
    'entrega de proformas',
    'estudio de mercado',
    'certificación presupuestaria',
    'solicitud de certificación pac',
    'certificacion pac',
    'solicitud de autorización de inicio',
    'autorización de inicio',
    'elaboración de pliegos',
    'solicitud de elaboración',
    'resolución de inicio',
    'fecha publicación',
    'preguntas',
    'respuestas',
    'fecha límite de entrega',
    'solicitud de convalidaciones',
    'convalidaciones',
    'calificación',
    'mesa técnica',
    'corrección',
    'solicitud de cate',
    'certificación',
    'certificacion programatica',
    'informe técnico',
    'informe tecnico'
  ],
  contractual: [
    'adjudicación',
    'adjudicacion'
  ],
  contrato: [
    'contrato'
  ]
};

function obtenerClasificacion(nombreEtapa) {
  if (!nombreEtapa) return 'otro';

  const etapaNorm = nombreEtapa.toLowerCase().trim();

  for (const [clave, etapas] of Object.entries(clasificacionEtapas)) {
    if (etapas.some(e => etapaNorm.includes(e))) {
      return clave;
    }
  }
  return 'otro';
}

async function generarReporte() {
  let conn;
  try {
    console.log('Conectando a la base de datos...');
    conn = await mysql.createConnection(dbConfig);

    // Obtener procesos activos
    const [procesos] = await conn.execute(`
      SELECT
        s.id,
        s.nombre,
        s.direccion_encargada
      FROM subtareas s
      WHERE s.activo = 1
      ORDER BY s.nombre
    `);

    console.log(`Encontrados ${procesos.length} procesos activos\n`);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Procesar cada proceso
    const datosReporte = [];

    for (const proceso of procesos) {
      // Obtener todas las etapas del proceso (de seguimiento_etapas)
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

      if (etapas.length === 0) continue; // Saltar procesos sin etapas

      // Contar etapas en retraso por clasificación
      let preparatoriaRetraso = 0;
      let precontractualRetraso = 0;
      let contractualRetraso = 0;
      let contratoRetraso = 0;

      for (const etapa of etapas) {
        const clasificacion = obtenerClasificacion(etapa.nombre);
        const esCompletada = etapa.estado === 'completado';

        // Verificar si está en retraso
        if (etapa.fecha_planificada) {
          const fechaProgramada = new Date(etapa.fecha_planificada);
          fechaProgramada.setHours(0, 0, 0, 0);

          if (fechaProgramada < hoy && !esCompletada) {
            // Contar solo etapas en retraso por clasificación
            if (clasificacion === 'preparatoria') {
              preparatoriaRetraso++;
            } else if (clasificacion === 'precontractual') {
              precontractualRetraso++;
            } else if (clasificacion === 'contractual') {
              contractualRetraso++;
            } else if (clasificacion === 'contrato') {
              contratoRetraso++;
            }
          }
        }
      }

      datosReporte.push({
        id: proceso.id,
        nombre: proceso.nombre,
        direccion: proceso.direccion_encargada,
        totalEtapas: etapas.length,
        preparatoriaRetraso,
        precontractualRetraso,
        contractualRetraso,
        contratoRetraso
      });
    }

    // Crear workbook Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Procesos Activos');

    // Definir columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Nombre del Proceso', key: 'nombre', width: 50 },
      { header: 'Dirección', key: 'direccion', width: 32 },
      { header: 'Total Etapas', key: 'totalEtapas', width: 12 },
      { header: 'Preparatoria\n(Etapas Tarde)', key: 'preparatoriaRetraso', width: 16 },
      { header: 'Precontractual\n(Etapas Tarde)', key: 'precontractualRetraso', width: 16 },
      { header: 'Contractual\n(Etapas Tarde)', key: 'contractualRetraso', width: 16 },
      { header: 'Contrato\n(Etapas Tarde)', key: 'contratoRetraso', width: 16 }
    ];

    // Estilizar encabezado
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1a5fad' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    headerRow.height = 35;

    // Agregar datos
    for (const dato of datosReporte) {
      const row = worksheet.addRow(dato);

      // Colorear columnas según clasificación
      // Preparatoria (Naranja/Tomate)
      const cellPreparatoria = row.getCell('preparatoriaRetraso');
      cellPreparatoria.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9933' } };
      if (dato.preparatoriaRetraso > 0) {
        cellPreparatoria.font = { bold: true, color: { argb: 'FF8B0000' }, size: 12 };
      }

      // Precontractual (Verde)
      const cellPrecontractual = row.getCell('precontractualRetraso');
      cellPrecontractual.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFF99' } };
      if (dato.precontractualRetraso > 0) {
        cellPrecontractual.font = { bold: true, color: { argb: 'FF556B2F' }, size: 12 };
      }

      // Contractual (Verde oscuro)
      const cellContractual = row.getCell('contractualRetraso');
      cellContractual.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99CC33' } };
      if (dato.contractualRetraso > 0) {
        cellContractual.font = { bold: true, color: { argb: 'FF339933' }, size: 12 };
      }

      // Contrato (Azul)
      const cellContrato = row.getCell('contratoRetraso');
      cellContrato.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99CCFF' } };
      if (dato.contratoRetraso > 0) {
        cellContrato.font = { bold: true, color: { argb: 'FF003366' }, size: 12 };
      }

      // Alineación
      row.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      row.height = 18;
    }

    // Congelar primera fila
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Agregar hoja de leyenda
    const leyendaSheet = workbook.addWorksheet('Leyenda');
    leyendaSheet.columns = [
      { header: 'Clasificación de Etapas', key: 'clasificacion', width: 25 },
      { header: 'Color', key: 'color', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 70 }
    ];

    const leyendaData = [
      {
        clasificacion: 'Preparatoria',
        color: '🟠 Tomate',
        descripcion: 'Informe de necesidad, Solicitud/Autorización, TDR/Especificaciones'
      },
      {
        clasificacion: 'Precontractual',
        color: '🟢 Verde',
        descripcion: 'Publicación, Proformas, Certificaciones, Pliegos, Calificación, Mesa Técnica'
      },
      {
        clasificacion: 'Contractual',
        color: '🟢 Verde Oscuro',
        descripcion: 'Adjudicación del contrato'
      },
      {
        clasificacion: 'Contrato',
        color: '🔵 Azul',
        descripcion: 'Fase de ejecución del contrato'
      }
    ];

    leyendaSheet.addRows(leyendaData);
    const leyendaHeader = leyendaSheet.getRow(1);
    leyendaHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    leyendaHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1a5fad' }
    };

    // Guardar archivo
    const filename = 'reporte_procesos_activos.xlsx';
    await workbook.xlsx.writeFile(filename);

    const fileSizeKb = (fs.statSync(filename).size / 1024).toFixed(2);
    console.log(`✓ Reporte Excel generado exitosamente`);
    console.log(`Archivo: ${filename}`);
    console.log(`Tamaño: ${fileSizeKb} KB`);
    console.log(`\nResumen:`);
    console.log(`- Total de procesos: ${datosReporte.length}`);

    const procesosConRetraso = datosReporte.filter(p =>
      p.preparatoriaRetraso > 0 ||
      p.precontractualRetraso > 0 ||
      p.contractualRetraso > 0 ||
      p.contratoRetraso > 0
    ).length;

    console.log(`- Procesos con etapas en retraso: ${procesosConRetraso}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

generarReporte();
