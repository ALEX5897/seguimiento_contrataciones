import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Obtener el rol de TICS
const [usuarios] = await conn.execute("SELECT role FROM usuarios WHERE username = 'TICS'");
const userRole = usuarios[0]?.role;
console.log(`\nUsuario TICS tiene rol: ${userRole}\n`);

// Verificar permisos del rol "direccion" en módulo "actividades"
const [permisos] = await conn.execute(
  `SELECT puede_leer, puede_crear, puede_actualizar, puede_borrar FROM permisos_roles_modulos
   WHERE role = ? AND modulo_clave = 'actividades'`,
  [userRole]
);

console.log('Permisos para "actividades":');
if (permisos.length === 0) {
  console.log('  ❌ No hay permisos configurados para este módulo');
} else {
  const p = permisos[0];
  console.log(`  - Leer (GET): ${p.puede_leer ? '✓' : '❌'}`);
  console.log(`  - Crear (POST): ${p.puede_crear ? '✓' : '❌'}`);
  console.log(`  - Actualizar (PUT): ${p.puede_actualizar ? '✓' : '❌'}`);
  console.log(`  - Borrar (DELETE): ${p.puede_borrar ? '✓' : '❌'}`);
}

await conn.end();
