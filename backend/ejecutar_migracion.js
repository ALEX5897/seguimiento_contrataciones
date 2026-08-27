#!/usr/bin/env node

import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

async function ejecutarMigracion() {
  console.log('🔄 Ejecutando migración: Sistema de Versiones v2...\n');

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '172.16.1.80',
    user: process.env.DB_USER || 'usr-cont',
    password: process.env.DB_PASSWORD || 'mas_TER$*25@',
    database: process.env.DB_NAME || 'poa_pac',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const connection = await pool.getConnection();

  try {
    console.log(`📡 Conectado a ${process.env.DB_HOST}/${process.env.DB_NAME}\n`);

    // 1. Crear tabla versiones
    console.log('📝 Creando tabla versiones...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS versiones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        anio INT NOT NULL,
        numero_reforma INT DEFAULT 0,
        nombre VARCHAR(255),
        descripcion TEXT,
        estado ENUM('borrador', 'aprobado', 'historico') DEFAULT 'borrador',
        activa BOOLEAN DEFAULT 0,
        usuario_creacion VARCHAR(100),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_aprobacion VARCHAR(100),
        fecha_aprobacion TIMESTAMP NULL,
        usuario_activacion VARCHAR(100),
        fecha_activacion TIMESTAMP NULL,
        presupuesto_total DECIMAL(15,2) DEFAULT 0,
        total_procesos INT DEFAULT 0,
        activos_count INT DEFAULT 0,
        inactivos_count INT DEFAULT 0,

        UNIQUE KEY unique_reforma (anio, numero_reforma),
        INDEX idx_estado (estado),
        INDEX idx_activa (activa),
        INDEX idx_fecha_creacion (fecha_creacion),
        INDEX idx_anio (anio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla versiones creada\n');

    // 2. Crear tabla subtareas_versiones
    console.log('📝 Creando tabla subtareas_versiones...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subtareas_versiones (
        id INT PRIMARY KEY AUTO_INCREMENT,
        version_id INT NOT NULL,
        codigo_olympo VARCHAR(50) NOT NULL,
        subtarea VARCHAR(255) NOT NULL,
        direccion_encargada VARCHAR(100),
        responsable VARCHAR(100),
        responsable_id INT,
        fecha_inicio DATE,
        fecha_fin DATE,
        plazo_contrato INT,
        pac_no_pac VARCHAR(10),
        procedimiento_sugerido VARCHAR(100),
        presupuesto_2026_inicial DECIMAL(15,2) DEFAULT 0,
        costo_2026 DECIMAL(15,2) DEFAULT 0,
        partida_presupuestaria VARCHAR(50),
        cuatrimestre VARCHAR(20),
        activo TINYINT DEFAULT 1,
        proceso_en_riesgo TINYINT DEFAULT 0,
        riesgo_comentario TEXT,
        observaciones TEXT,
        estado_carga VARCHAR(50) DEFAULT 'activo',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY fk_version (version_id) REFERENCES versiones(id) ON DELETE CASCADE,
        UNIQUE KEY unique_proceso_version (version_id, codigo_olympo),
        INDEX idx_version (version_id),
        INDEX idx_codigo (codigo_olympo),
        INDEX idx_activo (activo),
        INDEX idx_direccion (direccion_encargada),
        INDEX idx_pac_nopac (pac_no_pac)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla subtareas_versiones creada\n');

    // 3. Crear tabla versiones_cambios
    console.log('📝 Creando tabla versiones_cambios...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS versiones_cambios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        version_id INT NOT NULL,
        tipo_cambio ENUM('crear', 'duplicar', 'excel', 'editar', 'eliminar', 'aprobar', 'activar') NOT NULL,
        usuario VARCHAR(100),
        descripcion TEXT,
        cantidad_registros INT,
        datos_cambio JSON,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (version_id) REFERENCES versiones(id) ON DELETE CASCADE,
        INDEX idx_version (version_id),
        INDEX idx_fecha (fecha),
        INDEX idx_tipo (tipo_cambio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla versiones_cambios creada\n');

    // 4. Obtener o crear Reforma 0
    console.log('📝 Verificando Reforma 0 (Base)...');
    const [existeReforma] = await connection.query(
      'SELECT id FROM versiones WHERE anio = 2026 AND numero_reforma = 0'
    );

    let reformaId;
    if (existeReforma.length > 0) {
      reformaId = existeReforma[0].id;
      console.log(`✅ Reforma 0 ya existe (ID: ${reformaId})\n`);
    } else {
      const [insertResult] = await connection.query(`
        INSERT INTO versiones (
          anio, numero_reforma, nombre, descripcion, estado, activa,
          usuario_creacion, fecha_creacion,
          presupuesto_total, total_procesos, activos_count, inactivos_count
        ) VALUES (
          2026, 0, 'Reforma Base 2026', 'Versión inicial con datos cargados en el sistema',
          'aprobado', 1,
          'SISTEMA', NOW(),
          10631080.06, 227, 81, 145
        )
      `);
      reformaId = insertResult.insertId;
      console.log(`✅ Reforma 0 creada (ID: ${reformaId})\n`);
    }

    // 5. Migrar procesos actuales
    console.log('📝 Migrando procesos actuales a Reforma 0...');
    const [result] = await connection.query(`
      INSERT INTO subtareas_versiones (
        version_id, codigo_olympo, subtarea, direccion_encargada, responsable, responsable_id,
        fecha_inicio, fecha_fin, plazo_contrato, pac_no_pac, procedimiento_sugerido,
        presupuesto_2026_inicial, costo_2026, partida_presupuestaria, cuatrimestre,
        activo, proceso_en_riesgo, riesgo_comentario, observaciones
      )
      SELECT
        ${reformaId} as version_id,
        COALESCE(codigo_olympo, CONCAT('OLY-2026-', id)) as codigo_olympo,
        SUBSTRING(nombre, 1, 255) as subtarea,
        COALESCE(direccion_encargada, 'N/A') as direccion_encargada,
        COALESCE(responsable, 'N/A') as responsable,
        responsable_id,
        fecha_inicio,
        fecha_fin,
        CAST(COALESCE(REGEXP_SUBSTR(plazo_contrato, '^[0-9]+'), '0') AS SIGNED) as plazo_contrato,
        COALESCE(pac_no_pac, 'PAC') as pac_no_pac,
        COALESCE(procedimiento_sugerido, 'No definido') as procedimiento_sugerido,
        COALESCE(presupuesto_2026_inicial, 0) as presupuesto_2026_inicial,
        COALESCE(costo_2026, 0) as costo_2026,
        partida_presupuestaria,
        COALESCE(cuatrimestre, 'Cuatrimestre I') as cuatrimestre,
        CASE WHEN activo IN (0, '0') THEN 0 ELSE 1 END as activo,
        CASE WHEN proceso_en_riesgo IN (1, '1') THEN 1 ELSE 0 END as proceso_en_riesgo,
        riesgo_comentario,
        observaciones
      FROM subtareas
      WHERE activo != 0
      ORDER BY id
    `);
    console.log(`✅ ${result.affectedRows} procesos migrados\n`);

    // 6. Registrar cambio
    console.log('📝 Registrando cambio en auditoría...');
    await connection.query(`
      INSERT INTO versiones_cambios (
        version_id, tipo_cambio, usuario, descripcion, cantidad_registros
      ) VALUES (?, 'crear', 'SISTEMA', 'Migración inicial - Carga de Reforma 0', ?)
    `, [reformaId, result.affectedRows]);
    console.log('✅ Cambio registrado\n');

    // 7. Verificaciones
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log('='.repeat(60) + '\n');

    const [versiones] = await connection.query('SELECT * FROM versiones WHERE numero_reforma = 0');
    if (versiones.length > 0) {
      const v = versiones[0];
      console.log('🎯 Reforma 0 (Base):');
      console.log(`  ID: ${v.id}`);
      console.log(`  Nombre: ${v.nombre}`);
      console.log(`  Estado: ${v.estado}`);
      console.log(`  Activa: ${v.activa ? '✅ SÍ' : '❌ NO'}`);
      console.log(`  Presupuesto: $${(v.presupuesto_total || 0).toLocaleString('es-EC', {minimumFractionDigits: 2})}`);
      console.log(`  Procesos totales: ${v.total_procesos}`);
      console.log(`  Procesos activos: ${v.activos_count}`);
      console.log(`  Procesos inactivos: ${v.inactivos_count}\n`);
    }

    const [procesos] = await connection.query(
      'SELECT COUNT(*) as total FROM subtareas_versiones WHERE version_id = ?',
      [reformaId]
    );
    console.log(`📋 Procesos en subtareas_versiones: ${procesos[0].total}\n`);

    const [ejemplos] = await connection.query(
      `SELECT codigo_olympo, subtarea, direccion_encargada, presupuesto_2026_inicial
       FROM subtareas_versiones
       WHERE version_id = ?
       LIMIT 5`,
      [reformaId]
    );

    if (ejemplos.length > 0) {
      console.log('📌 Ejemplos de procesos migrados:');
      ejemplos.forEach((proc, idx) => {
        console.log(
          `  ${idx + 1}. ${proc.codigo_olympo} - ${(proc.subtarea || '').substring(0, 45)}`
        );
      });
    }

    console.log('\n✨ ¡Migración exitosa! El sistema de versiones está listo.\n');

  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:');
    console.error(`   ${error.message}\n`);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

// Ejecutar
ejecutarMigracion().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
