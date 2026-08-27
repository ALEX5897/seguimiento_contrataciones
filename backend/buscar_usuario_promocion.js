import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

try {
  // Buscar usuarios con "Promoción" en su nombre
  const [usuarios] = await connection.execute(
    `SELECT id, username, nombre, role, direccion_nombre
     FROM usuarios
     WHERE direccion_nombre LIKE ?
     ORDER BY nombre`,
    ['%Promoción%']
  );

  console.log('Usuarios con "Promoción" en su dirección:');
  usuarios.forEach(u => {
    console.log(`  ID ${u.id}: ${u.username} (${u.nombre}) - Rol: ${u.role}`);
    console.log(`          Dirección: ${u.direccion_nombre}\n`);
  });

  if (usuarios.length > 0) {
    console.log('\nVer también en usuarios_direcciones:');
    for (const u of usuarios) {
      const [asignadas] = await connection.execute(
        `SELECT direccion_id, d.nombre FROM usuarios_direcciones ud
         LEFT JOIN direcciones_catalogo d ON d.id = ud.direccion_id
         WHERE ud.usuario_id = ?`,
        [u.id]
      );
      console.log(`  Usuario ${u.username}: ${asignadas.length === 0 ? 'SIN DIRECCIONES ASIGNADAS' : asignadas.map(a => `[${a.direccion_id}]`).join(', ')}`);
    }
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
