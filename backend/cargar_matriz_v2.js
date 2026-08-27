#!/usr/bin/env node
import XLSX from 'xlsx';
import mysql from 'mysql2/promise';

const EXCEL_FILE = '../Matriz_Base_POA_2026_1.xlsx';

console.log('📊 CARGANDO TODOS LOS PROCESOS DEL EXCEL\n');
console.log('='.repeat(60) + '\n');

// Convertir número de serie de Excel a fecha (solo si es número válido)
function excelDateToDate(excelDate) {
  if (!excelDate || excelDate === 'N/A' || excelDate === '') return null;
  if (typeof excelDate === 'string') return null;
  if (typeof excelDate !== 'number') return null;

  // Excel date serial: días desde 1900-01-01
  // Números pequeños (< 1000) son probablemente datos corruptos
  if (excelDate < 1000 || excelDate > 100000) return null;

  try {
    const msPerDay = 24 * 60 * 60 * 1000;
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (excelDate - 1) * msPerDay);
    if (isNaN(date.getTime())) return null;
    const iso = date.toISOString().split('T')[0];
    // Validar que sea una fecha razonable (2000-2050)
    const year = date.getFullYear();
    if (year < 2000 || year > 2050) return null;
    return iso;
  } catch {
    return null;
  }
}

// Truncar string a longitud máxima
function truncate(value, maxLen) {
  if (!value) return null;
  const str = String(value).trim();
  if (str.length > maxLen) return str.substring(0, maxLen);
  return str || null;
}

