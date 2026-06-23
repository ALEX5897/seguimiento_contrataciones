import mysql from 'mysql2/promise';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error('❌ Error: Faltan variables de entorno de base de datos');
  process.exit(1);
}

const baseDir = 'Documentos base';

async function main() {
  let connection;
  try {
    // Connect to database
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });
    console.log('✓ Conectado a la base de datos\n');

    // Read the updated Excel file
    console.log('Leyendo archivo actualizado...');
    const updateFile = path.join(baseDir, 'update_datos.xlsx');
    const workbook = XLSX.readFile(updateFile);
    const worksheet = workbook.Sheets['Hoja1'];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✓ ${data.length} registros cargados del Excel\n`);

    // Track results
    const resultados = {
      actualizados: [],
      noEncontrados: [],
      errores: []
    };

    // Update each record
    console.log('Actualizando registros en la base de datos...\n');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const codigoOlympo = row['Código Olympo']?.toString().trim();
      const montoNuevo = Number(row['Presupuesto con Reformas']);

      if (!codigoOlympo || isNaN(montoNuevo)) {
        continue;
      }

      try {
        // Get current value
        const [existing] = await connection.query(
          'SELECT id, presupuesto_2026_inicial FROM subtareas WHERE codigo_olympo = ?',
          [codigoOlympo]
        );

        if (existing && existing.length > 0) {
          const id = existing[0].id;
          const montoAnterior = Number(existing[0].presupuesto_2026_inicial);

          if (montoAnterior !== montoNuevo) {
            // Update
            await connection.query(
              'UPDATE subtareas SET presupuesto_2026_inicial = ? WHERE id = ?',
              [montoNuevo, id]
            );

            resultados.actualizados.push({
              codigoOlympo,
              id,
              anterior: montoAnterior,
              nuevo: montoNuevo,
              diferencia: montoNuevo - montoAnterior
            });

            if ((i + 1) % 10 === 0) {
              process.stdout.write(`\rProcesados: ${i + 1}/${data.length}`);
            }
          }
        } else {
          resultados.noEncontrados.push({
            codigoOlympo,
            monto: montoNuevo
          });
        }
      } catch (error) {
        resultados.errores.push({
          codigoOlympo,
          error: error.message
        });
      }
    }

    console.log(`\nProcesados: ${data.length}/${data.length}\n`);

    // Generate report
    const reportePath = path.join(baseDir, 'REPORTE_ACTUALIZACION_BD.txt');
    let reporte = 'REPORTE DE ACTUALIZACIÓN DE MONTOS EN BASE DE DATOS\n';
    reporte += '='.repeat(80) + '\n';
    reporte += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
    reporte += `Base de datos: ${DB_NAME}\n`;
    reporte += `Tabla: subtareas\n`;
    reporte += `Campo: presupuesto_2026_inicial\n`;
    reporte += '='.repeat(80) + '\n\n';

    reporte += `RESUMEN:\n`;
    reporte += `-`.repeat(80) + '\n';
    reporte += `  Total de registros procesados: ${data.length}\n`;
    reporte += `  Registros actualizados en BD: ${resultados.actualizados.length}\n`;
    reporte += `  Códigos no encontrados en BD: ${resultados.noEncontrados.length}\n`;
    reporte += `  Errores: ${resultados.errores.length}\n\n`;

    if (resultados.actualizados.length > 0) {
      reporte += `REGISTROS ACTUALIZADOS (${resultados.actualizados.length}):\n`;
      reporte += `-`.repeat(80) + '\n';

      let totalAnterior = 0;
      let totalNuevo = 0;

      resultados.actualizados.forEach((reg, index) => {
        reporte += `\n${index + 1}. Código Olympo: ${reg.codigoOlympo}\n`;
        reporte += `   ID en BD: ${reg.id}\n`;
        reporte += `   Monto anterior: ${reg.anterior}\n`;
        reporte += `   Monto nuevo:   ${reg.nuevo}\n`;
        reporte += `   Diferencia:    ${reg.diferencia >= 0 ? '+' : ''}${reg.diferencia.toFixed(2)}\n`;

        totalAnterior += reg.anterior;
        totalNuevo += reg.nuevo;
      });

      reporte += `\n${'-'.repeat(80)}\n`;
      reporte += `TOTALES EN BASE DE DATOS:\n`;
      reporte += `  Monto anterior: ${totalAnterior.toFixed(2)}\n`;
      reporte += `  Monto nuevo:   ${totalNuevo.toFixed(2)}\n`;
      reporte += `  Diferencia:    ${(totalNuevo - totalAnterior) >= 0 ? '+' : ''}${(totalNuevo - totalAnterior).toFixed(2)}\n`;
    }

    if (resultados.noEncontrados.length > 0) {
      reporte += `\n\nCÓDIGOS NO ENCONTRADOS EN BD (${resultados.noEncontrados.length}):\n`;
      reporte += `-`.repeat(80) + '\n';
      reporte += `Estos códigos no existen en la tabla subtareas y mantienen su monto actual en Excel:\n\n`;
      resultados.noEncontrados.forEach((reg, index) => {
        reporte += `${index + 1}. ${reg.codigoOlympo} | Monto en Excel: ${reg.monto}\n`;
      });
    }

    if (resultados.errores.length > 0) {
      reporte += `\n\nERRORES (${resultados.errores.length}):\n`;
      reporte += `-`.repeat(80) + '\n';
      resultados.errores.forEach((error, index) => {
        reporte += `\n${index + 1}. Código: ${error.codigoOlympo}\n`;
        reporte += `   Error: ${error.error}\n`;
      });
    }

    reporte += '\n\n' + '='.repeat(80) + '\n';
    reporte += 'Fin del reporte\n';

    fs.writeFileSync(reportePath, reporte, 'utf8');

    // Print summary
    console.log('📊 RESUMEN DE ACTUALIZACIÓN EN BASE DE DATOS:');
    console.log('-'.repeat(80));
    console.log(`  ✓ Registros actualizados: ${resultados.actualizados.length}`);
    if (resultados.noEncontrados.length > 0) {
      console.log(`  ⚠ Códigos no encontrados: ${resultados.noEncontrados.length}`);
    }
    if (resultados.errores.length > 0) {
      console.log(`  ✗ Errores: ${resultados.errores.length}`);
    }
    console.log('-'.repeat(80));

    if (resultados.actualizados.length > 0) {
      const totalAnterior = resultados.actualizados.reduce((sum, r) => sum + r.anterior, 0);
      const totalNuevo = resultados.actualizados.reduce((sum, r) => sum + r.nuevo, 0);
      console.log(`\n  Presupuesto actualizado:`);
      console.log(`    Anterior: $${totalAnterior.toFixed(2)}`);
      console.log(`    Nuevo:    $${totalNuevo.toFixed(2)}`);
      console.log(`    Cambio:   ${(totalNuevo - totalAnterior) >= 0 ? '+' : ''}$${(totalNuevo - totalAnterior).toFixed(2)}\n`);
    }

    console.log(`✓ Reporte generado: ${reportePath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
