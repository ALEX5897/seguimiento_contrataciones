import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME
});

await conn.query('SET FOREIGN_KEY_CHECKS=0');
await conn.query('DROP TABLE IF EXISTS seguimientos_diarios');
await conn.query('DROP TABLE IF EXISTS seguimiento_etapas');
await conn.query('DROP TABLE IF EXISTS subtareas_etapas');
await conn.query('DROP TABLE IF EXISTS subtareas');
await conn.query('DROP TABLE IF EXISTS etapas_pac');
await conn.query('SET FOREIGN_KEY_CHECKS=1');

await conn.query(`
CREATE TABLE etapas_pac (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  orden INT NOT NULL,
  es_personalizada BOOLEAN DEFAULT false,
  UNIQUE KEY unique_nombre (nombre)
) ENGINE=InnoDB;
`);

await conn.query(`
CREATE TABLE subtareas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  direccion_encargada VARCHAR(255) NOT NULL,
  nombre TEXT NOT NULL,
  codigo_olympo VARCHAR(100) NOT NULL UNIQUE,
  partida_presupuestaria VARCHAR(120) NULL,
  presupuesto_2026_inicial DECIMAL(14,2) NOT NULL DEFAULT 0,
  costo_2026 DECIMAL(14,2) NOT NULL DEFAULT 0,
  cuatrimestre VARCHAR(50) NULL,
  plazo_contrato VARCHAR(120) NULL,
  pac_no_pac VARCHAR(30) NOT NULL DEFAULT 'PAC',
  procedimiento_sugerido VARCHAR(255) NULL,
  responsable VARCHAR(255) NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  observaciones TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`);

await conn.query(`
CREATE TABLE subtareas_etapas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subtarea_id INT NOT NULL,
  etapa_id INT NOT NULL,
  aplica BOOLEAN NOT NULL DEFAULT true,
  fecha_tentativa DATE NULL,
  UNIQUE KEY unique_subtarea_etapa (subtarea_id, etapa_id),
  FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
  FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`);

await conn.query(`
CREATE TABLE seguimiento_etapas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subtarea_id INT NOT NULL,
  etapa_id INT NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  fecha_planificada DATE NULL,
  fecha_real DATE NULL,
  responsable VARCHAR(255) NULL,
  observaciones TEXT NULL,
  UNIQUE KEY unique_subtarea_etapa_seguimiento (subtarea_id, etapa_id),
  FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
  FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE
) ENGINE=InnoDB;
`);

await conn.query(`
CREATE TABLE seguimientos_diarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subtarea_id INT NOT NULL,
  etapa_id INT NOT NULL,
  fecha DATE NOT NULL,
  comentario TEXT NOT NULL,
  tiene_alerta BOOLEAN DEFAULT FALSE,
  responsable VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subtarea_id) REFERENCES subtareas(id) ON DELETE CASCADE,
  FOREIGN KEY (etapa_id) REFERENCES etapas_pac(id) ON DELETE CASCADE,
  INDEX idx_sd_subtarea (subtarea_id)
) ENGINE=InnoDB;
`);

await conn.end();
console.log('SCHEMA_OK');
