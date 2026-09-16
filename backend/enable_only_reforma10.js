import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, './.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error) {
  console.warn('Advertencia: .env no encontrado en', ENV_PATH, ', usando variables de entorno globales');
}

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('🔧 Habilitando solo procesos de Reforma 10...\n');

  let pool;
  try {
    // Crear pool de conexiones
    pool = await mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();

    try {
      // 1. Obtener información de la Reforma 10
      console.log('📋 Obteniendo información de Reforma 10...');
      const [reforma10] = await connection.query(
        'SELECT * FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
      );

      if (reforma10.length === 0) {
        throw new Error('No se encontró Reforma 10 2026');
      }

      const reforma10Id = reforma10[0].id;
      console.log(`✅ Reforma 10 encontrada (ID: ${reforma10Id})\n`);

      // 2. Obtener información de otras versiones
      console.log('📊 Consultando otras reformas...');
      const [otrasReformas] = await connection.query(
        'SELECT id, numero_reforma, nombre FROM versiones WHERE id != ? ORDER BY numero_reforma',
        [reforma10Id]
      );

      console.log(`✅ Se encontraron ${otrasReformas.length} otras reformas\n`);

      // 3. Desactivar procesos de otras reformas
      console.log('🔴 Desactivando procesos de otras reformas...');
      const [resultDesactivar] = await connection.query(
        'UPDATE procesos SET activo = 0 WHERE version_id != ?',
        [reforma10Id]
      );
      console.log(`✅ ${resultDesactivar.affectedRows} procesos desactivados\n`);

      // 4. Activar procesos de Reforma 10
      console.log('🟢 Activando procesos de Reforma 10...');
      const [resultActivar] = await connection.query(
        'UPDATE procesos SET activo = 1 WHERE version_id = ?',
        [reforma10Id]
      );
      console.log(`✅ ${resultActivar.affectedRows} procesos activados\n`);

      // 5. Verificar estado actual
      console.log('📈 Verificando estado actual del sistema...\n');

      const [procesos] = await connection.query(
        `SELECT
          v.numero_reforma,
          v.nombre,
          COUNT(p.id) as total_procesos,
          SUM(CASE WHEN p.activo = 1 THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN p.activo = 0 THEN 1 ELSE 0 END) as inactivos
        FROM versiones v
        LEFT JOIN procesos p ON v.id = p.version_id
        GROUP BY v.id, v.numero_reforma, v.nombre
        ORDER BY v.numero_reforma`
      );

      console.log('Estado por reforma:');
      console.log('═══════════════════════════════════════════════════════════');
      let totalActivos = 0;
      let totalInactivos = 0;

      procesos.forEach((row) => {
        const activos = row.activos || 0;
        const inactivos = row.inactivos || 0;
        const total = row.total_procesos || 0;

        totalActivos += activos;
        totalInactivos += inactivos;

        const estado = row.numero_reforma === 10 ? '✅' : '❌';
        console.log(
          `${estado} Reforma ${row.numero_reforma} - ${row.nombre}`
        );
        console.log(
          `   Total: ${total} | Activos: ${activos} | Inactivos: ${inactivos}`
        );
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log(`\n📊 RESUMEN TOTAL:`);
      console.log(`   Procesos activos en el sistema: ${totalActivos}`);
      console.log(`   Procesos inactivos en el sistema: ${totalInactivos}`);
      console.log(`   Solo Reforma 10 está habilitada: ${totalActivos === reforma10[0].total_procesos ? '✅ Sí' : '⚠️ Revisar'}\n`);

      // 6. Desactivar otras reformas
      console.log('🔐 Marcando otras reformas como inactivas...');
      const [resultDesactivarReformas] = await connection.query(
        'UPDATE versiones SET activa = 0 WHERE id != ?',
        [reforma10Id]
      );
      console.log(`✅ ${resultDesactivarReformas.affectedRows} reformas desactivadas\n`);

      // 7. Asegurar Reforma 10 está activa
      console.log('🟢 Asegurando Reforma 10 como versión activa...');
      const [resultActivarReforma] = await connection.query(
        'UPDATE versiones SET activa = 1 WHERE id = ?',
        [reforma10Id]
      );
      console.log(`✅ Reforma 10 establecida como activa\n`);

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('✅ Solo procesos de Reforma 10 están habilitados');
      console.log('✅ Reforma 10 es la versión activa del sistema\n');

    } finally {
      await connection.release();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error crítico:', error.message);
    process.exit(1);
  });
