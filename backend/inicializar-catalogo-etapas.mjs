import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function inicializarCatalogo() {
  let connection;
  try {
    console.log('🔗 Conectando a la base de datos...');
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Conectado a: ' + DB_NAME + '\n');

    // 1. Crear tabla etapas_catalogo
    console.log('📋 Creando tabla etapas_catalogo...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS \`etapas_catalogo\` (
        \`id\` INT NOT NULL PRIMARY KEY,
        \`nombre\` VARCHAR(255) NOT NULL UNIQUE,
        \`clasificacion\` VARCHAR(50) NOT NULL DEFAULT 'sin_clasificar',
        \`orden\` INT NULL DEFAULT NULL,
        \`descripcion\` TEXT NULL DEFAULT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_clasificacion\` (\`clasificacion\`),
        INDEX \`idx_orden\` (\`orden\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableSQL);
    console.log('✓ Tabla creada o ya existe\n');

    // 2. Verificar si ya hay datos
    const [existingData] = await connection.query('SELECT COUNT(*) as count FROM etapas_catalogo');
    if (existingData[0].count > 0) {
      console.log(`⚠️  La tabla ya tiene ${existingData[0].count} registros. ¿Limpiar primero? (continuando sin limpiar)\n`);
    }

    // 3. Copiar etapas de etapas_pac a etapas_catalogo si no existen
    console.log('📦 Copiando etapas de etapas_pac a etapas_catalogo...');
    const insertSQL = `
      INSERT IGNORE INTO \`etapas_catalogo\` (id, nombre, clasificacion, orden)
      SELECT id, nombre, 'sin_clasificar', orden
      FROM etapas_pac
      WHERE id NOT IN (SELECT id FROM etapas_catalogo)
      ORDER BY id
    `;

    const [result] = await connection.query(insertSQL);
    console.log(`✓ Insertadas ${result.affectedRows} nuevas etapas\n`);

    // 4. Mostrar resumen
    console.log('📊 Resumen del catálogo:');
    const [summary] = await connection.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN clasificacion = 'sin_clasificar' THEN 1 ELSE 0 END) as sin_clasificar,
        SUM(CASE WHEN clasificacion = 'preparatoria' THEN 1 ELSE 0 END) as preparatoria,
        SUM(CASE WHEN clasificacion = 'precontractual' THEN 1 ELSE 0 END) as precontractual,
        SUM(CASE WHEN clasificacion = 'contractual' THEN 1 ELSE 0 END) as contractual
      FROM etapas_catalogo
    `);

    const s = summary[0];
    console.log(`  Total de etapas: ${s.total}`);
    console.log(`  - Sin clasificar: ${s.sin_clasificar}`);
    console.log(`  - Preparatoria: ${s.preparatoria || 0}`);
    console.log(`  - Precontractual: ${s.precontractual || 0}`);
    console.log(`  - Contractual: ${s.contractual || 0}`);

    console.log('\n✅ Inicialización completada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

inicializarCatalogo();
