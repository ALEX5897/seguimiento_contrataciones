import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

try {
  console.log('=== ASIGNANDO DIRECCIÓN AL USUARIO ===\n');

  // Asignar dirección ID 8 al usuario ID 14
  const [result] = await connection.execute(
    `INSERT INTO usuarios_direcciones (usuario_id, direccion_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id=id`,
    [14, 8]
  );

  console.log(`✓ Asignación completada`);
  console.log(`  Usuario ID: 14 (direccion_de_promocion_de_destino_turistico)`);
  console.log(`  Dirección ID: 8 (Dirección de Promoción de Destino Turístico)`);
  console.log(`  Registros afectados: ${result.affectedRows}`);

  // Verificar
  const [verificacion] = await connection.execute(
    `SELECT ud.usuario_id, u.nombre, ud.direccion_id, d.nombre as dir_nombre
     FROM usuarios_direcciones ud
     JOIN usuarios u ON u.id = ud.usuario_id
     LEFT JOIN direcciones_catalogo d ON d.id = ud.direccion_id
     WHERE ud.usuario_id = 14`
  );

  if (verificacion.length > 0) {
    console.log('\n✓ Verificación exitosa:');
    verificacion.forEach(row => {
      console.log(`  • ${row.nombre} → [${row.direccion_id}] ${row.dir_nombre}`);
    });
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
