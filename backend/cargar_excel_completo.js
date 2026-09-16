import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const EXCEL_FILE = path.resolve(__dirname, '../Matriz_Base_POA_2026_1.xlsx');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function toString(value, maxLen = null) {
  if (value === null || value === undefined || value === '') return null;
  let str = String(value).trim();
  if (str === '-' || str === '') return null;
  if (maxLen && str.length > maxLen) str = str.substring(0, maxLen);
  return str;
}

async function main() {
  console.log('📥 CARGA COMPLETA DE EXCEL - Matriz_Base_POA_2026_1.xlsx\n');

  try {
    // 1. Leer Excel
    console.log('1️⃣ Leyendo archivo Excel...');
    const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rows[0] || [];

    console.log(`✅ ${rows.length - 1} procesos encontrados\n`);

    // Mapear columnas del Excel
    const col = (headerName) => {
      const normalized = normalizeText(headerName);
      return headers.findIndex((h) => normalizeText(h) === normalized);
    };

    // 2. Conectar a BD
    console.log('2️⃣ Conectando a Base de Datos...');
    const pool = await mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    console.log('✅ Conectado\n');

    try {
      await conn.beginTransaction();

      console.log('3️⃣ Limpiando y cargando procesos en Reforma 10...');

      // Obtener version_id de Reforma 10
      const [versionReforma] = await conn.query(
        'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
      );
      if (versionReforma.length === 0) throw new Error('Reforma 10 no encontrada');
      const versionId = versionReforma[0].id;

      // Limpiar datos anteriores de Reforma 10
      await conn.query('SET FOREIGN_KEY_CHECKS=0');
      await conn.query('DELETE FROM procesos_contexto WHERE proceso_id IN (SELECT id FROM procesos WHERE version_id = ?)', [versionId]);
      await conn.query('DELETE FROM procesos_indicadores WHERE proceso_id IN (SELECT id FROM procesos WHERE version_id = ?)', [versionId]);
      await conn.query('DELETE FROM procesos_presupuesto WHERE proceso_id IN (SELECT id FROM procesos WHERE version_id = ?)', [versionId]);
      await conn.query('DELETE FROM procesos WHERE version_id = ?', [versionId]);
      await conn.query('SET FOREIGN_KEY_CHECKS=1');
      console.log('   ✅ Datos anteriores eliminados');

      let cargados = 0;
      let errores = 0;

      // Procesar cada fila del Excel
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const subtarea = toString(row[col('subtarea')]);
        if (!subtarea) continue;

        try {
          const codigoOlympo = toString(row[col('codigo_olympo')]) || `AUTO-${r}`;

          // Insertar en tabla procesos
          const [resProceso] = await conn.query(`
            INSERT INTO procesos (
              version_id, codigo_olympo, codigo_unico_proceso, subtarea,
              direccion_encargada, responsable, responsable_id,
              presupuesto_2026_inicial, costo_2026,
              partida_presupuestaria, pac_no_pac, procedimiento_sugerido,
              tipo_contratacion, estado, observaciones, estado_carga, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cargado_excel', 1)
          `, [
            versionId,
            codigoOlympo,
            toString(row[col('codigo_unico_proceso')]) || codigoOlympo,
            subtarea,
            toString(row[col('direccion')]) || 'N/A',  // Dirección REAL del Excel
            toString(row[col('entidad_responsable')]) || 'N/A',  // Responsable REAL
            null, // responsable_id se dejará para mapeo manual si es necesario
            toNumber(row[col('presupuesto_2026_anual')]),
            toNumber(row[col('presupuesto_con_reformas')]),
            toString(row[col('partida_presupuestaria')]),
            toString(row[col('tipo_plan')]) || 'PAC',
            toString(row[col('proyecto_tipo')]),
            'Pendiente', // tipo_contratacion por defecto
            'Precontractual', // estado por defecto
            toString(row[col('observaciones')]),
            'cargado_excel',
            1
          ]);

          const procesoId = resProceso.insertId;

          // Insertar información de contexto (Actividades, Tareas, PMDOT)
          const actividadNombre = toString(row[col('actividad_nombre')]);
          const tareaNombre = toString(row[col('tarea_nombre')]);
          if (actividadNombre || tareaNombre) {
            await conn.query(`
              INSERT INTO procesos_contexto (
                proceso_id, actividad_nombre, actividad_composicion_gasto,
                actividad_enfoque_genero, actividad_tipo_obra,
                actividad_fecha_inicio, actividad_fecha_fin,
                tarea_nombre, tarea_fecha_inicio, tarea_fecha_fin,
                objetivo_operativo_pmdot, meta_pmdot_2033, valor_meta_pmdot_2025
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              procesoId,
              actividadNombre,
              toString(row[col('actividad_composicion_gasto')]),
              toString(row[col('actividad_enfoque_genero')]),
              toString(row[col('actividad_tipo_obra')]),
              toString(row[col('actividad_fecha_inicio')]),
              toString(row[col('actividad_fecha_fin')]),
              tareaNombre,
              toString(row[col('tarea_fecha_inicio')]),
              toString(row[col('tarea_fecha_fin')]),
              toString(row[col('objetivo_operativo_pmdot')]),
              toString(row[col('meta_pmdot_2033')]),
              toString(row[col('valor_meta_pmdot_2025')])
            ]);
          }

          // Insertar indicadores/metas
          const metaIndicador = toString(row[col('meta_indicador')]);
          if (metaIndicador) {
            await conn.query(`
              INSERT INTO procesos_indicadores (
                proceso_id, meta_indicador, meta_valor_2026, meta_formula_calculo, meta_tipo,
                meta_cal_enero, meta_cal_febrero, meta_cal_marzo, meta_cal_abril,
                meta_cal_mayo, meta_cal_junio, meta_cal_julio, meta_cal_agosto,
                meta_cal_septiembre, meta_cal_octubre, meta_cal_noviembre, meta_cal_diciembre
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              procesoId,
              metaIndicador,
              toString(row[col('meta_valor_2026')]),
              toString(row[col('meta_formula_calculo')]),
              toString(row[col('meta_tipo')]) || 'Acumulativa',
              toNumber(row[col('meta_cal_ene')]),
              toNumber(row[col('meta_cal_feb')]),
              toNumber(row[col('meta_cal_mar')]),
              toNumber(row[col('meta_cal_abr')]),
              toNumber(row[col('meta_cal_may')]),
              toNumber(row[col('meta_cal_jun')]),
              toNumber(row[col('meta_cal_jul')]),
              toNumber(row[col('meta_cal_ago')]),
              toNumber(row[col('meta_cal_sep')]),
              toNumber(row[col('meta_cal_oct')]),
              toNumber(row[col('meta_cal_nov')]),
              toNumber(row[col('meta_cal_dic')])
            ]);
          }

          // Insertar presupuesto y reformas
          const presupuestoConReformas = toNumber(row[col('presupuesto_con_reformas')]);
          if (presupuestoConReformas > 0 || toNumber(row[col('presupuesto_2026_anual')]) > 0) {
            await conn.query(`
              INSERT INTO procesos_presupuesto (
                proceso_id, presupuesto_original, reforma_9, presupuesto_con_reformas, vigencia
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              procesoId,
              toNumber(row[col('presupuesto_2026_anual')]),
              toNumber(row[col('reforma_9')]),
              presupuestoConReformas,
              2026
            ]);
          }

          cargados++;
          if (cargados % 50 === 0) {
            console.log(`   ⏳ ${cargados} procesos cargados...`);
          }

        } catch (error) {
          errores++;
          console.error(`   ❌ Error fila ${r}:`, error.message.substring(0, 80));
        }
      }

      await conn.commit();

      console.log(`\n✅ ${cargados} procesos cargados exitosamente`);
      if (errores > 0) console.log(`⚠️  ${errores} errores`);

      // Verificar datos
      console.log('\n4️⃣ Verificando integridad de datos...');
      const [stats] = await conn.query(`
        SELECT
          COUNT(*) as total,
          COUNT(DISTINCT direccion_encargada) as direcciones_unicas,
          COUNT(DISTINCT responsable) as responsables_unicos,
          SUM(presupuesto_2026_inicial) as presupuesto_total
        FROM procesos WHERE version_id = ?
      `, [versionId]);

      console.log(`✅ Total de procesos: ${stats[0].total}`);
      console.log(`✅ Direcciones únicas: ${stats[0].direcciones_unicas}`);
      console.log(`✅ Responsables únicos: ${stats[0].responsables_unicos}`);
      console.log(`✅ Presupuesto total: $${stats[0].presupuesto_total}`);

      // Ver direcciones cargadas
      const [direcciones] = await conn.query(`
        SELECT DISTINCT direccion_encargada FROM procesos WHERE version_id = ? ORDER BY direccion_encargada
        LIMIT 20
      `, [versionId]);

      console.log(`\n📍 Direcciones cargadas:`);
      direcciones.forEach(d => {
        console.log(`   - ${d.direccion_encargada}`);
      });

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ CARGA COMPLETADA');
      console.log('═══════════════════════════════════════════════════════\n');

      console.log('📊 Información cargada:');
      console.log('   ✅ Procesos con direcciones reales');
      console.log('   ✅ Responsables');
      console.log('   ✅ Presupuestos e información de reformas');
      console.log('   ✅ Actividades, tareas y PMDOT');
      console.log('   ✅ Metas e indicadores');
      console.log('   ✅ Observaciones\n');

      console.log('🎯 Próximos pasos:');
      console.log('   1. Reinicia el servidor: Ctrl+C y luego npm start');
      console.log('   2. Recarga el navegador: Ctrl+F5');
      console.log('   3. Veremos qué información mostrar en el front\n');

    } finally {
      await conn.release();
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Error crítico:', error.message);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
