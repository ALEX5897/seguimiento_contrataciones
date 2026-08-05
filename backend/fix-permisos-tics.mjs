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

console.log('\n=== OTORGANDO PERMISOS A ROL "DIRECCION" ===\n');

// Actualizar permisos del rol "direccion" en módulo "actividades"
const [result] = await conn.execute(
  `UPDATE permisos_roles_modulos
   SET puede_crear = 1, puede_borrar = 1
   WHERE role = 'direccion' AND modulo_clave = 'actividades'`
);

console.log(`✓ Filas actualizadas: ${result.affectedRows}`);

// Verificar cambios
const [permisos] = await conn.execute(
  `SELECT puede_leer, puede_crear, puede_actualizar, puede_borrar FROM permisos_roles_modulos
   WHERE role = 'direccion' AND modulo_clave = 'actividades'`
);

if (permisos.length > 0) {
  const p = permisos[0];
  console.log('\nPermisos actualizados para "actividades":');
  console.log(`  - Leer (GET): ${p.puede_leer ? '✓' : '❌'}`);
  console.log(`  - Crear (POST): ${p.puede_crear ? '✓' : '❌'}`);
  console.log(`  - Actualizar (PUT): ${p.puede_actualizar ? '✓' : '❌'}`);
  console.log(`  - Borrar (DELETE): ${p.puede_borrar ? '✓' : '❌'}`);
}

await conn.end();
console.log('\n✓ Permisos configurados correctamente\n');
