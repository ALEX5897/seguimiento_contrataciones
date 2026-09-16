import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const EXCEL_FILE = path.resolve(__dirname, '../Matriz_Base_POA_2026_1.xlsx');

async function main() {
  console.log('📊 Auditando: Excel vs Base de Datos\n');

  // 1. Leer Excel
  console.log('1️⃣ Leyendo archivo Excel...');
  const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = rows[0] || [];

  console.log(`📄 Hoja: ${workbook.SheetNames[0]}`);
  console.log(`📋 Columnas encontradas en Excel: ${headers.length}`);
  console.log(`\n   Columnas:`);
  headers.forEach((h, i) => {
    if (h && String(h).trim()) {
      console.log(`   ${i+1}. ${h}`);
    }
  });

  // 2. Conectar a BD
  console.log('\n2️⃣ Conectando a BD...');
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const conn = await pool.getConnection();

  try {
    // Obtener columnas de procesos en BD
    const [colsDB] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'procesos'
      ORDER BY ORDINAL_POSITION
    `);

    console.log(`✅ Columnas en tabla PROCESOS: ${colsDB.length}`);
    console.log(`\n   Columnas en BD:`);
    colsDB.forEach((col, i) => {
      console.log(`   ${i+1}. ${col.COLUMN_NAME}`);
    });

    // 3. Comparar primer proceso
    console.log('\n\n3️⃣ COMPARANDO PRIMER PROCESO\n');

    const excelRows = rows.slice(1);
    const primerExcel = excelRows[0] || [];

    console.log('📄 Datos en Excel (primer fila):');
    headers.forEach((h, i) => {
      if (h && String(h).trim()) {
        const valor = primerExcel[i];
        if (valor !== null && valor !== undefined) {
          console.log(`   ${h}: ${valor}`);
        }
      }
    });

    // Obtener primer proceso de BD
    const [procesos] = await conn.query(`
      SELECT * FROM procesos WHERE version_id = 14 LIMIT 1
    `);

    if (procesos.length > 0) {
      console.log('\n💾 Datos en Base de Datos (primer registro):');
      const p = procesos[0];
      Object.entries(p).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          console.log(`   ${key}: ${value}`);
        }
      });
    }

    // 4. Revisar datos críticos
    console.log('\n\n4️⃣ REVISANDO DATOS CRÍTICOS\n');

    const [procesosConNull] = await conn.query(`
      SELECT
        codigo_olympo,
        COUNT(*) as total,
        SUM(CASE WHEN direccion_encargada IS NULL OR direccion_encargada = '' THEN 1 ELSE 0 END) as sin_direccion,
        SUM(CASE WHEN responsable IS NULL OR responsable = '' THEN 1 ELSE 0 END) as sin_responsable,
        SUM(CASE WHEN presupuesto_2026_inicial IS NULL OR presupuesto_2026_inicial = 0 THEN 1 ELSE 0 END) as sin_presupuesto
      FROM procesos
      WHERE version_id = 14
      GROUP BY 1
      LIMIT 10
    `);

    console.log('📊 Muestra de procesos cargados:');
    console.log('Código | Sin Dirección | Sin Responsable | Sin Presupuesto');
    console.log('------|---------|---------|----------');
    procesosConNull.forEach(row => {
      console.log(`${row.codigo_olympo.padEnd(6)} | ${String(row.sin_direccion).padEnd(7)} | ${String(row.sin_responsable).padEnd(7)} | ${String(row.sin_presupuesto).padEnd(7)}`);
    });

    // 5. Estadísticas generales
    console.log('\n\n5️⃣ ESTADÍSTICAS DE REFORMA 10\n');

    const stats = await Promise.all([
      conn.query('SELECT COUNT(*) as cnt FROM procesos WHERE version_id = 14'),
      conn.query('SELECT COUNT(*) as cnt FROM procesos WHERE version_id = 14 AND (direccion_encargada IS NULL OR direccion_encargada = "")'),
      conn.query('SELECT DISTINCT direccion_encargada FROM procesos WHERE version_id = 14 AND direccion_encargada IS NOT NULL AND direccion_encargada != "" ORDER BY direccion_encargada'),
      conn.query('SELECT COUNT(DISTINCT responsable) as cnt FROM procesos WHERE version_id = 14 AND responsable IS NOT NULL AND responsable != ""')
    ]);

    console.log(`✅ Total de procesos: ${stats[0][0][0].cnt}`);
    console.log(`⚠️  Procesos sin dirección: ${stats[1][0][0].cnt}`);
    console.log(`\n📍 Direcciones cargadas: ${stats[2][0].length}`);
    stats[2][0].forEach(d => {
      console.log(`   - ${d.direccion_encargada}`);
    });
    console.log(`\n👥 Total de responsables únicos: ${stats[3][0][0].cnt}`);

  } finally {
    await conn.release();
    await pool.end();
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('CONCLUSIÓN');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('¿Faltan columnas o datos en la carga?');
  console.log('Revisa la lista de columnas de Excel vs la BD');
  console.log('e indica cuáles faltan cargar o cuáles se cargaron incorrectamente.\n');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
