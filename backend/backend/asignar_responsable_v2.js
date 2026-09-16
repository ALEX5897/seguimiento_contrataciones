import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  console.log('🔍 BUSCANDO EN RESPONSABLES_CATALOGO\n');

  // 1. Buscar usuario en responsables_catalogo
  console.log('1️⃣ Buscando "alex wladimir casa"...');
  const [responsables] = await conn.execute(`
    SELECT id, nombre, email FROM responsables_catalogo
    WHERE nombre LIKE '%alex%' OR nombre LIKE '%wladimir%' OR nombre LIKE '%casa%'
  `);

  if (responsables.length === 0) {
    console.log('   ❌ No encontrado en responsables_catalogo');
    
    console.log('\n   📋 Listando responsables...');
    const [todos] = await conn.execute('SELECT id, nombre FROM responsables_catalogo LIMIT 20');
    todos.forEach(r => console.log(`      - ID ${r.id}: ${r.nombre}`));
    process.exit(1);
  }

  const responsable = responsables[0];
  console.log(`   ✅ Encontrado: ${responsable.nombre} (ID: ${responsable.id})`);

  // 2. Actualizar procesos
  console.log('\n2️⃣ Asignando a procesos...');
  const [result] = await conn.execute(`
    UPDATE procesos SET responsable_id = ? WHERE activo = 1 LIMIT 10
  `, [responsable.id]);

  console.log(`   ✅ ${result.affectedRows} proceso(s) actualizado(s)`);

  console.log('\n✅ LISTO - Ejecuta notificaciones:');
  console.log('POST http://localhost:3000/api/notificaciones/ejecutar');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await conn.end();
}
