import * as mysql from './data/mysql.js';

async function listar() {
  try {
    await mysql.initMySQL();
    
    // Mostrar tablas
    const tablas = await mysql.query('SHOW TABLES');
    console.log('\n📊 TABLAS EN LA BASE DE DATOS:\n');
    tablas.forEach(t => {
      const nombreTabla = Object.values(t)[0];
      console.log(`  - ${nombreTabla}`);
    });

    // Estructura de etapas_proceso
    console.log('\n📋 ESTRUCTURA: etapas_proceso\n');
    const etapasEstructura = await mysql.query('DESCRIBE etapas_proceso');
    etapasEstructura.forEach(col => {
      console.log(`  ${col.Field.padEnd(25)} - ${col.Type.padEnd(20)} ${col.Null === 'NO' ? '[NOT NULL]' : '[nullable]'}`);
    });

    // Estructura de etapas_catalogo
    console.log('\n📋 ESTRUCTURA: etapas_catalogo\n');
    const catalogoEstructura = await mysql.query('DESCRIBE etapas_catalogo');
    catalogoEstructura.forEach(col => {
      console.log(`  ${col.Field.padEnd(25)} - ${col.Type.padEnd(20)} ${col.Null === 'NO' ? '[NOT NULL]' : '[nullable]'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

listar();
