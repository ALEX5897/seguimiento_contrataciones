import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as mysql from './data/mysql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../informes_pdf');
dotenv.config({ path: path.join(__dirname, '.env') });

// Crear carpeta de salida si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function sanitizeDireccionName(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

async function generarInformesPorDireccion() {
  try {
    // Inicializar MySQL
    await mysql.initMySQL();
    console.log('✓ Conectado a la base de datos');

    // Obtener procesos de la versión activa (Reforma 8 2026)
    const subtareas = await mysql.getAllSubtareasByScope({});

    // Filtrar solo procesos activos
    const procesosActivos = subtareas.filter(s => s.estado === 'pendiente' || s.estado !== 0);
    console.log(`✓ Obtenidos ${subtareas.length} procesos (${procesosActivos.length} activos)`);

    // Agrupar por dirección
    const procesoPorDireccion = {};

    procesosActivos.forEach(subtarea => {
      const direccion = subtarea.direccionNombre || 'Sin dirección';
      if (!procesoPorDireccion[direccion]) {
        procesoPorDireccion[direccion] = [];
      }

      // Encontrar la última actualización
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

    // Generar un PDF por dirección
    const direcciones = Object.keys(procesoPorDireccion).sort();
    const archivosPDF = [];

    for (const direccion of direcciones) {
      const procesos = procesoPorDireccion[direccion];
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 40,
        size: 'A4'
      });

      const nombreSanitizado = sanitizeDireccionName(direccion);
      const pdfPath = path.join(outputDir, `${nombreSanitizado}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('INFORME DE PROCESOS', {
        align: 'center'
      });
      doc.fontSize(16).font('Helvetica-Bold').text(direccion, {
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

      // Resumen de dirección
      const totalEtapas = procesos.reduce((sum, p) => sum + p.totalEtapas, 0);
      const completadas = procesos.reduce((sum, p) => sum + p.completadas, 0);
      const porcentaje = totalEtapas > 0 ? Math.round((completadas / totalEtapas) * 100) : 0;

      doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total de Procesos: ${procesos.length}`, { indent: 20 });
      doc.text(`Total de Verificables: ${totalEtapas}`, { indent: 20 });
      doc.text(`Verificables Completadas: ${completadas} (${porcentaje}%)`, { indent: 20 });

      doc.moveDown(0.8);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
      doc.moveDown(0.8);

      // Procesos
      doc.fontSize(12).font('Helvetica-Bold').text('PROCESOS');
      doc.moveDown(0.5);

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

        const porcentajeProceso = proceso.totalEtapas > 0
          ? Math.round((proceso.completadas / proceso.totalEtapas) * 100)
          : 0;

        doc.fontSize(10).font('Helvetica-Bold').text(`${idx + 1}. ${proceso.nombre}`, { indent: 20 });
        doc.fontSize(9).font('Helvetica');
        doc.text(`Código: ${proceso.codigo}`, { indent: 30 });
        doc.text(`Etapas: ${proceso.completadas}/${proceso.totalEtapas} completadas (${porcentajeProceso}%)`, { indent: 30 });
        doc.text(`Última actualización: ${fechaFormato}`, { indent: 30 });
        doc.moveDown(0.4);
      });

      // Nota al pie
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
        'Este informe muestra solo cambios de fechas y estados de etapas.',
        { align: 'center' }
      );

      doc.end();

      archivosPDF.push(new Promise((resolve, reject) => {
        stream.on('finish', () => {
          console.log(`  ✓ ${direccion}`);
          resolve(pdfPath);
        });
        stream.on('error', reject);
      }));
    }

    // Esperar a que se generen todos los PDFs
    await Promise.all(archivosPDF);

    console.log(`\n✓ Se generaron ${direcciones.length} PDF(s) exitosamente en: ${outputDir}`);
    console.log('\nArchivos generados:');
    const archivos = fs.readdirSync(outputDir);
    archivos.forEach(archivo => {
      const stat = fs.statSync(path.join(outputDir, archivo));
      console.log(`  - ${archivo} (${(stat.size / 1024).toFixed(2)} KB)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Ejecutar
generarInformesPorDireccion().catch(err => {
  console.error(err);
  process.exit(1);
});
