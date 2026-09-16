import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as mysql from './data/mysql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function generarInformePDF() {
  try {
    // Inicializar MySQL
    await mysql.initMySQL();
    console.log('✓ Conectado a la base de datos');

    // Obtener procesos de la versión activa (Reforma 8 2026)
    const subtareas = await mysql.getAllSubtareasByScope({});

    // Filtrar solo procesos activos
    const procesosActivos = subtareas.filter(s => s.estado === 'pendiente' || s.estado !== 0);
    console.log(`✓ Obtenidos ${subtareas.length} procesos (${procesosActivos.length} activos)`);

    // Agrupar por dirección y extraer última actualización
    const procesoPorDireccion = {};

    procesosActivos.forEach(subtarea => {
      const direccion = subtarea.direccionNombre || 'Sin dirección';
      if (!procesoPorDireccion[direccion]) {
        procesoPorDireccion[direccion] = [];
      }

      // Encontrar la última actualización (fecha más reciente entre etapas)
      let ultimaActualizacion = null;
      let ultimaActualizacionFecha = new Date('1900-01-01');

      const etapas = subtarea.seguimientoEtapas || subtarea.etapas || [];
      etapas.forEach(etapa => {
        const fechas = [
          etapa.fechaPlanificada,
          etapa.fechaReforma,
          etapa.fechaReal,
          etapa.updated_at
        ].filter(f => f);

        fechas.forEach(fecha => {
          const fechaDate = new Date(fecha);
          if (!isNaN(fechaDate.getTime()) && fechaDate > ultimaActualizacionFecha) {
            ultimaActualizacionFecha = fechaDate;
            ultimaActualizacion = fecha;
          }
        });
      });

      // Contar etapas completadas
      const totalEtapas = etapas.length;
      const completadas = etapas.filter(e => e.estado === 'completado').length;

      procesoPorDireccion[direccion].push({
        nombre: subtarea.nombre,
        codigo: subtarea.codigoOlympo,
        ultimaActualizacion: ultimaActualizacion,
        totalEtapas,
        completadas
      });
    });

    // Crear PDF
    const doc = new PDFDocument({
      bufferPages: true,
      margin: 40,
      size: 'A4'
    });

    const pdfPath = path.join(__dirname, `informe_procesos_${new Date().toISOString().split('T')[0]}.pdf`);
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // Encabezado
    doc.fontSize(24).font('Helvetica-Bold').text('INFORME DE PROCESOS POR DIRECCIÓN', {
      align: 'center'
    });

    doc.fontSize(11).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-ES')}`, {
      align: 'center'
    });
    doc.text(`Reforma 8 2026`, {
      align: 'center'
    });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
    doc.moveDown(0.8);

    // Resumen general
    const totalProcesos = procesosActivos.length;
    const totalDirecciones = Object.keys(procesoPorDireccion).length;
    const totalEtapasGlobal = Object.values(procesoPorDireccion)
      .flat()
      .reduce((sum, p) => sum + (p.totalEtapas || 0), 0);
    const completadasGlobal = Object.values(procesoPorDireccion)
      .flat()
      .reduce((sum, p) => sum + (p.completadas || 0), 0);
    const porcentajeGlobal = totalEtapasGlobal > 0 ? Math.round((completadasGlobal / totalEtapasGlobal) * 100) : 0;

    doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN GENERAL');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total de Procesos: ${totalProcesos}`, { indent: 20 });
    doc.text(`Total de Direcciones: ${totalDirecciones}`, { indent: 20 });
    doc.text(`Total de Verificables: ${totalEtapasGlobal}`, { indent: 20 });
    doc.text(`Verificables Completadas: ${completadasGlobal} (${porcentajeGlobal}%)`, { indent: 20 });

    doc.moveDown(0.8);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
    doc.moveDown(0.8);

    // Procesos por dirección
    const direcciones = Object.keys(procesoPorDireccion).sort();

    direcciones.forEach((direccion, dirIndex) => {
      // Evitar saltos de página innecesarios
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(13).font('Helvetica-Bold').text(`▶ ${direccion}`);
      doc.moveDown(0.3);

      const procesos = procesoPorDireccion[direccion];

      // Tabla simple con procesos
      procesos.forEach((proceso, idx) => {
        if (doc.y > 750) {
          doc.addPage();
        }

        const ultimaActu = new Date(proceso.ultimaActualizacion);
        const fechaFormato = isNaN(ultimaActu.getTime())
          ? 'Sin actualización'
          : ultimaActu.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

        const porcentaje = proceso.totalEtapas > 0
          ? Math.round((proceso.completadas / proceso.totalEtapas) * 100)
          : 0;

        doc.fontSize(9).font('Helvetica');
        doc.text(`${idx + 1}. ${proceso.nombre}`, { indent: 30, width: 450 });
        doc.fontSize(8).font('Helvetica');
        doc.text(`   Código: ${proceso.codigo} | Etapas: ${proceso.completadas}/${proceso.totalEtapas} (${porcentaje}%)`, { indent: 30 });
        doc.text(`   Última actualización: ${fechaFormato}`, { indent: 30 });

        doc.moveDown(0.2);
      });

      // Resumen de dirección
      const totalEtapasDir = procesos.reduce((sum, p) => sum + p.totalEtapas, 0);
      const completadasDir = procesos.reduce((sum, p) => sum + p.completadas, 0);
      const porcentajeDir = totalEtapasDir > 0 ? Math.round((completadasDir / totalEtapasDir) * 100) : 0;

      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text(
        `Resumen ${direccion}: ${procesos.length} procesos | ${completadasDir}/${totalEtapasDir} etapas completadas (${porcentajeDir}%)`,
        { indent: 30, width: 450 }
      );

      if (dirIndex < direcciones.length - 1) {
        doc.moveDown(0.6);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#e0e0e0');
        doc.moveDown(0.6);
      }
    });

    // Nota al pie
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
      'Este informe muestra solo cambios de fechas y estados de etapas.',
      { align: 'center' }
    );

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log(`\n✓ PDF generado exitosamente: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Ejecutar
generarInformePDF().catch(err => {
  console.error(err);
  process.exit(1);
});
