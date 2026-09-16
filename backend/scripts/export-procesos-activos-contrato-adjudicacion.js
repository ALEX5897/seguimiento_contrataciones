import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { getAllSubtareas, initMySQL } from '../data/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../../reportes');

function normalizarTexto(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizarEstado(value = '') {
  const normalized = normalizarTexto(value).replace(/\s+/g, '_');
  if (['completado', 'completada', 'cerrado', 'cerrada', 'closed', 'done', 'finalizado', 'finalizada'].includes(normalized)) {
    return 'Completado';
  }
  if (['en_proceso', 'en_curso', 'en_revision', 'bloqueada'].includes(normalized)) {
    return 'En proceso';
  }
  return 'Pendiente';
}

function parseDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatDate(value) {
  const date = parseDateOnly(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function obtenerMonto(subtarea) {
  const valor = Number(subtarea?.presupuesto || subtarea?.presupuesto2026Inicial || 0);
  return Number.isFinite(valor) ? valor : 0;
}

function obtenerEstadoProceso(subtarea) {
  const valor = subtarea?.activo;
  if (valor === undefined || valor === null || valor === '') return 1;
  if (typeof valor === 'number') return valor === 0 ? 0 : valor;
  if (typeof valor === 'boolean') return valor ? 1 : 0;

  const normalized = String(valor).trim().toLowerCase();
  if (['0', 'false', 'inactivo'].includes(normalized)) return 0;
  if (['2', 'desierto'].includes(normalized)) return 2;
  return 1;
}

function procesoActivo(subtarea) {
  const estado = obtenerEstadoProceso(subtarea);
  if (estado === 0) return false;
  if (estado === 1 && obtenerMonto(subtarea) <= 0) return false;
  return true;
}

function calcularAvance(subtarea) {
  const etapas = Array.isArray(subtarea?.seguimientoEtapas) ? subtarea.seguimientoEtapas : [];
  if (!etapas.length) return 0;

  const completadas = etapas.filter((etapa) => normalizarEstado(etapa?.estado) === 'Completado').length;
  return Math.round((completadas / etapas.length) * 100);
}

function buscarEtapa(subtarea, keywords = []) {
  const etapas = Array.isArray(subtarea?.seguimientoEtapas) ? subtarea.seguimientoEtapas : [];
  const matches = etapas
    .filter((etapa) => {
      const nombre = normalizarTexto(etapa?.etapaNombre || etapa?.nombre || '');
      return keywords.some((keyword) => nombre.includes(keyword));
    })
    .sort((a, b) => Number(a?.orden || 0) - Number(b?.orden || 0));

  const etapa = matches[0];
  if (!etapa) {
    return {
      nombre: '',
      estado: '',
      fechaLimite: '',
      fechaReforma: ''
    };
  }

  return {
    nombre: String(etapa?.etapaNombre || etapa?.nombre || ''),
    estado: normalizarEstado(etapa?.estado),
    fechaLimite: formatDate(etapa?.fechaPlanificada || etapa?.fechaTentativa || etapa?.fechaReforma),
    fechaReforma: formatDate(etapa?.fechaReforma || etapa?.fechaTentativa || etapa?.fechaPlanificada)
  };
}

function autoFitColumns(rows = []) {
  const widths = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      const value = String(cell ?? '');
      widths[index] = Math.max(widths[index] || 10, Math.min(50, value.length + 2));
    });
  }
  return widths.map((wch) => ({ wch }));
}

async function main() {
  await initMySQL();
  const subtareas = await getAllSubtareas();

  const rows = subtareas
    .filter((subtarea) => procesoActivo(subtarea))
    .map((subtarea) => {
      const adjudicacion = buscarEtapa(subtarea, ['adjudicacion', 'adjudica']);
      const contrato = buscarEtapa(subtarea, ['contratacion', 'contrato']);
      const monto = obtenerMonto(subtarea);
      const porcentajeAvance = calcularAvance(subtarea);

      return {
        direccion: String(subtarea?.direccionNombre || ''),
        nombreProceso: String(subtarea?.nombre || ''),
        codigoOlympo: String(subtarea?.codigoOlympo || ''),
        monto,
        porcentajeAvance,
        etapaAdjudicacion: adjudicacion.nombre,
        fechaLimiteAdjudicacion: adjudicacion.fechaLimite,
        fechaReformaAdjudicacion: adjudicacion.fechaReforma,
        estadoAdjudicacion: adjudicacion.estado,
        etapaContrato: contrato.nombre,
        fechaLimiteContrato: contrato.fechaLimite,
        fechaReformaContrato: contrato.fechaReforma,
        estadoContrato: contrato.estado
      };
    })
    .sort((a, b) => a.direccion.localeCompare(b.direccion) || a.nombreProceso.localeCompare(b.nombreProceso));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const exportRows = [
    [
      'Dirección',
      'Nombre del proceso',
      'Código Olympo',
      'Monto',
      '% avance proceso',
      'Etapa adjudicación',
      'Fecha límite adjudicación',
      'Fecha reforma adjudicación',
      'Estado adjudicación',
      'Etapa contrato',
      'Fecha límite contrato',
      'Fecha reforma contrato',
      'Estado contrato'
    ],
    ...rows.map((item) => [
      item.direccion,
      item.nombreProceso,
      item.codigoOlympo,
      item.monto,
      `${item.porcentajeAvance}%`,
      item.etapaAdjudicacion,
      item.fechaLimiteAdjudicacion,
      item.fechaReformaAdjudicacion,
      item.estadoAdjudicacion,
      item.etapaContrato,
      item.fechaLimiteContrato,
      item.fechaReformaContrato,
      item.estadoContrato
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(exportRows);
  ws['!cols'] = autoFitColumns(exportRows);
  ws['!autofilter'] = { ref: `A1:M${exportRows.length}` };

  const resumen = [
    ['Reporte', 'Procesos activos con fechas de adjudicación y contrato'],
    ['Generado en', new Date().toISOString()],
    ['Total procesos activos', rows.length],
    ['Con etapa de adjudicación identificada', rows.filter((row) => row.etapaAdjudicacion).length],
    ['Con etapa de contrato identificada', rows.filter((row) => row.etapaContrato).length]
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 36 }, { wch: 50 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
  XLSX.utils.book_append_sheet(wb, ws, 'Procesos activos');

  const outputPath = path.join(OUTPUT_DIR, `reporte_procesos_activos_contrato_adjudicacion_${new Date().toISOString().slice(0, 10)}.xlsx`);
  XLSX.writeFile(wb, outputPath);

  console.log(JSON.stringify({
    outputPath,
    totalProcesos: rows.length,
    conAdjudicacion: rows.filter((row) => row.etapaAdjudicacion).length,
    conContrato: rows.filter((row) => row.etapaContrato).length
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
