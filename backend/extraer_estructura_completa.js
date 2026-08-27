import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../../Desarrollo/Seguimiento_contrataciones/backend/.env')
});

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

const CODIGO_OLYMPO = '01.01.001.055.530702.000.009';

async function extraerEstructura() {
  let pool;
  try {
    pool = await mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4'
    });

    console.log('\n========================================');
    console.log('EXTRAYENDO ESTRUCTURA COMPLETA DE TABLAS');
    console.log('========================================\n');

    // 1. Obtener ID del proceso
    const [procesoPrincipal] = await pool.execute(
      'SELECT id FROM subtareas WHERE codigo_olympo = ? LIMIT 1',
      [CODIGO_OLYMPO]
    );

    if (procesoPrincipal.length === 0) {
      throw new Error('Proceso no encontrado');
    }

    const procesoId = procesoPrincipal[0].id;
    console.log(`✓ Proceso ID encontrado: ${procesoId}\n`);

    // 2. Obtener todas las tablas del esquema
    const [tablas] = await pool.execute(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    const estructura = {};

    // 3. Para cada tabla, obtener columnas y datos relacionados
    for (const tabla of tablas) {
      const nombreTabla = tabla.TABLE_NAME;

      // Obtener información de columnas
      const [columnas] = await pool.execute(`
        SELECT
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          EXTRA,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [nombreTabla]);

      estructura[nombreTabla] = {
        columnas: columnas,
        datos: []
      };

      // Obtener datos relevantes
      try {
        let query = `SELECT * FROM ${nombreTabla}`;
        let params = [];

        // Filtrar datos según la tabla
        if (nombreTabla === 'subtareas') {
          query += ' WHERE id = ?';
          params = [procesoId];
        } else if (nombreTabla === 'subtareas_etapas') {
          query += ' WHERE subtarea_id = ?';
          params = [procesoId];
        } else if (nombreTabla === 'seguimiento_etapas') {
          query += ' WHERE subtarea_id = ?';
          params = [procesoId];
        } else if (nombreTabla === 'seguimientos_diarios') {
          query += ' WHERE subtarea_id = ?';
          params = [procesoId];
        } else {
          // Para otras tablas, solo obtener los primeros registros
          query += ' LIMIT 2';
        }

        const [datos] = await pool.execute(query, params);
        estructura[nombreTabla].datos = datos;
      } catch (e) {
        console.log(`  ⚠ No se pudieron extraer datos de ${nombreTabla}`);
      }
    }

    // 4. Crear archivo JSON con la estructura completa
    const outputJson = path.resolve(__dirname, '../../../Desarrollo/Seguimiento_contrataciones/Documentos para actualizar/estructura_completa.json');
    fs.writeFileSync(outputJson, JSON.stringify(estructura, null, 2), 'utf8');
    console.log(`\n✓ Estructura JSON guardada en: estructura_completa.json`);

    // 5. Crear CSV para fácil visualización
    const outputCsv = path.resolve(__dirname, '../../../Desarrollo/Seguimiento_contrataciones/Documentos para actualizar/estructura_completa.csv');
    let csvContent = 'TABLA,COLUMNA,TIPO_DATO,NULLABLE,CLAVE,EXTRA,VALOR_EJEMPLO\n';

    for (const [tabla, info] of Object.entries(estructura)) {
      for (const col of info.columnas) {
        const datosEjemplo = info.datos.length > 0 ? info.datos[0][col.COLUMN_NAME] : '';
        const valor = datosEjemplo !== null && datosEjemplo !== undefined ? String(datosEjemplo).replace(/,/g, ';') : '';

        csvContent += `"${tabla}","${col.COLUMN_NAME}","${col.COLUMN_TYPE}","${col.IS_NULLABLE}","${col.COLUMN_KEY}","${col.EXTRA}","${valor}"\n`;
      }
    }

    fs.writeFileSync(outputCsv, csvContent, 'utf8');
    console.log(`✓ Estructura CSV guardada en: estructura_completa.csv\n`);

    // 6. Mostrar resumen
    console.log('\n========================================');
    console.log('RESUMEN DE TABLAS Y COLUMNAS');
    console.log('========================================\n');

    for (const [tabla, info] of Object.entries(estructura)) {
      console.log(`📋 TABLA: ${tabla} (${info.columnas.length} columnas)`);

      for (const col of info.columnas) {
        let tipo = col.COLUMN_TYPE;
        let info_extra = [];
        if (col.COLUMN_KEY) info_extra.push(`KEY:${col.COLUMN_KEY}`);
        if (col.IS_NULLABLE === 'NO') info_extra.push('NOT NULL');
        if (col.COLUMN_DEFAULT) info_extra.push(`DEFAULT:${col.COLUMN_DEFAULT}`);
        if (col.EXTRA) info_extra.push(`EXTRA:${col.EXTRA}`);

        const extra = info_extra.length > 0 ? ` [${info_extra.join(', ')}]` : '';
        console.log(`   - ${col.COLUMN_NAME}: ${tipo}${extra}`);
      }

      if (info.datos.length > 0) {
        console.log(`   ✓ ${info.datos.length} registro(s) encontrado(s) para este proceso`);
      }
      console.log('');
    }

    await pool.end();
    console.log('✓ Extracción completada exitosamente\n');

  } catch (error) {
    console.error('❌ Error:');
    console.error(error.message);
    console.error('\nVerifica que:');
    console.error('  - MySQL esté corriendo');
    console.error('  - Las variables de entorno estén configuradas');
    console.error('  - El archivo .env exista en backend/');
  }
}

extraerEstructura();
