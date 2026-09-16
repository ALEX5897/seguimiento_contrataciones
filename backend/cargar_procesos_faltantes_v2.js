#!/usr/bin/env node
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_FILE = path.join(__dirname, '..', 'Matriz_Base_POA_2026_1.xlsx');
const versionId = 12;

console.log('\n📊 CARGANDO 4 PROCESOS FALTANTES (Sin código_olympo)\n');
console.log('='.repeat(60) + '\n');

// Leer Excel
const workbook = XLSX.readFile(EXCEL_FILE);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const datos = XLSX.utils.sheet_to_json(worksheet);

console.log(`✅ Datos leídos: ${datos.length} procesos`);

// Conectar BD
const pool = await mysql.createPool({
  host: '172.16.1.80',
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
});

const conn = await pool.getConnection();

try {
  await conn.beginTransaction();

  // Funciones auxiliares
  function truncate(value, maxLen) {
    if (!value) return null;
    const str = String(value).trim();
    if (str.length > maxLen) return str.substring(0, maxLen);
    return str || null;
  }

  function parseNumber(value) {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  // Obtener procesos sin código
  const procesosSinCodigo = datos.filter(d => !d.codigo_olympo || d.codigo_olympo === 'N/A');
  console.log(`📌 Procesos sin código encontrados en Excel: ${procesosSinCodigo.length}\n`);

  let cargados = 0;
  let errores = 0;
  let saltados = 0;

  for (let i = 1; i <= procesosSinCodigo.length; i++) {
    const proceso = procesosSinCodigo[i - 1];
    const nombreDireccion = proceso.direccion || 'N/A';
    
    // Generar código usando nueva lógica: N/A 01, N/A 02, etc.
    const codigoFinal = `N/A ${String(i).padStart(2, '0')}`;

    // Verificar si ya existe
    const [existe] = await conn.query(
      'SELECT id FROM procesos WHERE codigo_olympo = ? AND version_id = ?',
      [codigoFinal, versionId]
    );

    if (existe.length > 0) {
      console.log(`⏭️  ${codigoFinal} ya existe, saltando...`);
      saltados++;
      continue;
    }

    try {
      // Insertar proceso
      await conn.query(
        `INSERT INTO procesos (
          version_id, codigo_olympo, codigo_unico_proceso, subtarea, responsable,
          direccion_encargada, presupuesto_2026_inicial, costo_2026,
          partida_presupuestaria, pac_no_pac, procedimiento_sugerido,
          tipo_contratacion, estado, activo, observaciones, estado_carga
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'cargado_excel')`,
        [
          versionId,
          codigoFinal,
          truncate(proceso.codigo_unico_proceso, 50),
          truncate(proceso.subtarea, 1000) || 'Sin descripción',
          truncate(proceso.responsable, 500) || 'N/A',
          nombreDireccion,
          parseNumber(proceso.presupuesto_con_reformas || 0),
          parseNumber(proceso.presupuesto_2026_anual || 0),
          truncate(proceso.partida_presupuestaria, 50),
          proceso.pac_no_pac || 'PAC',
          truncate(proceso.procedimiento_sugerido, 100),
          truncate(proceso.tipo_contratacion, 100),
          proceso.estado || 'Precontractual',
          truncate(proceso.observaciones, 500)
        ]
      );

      const subtarea = truncate(proceso.subtarea, 40);
      console.log(`✅ Cargado: ${codigoFinal} - ${subtarea}`);
      cargados++;

    } catch (error) {
      console.error(`❌ Error al cargar ${codigoFinal}:`, error.message);
      errores++;
    }
  }

  await conn.commit();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ CARGA COMPLETADA\n');
  console.log(`📊 Procesos cargados: ${cargados}`);
  console.log(`⏭️  Procesos saltados (ya existentes): ${saltados}`);
  console.log(`❌ Errores: ${errores}`);

  // Verificar total
  const [stats] = await conn.query(`
    SELECT COUNT(*) as total, SUM(presupuesto_2026_inicial) as presupuesto_total
    FROM procesos
    WHERE version_id = ?
  `, [versionId]);

  console.log(`\n📈 TOTALES EN VERSIÓN ${versionId}:`);
  console.log(`   ✅ Total procesos: ${stats[0].total}`);
  console.log(`   💰 Presupuesto: $${Number(stats[0].presupuesto_total || 0).toLocaleString('es-EC')}`);

  // Listar procesos sin código para confirmar
  const [procesosNA] = await conn.query(`
    SELECT codigo_olympo, subtarea, direccion_encargada, presupuesto_2026_inicial
    FROM procesos
    WHERE version_id = ? AND codigo_olympo LIKE 'N/A%'
    ORDER BY codigo_olympo
  `, [versionId]);

  console.log(`\n📋 PROCESOS SIN CÓDIGO (Generados):`);
  procesosNA.forEach(p => {
    console.log(`   ${p.codigo_olympo}: ${truncate(p.subtarea, 40)} (${p.direccion_encargada})`);
  });

} catch (error) {
  await conn.rollback();
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await conn.release();
  await pool.end();
}

function truncate(value, maxLen) {
  if (!value) return 'N/A';
  const str = String(value).trim();
  if (str.length > maxLen) return str.substring(0, maxLen) + '...';
  return str;
}
