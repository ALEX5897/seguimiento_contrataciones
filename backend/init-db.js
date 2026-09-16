import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME
});

try {
  console.log('🔧 INICIALIZANDO TABLAS DE PERMISOS...');

  // Crear tabla de módulos de permisos si no existe
  await conn.query(`
    CREATE TABLE IF NOT EXISTS permisos_modulos_catalogo (
      id int NOT NULL AUTO_INCREMENT,
      clave varchar(80) NOT NULL,
      nombre varchar(120) NOT NULL,
      descripcion varchar(255) DEFAULT NULL,
      activo tinyint(1) NOT NULL DEFAULT '1',
      orden int NOT NULL DEFAULT '0',
      created_at datetime DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY clave (clave)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ Tabla permisos_modulos_catalogo creada/verificada');

  // Crear tabla de menú si no existe
  await conn.query(`
    CREATE TABLE IF NOT EXISTS permisos_menu_catalogo (
      id int NOT NULL AUTO_INCREMENT,
      clave varchar(80) NOT NULL,
      nombre varchar(120) NOT NULL,
      ruta varchar(255) NOT NULL,
      activo tinyint(1) NOT NULL DEFAULT '1',
      orden int NOT NULL DEFAULT '0',
      created_at datetime DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY clave (clave)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ Tabla permisos_menu_catalogo creada/verificada');

  // Crear tabla de permisos de roles si no existe
  await conn.query(`
    CREATE TABLE IF NOT EXISTS permisos_roles_modulos (
      id int NOT NULL AUTO_INCREMENT,
      role varchar(80) NOT NULL,
      modulo_clave varchar(80) NOT NULL,
      puede_leer tinyint(1) NOT NULL DEFAULT '0',
      puede_crear tinyint(1) NOT NULL DEFAULT '0',
      puede_actualizar tinyint(1) NOT NULL DEFAULT '0',
      puede_borrar tinyint(1) NOT NULL DEFAULT '0',
      created_at datetime DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_permisos_roles_modulo (role, modulo_clave),
      KEY fk_permisos_roles_modulos_catalogo (modulo_clave),
      CONSTRAINT fk_permisos_roles_modulos_catalogo FOREIGN KEY (modulo_clave) REFERENCES permisos_modulos_catalogo (clave) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ Tabla permisos_roles_modulos creada/verificada');

  // Crear tabla de permisos de menú si no existe
  await conn.query(`
    CREATE TABLE IF NOT EXISTS permisos_roles_menu (
      id int NOT NULL AUTO_INCREMENT,
      role varchar(80) NOT NULL,
      menu_clave varchar(80) NOT NULL,
      puede_ingresar tinyint(1) NOT NULL DEFAULT '0',
      created_at datetime DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_permisos_roles_menu (role, menu_clave),
      KEY fk_permisos_roles_menu_catalogo (menu_clave),
      CONSTRAINT fk_permisos_roles_menu_catalogo FOREIGN KEY (menu_clave) REFERENCES permisos_menu_catalogo (clave) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ Tabla permisos_roles_menu creada/verificada');

  // Insertar módulos de permisos por defecto
  const DEFAULT_PERMISSION_MODULES = [
    { clave: 'dashboard', nombre: 'Dashboard', descripcion: 'Acceso a indicadores generales', orden: 10 },
    { clave: 'actividades', nombre: 'Procesos / Actividades', descripcion: 'Gestión y consulta de procesos', orden: 20 },
    { clave: 'reportes', nombre: 'Reportes', descripcion: 'Consulta y exportación de reportes', orden: 30 },
    { clave: 'versiones', nombre: 'Versiones', descripcion: 'Gestión de reformas y versiones POA', orden: 40 },
    { clave: 'admin_usuarios', nombre: 'Admin Usuarios', descripcion: 'Administración de usuarios del sistema', orden: 50 },
    { clave: 'admin_catalogos', nombre: 'Admin Catálogos', descripcion: 'Administración de catálogos maestros', orden: 60 },
    { clave: 'admin_permisos', nombre: 'Admin Permisos', descripcion: 'Administración de permisos y menús', orden: 70 },
    { clave: 'admin_auditoria', nombre: 'Admin Auditoría', descripcion: 'Consulta de trazabilidad y bitácora de cambios', orden: 75 },
    { clave: 'notificaciones', nombre: 'Notificaciones', descripcion: 'Consulta y gestión de notificaciones', orden: 80 },
    { clave: 'chat_ia', nombre: 'Chat IA', descripcion: 'Asistente conversacional para apoyo operativo', orden: 85 },
    { clave: 'estados', nombre: 'Estados', descripcion: 'Consulta de estados de seguimiento', orden: 90 },
    { clave: 'admin_actividades', nombre: 'Admin Procesos', descripcion: 'Configuración administrativa de procesos', orden: 100 },
    { clave: 'admin_versiones', nombre: 'Admin Versiones', descripcion: 'Operaciones administrativas de versiones', orden: 110 }
  ];

  for (const module of DEFAULT_PERMISSION_MODULES) {
    await conn.query(
      'INSERT IGNORE INTO permisos_modulos_catalogo (clave, nombre, descripcion, orden) VALUES (?, ?, ?, ?)',
      [module.clave, module.nombre, module.descripcion, module.orden]
    );
  }

  console.log(`✅ ${DEFAULT_PERMISSION_MODULES.length} módulos de permisos insertados`);

  // Insertar menú por defecto
  const DEFAULT_PERMISSION_MENU = [
    { clave: 'dashboard', nombre: 'Dashboard', ruta: '/', orden: 10 },
    { clave: 'actividades', nombre: 'Procesos', ruta: '/actividades', orden: 20 },
    { clave: 'reportes', nombre: 'Reportes', ruta: '/reportes', orden: 30 },
    { clave: 'informes', nombre: 'Informes Gerenciales', ruta: '/informes', orden: 31 },
    { clave: 'notificaciones', nombre: 'Notificaciones', ruta: '/notificaciones', orden: 35 },
    { clave: 'chat_ia', nombre: 'Chat IA', ruta: '/chat-ia', orden: 36 },
    { clave: 'admin_actividades', nombre: 'Admin Procesos', ruta: '/admin/actividades', orden: 40 },
    { clave: 'admin_versiones', nombre: 'Admin Versiones', ruta: '/admin/versiones', orden: 50 },
    { clave: 'admin_usuarios', nombre: 'Admin Usuarios', ruta: '/admin/usuarios', orden: 60 },
    { clave: 'admin_catalogos', nombre: 'Admin Catálogos', ruta: '/admin/catalogos', orden: 70 },
    { clave: 'admin_permisos', nombre: 'Admin Permisos', ruta: '/admin/permisos', orden: 80 },
    { clave: 'admin_auditoria', nombre: 'Admin Auditoría', ruta: '/admin/auditoria', orden: 90 }
  ];

  for (const menu of DEFAULT_PERMISSION_MENU) {
    await conn.query(
      'INSERT IGNORE INTO permisos_menu_catalogo (clave, nombre, ruta, orden) VALUES (?, ?, ?, ?)',
      [menu.clave, menu.nombre, menu.ruta, menu.orden]
    );
  }

  console.log(`✅ ${DEFAULT_PERMISSION_MENU.length} menús insertados`);

  // Insertar permisos por defecto para rol admin
  const adminModules = DEFAULT_PERMISSION_MODULES.map(m => m.clave);
  for (const mod of adminModules) {
    await conn.query(
      'INSERT IGNORE INTO permisos_roles_modulos (role, modulo_clave, puede_leer, puede_crear, puede_actualizar, puede_borrar) VALUES (?, ?, 1, 1, 1, 1)',
      ['admin', mod]
    );
  }

  console.log(`✅ Permisos de admin insertados`);

  // Insertar permisos de menú para admin
  const adminMenus = DEFAULT_PERMISSION_MENU.map(m => m.clave);
  for (const menu of adminMenus) {
    await conn.query(
      'INSERT IGNORE INTO permisos_roles_menu (role, menu_clave, puede_ingresar) VALUES (?, ?, 1)',
      ['admin', menu]
    );
  }

  console.log(`✅ Permisos de menú para admin insertados`);

  console.log('\n🎉 BASE DE DATOS INICIALIZADA CORRECTAMENTE');

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
