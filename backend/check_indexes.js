import mysql from 'mysql2/promise';

async function checkIndexes() {
  const pool = await mysql.createPool({
    host: '172.16.1.80',
    user: 'usr-cont',
    password: 'mas_TER$*25@',
    database: 'poa_pac'
  });

  try {
    const conn = await pool.getConnection();

    // Verificar índices en tabla procesos
    console.log('=== ÍNDICES EN TABLA procesos ===');
    const [indexes] = await conn.execute(
      `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA='poa_pac' AND TABLE_NAME='procesos'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );
    console.log(indexes.length > 0 ? indexes : 'No hay índices');

    // Verificar índices en tabla subtareas_etapas
    console.log('\n=== ÍNDICES EN TABLA subtareas_etapas ===');
    const [indexes2] = await conn.execute(
      `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA='poa_pac' AND TABLE_NAME='subtareas_etapas'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );
    console.log(indexes2.length > 0 ? indexes2 : 'No hay índices');

    // Verificar índices en tabla seguimiento_etapas
    console.log('\n=== ÍNDICES EN TABLA seguimiento_etapas ===');
    const [indexes3] = await conn.execute(
      `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA='poa_pac' AND TABLE_NAME='seguimiento_etapas'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );
    console.log(indexes3.length > 0 ? indexes3 : 'No hay índices');

    // Ver tamaño de las tablas principales
    console.log('\n=== TAMAÑO DE TABLAS ===');
    const [sizes] = await conn.execute(`
      SELECT TABLE_NAME,
             ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
             TABLE_ROWS AS 'Rows'
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA='poa_pac' AND TABLE_NAME IN ('procesos', 'subtareas_etapas', 'seguimiento_etapas', 'subtareas')
      ORDER BY data_length DESC
    `);
    console.log(sizes);

    await conn.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkIndexes();
