import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DB_HOST = '172.16.1.80';
const DB_PORT = 3306;
const DB_USER = 'usr-cont';
const DB_PASSWORD = 'mas_TER$*25@';
const DB_NAME = 'poa_pac';

async function verificarColumnas() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    console.log('🔍 Verificando columnas existentes en subtareas...\n');

    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'subtareas' AND TABLE_SCHEMA = ?"
      , [DB_NAME]
    );

    const columnasExistentes = columns.map(c => c.COLUMN_NAME);
    console.log('Columnas actuales:', columnasExistentes);

    const columnasNecesarias = ['fecha_inicio', 'fecha_fin', 'avance_general'];
    const columnasQueFaltan = columnasNecesarias.filter(col => !columnasExistentes.includes(col));

    if (columnasQueFaltan.length === 0) {
      console.log('\n✅ Todas las columnas necesarias existen');
      return false;
    }

    console.log('\n❌ Columnas que faltan:', columnasQueFaltan);
    return true;
  } finally {
    if (connection) await connection.end();
  }
}

async function ejecutarMigracion() {
  let connection;
  try {
    console.log('\n🔗 Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Conectado a: ' + DB_NAME);

    // Leer el archivo de migración
    const migrationPath = path.resolve('./migrations/005_agregar_campos_cronograma.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📋 Ejecutando migración...\n');

    // Ejecutar cada declaración SQL por separado
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[${i + 1}/${statements.length}] Ejecutando...`);
      try {
        await connection.query(stmt);
        console.log('✓ OK\n');
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log('⚠️  Índice ya existe (ignorado)\n');
        } else if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  Columna ya existe (ignorada)\n');
        } else {
          throw e;
        }
      }
    }

    console.log('✅ Migración completada exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

async function main() {
  const necesitaMigracion = await verificarColumnas();
  if (necesitaMigracion) {
    await ejecutarMigracion();
    console.log('\n✅ Por favor reinicia el servidor para aplicar los cambios');
  }
}

main();
