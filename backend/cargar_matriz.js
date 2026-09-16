#!/usr/bin/env node
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';

const EXCEL_FILE = '../Matriz_Base_POA_2026_1.xlsx';

// Convertir número de serie de Excel a fecha
function excelDateToDate(excelDate) {
  if (!excelDate || excelDate === 'N/A' || excelDate === '') return null;
  if (typeof excelDate === 'string') return null;
  // Excel date serial: días desde 1900-01-01
  const msPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = new Date(1900, 0, 1);
  const date = new Date(excelEpoch.getTime() + (excelDate - 1) * msPerDay);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

console.log('📊 CARGANDO DATOS COMPLETOS DEL EXCEL\n');
console.log('='.repeat(60) + '\n');

// Leer Excel
const workbook = XLSX.readFile(EXCEL_FILE);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const datos = XLSX.utils.sheet_to_json(worksheet);

console.log(`✅ Datos leídos: ${datos.length} procesos\n`);

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

  console.log('🔧 Preparando carga...\n');

  // Obtener versión activa
  const [versionActiva] = await conn.query(
    'SELECT id FROM versiones WHERE activa = 1 LIMIT 1'
  );

  if (versionActiva.length === 0) {
    throw new Error('No hay versión activa');
  }

  const versionId = versionActiva[0].id;
  console.log(`✅ Versión activa: ${versionId}\n`);

  // Agrupar procesos por dirección
  const procesosPorDireccion = {};
  for (const proceso of datos) {
    const dir = proceso.direccion || 'N/A';
    if (!procesosPorDireccion[dir]) {
      procesosPorDireccion[dir] = [];
    }
    procesosPorDireccion[dir].push(proceso);
  }

  console.log(`📍 Direcciones encontradas: ${Object.keys(procesosPorDireccion).length}\n`);

  let totalCargados = 0;

  // Procesar cada dirección
  for (const [nombreDireccion, procesos] of Object.entries(procesosPorDireccion)) {
    // Verificar/crear dirección
    const [existeDireccion] = await conn.query(
      'SELECT id FROM entidades_catalogo WHERE nombre = ?',
      [nombreDireccion]
    );

    let direccionId;
    if (existeDireccion.length > 0) {
      direccionId = existeDireccion[0].id;
    } else {
      const [resultInsert] = await conn.query(
        'INSERT INTO entidades_catalogo (nombre, tipo, activo) VALUES (?, ?, 1)',
        [nombreDireccion, 'Responsable']
      );
      direccionId = resultInsert.insertId;
    }

    console.log(`  ✅ ${nombreDireccion.substring(0, 40)}: ${procesos.length} procesos`);

    // Cargar procesos de esta dirección
    let cargados = 0;
    for (const proceso of procesos) {
      // Verificar si ya existe
      const [existe] = await conn.query(
        'SELECT id FROM procesos WHERE codigo_olympo = ?',
        [proceso.codigo_olympo]
      );

      if (existe.length > 0) {
        continue;
      }

      try {
        // INSERTAR PROCESO
        const [resultProceso] = await conn.query(
          `INSERT INTO procesos (
            version_id, codigo_olympo, codigo_unico_proceso, subtarea, responsable,
            direccion_encargada, presupuesto_2026_inicial, costo_2026,
            partida_presupuestaria, pac_no_pac, procedimiento_sugerido,
            tipo_contratacion, estado, activo, observaciones, estado_carga
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Precontractual', 1, ?, 'cargado_excel')`,
          [
            versionId,
            proceso.codigo_olympo,
            proceso.codigo_unico_proceso || null,
            proceso.subtarea || 'N/A',
            proceso.responsable || 'N/A',
            nombreDireccion,
            parseFloat(proceso.presupuesto_con_reformas || proceso.presupuesto_2026_inicial || 0) || 0,
            parseFloat(proceso.costo_2026 || 0) || 0,
            proceso.partida_presupuestaria || null,
            proceso.pac_no_pac || 'PAC',
            proceso.procedimiento_sugerido || null,
            proceso.tipo_contratacion || null,
            proceso.observaciones || ''
          ]
        );

        const procesoId = resultProceso.insertId;
        cargados++;

        // Indicador
        if (proceso.meta_indicador) {
          await conn.query(
            `INSERT INTO procesos_indicadores (
              proceso_id, meta_indicador, meta_valor_2026, meta_formula_calculo, meta_tipo,
              meta_cal_enero, meta_cal_febrero, meta_cal_marzo, meta_cal_abril,
              meta_cal_mayo, meta_cal_junio, meta_cal_julio, meta_cal_agosto,
              meta_cal_septiembre, meta_cal_octubre, meta_cal_noviembre, meta_cal_diciembre
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              procesoId, proceso.meta_indicador, proceso.meta_valor_2026,
              proceso.meta_formula_calculo || null, proceso.meta_tipo || 'Acumulativa',
              parseFloat(proceso.meta_cal_enero || 0), parseFloat(proceso.meta_cal_febrero || 0),
              parseFloat(proceso.meta_cal_marzo || 0), parseFloat(proceso.meta_cal_abril || 0),
              parseFloat(proceso.meta_cal_mayo || 0), parseFloat(proceso.meta_cal_junio || 0),
              parseFloat(proceso.meta_cal_julio || 0), parseFloat(proceso.meta_cal_agosto || 0),
              parseFloat(proceso.meta_cal_septiembre || 0), parseFloat(proceso.meta_cal_octubre || 0),
              parseFloat(proceso.meta_cal_noviembre || 0), parseFloat(proceso.meta_cal_diciembre || 0)
            ]
          );
        }

        // Presupuesto
        if (proceso.presupuesto_con_reformas || proceso.reforma_9) {
          await conn.query(
            `INSERT INTO procesos_presupuesto (
              proceso_id, presupuesto_original, reforma_9, presupuesto_con_reformas,
              vigencia, fecha_calculo
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              procesoId,
              parseFloat(proceso.presupuesto_2026_inicial || 0) || 0,
              parseFloat(proceso.reforma_9 || 0) || 0,
              parseFloat(proceso.presupuesto_con_reformas || 0) || 0,
              new Date().getFullYear()
            ]
          );
        }

        // Contexto
        if (proceso.actividad_nombre || proceso.tarea_nombre) {
          try {
            await conn.query(
              `INSERT INTO procesos_contexto (
                proceso_id, actividad_nombre, actividad_composicion_gasto,
                actividad_enfoque_genero, actividad_tipo_obra,
                actividad_fecha_inicio, actividad_fecha_fin,
                tarea_nombre, tarea_fecha_inicio, tarea_fecha_fin,
                objetivo_operativo_pmdot, meta_pmdot_2033, valor_meta_pmdot_2025
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                procesoId,
                proceso.actividad_nombre ? proceso.actividad_nombre.substring(0, 255) : null,
                proceso.actividad_composicion_gasto || null,
                proceso.actividad_enfoque_genero || null,
                proceso.actividad_tipo_obra || null,
                excelDateToDate(proceso.actividad_fecha_inicio),
                excelDateToDate(proceso.actividad_fecha_fin),
                proceso.tarea_nombre ? proceso.tarea_nombre.substring(0, 255) : null,
                excelDateToDate(proceso.tarea_fecha_inicio),
                excelDateToDate(proceso.tarea_fecha_fin),
                proceso.objetivo_operativo_pmdot || null,
                proceso.meta_pmdot_2033 || null,
                proceso.valor_meta_pmdot_2025 || null
              ]
            );
          } catch (contextError) {
            // Silenciar errores de contexto
          }
        }

      } catch (error) {
        console.error(`  ⚠️ Error en ${proceso.codigo_olympo}:`, error.message.substring(0, 50));
      }
    }

    console.log(`     → Cargados: ${cargados}/${procesos.length}`);
    totalCargados += cargados;
  }

  await conn.commit();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ CARGA COMPLETADA\n');
  console.log(`📊 Total procesos cargados: ${totalCargados}\n`);

  // Verificar totales
  const [stats] = await conn.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN pi.id IS NOT NULL THEN 1 ELSE 0 END) as indicadores,
      SUM(CASE WHEN pp.id IS NOT NULL THEN 1 ELSE 0 END) as presupuesto,
      SUM(CASE WHEN pc.id IS NOT NULL THEN 1 ELSE 0 END) as contexto
    FROM procesos p
    LEFT JOIN procesos_indicadores pi ON p.id = pi.proceso_id
    LEFT JOIN procesos_presupuesto pp ON p.id = pp.proceso_id
    LEFT JOIN procesos_contexto pc ON p.id = pc.proceso_id
    WHERE p.version_id = ?
  `, [versionId]);

  console.log(`✅ Total en BD: ${stats[0].total}`);
  console.log(`   Con indicadores: ${stats[0].indicadores}`);
  console.log(`   Con presupuesto: ${stats[0].presupuesto}`);
  console.log(`   Con contexto: ${stats[0].contexto}`);
  console.log('\n✨ DATOS CARGADOS Y LISTOS');

} catch (error) {
  await conn.rollback();
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await conn.release();
  await pool.end();
}
