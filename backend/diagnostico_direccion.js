import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

try {
  console.log('=== DIAGNÓSTICO DE ACCESO A TAREA ===\n');

  // 1. Obtener información de la subtarea
  const [subtarea] = await connection.execute(
    `SELECT id, codigo_olympo, nombre, direccion_encargada
     FROM subtareas WHERE codigo_olympo = ?`,
    ['02.01.001.043.730249.000.002']
  );

  if (subtarea.length === 0) {
    console.log('✗ Tarea no encontrada');
    await connection.end();
    process.exit(1);
  }

  const tarea = subtarea[0];
  console.log('📋 INFORMACIÓN DE LA TAREA:');
  console.log(`  Código: ${tarea.codigo_olympo}`);
  console.log(`  Nombre: ${tarea.nombre.substring(0, 80)}...`);
  console.log(`  Dirección encargada: ${tarea.direccion_encargada}`);

  // 2. Obtener el catálogo de direcciones
  const [direccionesDb] = await connection.execute(
    'SELECT id, nombre FROM direcciones_catalogo ORDER BY nombre'
  );

  console.log('\n📁 CATÁLOGO DE DIRECCIONES:');
  let direccionId = null;
  for (const d of direccionesDb) {
    const esLaDireccion = String(d.nombre).trim().toLowerCase() === String(tarea.direccion_encargada).trim().toLowerCase();
    if (esLaDireccion) {
      direccionId = d.id;
      console.log(`  [${d.id}] ${d.nombre} ← COINCIDE CON LA TAREA`);
    }
  }

  console.log(`\n  Dirección ID de la tarea sería: ${direccionId}`);

  // 3. Buscar usuarios con esa dirección asignada
  const [usuariosAsignados] = await connection.execute(
    `SELECT ud.usuario_id, u.username, u.nombre, d.id, d.nombre as dir_nombre
     FROM usuarios_direcciones ud
     JOIN usuarios u ON u.id = ud.usuario_id
     LEFT JOIN direcciones_catalogo d ON d.id = ud.direccion_id
     WHERE ud.direccion_id = ?
     ORDER BY u.nombre`,
    [direccionId]
  );

  console.log(`\n👥 USUARIOS ASIGNADOS AL DIRECTIONID ${direccionId}:`);
  if (usuariosAsignados.length === 0) {
    console.log(`  ⚠️ NINGÚN USUARIO ASIGNADO A ESTA DIRECCIÓN`);
  } else {
    usuariosAsignados.forEach(u => {
      console.log(`  • ${u.username} (${u.nombre}) - User ID: ${u.usuario_id}`);
    });
  }

  // 4. Análisis y conclusión
  console.log('\n⚠️  DIAGNOSIS:');
  if (!direccionId) {
    console.log('  ✗ La dirección de la tarea NO existe en el catálogo');
  } else if (usuariosAsignados.length === 0) {
    console.log(`  ✗ PROBLEMA ENCONTRADO: No hay usuarios asignados al directionId ${direccionId}`);
    console.log('  ✗ Por eso, aunque cambies el cuatrimestre, el usuario no ve la tarea');
    console.log('\n  SOLUCIÓN: Hay que asignar usuarios a este directionId en la tabla usuarios_direcciones');
  } else {
    console.log(`  ✓ TODO OK: ${usuariosAsignados.length} usuario(s) pueden ver esta tarea`);
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
