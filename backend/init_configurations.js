import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, './.env');
const envLoaded = dotenv.config({ path: ENV_PATH });
if (envLoaded.error) {
  console.warn('Advertencia: .env no encontrado en', ENV_PATH);
}

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT, 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('🔧 Inicializando configuraciones del sistema...\n');

  let pool;
  try {
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
      // Crear tabla de configuración si no existe
      console.log('📋 Verificando tabla de configuración...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS configuracion_sistema (
          id INT PRIMARY KEY AUTO_INCREMENT,
          clave VARCHAR(255) UNIQUE NOT NULL,
          valor TEXT,
          tipo ENUM('string', 'boolean', 'number', 'json') DEFAULT 'string',
          descripcion TEXT,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_clave (clave)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla configuracion_sistema lista\n');

      // Configuraciones a insertar
      const configuraciones = [
        {
          clave: 'editar_fecha_planificada_direcciones',
          valor: '0',
          tipo: 'boolean',
          descripcion: 'Permite que usuarios de dirección editen la Fecha Planificada de etapas'
        },
        {
          clave: 'version_activa_id',
          valor: '14',
          tipo: 'number',
          descripcion: 'ID de la versión/reforma activa del sistema'
        },
        {
          clave: 'notificaciones_habilitadas',
          valor: '1',
          tipo: 'boolean',
          descripcion: 'Habilita el sistema de notificaciones'
        }
      ];

      console.log('📝 Insertando/Actualizando configuraciones...\n');

      for (const config of configuraciones) {
        try {
          // Verificar si existe
          const [existe] = await connection.query(
            'SELECT id FROM configuracion_sistema WHERE clave = ?',
            [config.clave]
          );

          if (existe.length > 0) {
            // Actualizar
            await connection.query(
              'UPDATE configuracion_sistema SET valor = ?, tipo = ?, descripcion = ? WHERE clave = ?',
              [config.valor, config.tipo, config.descripcion, config.clave]
            );
            console.log(`✅ ${config.clave} (actualizado)`);
          } else {
            // Insertar
            await connection.query(
              'INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion) VALUES (?, ?, ?, ?)',
              [config.clave, config.valor, config.tipo, config.descripcion]
            );
            console.log(`✅ ${config.clave} (creado)`);
          }
        } catch (error) {
          console.error(`❌ Error con ${config.clave}:`, error.message);
        }
      }

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ CONFIGURACIONES INICIALIZADAS');
      console.log('═══════════════════════════════════════════════════════\n');

      // Mostrar configuraciones actuales
      const [configs] = await connection.query(
        'SELECT clave, valor, tipo, descripcion FROM configuracion_sistema ORDER BY clave'
      );

      console.log('📋 Configuraciones del sistema:\n');
      configs.forEach(config => {
        const valorMostrado = config.tipo === 'boolean' ? (config.valor === '1' ? '✅ Sí' : '❌ No') : config.valor;
        console.log(`${config.clave}:`);
        console.log(`  Valor: ${valorMostrado}`);
        console.log(`  Tipo: ${config.tipo}`);
        console.log(`  Descripción: ${config.descripcion}\n`);
      });

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
