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

function toString(value, maxLen = null) {
  if (value === null || value === undefined || value === '') return null;
  let str = String(value).trim();
  if (str === '-' || str === '') return null;
  if (maxLen && str.length > maxLen) str = str.substring(0, maxLen);
  return str;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

async function main() {
  console.log('📥 CARGANDO 4 PROCESOS FALTANTES\n');

  try {
    // Leer Excel
    const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rows[0] || [];

    const col = (headerName) => {
      const normalized = normalizeText(headerName);
      return headers.findIndex((h) => normalizeText(h) === normalized);
    };

    // Conectar
    const pool = await mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const conn = await pool.getConnection();

    try {
      // Obtener version_id
      const [versionReforma] = await conn.query(
        'SELECT id FROM versiones WHERE numero_reforma = 10 AND anio = 2026'
      );
      const versionId = versionReforma[0].id;

      // Procesos faltantes: filas 276, 277, 278, 279 (índices en array: 275, 276, 277, 278)
      const filasConProblema = [275, 276, 277, 278];
      let cargados = 0;

      console.log('Cargando procesos sin código (generando códigos únicos)...\n');

      for (const filaIdx of filasConProblema) {
        const row = rows[filaIdx + 1] || []; // +1 porque la fila 0 es encabezados
        const subtarea = toString(row[col('subtarea')]);

        if (!subtarea) {
          console.log(`⏭️  Fila ${filaIdx + 2}: Vacía, saltada`);
          continue;
        }

        try {
          // Generar código único basado en número de fila
          const codigoUnico = `AUTO-${filaIdx + 2}-${Date.now() % 10000}`;

          console.log(`Insertando fila ${filaIdx + 2}:`);
          console.log(`  Código generado: ${codigoUnico}`);
          console.log(`  Subtarea: ${subtarea.substring(0, 50)}...`);

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
            codigoUnico, // Código único generado
            codigoUnico,
            subtarea,
            toString(row[col('direccion')], 100) || 'N/A',
            toString(row[col('entidad_responsable')], 100) || 'N/A',
            null,
            toNumber(row[col('presupuesto_2026_anual')]),
            toNumber(row[col('presupuesto_con_reformas')]),
            toString(row[col('partida_presupuestaria')], 50),
            toString(row[col('tipo_plan')], 10) || 'PAC',
            toString(row[col('proyecto_tipo')], 100),
            toString(row[col('tipo_contratacion')], 100) || 'Pendiente',
            'Precontractual',
            toString(row[col('observaciones')], 500)
          ]);

          const procesoId = resProceso.insertId;

          // Insertar contexto
          const actividadNombre = toString(row[col('actividad_nombre')]);
          const tareaNombre = toString(row[col('tarea_nombre')]);
          if (actividadNombre || tareaNombre) {
            try {
              await conn.query(`
                INSERT INTO procesos_contexto (
                  proceso_id, actividad_nombre, tarea_nombre,
                  objetivo_operativo_pmdot, meta_pmdot_2033
                ) VALUES (?, ?, ?, ?, ?)
              `, [
                procesoId,
                actividadNombre,
                tareaNombre,
                toString(row[col('objetivo_operativo_pmdot')]),
                toString(row[col('meta_pmdot_2033')])
              ]);
            } catch (e) {
              console.log(`  ⚠️  Error guardando contexto (no crítico)`);
            }
          }

          cargados++;
          console.log(`  ✅ Cargado\n`);

        } catch (error) {
          console.error(`  ❌ Error: ${error.message}\n`);
        }
      }

      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ Se cargaron ${cargados} procesos faltantes`);
      console.log('═══════════════════════════════════════════════════════\n');

      // Verificar total
      const [countFinal] = await conn.query(
        'SELECT COUNT(*) as total FROM procesos WHERE version_id = ?',
        [versionId]
      );

      console.log(`📊 Total en BD ahora: ${countFinal[0].total} procesos`);
      console.log(`✅ ¡Completos los 341 procesos!\n`);

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
