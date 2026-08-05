import mysql from 'mysql2/promise';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

async function checkColumns() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    const [columns] = await conn.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database, 'seguimiento_etapas']);

    console.log('Columnas de la tabla seguimiento_etapas:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

checkColumns();
