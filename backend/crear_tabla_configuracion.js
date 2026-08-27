import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function crearTabla() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('📝 Creando tabla de configuración...\n');

    // Crear tabla
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS configuracion_sistema (
          id INT PRIMARY KEY AUTO_INCREMENT,
          clave VARCHAR(100) NOT NULL UNIQUE COMMENT 'Clave de configuración',
          valor VARCHAR(255) NOT NULL COMMENT 'Valor de la configuración',
          descripcion TEXT COMMENT 'Descripción de qué es esta configuración',
          tipo ENUM('boolean', 'string', 'number', 'json') DEFAULT 'string' COMMENT 'Tipo de dato',
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla configuracion_sistema creada');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('ℹ️  Tabla configuracion_sistema ya existe');
      } else {
        throw error;
      }
    }

    // Insertar configuraciones por defecto
    console.log('\n📋 Insertando configuraciones por defecto...\n');

    const configs = [
      {
        clave: 'editar_fecha_planificada_direcciones',
        valor: '1',
        descripcion: 'Permitir que los usuarios de direcciones editen la fecha planificada de las etapas',
        tipo: 'boolean'
      },
      {
        clave: 'editar_fecha_planificada_admin',
        valor: '1',
        descripcion: 'Permitir que los administradores editen la fecha planificada de las etapas',
        tipo: 'boolean'
      }
    ];

    for (const config of configs) {
      try {
        await connection.query(
          `INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion), tipo = VALUES(tipo)`,
          [config.clave, config.valor, config.descripcion, config.tipo]
        );
        console.log(`  ✅ ${config.clave} = ${config.valor}`);
      } catch (error) {
        console.error(`  ❌ Error en ${config.clave}:`, error.message);
      }
    }

    // Verificar configuraciones creadas
    console.log('\n✅ Configuraciones del sistema:\n');
    const [configs_guardadas] = await connection.query(
      `SELECT clave, valor, descripcion FROM configuracion_sistema ORDER BY clave`
    );

    configs_guardadas.forEach((cfg, i) => {
      console.log(`  ${i+1}. ${cfg.clave}`);
      console.log(`     Valor: ${cfg.valor}`);
      console.log(`     ${cfg.descripcion}\n`);
    });

    console.log('✅ Operación completada');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

crearTabla();
