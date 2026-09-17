import XLSX from 'xlsx';
import * as mysql from '../data/mysql.js';

// ============ Funciones de conversión ============

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

// Convertir número de Excel a fecha (Excel epoch: 1899-12-30)
function excelDateToDate(excelDate) {
  if (!excelDate) return null;

  if (typeof excelDate === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    return !isNaN(jsDate.getTime()) ? jsDate : null;
  }

  if (excelDate instanceof Date) {
    return !isNaN(excelDate.getTime()) ? excelDate : null;
  }

  const dateStr = String(excelDate).trim();
  if (!dateStr || dateStr === '-') return null;
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime()) ? parsed : null;
}

// ============ Lectura y validación de Excel ============

export async function leerYValidarExcel(filePath) {
  const resultados = {
    procesos: [],
    errores: [],
    advertencias: [],
    resumen: {
      totalFilas: 0,
      procesosValidos: 0,
      erroresEncontrados: 0,
      advertenciasEncontradas: 0
    }
  };

  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    if (rows.length < 2) {
      throw new Error('El archivo Excel está vacío');
    }

    const headers = rows[0] || [];
    resultados.resumen.totalFilas = rows.length - 1;

    // Crear función para buscar columnas (case-insensitive, sin acentos)
    function normalizarNombre(s) {
      return String(s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();
    }

    function findCol(nombreColumna) {
      const norm = normalizarNombre(nombreColumna);
      return headers.findIndex(h => normalizarNombre(h) === norm);
    }

    // Validar columnas requeridas
    if (findCol('subtarea') < 0 || findCol('codigo_olympo') < 0) {
      throw new Error('El archivo debe contener las columnas: "subtarea" y "codigo_olympo"');
    }

    // Procesar cada fila
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const rowNum = r + 1;
      const erroresRow = [];
      const advertenciasRow = [];

      // Extraer valores
      const subtarea = toString(row[findCol('subtarea')]);
      const codigoOlympo = toString(row[findCol('codigo_olympo')]);

      // Validar campos obligatorios
      if (!subtarea) {
        erroresRow.push({
          fila: rowNum,
          campo: 'subtarea',
          mensaje: 'Campo requerido'
        });
      }

      if (!codigoOlympo) {
        erroresRow.push({
          fila: rowNum,
          campo: 'codigo_olympo',
          mensaje: 'Campo requerido'
        });
      }

      // Si hay errores críticos, saltar fila
      if (erroresRow.length > 0) {
        resultados.errores.push(...erroresRow);
        resultados.resumen.erroresEncontrados += erroresRow.length;
        continue;
      }

      // Validar presupuesto
      const presupuestoVal = row[findCol('presupuesto_con_reformas')];
      if (presupuestoVal !== null && presupuestoVal !== undefined && presupuestoVal !== '') {
        const num = toNumber(presupuestoVal);
        if (isNaN(num) || num < 0) {
          erroresRow.push({
            fila: rowNum,
            campo: 'presupuesto_con_reformas',
            mensaje: 'Debe ser un número válido'
          });
        }
      }

      // Si hay errores después de validaciones, agregar y continuar
      if (erroresRow.length > 0) {
        resultados.errores.push(...erroresRow);
        resultados.resumen.erroresEncontrados += erroresRow.length;
        continue;
      }

      // Construir objeto de proceso
      const procesoData = {
        rowNum,
        codigo_olympo: codigoOlympo,
        codigo_unico_proceso: toString(row[findCol('codigo_unico_proceso')]) || codigoOlympo,
        subtarea,
        direccion: toString(row[findCol('direccion')]),
        partida_presupuestaria: toNumber(row[findCol('partida_presupuestaria')]) || null,
        fuente_financiamiento: toString(row[findCol('fuente_financiamiento')]),
        presupuesto_con_reformas: toNumber(row[findCol('presupuesto_con_reformas')]),
        pac_no_pac: toString(row[findCol('pac_no_pac')]),
        tipo_contratacion: toString(row[findCol('tipo_contratacion')]),
        cpc: toString(row[findCol('cpc')]),
        cuatrimestre: toString(row[findCol('cuatrimestre')])
      };

      resultados.procesos.push(procesoData);
      resultados.resumen.procesosValidos++;

      if (advertenciasRow.length > 0) {
        resultados.advertencias.push(...advertenciasRow);
        resultados.resumen.advertenciasEncontradas += advertenciasRow.length;
      }
    }
  } catch (error) {
    throw new Error(`Error al leer Excel: ${error.message}`);
  }

  return resultados;
}