// Parsear número
function parseNumber(value) {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

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
  let erroresDetalles = [];

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

    // Cargar procesos de esta dirección
    let cargados = 0;
    for (const proceso of procesos) {
      // Verificar si ya existe
      const [existe] = await conn.query(
        'SELECT id FROM procesos WHERE codigo_olympo = ? AND version_id = ?',
        [proceso.codigo_olympo, versionId]
      );

      if (existe.length > 0) {
        continue;
      }

      try {
        // INSERTAR PROCESO - datos principales
        const [resultProceso] = await conn.query(
          `INSERT INTO procesos (
            version_id, codigo_olympo, codigo_unico_proceso, subtarea, responsable,
            direccion_encargada, presupuesto_2026_inicial, costo_2026,
            partida_presupuestaria, pac_no_pac, procedimiento_sugerido,
            tipo_contratacion, estado, activo, observaciones, estado_carga
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'cargado_excel')`,
          [
            versionId,
            truncate(proceso.codigo_olympo, 50),
            truncate(proceso.codigo_unico_proceso, 50),
            truncate(proceso.subtarea, 1000) || 'N/A',
            truncate(proceso.responsable, 500) || 'N/A',
            nombreDireccion,
            parseNumber(proceso.presupuesto_con_reformas || proceso.presupuesto_2026_anual),
            parseNumber(proceso.presupuesto_2026_anual),
            truncate(proceso.partida_presupuestaria, 50),
            proceso.pac_no_pac || 'PAC',
            truncate(proceso.procedimiento_sugerido, 100),
            truncate(proceso.tipo_contratacion, 100),
            proceso.estado || 'Precontractual',
            truncate(proceso.observaciones, 500)
          ]
        );

        const procesoId = resultProceso.insertId;
        cargados++;

        // INDICADORES - SIEMPRE cargar si existen datos
        if (proceso.meta_indicador) {
          try {
            const metas = {
              enero: parseNumber(proceso.meta_cal_ene || proceso.meta_cal_enero),
              febrero: parseNumber(proceso.meta_cal_feb),
              marzo: parseNumber(proceso.meta_cal_mar),
              abril: parseNumber(proceso.meta_cal_abr),
              mayo: parseNumber(proceso.meta_cal_may),
              junio: parseNumber(proceso.meta_cal_jun),
              julio: parseNumber(proceso.meta_cal_jul),
              agosto: parseNumber(proceso.meta_cal_ago),
              septiembre: parseNumber(proceso.meta_cal_sep),
              octubre: parseNumber(proceso.meta_cal_oct),
              noviembre: parseNumber(proceso.meta_cal_nov),
              diciembre: parseNumber(proceso.meta_cal_dic)
            };

            await conn.query(
              `INSERT INTO procesos_indicadores (
                proceso_id, meta_indicador, meta_valor_2026, meta_formula_calculo, meta_tipo,
                meta_cal_enero, meta_cal_febrero, meta_cal_marzo, meta_cal_abril,
                meta_cal_mayo, meta_cal_junio, meta_cal_julio, meta_cal_agosto,
                meta_cal_septiembre, meta_cal_octubre, meta_cal_noviembre, meta_cal_diciembre
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                procesoId,
                truncate(proceso.meta_indicador, 255),
                truncate(proceso.meta_valor_2026, 255),
                truncate(proceso.meta_formula_calculo, 2000),
                proceso.meta_tipo || 'Acumulativa',
                metas.enero, metas.febrero, metas.marzo, metas.abril,
                metas.mayo, metas.junio, metas.julio, metas.agosto,
                metas.septiembre, metas.octubre, metas.noviembre, metas.diciembre
              ]
            );
          } catch (indicadorError) {
            // Log pero continuar
          }
        }

        // PRESUPUESTO - SIEMPRE cargar si existen datos
        if (parseNumber(proceso.presupuesto_con_reformas) > 0 || parseNumber(proceso.presupuesto_2026_anual) > 0) {
          try {
            await conn.query(
              `INSERT INTO procesos_presupuesto (
                proceso_id, presupuesto_original, reforma_9, presupuesto_con_reformas,
                vigencia, fecha_calculo
              ) VALUES (?, ?, ?, ?, ?, NOW())`,
              [
                procesoId,
                parseNumber(proceso.presupuesto_2026_anual),
                parseNumber(proceso.reforma_9 || 0),
                parseNumber(proceso.presupuesto_con_reformas),
                2026
              ]
            );
          } catch (presError) {
            // Log pero continuar
          }
        }

        // CONTEXTO - SIEMPRE cargar si existen datos
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
                truncate(proceso.actividad_nombre, 500),
                truncate(proceso.actividad_composicion_gasto, 100),
                truncate(proceso.actividad_enfoque_genero, 50),
                truncate(proceso.actividad_tipo_obra, 100),
                excelDateToDate(proceso.actividad_fecha_inicio),
                excelDateToDate(proceso.actividad_fecha_fin),
                truncate(proceso.tarea_nombre, 500),
                excelDateToDate(proceso.tarea_fecha_inicio),
                excelDateToDate(proceso.tarea_fecha_fin),
                truncate(proceso.objetivo_operativo_pmdot, 255),
                truncate(proceso.meta_pmdot_2033, 255),
                truncate(proceso.valor_meta_pmdot_2025, 100)
              ]
            );
          } catch (contextError) {
            // Log pero continuar
          }
        }

      } catch (error) {
        erroresDetalles.push({
          codigo: proceso.codigo_olympo,
          error: error.message.substring(0, 50)
        });
      }
    }

    const dirCorta = nombreDireccion.substring(0, 35).padEnd(35);
    console.log(`  ${dirCorta} ${cargados}/${procesos.length} ✅`);
    totalCargados += cargados;
  }

  await conn.commit();

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ CARGA COMPLETADA\n');
  console.log(`📊 Total procesos cargados: ${totalCargados}/${datos.length}\n`);

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
  console.log(`   Con indicadores: ${stats[0].indicadores} (${Math.round(stats[0].indicadores/stats[0].total*100)}%)`);
  console.log(`   Con presupuesto: ${stats[0].presupuesto} (${Math.round(stats[0].presupuesto/stats[0].total*100)}%)`);
  console.log(`   Con contexto: ${stats[0].contexto} (${Math.round(stats[0].contexto/stats[0].total*100)}%)`);

  if (erroresDetalles.length > 0) {
    console.log(`\n⚠️ Errores (${erroresDetalles.length}):`);
    erroresDetalles.slice(0, 5).forEach(e => {
      console.log(`   ${e.codigo}: ${e.error}`);
    });
  }

  console.log('\n✨ DATOS LISTOS PARA USAR');

} catch (error) {
  await conn.rollback();
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await conn.release();
  await pool.end();
}
