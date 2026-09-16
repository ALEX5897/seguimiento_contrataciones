import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { initMySQL, query, crearNuevaReforma, cargarExcelVersion, reactivarVersion, getVersionById, aprobarVersion } from './data/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
  console.log('📋 Iniciando carga de nueva proforma desde Excel...\n');

  try {
    // 1. Inicializar base de datos
    console.log('🔌 Conectando a la base de datos...');
    await initMySQL();
    console.log('✅ Conexión exitosa\n');

    // 2. Leer archivo Excel
    console.log(`📖 Leyendo archivo: ${EXCEL_FILE}`);
    const workbook = XLSX.readFile(EXCEL_FILE, { cellDates: true });

    // Encontrar la hoja (puede ser la primera o "Matriz POA 2026")
    const sheetName = workbook.SheetNames[0];
    console.log(`📄 Hoja encontrada: ${sheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (rows.length < 2) {
      throw new Error('El archivo Excel está vacío o no tiene datos');
    }

    // Buscar fila de encabezados (normalmente fila 1)
    let headerRowIdx = 0;
    const headers = rows[headerRowIdx] || [];

    const col = (headerName) => {
      const normalized = normalizeText(headerName);
      return headers.findIndex((h) => normalizeText(h) === normalized);
    };

    // Mapear columnas
    const columnMap = {
      codigo: col('Código') || col('Código Olympo') || col('codigo'),
      codigoUnico: col('Código Único') || col('codigo_unico'),
      subtarea: col('SubTarea') || col('Proceso') || col('subtarea'),
      responsable: col('Responsable') || col('responsable'),
      direccion: col('Dirección') || col('Dirección Encargada') || col('direccion'),
      presupuestoConReformas: col('Presupuesto con Reformas') || col('Presupuesto') || col('presupuesto'),
      presupuesto2026: col('Costo 2026') || col('Presupuesto 2026') || col('presupuesto_2026'),
      partida: col('Partida Presupuestaria') || col('partida'),
      pacNoPac: col('PAC / No PAC') || col('PAC') || col('pac_no_pac'),
      procedimiento: col('Procedimiento') || col('Procedimiento Sugerido') || col('procedimiento'),
      tipoContratacion: col('Tipo Contratación') || col('tipo_contratacion'),
      estado: col('Estado') || col('estado'),
      metaIndicador: col('Meta / Indicador') || col('meta'),
      metaValor2026: col('Meta Valor 2026') || col('meta_valor'),
      observaciones: col('Observaciones') || col('observaciones')
    };

    // Validar que al menos tengamos algunas columnas críticas
    if (columnMap.codigo === -1 && columnMap.codigoUnico === -1) {
      console.warn('⚠️  Advertencia: No se encontró columna de código, se generarán automáticamente');
    }

    // 3. Extraer procesos del Excel
    console.log('\n📊 Extrayendo procesos del Excel...');
    const procesos = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];

      const codigo = String(row[columnMap.codigo] || '').trim() || '';
      const subtarea = String(row[columnMap.subtarea] || '').trim();

      // Saltar filas vacías
      if (!subtarea && !codigo) continue;

      procesos.push({
        codigo_olympo: codigo,
        codigo_unico_proceso: row[columnMap.codigoUnico] ? String(row[columnMap.codigoUnico]).trim() : codigo,
        subtarea: subtarea || `Proceso ${r}`,
        responsable: String(row[columnMap.responsable] || '').trim() || 'N/A',
        direccion: String(row[columnMap.direccion] || '').trim() || 'N/A',
        presupuesto_con_reformas: toNumber(row[columnMap.presupuestoConReformas]),
        presupuesto_2026_anual: toNumber(row[columnMap.presupuesto2026]),
        partida_presupuestaria: row[columnMap.partida] ? String(row[columnMap.partida]).trim() : null,
        pac_no_pac: String(row[columnMap.pacNoPac] || 'PAC').trim(),
        procedimiento_sugerido: row[columnMap.procedimiento] ? String(row[columnMap.procedimiento]).trim() : null,
        tipo_contratacion: row[columnMap.tipoContratacion] ? String(row[columnMap.tipoContratacion]).trim() : null,
        estado: String(row[columnMap.estado] || 'Precontractual').trim(),
        meta_indicador: row[columnMap.metaIndicador] ? String(row[columnMap.metaIndicador]).trim() : null,
        meta_valor_2026: row[columnMap.metaValor2026] ? String(row[columnMap.metaValor2026]).trim() : null,
        observaciones: row[columnMap.observaciones] ? String(row[columnMap.observaciones]).trim() : null
      });
    }

    console.log(`✅ Se extrajeron ${procesos.length} procesos\n`);

    if (procesos.length === 0) {
      throw new Error('No se encontraron procesos en el archivo Excel');
    }

    // Mostrar primeros 3 procesos como ejemplo
    console.log('📋 Primeros 3 procesos:');
    procesos.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.codigo_olympo || 'N/A'} - ${p.subtarea}`);
    });
    console.log();

    // 4. Crear nueva reforma
    console.log('🔧 Creando nueva versión/reforma...');
    const usuario = process.env.ADMIN_USER || 'admin';
    const nuevaVersion = await crearNuevaReforma(
      2026,
      `Reforma cargada desde Matriz_Base_POA_2026_1.xlsx`,
      usuario
    );
    console.log(`✅ Versión creada: ${nuevaVersion.nombre} (ID: ${nuevaVersion.id})\n`);

    // 5. Cargar procesos
    console.log(`📥 Cargando ${procesos.length} procesos en la nueva versión...`);
    const cantCargados = await cargarExcelVersion(nuevaVersion.id, procesos, usuario);
    console.log(`✅ ${cantCargados} procesos cargados exitosamente\n`);

    // 6. Aprobar versión
    console.log('✔️  Aprobando la versión...');
    await aprobarVersion(nuevaVersion.id, usuario);
    console.log(`✅ Versión aprobada\n`);

    // 7. Reactivar versión (hacerla la versión activa)
    console.log('🔄 Activando la nueva versión...');
    const versionActivada = await reactivarVersion(nuevaVersion.id, usuario);
    console.log(`✅ Versión activada: ${versionActivada.nombre}\n`);

    // 8. Mostrar resumen final
    const versionFinal = await getVersionById(nuevaVersion.id);
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE CARGA EXITOSA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Versión: ${versionFinal.nombre}`);
    console.log(`ID: ${versionFinal.id}`);
    console.log(`Año: ${versionFinal.anio}`);
    console.log(`Reforma #: ${versionFinal.numero_reforma}`);
    console.log(`Estado: ${versionFinal.estado}`);
    console.log(`Activa: ${versionFinal.activa ? '✅ Sí' : '❌ No'}`);
    console.log(`Total de procesos: ${versionFinal.total_procesos}`);
    console.log(`Procesos activos: ${versionFinal.activos_count}`);
    console.log(`Procesos inactivos: ${versionFinal.inactivos_count}`);
    console.log(`Presupuesto total: $${versionFinal.presupuesto_total}`);
    console.log(`Fecha creación: ${versionFinal.fecha_creacion}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🎉 ¡Proceso completado exitosamente!\n');

  } catch (error) {
    console.error('❌ Error durante el proceso:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error crítico:', error.message);
    process.exit(1);
  });