// ============ Carga a base de datos ============

export async function cargarProcesosMasivo(procesos, versionId, conn, opciones = {}) {
  const {
    actualizarExistentes = false,
    limpiarDatos = false
  } = opciones;

  const resultados = {
    cargados: 0,
    actualizados: 0,
    errores: [],
    detalles: []
  };

  try {
    // Limpiar datos si se indica (etapas_proceso, seguimiento_etapas y
    // comentarios_etapa se eliminan en cascada por FK ON DELETE CASCADE)
    if (limpiarDatos) {
      await conn.query(
        'DELETE FROM procesos WHERE version_id = ?',
        [versionId]
      );
    }

    // Procesar cada proceso
    for (const proceso of procesos) {
      try {
        // Verificar si existe
        const [existentes] = await conn.query(
          'SELECT id FROM procesos WHERE version_id = ? AND codigo_olympo = ? LIMIT 1',
          [versionId, proceso.codigo_olympo]
        );

        let procesoId;

        if (existentes.length > 0) {
          if (actualizarExistentes) {
            // Actualizar
            await conn.query(
              `UPDATE procesos SET
                codigo_unico_proceso = ?,
                subtarea = ?,
                direccion = ?,
                partida_presupuestaria = ?,
                fuente_financiamiento = ?,
                presupuesto_con_reformas = ?,
                pac_no_pac = ?,
                tipo_contratacion = ?,
                cpc = ?,
                cuatrimestre = ?
              WHERE id = ?`,
              [
                proceso.codigo_unico_proceso,
                proceso.subtarea,
                proceso.direccion,
                proceso.partida_presupuestaria,
                proceso.fuente_financiamiento,
                proceso.presupuesto_con_reformas,
                proceso.pac_no_pac,
                proceso.tipo_contratacion,
                proceso.cpc,
                proceso.cuatrimestre,
                existentes[0].id
              ]
            );
            procesoId = existentes[0].id;
            resultados.actualizados++;
          } else {
            resultados.detalles.push({
              rowNum: proceso.rowNum,
              codigo_olympo: proceso.codigo_olympo,
              estado: 'omitido',
              razon: 'Proceso ya existe'
            });
            continue;
          }
        } else {
          // Insertar nuevo
          const [res] = await conn.query(
            `INSERT INTO procesos (
              version_id, codigo_olympo, codigo_unico_proceso, subtarea,
              direccion, partida_presupuestaria,
              fuente_financiamiento, presupuesto_con_reformas,
              pac_no_pac, tipo_contratacion, cpc, cuatrimestre, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              versionId,
              proceso.codigo_olympo,
              proceso.codigo_unico_proceso,
              proceso.subtarea,
              proceso.direccion,
              proceso.partida_presupuestaria,
              proceso.fuente_financiamiento,
              proceso.presupuesto_con_reformas,
              proceso.pac_no_pac,
              proceso.tipo_contratacion,
              proceso.cpc,
              proceso.cuatrimestre
            ]
          );
          procesoId = res.insertId;
          resultados.cargados++;
        }

        resultados.detalles.push({
          rowNum: proceso.rowNum,
          codigo_olympo: proceso.codigo_olympo,
          subtarea: proceso.subtarea,
          estado: 'cargado'
        });
      } catch (error) {
        resultados.errores.push({
          rowNum: proceso.rowNum,
          codigo_olympo: proceso.codigo_olympo,
          mensaje: error.message
        });
      }
    }
  } catch (error) {
    throw new Error(`Error durante la carga: ${error.message}`);
  }

  return resultados;
}

export default {
  leerYValidarExcel,
  cargarProcesosMasivo
};
