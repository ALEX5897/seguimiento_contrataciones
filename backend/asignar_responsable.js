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
  console.log('🔍 BUSCANDO USUARIO Y PROCESOS\n');

  // 1. Buscar usuario
  console.log('1️⃣ Buscando usuario "alex"...');
  const [usuarios] = await conn.execute(`
    SELECT id, nombre, username FROM usuarios
    WHERE nombre LIKE '%alex%' OR username LIKE '%alex%'
  `);

  if (usuarios.length === 0) {
    console.log('   ❌ Usuario no encontrado');
    process.exit(1);
  }

  const usuario = usuarios[0];
  console.log(`   ✅ Usuario: ${usuario.nombre} (ID: ${usuario.id})`);

  // 2. Asignar responsable a procesos activos
  console.log('\n2️⃣ Asignando responsable a procesos activos...');
  const [result] = await conn.execute(`
    UPDATE procesos SET responsable_id = ? WHERE activo = 1 LIMIT 10
  `, [usuario.id]);

  console.log(`   ✅ ${result.affectedRows} proceso(s) actualizado(s)`);

  // 3. Verificar
  console.log('\n3️⃣ Verificando asignación...');
  const [procesos] = await conn.execute(`
    SELECT codigo_unico_proceso, direccion FROM procesos 
    WHERE responsable_id = ? LIMIT 5
  `, [usuario.id]);

  console.log(`   ✅ ${procesos.length} proceso(s) asignado(s):`);
  procesos.forEach(p => {
    console.log(`      - ${p.codigo_unico_proceso} (${p.direccion})`);
  });

  console.log('\n✅ LISTO - Ahora ejecuta las notificaciones:');
  console.log('POST http://localhost:3000/api/notificaciones/ejecutar');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await conn.end();
}
