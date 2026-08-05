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

async function generarReporte() {
  let conn;
  try {
    console.log('Conectando a la base de datos...');
    conn = await mysql.createConnection(dbConfig);

    // Obtener procesos activos CON PRESUPUESTO
    const [procesos] = await conn.execute(`
      SELECT
        s.id,
        s.nombre,
        s.direccion_encargada,
        s.presupuesto_2026_inicial as presupuesto
      FROM subtareas s
      WHERE s.activo = 1 AND s.presupuesto_2026_inicial > 0
      ORDER BY s.nombre
    `);

    console.log(`Encontrados ${procesos.length} procesos activos con presupuesto\n`);

    // Obtener todas las etapas del sistema
    const [todasLasEtapas] = await conn.execute(`
      SELECT DISTINCT id, nombre
      FROM etapas_pac
      ORDER BY nombre
    `);

    console.log(`Total de etapas en el sistema: ${todasLasEtapas.length}\n`);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Procesar datos
    const datosReporte = [];

    for (const proceso of procesos) {
      console.log(`Procesando: ${proceso.nombre.substring(0, 50)}...`);

      // Obtener etapas de este proceso
      const [etapasDelProceso] = await conn.execute(`
        SELECT
          se.etapa_id,
          se.fecha_planificada,
          se.estado
        FROM seguimiento_etapas se
        WHERE se.subtarea_id = ?
      `, [proceso.id]);

      // Crear mapa de etapas del proceso
      const etapasMap = new Map();
      for (const etapa of etapasDelProceso) {
        etapasMap.set(etapa.etapa_id, {
          fecha: etapa.fecha_planificada,
          estado: etapa.estado
        });
      }

      // Crear fila para este proceso
      const fila = {
        id: proceso.id,
        nombre: proceso.nombre,
        direccion: proceso.direccion_encargada,
        presupuesto: proceso.presupuesto
      };

      // Para cada etapa del sistema
      for (const etapaSistema of todasLasEtapas) {
        const etapaDelProceso = etapasMap.get(etapaSistema.id);

        if (!etapaDelProceso) {
          // Etapa no asignada
          fila[`etapa_${etapaSistema.id}`] = 'n/a';
        } else {
          // Etapa asignada, verificar retraso
          let tieneRetraso = 0;

          if (etapaDelProceso.fecha) {
            const fechaProgramada = new Date(etapaDelProceso.fecha);
            fechaProgramada.setHours(0, 0, 0, 0);

            if (fechaProgramada < hoy && etapaDelProceso.estado !== 'completado') {
              tieneRetraso = 1;
            }
          }

          fila[`etapa_${etapaSistema.id}`] = tieneRetraso;
        }
      }

      datosReporte.push(fila);
    }

    // Crear workbook Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Matriz Etapas');

    // Definir columnas
    const columnas = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Proceso', key: 'nombre', width: 45 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Presupuesto', key: 'presupuesto', width: 15 }
    ];

    // Agregar columnas para cada etapa
    for (const etapa of todasLasEtapas) {
      columnas.push({
        header: etapa.nombre,
        key: `etapa_${etapa.id}`,
        width: 12
      });
    }

    worksheet.columns = columnas;

    // Estilizar encabezado
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1a5fad' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    headerRow.height = 40;

    // Agregar datos
    for (const dato of datosReporte) {
      const row = worksheet.addRow(dato);

      // Alineación y colores para etapas
      for (const etapa of todasLasEtapas) {
        const cell = row.getCell(`etapa_${etapa.id}`);
        const valor = cell.value;

        if (valor === 1) {
          // Retraso = Rojo
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
          cell.font = { bold: true, color: { argb: 'FF8B0000' }, size: 11 };
        } else if (valor === 0) {
          // Sin retraso = Verde
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF99CC33' } };
          cell.font = { bold: true, color: { argb: 'FF339933' }, size: 11 };
        } else if (valor === 'n/a') {
          // No asignada = Gris
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
          cell.font = { color: { argb: 'FF666666' }, size: 11 };
        }

        cell.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // Formato para presupuesto
      row.getCell('presupuesto').numFmt = '$#,##0.00';
      row.alignment = { horizontal: 'left', vertical: 'center' };
      row.height = 20;
    }

    // Congelar primeras columnas y fila
    worksheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];

    // Agregar hoja de leyenda
    const leyendaSheet = workbook.addWorksheet('Leyenda');
    leyendaSheet.columns = [
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Color', key: 'color', width: 15 },
      { header: 'Significado', key: 'significado', width: 70 }
    ];

    const leyendaData = [
      {
        valor: '1',
        color: '🔴 Rojo',
        significado: 'Etapa con días de retraso (fecha pasada y no completada)'
      },
      {
        valor: '0',
        color: '🟢 Verde',
        significado: 'Etapa asignada sin retraso (en plazo o completada)'
      },
      {
        valor: 'n/a',
        color: '⚫ Gris',
        significado: 'Etapa no asignada a este proceso'
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
    const filename = 'reporte_matriz_etapas.xlsx';
    await workbook.xlsx.writeFile(filename);

    const fileSizeKb = (fs.statSync(filename).size / 1024).toFixed(2);
    console.log(`\n✓ Reporte Excel generado exitosamente`);
    console.log(`Archivo: ${filename}`);
    console.log(`Tamaño: ${fileSizeKb} KB`);
    console.log(`\nResumen:`);
    console.log(`- Procesos con presupuesto: ${datosReporte.length}`);
    console.log(`- Total de etapas en matriz: ${todasLasEtapas.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

generarReporte();
