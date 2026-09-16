import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('🔍 BÚSQUEDA DE DATOS PARA PRUEBA DE NOTIFICACIONES\n');

// Buscar usuario Alex Wladimir Casa
console.log('1️⃣ Buscando usuario "alex wladimir casa"...');
const [usuarios] = await conn.execute(`
  SELECT id, username, nombre, email FROM usuarios
  WHERE nombre LIKE '%alex%' OR nombre LIKE '%wladimir%' OR nombre LIKE '%casa%' OR username LIKE '%alex%'
`);

if (usuarios.length > 0) {
  console.log('   ✅ Usuarios encontrados:');
  usuarios.forEach(u => {
    console.log(`   - ID: ${u.id}, Nombre: ${u.nombre}, Usuario: ${u.username}`);
  });
} else {
  console.log('   ❌ No se encontró el usuario');
}

// Buscar procesos de TICs
console.log('\n2️⃣ Buscando procesos de dirección TICs...');
const [procesos] = await conn.execute(`
  SELECT id, codigo_unico_proceso, direccion, subtarea FROM procesos
  WHERE direccion LIKE '%TIC%' OR direccion LIKE '%Tecnología%' OR direccion LIKE '%ti%'
  LIMIT 5
`);

if (procesos.length > 0) {
  console.log(`   ✅ Encontrados ${procesos.length} procesos de TICs:`);
  procesos.forEach(p => {
    console.log(`   - ID: ${p.id}, Código: ${p.codigo_unico_proceso}, Dirección: ${p.direccion}`);
  });
} else {
  console.log('   ❌ No se encontraron procesos de TICs');
}

// Buscar etapas atrasadas
console.log('\n3️⃣ Verificando etapas en seguimiento_etapas...');
const [etapas] = await conn.execute(`
  SELECT se.*, p.codigo_unico_proceso, p.direccion
  FROM seguimiento_etapas se
  JOIN procesos p ON se.proceso_id = p.id
  WHERE p.direccion LIKE '%TIC%' OR p.direccion LIKE '%Tecnología%'
  LIMIT 10
`);

if (etapas.length > 0) {
  console.log(`   ✅ Encontradas ${etapas.length} etapas:`);
  etapas.forEach(e => {
    console.log(`   - Proceso: ${e.codigo_unico_proceso}, Estado: ${e.estado}, Responsable ID: ${e.responsable_id}`);
  });
} else {
  console.log('   ⚠️ No hay etapas de TICs en seguimiento');
}

await conn.end();
