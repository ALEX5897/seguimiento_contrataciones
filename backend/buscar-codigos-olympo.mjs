import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, values = []) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(sql, values);
    return rows;
  } finally {
    conn.release();
  }
}

// Códigos a buscar
const codigos = [
  '02.01.001.049.730207.000.002',
  '01.01.001.002.530702.000.009',
  '02.01.001.066.840107.000.002',
  '01.01.001.179.530813.000.009',
  '01.01.001.188.530807.000.009',
  '01.01.001.165.840107.000.002',
  '01.01.001.126.530210.000.009',
  '01.01.001.135.530606.000.009',
  '01.01.002.027.530606.000.009',
  '01.01.002.027.530801.000.009',
  '01.01.001.027.530606.000.009',
  '01.01.001.124.530606.000.009',
  '01.01.001.028.530606.000.009',
  '01.01.001.029.530301.000.009',
  '01.01.001.029.530302.000.009',
  '01.01.001.024.530502.000.009',
  '01.01.001.031.530209.000.009',
  '01.01.001.150.530404.000.009',
  '01.01.001.189.840104.000.009',
  '01.01.001.189.531407.000.009',
  '01.01.001.039.530404.000.009',
  '01.01.001.046.530405.000.009',
  '01.01.001.047.530405.000.009',
  '01.01.002.015.630207.000.009',
  '01.01.002.020.630207.000.009',
  '02.01.001.043.730249.000.002',
  '01.01.001.052.530404.000.009',
  '01.01.001.168.530404.000.009',
  '01.01.001.061.530404.000.009',
  '01.01.001.058.530404.000.009',
  '01.01.001.169.530404.000.009',
  '01.01.001.180.530704.000.009',
  '01.01.001.064.530811.000.009',
  '02.01.001.047.730249.000.002',
  '01.01.001.072.530702.000.009',
  '01.01.001.055.530702.000.009',
  '01.01.001.075.530702.000.009',
  '01.01.001.096.530702.000.009',
  '01.01.001.074.530702.000.009',
  '01.01.001.076.530702.000.009',
  '01.01.002.002.630602.000.009',
  '01.01.002.048.630207.000.009',
  '01.01.001.170.530105.000.009',
  '01.01.002.012.630204.000.009',
  '01.01.001.105.530704.000.009',
  '01.01.001.140.530704.000.009',
  '01.01.001.173.530704.000.009',
  '01.01.001.106.530704.000.009',
  '01.01.001.089.530704.000.009',
  '01.01.001.048.530105.000.009',
  '01.01.002.046.630207.001.009',
  '01.01.002.047.630207.000.009',
  '01.01.002.052.630201.000.009',
  '01.01.001.161.530241.000.009',
  '01.01.002.050.630601.000.009',
  '02.01.001.031.730702.000.002',
  '01.01.001.176.530702.000.009'
];

async function buscarCodigos() {
  console.log('='.repeat(100));
  console.log('BÚSQUEDA DE CÓDIGOS OLYMPO');
  console.log('='.repeat(100));

  try {
    // Primero, busca en la tabla subtareas
    console.log('\nBuscando en tabla SUBTAREAS...\n');

    let encontrados = 0;
    let noEncontrados = 0;

    const resultados = {
      activos: [],
      inactivos: [],
      noEncontrados: []
    };

    for (const codigo of codigos) {
      const resultado = await query(`
        SELECT id, nombre, codigo_olympo, activo FROM subtareas WHERE codigo_olympo = ? LIMIT 1
      `, [codigo]);

      if (resultado.length > 0) {
        const estado = resultado[0].activo === 1 ? 'ACTIVO' : 'INACTIVO';
        console.log(`✓ ${codigo} → ${estado} (ID: ${resultado[0].id})`);

        if (resultado[0].activo === 1) {
          resultados.activos.push(codigo);
        } else {
          resultados.inactivos.push(codigo);
        }
        encontrados++;
      } else {
        console.log(`✗ ${codigo} → NO ENCONTRADO`);
        resultados.noEncontrados.push(codigo);
        noEncontrados++;
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('RESUMEN');
    console.log('='.repeat(100));
    console.log(`Total buscados: ${codigos.length}`);
    console.log(`Encontrados: ${encontrados}`);
    console.log(`  → Activos: ${resultados.activos.length}`);
    console.log(`  → Inactivos: ${resultados.inactivos.length}`);
    console.log(`No encontrados: ${noEncontrados}`);

    if (resultados.activos.length > 0) {
      console.log('\nCÓDIGOS ACTIVOS:');
      resultados.activos.forEach(cod => console.log(`  • ${cod}`));
    }

    if (resultados.inactivos.length > 0) {
      console.log('\nCÓDIGOS INACTIVOS:');
      resultados.inactivos.forEach(cod => console.log(`  • ${cod}`));
    }

    if (resultados.noEncontrados.length > 0) {
      console.log('\nCÓDIGOS NO ENCONTRADOS:');
      resultados.noEncontrados.forEach(cod => console.log(`  • ${cod}`));
    }

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

buscarCodigos();
