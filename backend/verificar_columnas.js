import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificar() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('🔍 Verificando columnas en tabla SUBTAREAS...\n');
    const [columnasSubtareas] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'subtareas' AND TABLE_SCHEMA = ?"
      , [process.env.DB_NAME]
    );

    const columnasEsperadas = [
      'id', 'nombre', 'codigo_olympo', 'codigo_unico_proceso', 'estado',
      'partida_presupuestaria', 'presupuesto_2026_inicial', 'costo_2026',
      'cuatrimestre', 'plazo_contrato', 'pac_no_pac', 'gestion_gasto_o_proyecto',
      'tipo_contratacion', 'procedimiento_sugerido', 'observaciones', 'avance_general',
      'proceso_en_riesgo', 'riesgo_comentario', 'activo', 'fecha_inicio', 'fecha_fin',
      'fuente_financiamiento', 'direccion_encargada', 'responsable_id', 'responsable'
    ];

    const columnasPresentes = columnasSubtareas.map(c => c.COLUMN_NAME);
    console.log(`✅ Columnas en tabla SUBTAREAS (${columnasPresentes.length}):`);
    columnasPresentes.forEach(col => console.log(`  ✓ ${col}`));

    console.log('\n🔴 Columnas FALTANTES en SUBTAREAS:');
    let faltanColumnas = false;
    columnasEsperadas.forEach(col => {
      if (!columnasPresentes.includes(col)) {
        console.log(`  ✗ ${col}`);
        faltanColumnas = true;
      }
    });
    if (!faltanColumnas) console.log('  (Ninguna faltante)');

    console.log('\n🔍 Verificando columnas en tabla SUBTAREAS_VERSIONES...\n');
    const [columnasVersiones] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'subtareas_versiones' AND TABLE_SCHEMA = ?",
      [process.env.DB_NAME]
    );

    const columnasVersionesPresentes = columnasVersiones.map(c => c.COLUMN_NAME);
    console.log(`✅ Columnas en tabla SUBTAREAS_VERSIONES (${columnasVersionesPresentes.length}):`);
    columnasVersionesPresentes.forEach(col => console.log(`  ✓ ${col}`));

    console.log('\n🔴 Columnas FALTANTES en SUBTAREAS_VERSIONES:');
    faltanColumnas = false;
    columnasEsperadas.forEach(col => {
      if (!columnasVersionesPresentes.includes(col)) {
        console.log(`  ✗ ${col}`);
        faltanColumnas = true;
      }
    });
    if (!faltanColumnas) console.log('  (Ninguna faltante)');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

verificar();
