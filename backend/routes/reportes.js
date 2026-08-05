
import express from 'express';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import * as mysql from '../data/mysql.js';
import { getScopeFromReq, normalizeText, parseDateOnly, obtenerEstadoProceso, obtenerPresupuestoProceso, procesoCuentaEnReporte } from '../utils/helpers.js';
import { generarHTMLInformeDetalle, generarHTMLUltimosComentarios } from '../utils/informeTemplates.js';

const router = express.Router();

async function lanzarNavegador() {
  try {
    return await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } catch (error) {
    const mensaje = error?.message || '';
    if (mensaje.includes('No usable sandbox') || mensaje.includes('Failed to launch')) {
      const err = new Error('Chrome no disponible en el servidor. Por favor contacta al administrador.');
      err.statusCode = 503;
      throw err;
    }
    throw error;
  }
}

// Reporte personalizado por direcciones y columnas seleccionadas
router.get('/export/xlsx/personalizado', async (req, res) => {
  try {
    const scope = getScopeFromReq(req);
    const subtareas = await mysql.getAllSubtareasByScope(scope);
    // Filtros: direcciones (array), datos (array de columnas)
    const filtros = {
      ...getFiltros(req.query),
      direcciones: Array.isArray(req.query.direcciones)
        ? req.query.direcciones
        : (req.query.direcciones ? [req.query.direcciones] : []),
      datos: Array.isArray(req.query.datos)
        ? req.query.datos
        : (req.query.datos ? [req.query.datos] : [])
    };

    // Filtrar por direcciones si corresponde
    let procesos = construirReporte(subtareas, filtros).procesos;
    if (filtros.direcciones && filtros.direcciones.length > 0) {
      const direccionesNorm = filtros.direcciones.map((d) => String(d).trim().toLowerCase());
      procesos = procesos.filter((p) => direccionesNorm.includes(String(p.direccionNombre).trim().toLowerCase()));
    }

    // Columnas disponibles y mapeo
    const columnasDisponibles = {
      codigoOlympo: { label: 'Código Olimpo', value: (p) => p.codigoOlympo },
      nombre: { label: 'Proceso', value: (p) => p.nombre },
      direccionNombre: { label: 'Dirección', value: (p) => p.direccionNombre },
      responsableNombre: { label: 'Responsable', value: (p) => p.responsableNombre },
      tipoPlan: { label: 'Tipo de plan', value: (p) => p.tipoPlan },
      estadoGeneralLabel: { label: 'Estado', value: (p) => p.estadoGeneralLabel },
      porcentajeAvance: { label: 'Avance %', value: (p) => p.porcentajeAvance },
      totalEtapas: { label: 'Verificables', value: (p) => p.totalEtapas },
      atrasadas: { label: 'Atrasadas', value: (p) => p.atrasadas },
      presupuesto: { label: 'Presupuesto', value: (p) => p.presupuesto },
      costoReforma2: { label: 'Costo reforma 2', value: (p) => p.costoReforma2 },
      proximaEtapa: { label: 'Próxima etapa', value: (p) => p.proximaEtapa },
      completadas: { label: 'Completadas', value: (p) => p.completadas },
      enProceso: { label: 'En proceso', value: (p) => p.enProceso },
      pendientes: { label: 'Pendientes', value: (p) => p.pendientes },
      vencenHoy: { label: 'Vencen hoy', value: (p) => p.vencenHoy },
      activo: { label: 'Activo', value: (p) => p.activo ? 'Sí' : 'No' }
    };

    // Si no se selecciona ninguna columna, usar todas
    let columnas = Object.keys(columnasDisponibles);
    if (Array.isArray(filtros.datos) && filtros.datos.length > 0) {
      // Mapear los nombres amigables a claves internas
      const map = {
        procesos: 'nombre',
        verificables: 'totalEtapas',
        cumplimiento: 'porcentajeAvance',
        presupuesto: 'presupuesto',
        atrasadas: 'atrasadas',
        responsable: 'responsableNombre',
        tipoPlan: 'tipoPlan',
        estado: 'estadoGeneralLabel',
        codigoOlympo: 'codigoOlympo',
        fechas: 'proximaEtapa',
      };
      columnas = filtros.datos.map((d) => map[d] || d).filter((c) => columnasDisponibles[c]);
      if (columnas.length === 0) columnas = Object.keys(columnasDisponibles);
    }

    // Construir filas
    const filas = procesos.map((p) => {
      const fila = {};
      columnas.forEach((col) => {
        fila[columnasDisponibles[col].label] = columnasDisponibles[col].value(p);
      });
      return fila;
    });

    // Generar XLSX
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: columnas.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, 'Personalizado');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const suffix = sanitizeFileName(`${(filtros.direcciones && filtros.direcciones.join('_')) || 'todas'}_${new Date().toISOString().slice(0, 10)}`);
    const filename = `reporte_personalizado_${suffix}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error en GET /api/reportes/export/xlsx/personalizado:', error);
    res.status(500).json({ error: error.message || 'Error al exportar reporte personalizado en XLSX' });
  }
});

// ---- Utilidades y funciones auxiliares ----
const normalizarTexto = normalizeText;

function normalizarEstado(value) {
  const estado = normalizarTexto(value).replace(/\s+/g, '_');

  if (['completado', 'completada', 'cerrada', 'finalizada', 'finalizado'].includes(estado)) {
    return 'completado';
  }

  if (['en_proceso', 'en_curso', 'en_revision', 'bloqueada'].includes(estado)) {
    return 'en_proceso';
  }

  return 'pendiente';
}

function estadoLabel(value) {
  switch (normalizarEstado(value)) {
    case 'completado':
      return 'Completado';
    case 'en_proceso':
      return 'En proceso';
    default:
      return 'Pendiente';
  }
}

function formatDate(value) {
  const date = parseDateOnly(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function sanitizeFileName(value) {
  return String(value || 'reporte')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function getFiltros(query = {}) {
  return {
    busqueda: String(query.busqueda || '').trim(),
    direccion: String(query.direccion || '').trim(),
    tipoPlan: String(query.tipoPlan || '').trim(),
    estado: String(query.estado || '').trim()
  };
}

function calcularResumenProceso(subtarea, hoy) {
  const etapas = Array.isArray(subtarea?.seguimientoEtapas) ? [...subtarea.seguimientoEtapas] : [];
  etapas.sort((a, b) => Number(a?.orden || 0) - Number(b?.orden || 0));

  let completadas = 0;
  let enProceso = 0;
  let pendientes = 0;
  let atrasadas = 0;
  let vencenHoy = 0;

  const etapasDetalle = etapas.map((etapa) => {
    const estado = normalizarEstado(etapa?.estado);
    const fechaPlanificada = parseDateOnly(etapa?.fechaPlanificada);
    const fechaReal = parseDateOnly(etapa?.fechaReal);
    const esCompletada = estado === 'completado';

    if (estado === 'completado') completadas += 1;
    else if (estado === 'en_proceso') enProceso += 1;
    else pendientes += 1;

    let diasAtraso = 0;
    let esAtrasada = false;
    let esVenceHoy = false;

    if (fechaPlanificada && !esCompletada) {
      const diffDays = Math.round((hoy.getTime() - fechaPlanificada.getTime()) / 86400000);
      if (diffDays > 0) {
        esAtrasada = true;
        diasAtraso = diffDays;
        atrasadas += 1;
      } else if (diffDays === 0) {
        esVenceHoy = true;
        vencenHoy += 1;
      }
    }

    return {
      subtareaId: Number(subtarea?.id || 0),
      etapaId: Number(etapa?.etapaId || 0),
      codigoOlympo: String(subtarea?.codigoOlympo || ''),
      proceso: String(subtarea?.nombre || ''),
      direccionNombre: String(subtarea?.direccionNombre || ''),
      responsableNombre: String(etapa?.responsableNombre || subtarea?.responsableNombre || ''),
      tipoPlan: String(subtarea?.tipoPlan || subtarea?.pacNoPac || ''),
      etapaNombre: String(etapa?.etapaNombre || etapa?.nombre || ''),
      orden: Number(etapa?.orden || 0),
      estado,
      estadoLabel: estadoLabel(estado),
      fechaPlanificada: formatDate(etapa?.fechaPlanificada),
      fechaReforma: formatDate(etapa?.fechaReforma),
      fechaReal: formatDate(etapa?.fechaReal),
      observaciones: String(etapa?.observaciones || ''),
      diasAtraso,
      esAtrasada,
      esVenceHoy
    };
  });

  const totalEtapas = etapasDetalle.length;
  const porcentajeAvance = totalEtapas > 0 ? Math.round((completadas / totalEtapas) * 100) : 0;
  const estadoGeneral = totalEtapas > 0 && completadas === totalEtapas
    ? 'completado'
    : (enProceso > 0 || completadas > 0 ? 'en_proceso' : 'pendiente');
  const proximaEtapa = etapasDetalle.find((etapa) => etapa.estado !== 'completado')?.etapaNombre || 'Completado';

  return {
    id: Number(subtarea?.id || 0),
    codigoOlympo: String(subtarea?.codigoOlympo || ''),
    nombre: String(subtarea?.nombre || ''),
    direccionNombre: String(subtarea?.direccionNombre || ''),
    responsableNombre: String(subtarea?.responsableNombre || ''),
    tipoPlan: String(subtarea?.tipoPlan || subtarea?.pacNoPac || ''),
    presupuesto: obtenerPresupuestoProceso(subtarea),
    costoReforma2: Number(subtarea?.costoReforma2 || subtarea?.costo2026 || 0),
    activo: obtenerEstadoProceso(subtarea) !== 0,
    totalEtapas,
    completadas,
    enProceso,
    pendientes,
    atrasadas,
    vencenHoy,
    porcentajeAvance,
    estadoGeneral,
    estadoGeneralLabel: estadoLabel(estadoGeneral),
    proximaEtapa,
    etapasDetalle
  };
}

function coincideBusqueda(proceso, busqueda) {
  const q = normalizarTexto(busqueda);
  if (!q) return true;

  const haystack = normalizarTexto([
    proceso.codigoOlympo,
    proceso.nombre,
    proceso.direccionNombre,
    proceso.responsableNombre,
    proceso.tipoPlan,
    proceso.proximaEtapa
  ].join(' '));

  return haystack.includes(q);
}

function coincideEstado(proceso, estado) {
  const filtro = normalizarTexto(estado).replace(/\s+/g, '_');
  if (!filtro) return true;
  if (filtro === 'atrasada') return proceso.atrasadas > 0;
  if (filtro === 'vence_hoy') return proceso.vencenHoy > 0;
  return proceso.estadoGeneral === filtro;
}

function filtrarProcesos(procesos, filtros) {
  const direccion = normalizarTexto(filtros.direccion);
  const tipoPlan = normalizarTexto(filtros.tipoPlan);

  return procesos.filter((proceso) => {
    if (direccion && normalizarTexto(proceso.direccionNombre) !== direccion) return false;
    if (tipoPlan && normalizarTexto(proceso.tipoPlan) !== tipoPlan) return false;
    if (!coincideBusqueda(proceso, filtros.busqueda)) return false;
    if (!coincideEstado(proceso, filtros.estado)) return false;
    return true;
  });
}

function construirReporte(subtareas, filtros) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const procesosBase = subtareas
    .filter((subtarea) => procesoCuentaEnReporte(subtarea))
    .map((subtarea) => calcularResumenProceso(subtarea, hoy));
  const procesos = filtrarProcesos(procesosBase, filtros);
  const etapas = procesos.flatMap((proceso) => proceso.etapasDetalle);

  const totalProcesos = procesos.length;
  const totalVerificables = procesos.reduce((sum, item) => sum + item.totalEtapas, 0);
  const completados = procesos.reduce((sum, item) => sum + item.completadas, 0);
  const enProceso = procesos.reduce((sum, item) => sum + item.enProceso, 0);
  const pendientes = procesos.reduce((sum, item) => sum + item.pendientes, 0);
  const atrasadas = procesos.reduce((sum, item) => sum + item.atrasadas, 0);
  const vencenHoy = procesos.reduce((sum, item) => sum + item.vencenHoy, 0);
  const presupuestoTotal = procesos.reduce((sum, item) => sum + item.presupuesto, 0);
  const costoReformaTotal = procesos.reduce((sum, item) => sum + item.costoReforma2, 0);
  const cumplimientoGeneral = totalVerificables > 0 ? Math.round((completados / totalVerificables) * 100) : 0;

  const resumenPorDireccion = Object.values(procesos.reduce((acc, item) => {
    const key = item.direccionNombre || 'Sin dirección';
    if (!acc[key]) {
      acc[key] = {
        direccionNombre: key,
        totalProcesos: 0,
        totalVerificables: 0,
        completados: 0,
        enProceso: 0,
        pendientes: 0,
        atrasadas: 0,
        presupuestoTotal: 0,
        costoReformaTotal: 0,
        cumplimiento: 0
      };
    }

    acc[key].totalProcesos += 1;
    acc[key].totalVerificables += item.totalEtapas;
    acc[key].completados += item.completadas;
    acc[key].enProceso += item.enProceso;
    acc[key].pendientes += item.pendientes;
    acc[key].atrasadas += item.atrasadas;
    acc[key].presupuestoTotal += item.presupuesto;
    acc[key].costoReformaTotal += item.costoReforma2;
    return acc;
  }, {})).map((item) => ({
    ...item,
    cumplimiento: item.totalVerificables > 0 ? Math.round((item.completados / item.totalVerificables) * 100) : 0
  })).sort((a, b) => a.direccionNombre.localeCompare(b.direccionNombre));

  const direccionesDisponibles = [...new Set(subtareas.map((item) => String(item?.direccionNombre || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const tiposPlanDisponibles = [...new Set(subtareas.map((item) => String(item?.tipoPlan || item?.pacNoPac || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  return {
    generadoEn: new Date().toISOString(),
    filtros,
    kpis: {
      totalProcesos,
      totalVerificables,
      completados,
      enProceso,
      pendientes,
      atrasadas,
      vencenHoy,
      presupuestoTotal,
      costoReformaTotal,
      cumplimientoGeneral
    },
    direccionesDisponibles,
    tiposPlanDisponibles,
    procesos: procesos.map(({ etapasDetalle, ...item }) => item),
    etapas,
    resumenPorDireccion
  };
}

function agregarAutofiltro(ws, startRow, endRow, endCol) {
  if (endRow < startRow || endCol < 0) return;
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: startRow, c: 0 }, e: { r: endRow, c: endCol } })
  };
}

function buscarEtapaClave(etapas = [], palabrasClave = []) {
  const match = etapas
    .filter((etapa) => {
      const nombre = normalizarTexto(etapa?.etapaNombre || '');
      return palabrasClave.some((palabra) => nombre.includes(palabra));
    })
    .sort((a, b) => Number(a?.orden || 0) - Number(b?.orden || 0))[0];

  if (!match) {
    return {
      etapaNombre: '',
      estadoLabel: '',
      fechaPlanificada: '',
      fechaReforma: ''
    };
  }

  return {
    etapaNombre: match.etapaNombre || '',
    estadoLabel: match.estadoLabel || '',
    fechaPlanificada: match.fechaPlanificada || '',
    fechaReforma: match.fechaReforma || ''
  };
}

function construirFilasContratoAdjudicacion(reporte) {
  const etapasPorProceso = reporte.etapas.reduce((acc, etapa) => {
    const key = `${etapa.codigoOlympo}::${etapa.proceso}`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(etapa);
    return acc;
  }, new Map());

  return reporte.procesos.map((proceso) => {
    const key = `${proceso.codigoOlympo}::${proceso.nombre}`;
    const etapas = etapasPorProceso.get(key) || [];
    const adjudicacion = buscarEtapaClave(etapas, ['adjudicacion', 'adjudica']);
    const contrato = buscarEtapaClave(etapas, ['contratacion', 'contrato']);

    return {
      'Dirección': proceso.direccionNombre,
      'Nombre del proceso': proceso.nombre,
      'Código Olympo': proceso.codigoOlympo,
      'Monto': proceso.presupuesto,
      '% avance proceso': proceso.porcentajeAvance,
      'Etapa adjudicación': adjudicacion.etapaNombre,
      'Fecha límite adjudicación': adjudicacion.fechaPlanificada,
      'Fecha reforma adjudicación': adjudicacion.fechaReforma,
      'Estado adjudicación': adjudicacion.estadoLabel,
      'Etapa contrato': contrato.etapaNombre,
      'Fecha límite contrato': contrato.fechaPlanificada,
      'Fecha reforma contrato': contrato.fechaReforma,
      'Estado contrato': contrato.estadoLabel
    };
  });
}

function crearWorkbookReporte(reporte) {
  const wb = XLSX.utils.book_new();
  const generado = formatDateTime(reporte.generadoEn);

  const resumenRows = [
    ['Reporte de Seguimiento POA/PAC'],
    ['Generado el', generado],
    ['Búsqueda', reporte.filtros.busqueda || 'Todos'],
    ['Dirección', reporte.filtros.direccion || 'Todas'],
    ['Tipo plan', reporte.filtros.tipoPlan || 'Todos'],
    ['Estado', reporte.filtros.estado || 'Todos'],
    [],
    ['Indicador', 'Valor'],
    ['Total procesos', reporte.kpis.totalProcesos],
    ['Total verificables', reporte.kpis.totalVerificables],
    ['Completados', reporte.kpis.completados],
    ['En proceso', reporte.kpis.enProceso],
    ['Pendientes', reporte.kpis.pendientes],
    ['Atrasadas', reporte.kpis.atrasadas],
    ['Vencen hoy', reporte.kpis.vencenHoy],
    ['Cumplimiento general %', reporte.kpis.cumplimientoGeneral],
    ['Presupuesto total', reporte.kpis.presupuestoTotal],
    ['Costo reforma 2', reporte.kpis.costoReformaTotal]
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 28 }, { wch: 20 }];
  wsResumen['!merges'] = [XLSX.utils.decode_range('A1:B1')];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const wsDirecciones = XLSX.utils.json_to_sheet(reporte.resumenPorDireccion.map((item) => ({
    'Dirección': item.direccionNombre,
    'Procesos': item.totalProcesos,
    'Verificables': item.totalVerificables,
    'Completados': item.completados,
    'En proceso': item.enProceso,
    'Pendientes': item.pendientes,
    'Atrasadas': item.atrasadas,
    'Cumplimiento %': item.cumplimiento,
    'Presupuesto total': item.presupuestoTotal,
    'Costo reforma 2': item.costoReformaTotal
  })));
  wsDirecciones['!cols'] = [
    { wch: 34 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 }
  ];
  agregarAutofiltro(wsDirecciones, 0, reporte.resumenPorDireccion.length, 9);
  XLSX.utils.book_append_sheet(wb, wsDirecciones, 'Por dirección');

  const wsProcesos = XLSX.utils.json_to_sheet(reporte.procesos.map((item) => ({
    'Código Olimpo': item.codigoOlympo,
    'Proceso': item.nombre,
    'Dirección': item.direccionNombre,
    'Responsable': item.responsableNombre,
    'Tipo plan': item.tipoPlan,
    'Estado general': item.estadoGeneralLabel,
    'Próxima etapa': item.proximaEtapa,
    'Presupuesto': item.presupuesto,
    'Costo reforma 2': item.costoReforma2,
    'Total verificables': item.totalEtapas,
    'Completadas': item.completadas,
    'En proceso': item.enProceso,
    'Pendientes': item.pendientes,
    'Atrasadas': item.atrasadas,
    'Vencen hoy': item.vencenHoy,
    'Avance %': item.porcentajeAvance,
    'Activo': item.activo ? 'Sí' : 'No'
  })));
  wsProcesos['!cols'] = [
    { wch: 16 },
    { wch: 42 },
    { wch: 28 },
    { wch: 24 },
    { wch: 14 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 }
  ];
  agregarAutofiltro(wsProcesos, 0, reporte.procesos.length, 16);
  XLSX.utils.book_append_sheet(wb, wsProcesos, 'Procesos');

  const wsEtapas = XLSX.utils.json_to_sheet(reporte.etapas.map((item) => ({
    'Código Olimpo': item.codigoOlympo,
    'Proceso': item.proceso,
    'Dirección': item.direccionNombre,
    'Responsable': item.responsableNombre,
    'Tipo plan': item.tipoPlan,
    'Etapa': item.etapaNombre,
    'Orden': item.orden,
    'Estado': item.estadoLabel,
    'Fecha planificada': item.fechaPlanificada,
    'Fecha reforma': item.fechaReforma,
    'Fecha real': item.fechaReal,
    'Días atraso': item.diasAtraso,
    'Atrasada': item.esAtrasada ? 'Sí' : 'No',
    'Vence hoy': item.esVenceHoy ? 'Sí' : 'No',
    'Observaciones': item.observaciones
  })));
  wsEtapas['!cols'] = [
    { wch: 16 },
    { wch: 42 },
    { wch: 28 },
    { wch: 24 },
    { wch: 14 },
    { wch: 28 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 50 }
  ];
  agregarAutofiltro(wsEtapas, 0, reporte.etapas.length, 14);
  XLSX.utils.book_append_sheet(wb, wsEtapas, 'Verificables');

  const filasContratoAdjudicacion = construirFilasContratoAdjudicacion(reporte);
  const wsContratoAdjudicacion = XLSX.utils.json_to_sheet(filasContratoAdjudicacion);
  wsContratoAdjudicacion['!cols'] = [
    { wch: 28 },
    { wch: 44 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 }
  ];
  agregarAutofiltro(wsContratoAdjudicacion, 0, filasContratoAdjudicacion.length, 12);
  XLSX.utils.book_append_sheet(wb, wsContratoAdjudicacion, 'Contrato y adjudicación');

  return wb;
}

function crearWorkbookContratoAdjudicacion(reporte) {
  const wb = XLSX.utils.book_new();
  const filas = construirFilasContratoAdjudicacion(reporte);

  const resumenRows = [
    ['Reporte de procesos activos - Contrato y adjudicación'],
    ['Generado el', formatDateTime(reporte.generadoEn)],
    ['Dirección', reporte.filtros.direccion || 'Todas'],
    ['Tipo plan', reporte.filtros.tipoPlan || 'Todos'],
    ['Total procesos activos', filas.length],
    ['Con etapa de adjudicación', filas.filter((item) => item['Etapa adjudicación']).length],
    ['Con etapa de contrato', filas.filter((item) => item['Etapa contrato']).length]
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen['!cols'] = [{ wch: 34 }, { wch: 36 }];
  wsResumen['!merges'] = [XLSX.utils.decode_range('A1:B1')];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const wsDetalle = XLSX.utils.json_to_sheet(filas);
  wsDetalle['!cols'] = [
    { wch: 28 },
    { wch: 44 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 }
  ];
  agregarAutofiltro(wsDetalle, 0, filas.length, 12);
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Contrato y adjudicación');

  return wb;
}

router.get('/resumen', async (req, res) => {
  try {
    const subtareas = await mysql.getAllSubtareasByScope(getScopeFromReq(req));
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);
    res.json(reporte);
  } catch (error) {
    console.error('Error en GET /api/reportes/resumen:', error);
    res.status(500).json({ error: error.message || 'Error al generar reporte' });
  }
});

router.get('/export/xlsx', async (req, res) => {
  try {
    const subtareas = await mysql.getAllSubtareasByScope(getScopeFromReq(req));
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);
    const wb = crearWorkbookReporte(reporte);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const suffix = sanitizeFileName(`${filtros.direccion || 'general'}_${filtros.tipoPlan || 'todos'}_${new Date().toISOString().slice(0, 10)}`);
    const filename = `reporte_seguimiento_${suffix || 'general'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error en GET /api/reportes/export/xlsx:', error);
    res.status(500).json({ error: error.message || 'Error al exportar reporte en XLSX' });
  }
});

router.get('/export/xlsx/contrato-adjudicacion', async (req, res) => {
  try {
    const subtareas = await mysql.getAllSubtareasByScope(getScopeFromReq(req));
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);
    const wb = crearWorkbookContratoAdjudicacion(reporte);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const suffix = sanitizeFileName(`${filtros.direccion || 'general'}_${new Date().toISOString().slice(0, 10)}`);
    const filename = `reporte_contrato_adjudicacion_${suffix || 'general'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error en GET /api/reportes/export/xlsx/contrato-adjudicacion:', error);
    res.status(500).json({ error: error.message || 'Error al exportar reporte de contrato y adjudicación en XLSX' });
  }
});


// ── WHITELIST de campos exportables ─────────────────────────────────────────
const CAMPOS_DISPONIBLES = [
  { key: 'codigoOlympo',           label: 'Código Olimpo',           tipo: 'text',     grupo: 'Proceso' },
  { key: 'nombre',                  label: 'Proceso',                  tipo: 'text',     grupo: 'Proceso' },
  { key: 'direccionNombre',         label: 'Dirección',               tipo: 'text',     grupo: 'Proceso' },
  { key: 'responsableNombre',       label: 'Responsable',             tipo: 'text',     grupo: 'Proceso' },
  { key: 'tipoPlan',                label: 'Tipo plan',               tipo: 'text',     grupo: 'Proceso' },
  { key: 'cuatrimestre',            label: 'Cuatrimestre',            tipo: 'text',     grupo: 'Proceso' },
  { key: 'plazoContrato',           label: 'Plazo contrato',          tipo: 'text',     grupo: 'Proceso' },
  { key: 'procedimientoSugerido',   label: 'Procedimiento sugerido',  tipo: 'text',     grupo: 'Proceso' },
  { key: 'partidaPresupuestaria',   label: 'Partida presupuestaria',  tipo: 'text',     grupo: 'Proceso' },
  { key: 'fechaInicio',             label: 'Fecha inicio',            tipo: 'fecha',    grupo: 'Proceso' },
  { key: 'fechaFin',                label: 'Fecha fin',               tipo: 'fecha',    grupo: 'Proceso' },
  { key: 'activo',                  label: 'Activo',                  tipo: 'boolean',  grupo: 'Proceso' },
  { key: 'procesoEnRiesgo',         label: 'En riesgo',               tipo: 'boolean',  grupo: 'Proceso' },
  { key: 'observaciones',           label: 'Observaciones',           tipo: 'text',     grupo: 'Proceso' },
  { key: 'presupuesto',             label: 'Presupuesto inicial',     tipo: 'moneda',   grupo: 'Presupuesto' },
  { key: 'costoReforma2',           label: 'Costo 2026',              tipo: 'moneda',   grupo: 'Presupuesto' },
  { key: 'estadoGeneralLabel',      label: 'Estado',                  tipo: 'text',     grupo: 'Seguimiento' },
  { key: 'porcentajeAvance',        label: 'Avance %',                tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'totalEtapas',             label: 'Verificables',            tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'completadas',             label: 'Completadas',             tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'enProceso',               label: 'En proceso',              tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'pendientes',              label: 'Pendientes',              tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'atrasadas',               label: 'Atrasadas',               tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'vencenHoy',               label: 'Vencen hoy',             tipo: 'numero',   grupo: 'Seguimiento' },
  { key: 'proximaEtapa',            label: 'Próxima etapa',           tipo: 'text',     grupo: 'Seguimiento' },
  { key: 'adjudicacionCompletada',  label: 'Adjudicación',            tipo: 'text',     grupo: 'Seguimiento' },
  { key: 'contratoCompletado',      label: 'Contrato',                tipo: 'text',     grupo: 'Seguimiento' },
  { key: 'ultimaActualizacion',     label: 'Última actualización',     tipo: 'texto',    grupo: 'Seguimiento' },
];

const WHITELIST_KEYS = new Set(CAMPOS_DISPONIBLES.map((c) => c.key));

// GET /api/reportes/campos → devuelve el catálogo de campos exportables
router.get('/campos', (_req, res) => {
  res.json(CAMPOS_DISPONIBLES);
});

// Extrae el valor de un campo del objeto proceso ya procesado
function extractCampoValue(proceso, campoKey) {
  switch (campoKey) {
    case 'activo':        return proceso.activo ? 'Sí' : 'No';
    case 'procesoEnRiesgo': return proceso.procesoEnRiesgo ? 'Sí' : 'No';
    default:              return proceso[campoKey] ?? '';
  }
}

function formatFecha(value) {
  const d = parseDateOnly(value);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Obtiene información sobre adjudicación completada
function obtenerAdjudicacionCompletada(subtarea) {
  const etapas = Array.isArray(subtarea?.seguimientoEtapas) ? [...subtarea.seguimientoEtapas] : [];

  for (const etapa of etapas) {
    const nombreNorm = String(etapa?.etapaNombre || '').toLowerCase().trim();
    const estado = normalizarEstado(etapa?.estado);

    if ((nombreNorm.includes('adjudicado') || nombreNorm.includes('adjudicacion')) && estado === 'completado') {
      const fechaReal = formatDate(etapa?.fechaReal) || 'N/A';
      const fechaPlan = formatDate(etapa?.fechaPlanificada) || 'N/A';
      return `Completado ${fechaReal} (Programado: ${fechaPlan})`;
    }
  }

  return '';
}

// Obtiene información sobre contrato completado
function obtenerContratoCompletado(subtarea) {
  const etapas = Array.isArray(subtarea?.seguimientoEtapas) ? [...subtarea.seguimientoEtapas] : [];

  for (const etapa of etapas) {
    const nombreNorm = String(etapa?.etapaNombre || '').toLowerCase().trim();
    const estado = normalizarEstado(etapa?.estado);

    if (nombreNorm.includes('contrato') && estado === 'completado') {
      const fechaReal = formatDate(etapa?.fechaReal) || 'N/A';
      const fechaPlan = formatDate(etapa?.fechaPlanificada) || 'N/A';
      return `Completado ${fechaReal} (Programado: ${fechaPlan})`;
    }
  }

  return '';
}

// Obtiene la última actualización del proceso
function obtenerUltimaActualizacion(subtarea) {
  let ultimaFecha = null;
  let ultimaAccion = '';

  // Revisar updated_at del proceso
  if (subtarea?.updatedAt) {
    const fecha = new Date(subtarea.updatedAt);
    if (fecha > (ultimaFecha || new Date(0))) {
      ultimaFecha = fecha;
      ultimaAccion = 'Actualización del proceso';
    }
  }

  // Revisar cambios en etapas de seguimiento
  const etapas = Array.isArray(subtarea?.seguimientoEtapas) ? subtarea.seguimientoEtapas : [];
  etapas.forEach((etapa) => {
    const fechaEtapa = etapa?.updatedAt || etapa?.createdAt;
    if (fechaEtapa) {
      const fecha = new Date(fechaEtapa);
      if (fecha > (ultimaFecha || new Date(0))) {
        ultimaFecha = fecha;
        const nombreEtapa = etapa?.etapaNombre || '';
        const estado = etapa?.estado || 'pendiente';
        ultimaAccion = `Cambio en "${nombreEtapa}" a estado ${estado}`;
      }
    }
  });

  if (ultimaFecha) {
    const dd = String(ultimaFecha.getDate()).padStart(2, '0');
    const mm = String(ultimaFecha.getMonth() + 1).padStart(2, '0');
    const yyyy = ultimaFecha.getFullYear();
    const hh = String(ultimaFecha.getHours()).padStart(2, '0');
    const min = String(ultimaFecha.getMinutes()).padStart(2, '0');

    return `${dd}/${mm}/${yyyy} ${hh}:${min} - ${ultimaAccion}`;
  }

  return 'Sin cambios registrados';
}

// Construye proceso enriquecido para exportación (combina subtarea + resumen)
function enriquecerProceso(subtarea) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const resumen = calcularResumenProceso(subtarea, hoy);
  return {
    ...resumen,
    cuatrimestre:           String(subtarea.cuatrimestre || ''),
    plazoContrato:          String(subtarea.plazoContrato || ''),
    procedimientoSugerido:  String(subtarea.procedimientoSugerido || ''),
    partidaPresupuestaria:  String(subtarea.partidaPresupuestaria || ''),
    fechaInicio:            formatFecha(subtarea.fechaInicio),
    fechaFin:               formatFecha(subtarea.fechaFin),
    procesoEnRiesgo:        Boolean(subtarea.procesoEnRiesgo),
    observaciones:          String(subtarea.observaciones || ''),
    adjudicacionCompletada: obtenerAdjudicacionCompletada(subtarea),
    contratoCompletado:     obtenerContratoCompletado(subtarea),
    ultimaActualizacion:    obtenerUltimaActualizacion(subtarea),
  };
}

// Columnas fijas para el modo verificables
const COLS_VERIFICABLES = [
  { key: '_etapaNombre',        label: 'Verificable',        tipo: 'text',   width: 32 },
  { key: '_etapaOrden',         label: 'Orden',              tipo: 'numero', width: 10 },
  { key: '_etapaEstado',        label: 'Estado verificable', tipo: 'text',   width: 20 },
  { key: '_etapaFechaPlan',     label: 'Fecha planificada',  tipo: 'fecha',  width: 18 },
  { key: '_etapaFechaReforma',  label: 'Fecha reforma',      tipo: 'fecha',  width: 16 },
  { key: '_etapaFechaReal',     label: 'Fecha real',         tipo: 'fecha',  width: 16 },
  { key: '_etapaDiasAtraso',    label: 'Días atraso',        tipo: 'numero', width: 14 },
];

// Expande un proceso en sus verificables
function expandirEnVerificables(proceso) {
  const etapas = proceso.etapasDetalle || [];
  if (etapas.length === 0) {
    return [{ ...proceso, _etapaNombre: '', _etapaOrden: '', _etapaEstado: '', _etapaFechaPlan: '', _etapaFechaReforma: '', _etapaFechaReal: '', _etapaDiasAtraso: 0 }];
  }
  return etapas.map((e) => ({
    ...proceso,
    _etapaNombre:       String(e.etapaNombre || ''),
    _etapaOrden:        Number(e.orden || 0),
    _etapaEstado:       estadoLabel(String(e.estado || 'pendiente')),
    _etapaFechaPlan:    String(e.fechaPlanificada || ''),
    _etapaFechaReforma: String(e.fechaReforma || ''),
    _etapaFechaReal:    String(e.fechaReal || ''),
    _etapaDiasAtraso:   Number(e.diasAtraso || 0),
  }));
}

// POST /api/reportes/generar
router.post('/generar', async (req, res) => {
  try {
    const scope = getScopeFromReq(req);
    const { areas = 'ALL', campos = [], incluirVerificables = false, bloquesMatriz = {} } = req.body || {};

    // Validar campos contra whitelist
    const camposValidados = Array.isArray(campos)
      ? campos.filter((c) => WHITELIST_KEYS.has(String(c)))
      : [];

    if (camposValidados.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un campo válido.' });
    }

    const metaCampos = camposValidados.map((k) => CAMPOS_DISPONIBLES.find((c) => c.key === k));
    const todasColumnas = incluirVerificables ? [...metaCampos, ...COLS_VERIFICABLES] : metaCampos;

    // Obtener datos respetando scope del usuario
    const subtareas = await mysql.getAllSubtareasByScope(scope);

    let procesosBase = subtareas
      .filter((s) => procesoCuentaEnReporte(s))
      .map(enriquecerProceso);

    if (areas !== 'ALL' && Array.isArray(areas) && areas.length > 0) {
      const areasNorm = areas.map((a) => String(a).trim().toLowerCase());
      procesosBase = procesosBase.filter((p) =>
        areasNorm.includes(String(p.direccionNombre || '').trim().toLowerCase())
      );
    }

    // Expandir en verificables si aplica
    const filas = incluirVerificables
      ? procesosBase.flatMap(expandirEnVerificables)
      : procesosBase;

    // ── Generar Excel con ExcelJS ──────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema Seguimiento Contrataciones';
    wb.created = new Date();

    const COLOR_HEADER_BG  = '0F2F55';
    const COLOR_HEADER_FG  = 'FFFFFF';
    const COLOR_VERIF_BG   = '0F5132'; // verde oscuro para columnas de verificables
    const COLOR_MONEDA_BG  = 'EEF4FF';
    const COLOR_ALT_BG     = 'F8FAFC';

    const ws = wb.addWorksheet('Reporte', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    const maxWidths = todasColumnas.map((m) => Math.max(m.label.length + 4, m.width || getDefaultWidth(m.tipo)));

    ws.columns = todasColumnas.map((meta, i) => ({
      header: meta.label,
      key: meta.key,
      width: maxWidths[i]
    }));

    // Estilo encabezados
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell, colIdx) => {
      const isVerif = incluirVerificables && colIdx > metaCampos.length;
      cell.font = { bold: true, color: { argb: COLOR_HEADER_FG }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isVerif ? COLOR_VERIF_BG : COLOR_HEADER_BG } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: isVerif ? '198754' : '2F6EB0' } } };
    });
    headerRow.height = 22;

    // Filas de datos
    filas.forEach((fila, rowIdx) => {
      const rowData = {};
      todasColumnas.forEach((meta, colIdx) => {
        const raw = extractCampoValue(fila, meta.key);
        rowData[meta.key] = formatCellValue(raw, meta.tipo);
        const strLen = String(raw || '').length;
        if (strLen + 2 > maxWidths[colIdx]) maxWidths[colIdx] = Math.min(strLen + 2, 60);
      });

      const dataRow = ws.addRow(rowData);
      dataRow.height = 18;

      if (rowIdx % 2 === 1) {
        dataRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ALT_BG } };
        });
      }

      todasColumnas.forEach((meta, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        applyColumnFormat(cell, meta.tipo, fila[meta.key]);

        if (meta.tipo === 'moneda') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_MONEDA_BG } };
        }

        cell.alignment = { vertical: 'middle', horizontal: getAlign(meta.tipo) };
        cell.border = { bottom: { style: 'thin', color: { argb: 'E2E8F0' } } };
      });
    });

    ws.columns.forEach((col, i) => { col.width = maxWidths[i] + 1; });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: filas.length + 1, column: todasColumnas.length }
    };

    // ── Agregar hoja de matriz de etapas por días de retraso ────────────────
    const tieneAlgunBloque = bloquesMatriz.informacionGeneral || bloquesMatriz.etapasTarde || bloquesMatriz.diasTarde;
    if (tieneAlgunBloque && !incluirVerificables && procesosBase.length > 0) {
      await agregarHojaMatrizEtapas(wb, procesosBase, bloquesMatriz);
    }

    // ── Hoja Info ──────────────────────────────────────────────────────────
    const wsMeta = wb.addWorksheet('Info');
    wsMeta.columns = [{ width: 28 }, { width: 48 }];
    [
      ['Reporte generado el', new Date().toLocaleString('es-EC')],
      ['Modo', incluirVerificables ? 'Por verificable (una fila por etapa)' : 'Por proceso'],
      ['Áreas incluidas', areas === 'ALL' ? 'Todas' : (Array.isArray(areas) ? areas.join(', ') : areas)],
      ['Total filas', filas.length],
      ['Campos exportados', metaCampos.map((m) => m.label).join(', ')],
    ].forEach(([k, v]) => {
      const row = wsMeta.addRow([k, v]);
      row.getCell(1).font = { bold: true };
    });

    // ── Enviar ─────────────────────────────────────────────────────────────
    const areasSuffix = areas === 'ALL' ? 'todas' : (Array.isArray(areas) ? areas.slice(0, 2).join('_') : String(areas));
    const modeSuffix  = incluirVerificables ? '_verificables' : '';
    const filename    = `reporte_${sanitizeFileName(areasSuffix)}${modeSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error en POST /api/reportes/generar:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Error al generar el reporte Excel.' });
    }
  }
});

function getDefaultWidth(tipo) {
  switch (tipo) {
    case 'moneda':  return 18;
    case 'fecha':   return 14;
    case 'numero':  return 12;
    case 'boolean': return 10;
    default:        return 20;
  }
}

function getAlign(tipo) {
  switch (tipo) {
    case 'moneda':
    case 'numero':  return 'right';
    case 'boolean': return 'center';
    default:        return 'left';
  }
}

function formatCellValue(raw, tipo) {
  if (tipo === 'moneda' || tipo === 'numero') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return raw;
}

function applyColumnFormat(cell, tipo, rawValue) {
  switch (tipo) {
    case 'moneda':
      cell.numFmt = '"$"#,##0.00';
      break;
    case 'numero':
      cell.numFmt = '#,##0';
      break;
    case 'fecha':
      if (rawValue) cell.numFmt = 'dd/mm/yyyy';
      break;
    default:
      break;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MÓDULO DE INFORMES EN PDF (nueva funcionalidad)
// ──────────────────────────────────────────────────────────────────────────────

import PDFDocument from 'pdfkit';

function generarInformePDF(res, datos) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${datos.filename}"`);
  doc.pipe(res);

  // ── PORTADA ─────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1a5fad');

  doc.fontSize(32).font('Helvetica-Bold').fillColor('#ffffff').text('INFORME DE ACTIVIDADES', 50, 150, { align: 'center', width: 495 });
  doc.moveDown(1);
  doc.fontSize(16).font('Helvetica').text('Seguimiento de Contrataciones POA/PAC 2026', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(12).fillColor('#e2e8f0').text(`Período: ${datos.fechaInicio} al ${datos.fechaFin}`, { align: 'center' });
  doc.moveDown(4);

  // KPIs en la portada
  const kpiInfos = [
    { label: 'Procesos', valor: datos.resumen.totalProcesos },
    { label: 'Cumplimiento', valor: `${datos.resumen.cumplimientoGeneral}%` },
    { label: 'Presupuesto', valor: `$${formatMonto(datos.resumen.presupuestoTotal)}` }
  ];

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
  kpiInfos.forEach((kpi, i) => {
    doc.text(`${kpi.label}: ${kpi.valor}`, 50, 400 + i * 40);
  });

  doc.moveDown(6);
  doc.fontSize(10).fillColor('#bfdbfe').text(`Generado: ${new Date().toLocaleString('es-EC')}`, 50, doc.page.height - 80, { align: 'center', width: 495 });
  doc.fontSize(9).text('QuitoTurismo - Sistema de Seguimiento', { align: 'center' });

  doc.addPage();

  // ── ÍNDICE ──────────────────────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('ÍNDICE', 50, 50);
  doc.fontSize(10).font('Helvetica').moveDown(0.5);
  const items = [
    '1. Resumen Ejecutivo',
    '2. Indicadores Generales',
    '3. Análisis por Dirección',
    '4. Etapas Tardías',
    '5. Direcciones Más Activas',
    '6. Detalle de Cambios'
  ];
  items.forEach((item, i) => {
    doc.text(item);
  });

  doc.addPage();

  // ── RESUMEN EJECUTIVO ─────────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('1. RESUMEN EJECUTIVO', 50);
  doc.moveDown(0.2);

  const resumen = datos.resumen;
  const statusColor = resumen.cumplimientoGeneral >= 80 ? '#16a34a' : resumen.cumplimientoGeneral >= 60 ? '#f59e0b' : '#dc2626';
  const statusLabel = resumen.cumplimientoGeneral >= 80 ? 'EXCELENTE' : resumen.cumplimientoGeneral >= 60 ? 'EN DESARROLLO' : 'REQUIERE ATENCIÓN';

  // Status badge
  doc.rect(50, doc.y, 495, 25).fill('#f3f4f6').stroke('#d1d5db');
  doc.fontSize(11).font('Helvetica-Bold').fillColor(statusColor).text(statusLabel, 60, doc.y + 7);
  doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Cumplimiento General: ${resumen.cumplimientoGeneral}%`, 250, doc.y + 7);

  doc.moveDown(2);

  const texto = `En el período comprendido entre ${datos.fechaInicio} y ${datos.fechaFin}, se ha registrado un avance del ${resumen.cumplimientoGeneral}% en los procesos de contratación. De los ${resumen.totalVerificables} verificables programados, se han completado ${resumen.completados} (${Math.round((resumen.completados/resumen.totalVerificables)*100)}%). Se administra un presupuesto total de $${formatMonto(resumen.presupuestoTotal)}, con ${resumen.atrasadas} etapas aún pendientes de completar.`;

  doc.fontSize(10).font('Helvetica').fillColor('#000').text(texto, 50, doc.y, { align: 'justify', width: 495 });
  doc.moveDown(0.5);

  // KPIs principales en cajas
  const kpiBoxWidth = (495 - 10) / 4;
  const kpiY = doc.y;

  const kpis = [
    { label: 'Procesos', valor: resumen.totalProcesos, icon: '📋' },
    { label: 'Verificables', valor: resumen.totalVerificables, icon: '✓' },
    { label: 'Completados', valor: resumen.completados, icon: '✔️' },
    { label: 'Atrasadas', valor: resumen.atrasadas, icon: '⏱' }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 50 + idx * (kpiBoxWidth + 5);
    const isCritical = kpi.label === 'Atrasadas' && kpi.valor > 0;
    const bgColor = isCritical ? '#fee2e2' : '#eff6ff';
    const borderColor = isCritical ? '#fecaca' : '#bfdbfe';

    doc.rect(x, kpiY, kpiBoxWidth, 55).fill(bgColor).stroke(borderColor);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a5fad').text(String(kpi.valor), x + 5, kpiY + 8, { width: kpiBoxWidth - 10 });
    doc.fontSize(8).font('Helvetica').fillColor('#666').text(kpi.label, x + 5, kpiY + 35, { width: kpiBoxWidth - 10 });
  });

  doc.moveDown(4);

  // ── INDICADORES GENERALES ───────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('2. INDICADORES GENERALES DE DESEMPEÑO');
  doc.moveDown(0.3);

  const tablaIndicadores = [
    { label: 'Total Procesos', valor: resumen.totalProcesos, tipo: 'numero' },
    { label: 'Total Verificables Programados', valor: resumen.totalVerificables, tipo: 'numero' },
    { label: 'Verificables Completados', valor: resumen.completados, tipo: 'numero' },
    { label: 'Verificables en Proceso', valor: resumen.enProceso, tipo: 'numero' },
    { label: 'Verificables Pendientes', valor: resumen.pendientes, tipo: 'numero' },
    { label: 'Etapas Atrasadas (crítico)', valor: resumen.atrasadas, tipo: 'numero' },
    { label: 'Etapas que Vencen Hoy', valor: resumen.vencenHoy, tipo: 'numero' },
    { label: 'Tasa de Cumplimiento General', valor: `${resumen.cumplimientoGeneral}%`, tipo: 'porcentaje' },
    { label: 'Presupuesto Total Administrado', valor: `$${formatMonto(resumen.presupuestoTotal)}`, tipo: 'moneda' }
  ];

  let currentY = doc.y;
  const colWidth = 260;
  const rowHeight = 15;

  tablaIndicadores.forEach((item, idx) => {
    const isEven = idx % 2 === 0;
    const x = isEven ? 50 : 305;

    if (!isEven && idx > 0) {
      currentY += rowHeight + 2;
    }

    if (currentY > doc.page.height - 80) {
      doc.addPage();
      currentY = 50;
    }

    const isCritical = (item.label === 'Etapas Atrasadas (crítico)' && item.valor > 0);
    const bgColor = isCritical ? '#fee2e2' : '#f8fafc';

    doc.rect(x, currentY, colWidth, rowHeight).fill(bgColor).stroke('#e2e8f0');
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(item.label, x + 5, currentY + 3, { width: colWidth - 50 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a5fad').text(String(item.valor), x + colWidth - 35, currentY + 3, { align: 'right' });
  });

  doc.addPage();

  // ── ANÁLISIS POR DIRECCIÓN ──────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('3. ANÁLISIS POR DIRECCIÓN');
  doc.moveDown(0.5);

  const direcciones = datos.porDireccion || [];
  let dirY = doc.y;

  direcciones.forEach((dir, idx) => {
    if (dirY > doc.page.height - 160) {
      doc.addPage();
      dirY = 50;
    }

    // Encabezado dirección con badge
    doc.rect(50, dirY, 495, 24).fill('#ecfdf5').stroke('#bbf7d0');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#166534').text(dir.nombre, 60, dirY + 7, { width: 400 });
    dirY = doc.y + 8;

    // Contratos principales (top 3)
    const contratos = (dir.contratos || []).slice(0, 3);
    if (contratos.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Contratos con mayor monto:', 60, dirY);
      dirY = doc.y + 3;

      contratos.forEach((contrato, cidx) => {
        const medal = cidx === 0 ? '1️⃣' : cidx === 1 ? '2️⃣' : '3️⃣';
        const textoContrato = `${medal} ${contrato.nombre}`;
        doc.fontSize(8).font('Helvetica').text(textoContrato, 70, dirY);
        doc.fontSize(8).font('Helvetica').text(`   Monto: $${formatMonto(contrato.monto)} | Avance: ${contrato.avance}%`, 75, doc.y);
        dirY = doc.y + 3;
      });
    }

    // Tabla de estadísticas
    dirY += 2;
    doc.fontSize(8).font('Helvetica').fillColor('#000');
    const statsTable = [
      { label: 'Procesos', valor: dir.procesos },
      { label: 'Verificables', valor: dir.verificables },
      { label: 'Completados', valor: dir.completados },
      { label: 'Atrasadas', valor: dir.atrasadas },
      { label: 'Cumplimiento', valor: `${dir.cumplimiento}%` }
    ];

    let colX = 60;
    statsTable.forEach((stat, sidx) => {
      if (sidx > 0 && sidx % 2 === 0) {
        dirY += 16;
        colX = 60;
      } else if (sidx > 0) {
        colX = 275;
      }

      doc.rect(colX, dirY, 200, 14).stroke('#e2e8f0');
      doc.fontSize(8).font('Helvetica-Bold').text(stat.label, colX + 4, dirY + 3, { width: 90 });
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a5fad').text(String(stat.valor), colX + 100, dirY + 2);
      doc.fillColor('#000');
    });

    dirY += 20;
  });

  doc.addPage();

  // ── ETAPAS TARDÍAS ──────────────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('4. ETAPAS EN ATRASO - PUNTOS CRÍTICOS');
  doc.moveDown(0.5);

  const etapasTardias = datos.etapasTardias || [];
  let etapasY = doc.y;

  if (etapasTardias.length === 0) {
    doc.rect(50, etapasY, 495, 40).fill('#dcfce7');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#166534').text('✓ EXCELENTE - No hay etapas tardías registradas', 60, etapasY + 10, { width: 450 });
    doc.fontSize(9).font('Helvetica').fillColor('#166534').text('Todos los procesos están avanzando dentro de los plazos programados', 60, doc.y + 5, { width: 450 });
    etapasY = doc.y + 30;
  } else {
    etapasTardias.forEach((item, idx) => {
      if (etapasY > doc.page.height - 100) {
        doc.addPage();
        etapasY = 50;
      }

      const urgencia = item.diasAtraso > 30 ? '🔴 CRÍTICO' : item.diasAtraso > 15 ? '🟠 ALTO' : '🟡 MEDIO';
      const bgColor = item.diasAtraso > 30 ? '#fee2e2' : item.diasAtraso > 15 ? '#fef3c7' : '#fef08a';
      const borderColor = item.diasAtraso > 30 ? '#fecaca' : item.diasAtraso > 15 ? '#fcd34d' : '#fef3c7';

      doc.rect(50, etapasY, 495, 35).fill(bgColor).stroke(borderColor);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text(`${urgencia}  ${item.direccion}`, 60, etapasY + 5);
      doc.fontSize(8).font('Helvetica').fillColor('#374151').text(`Proceso: ${item.proceso}`, 60, doc.y + 2);
      doc.fontSize(8).font('Helvetica').fillColor('#374151').text(`Etapa: "${item.etapa}" | Atraso: ${item.diasAtraso} días`, 60, doc.y + 2);
      etapasY = doc.y + 8;
    });
  }

  doc.addPage();

  // ── RESUMEN DE ACTIVIDAD ────────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('5. RESUMEN DE ACTIVIDAD Y PARTICIPACIÓN');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#000').text('Direcciones con mayor actividad registrada:', 60);
  doc.moveDown(0.3);

  const activas = datos.activas || [];
  let activasY = doc.y;

  if (activas.length === 0) {
    doc.fontSize(9).fillColor('#999').text('No hay registros de actividad en el período seleccionado', 60);
  } else {
    activas.forEach((dir, idx) => {
      const icons = ['🥇', '🥈', '🥉', '⭐', '✓'];
      const icon = icons[idx] || '•';
      const totalActividad = dir.cambios + dir.comentarios;

      doc.rect(50, activasY - 5, 495, 25).fill(idx % 2 === 0 ? '#f8fafc' : '#fff').stroke('#e2e8f0');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(`${icon}  ${dir.nombre}`, 60, activasY);
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(`${dir.cambios} cambios • ${dir.comentarios} etapas | Total: ${totalActividad}`, 250, activasY);
      activasY = doc.y + 8;
    });
  }

  doc.moveDown(1);

  // Direcciones inactivas
  const inactivas = datos.inactivas || [];
  if (inactivas.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#b91c1c').text('⚠ Direcciones sin cambios registrados');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a');
    inactivas.forEach(dir => {
      doc.text(`• ${dir.nombre}`);
    });
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#7f1d1d').text('Nota: Se recomienda realizar seguimiento con estas direcciones para verificar el estado de sus procesos.', { align: 'justify' });
  }

  doc.addPage();

  // ── PIE DE PÁGINA EN TODAS LAS PÁGINAS ──────────────────────────────────
  const pages = doc.bufferedPageRange().count;
  for (let i = 1; i < pages; i++) { // Saltar portada (página 0)
    doc.switchToPage(i);

    // Línea divisoria
    doc.moveTo(50, doc.page.height - 40).lineTo(doc.page.width - 50, doc.page.height - 40).stroke('#d1d5db');

    // Información del pie
    doc.fontSize(8).fillColor('#9ca3af');
    doc.text(
      'Sistema de Seguimiento POA/PAC 2026 • QuitoTurismo',
      50,
      doc.page.height - 30,
      { align: 'left', width: 400 }
    );

    doc.fontSize(8).fillColor('#6b7280');
    doc.text(
      `Página ${i + 1} de ${pages}`,
      450,
      doc.page.height - 30,
      { align: 'right', width: 100 }
    );
  }

  doc.end();
}

function formatMonto(valor) {
  if (!valor) return '0.00';
  return Number(valor).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// POST /api/reportes/generar-informe-pdf
router.post('/generar-informe-pdf', async (req, res) => {
  try {
    const scope = getScopeFromReq(req);
    const { fechaInicio, fechaFin } = req.body || {};

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Se requieren fechaInicio y fechaFin' });
    }

    const subtareas = await mysql.getAllSubtareasByScope(scope);
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);

    // Parsear fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    // Obtener auditoría en el período para contar cambios
    const auditoria = await mysql.getEventosAuditoria({
      desde: inicio.toISOString().split('T')[0],
      hasta: fin.toISOString().split('T')[0],
      limit: 10000
    });

    const cambiosPorDireccion = {};
    (auditoria?.events || []).forEach(evt => {
      const dir = evt.direccionNombre || 'Sin dirección';
      if (!cambiosPorDireccion[dir]) cambiosPorDireccion[dir] = 0;
      cambiosPorDireccion[dir]++;
    });

    // Preparar datos del informe
    const datosPDF = {
      filename: `informe_${sanitizeFileName(new Date().toISOString().slice(0, 10))}.pdf`,
      fechaInicio: new Date(inicio).toLocaleDateString('es-EC'),
      fechaFin: new Date(fin).toLocaleDateString('es-EC'),
      resumen: reporte.kpis,
      porDireccion: reporte.resumenPorDireccion.map(dir => ({
        nombre: dir.direccionNombre,
        procesos: dir.totalProcesos,
        verificables: dir.totalVerificables,
        completados: dir.completados,
        atrasadas: dir.atrasadas,
        cumplimiento: dir.cumplimiento,
        contratos: reporte.procesos
          .filter(p => p.direccionNombre === dir.direccionNombre)
          .sort((a, b) => b.presupuesto - a.presupuesto)
          .slice(0, 3)
          .map(p => ({
            nombre: p.nombre,
            monto: p.presupuesto,
            avance: p.porcentajeAvance
          }))
      })),
      etapasTardias: reporte.etapas
        .filter(e => e.esAtrasada && e.diasAtraso > 0)
        .slice(0, 10)
        .map(e => ({
          direccion: e.direccionNombre,
          proceso: e.proceso,
          etapa: e.etapaNombre,
          diasAtraso: e.diasAtraso
        })),
      activas: reporte.resumenPorDireccion
        .map(dir => ({
          nombre: dir.direccionNombre,
          cambios: cambiosPorDireccion[dir.direccionNombre] || 0,
          comentarios: dir.totalVerificables
        }))
        .sort((a, b) => (b.cambios + b.comentarios) - (a.cambios + a.comentarios))
        .slice(0, 5),
      inactivas: reporte.resumenPorDireccion
        .filter(dir => (cambiosPorDireccion[dir.direccionNombre] || 0) === 0 && dir.totalProcesos === 0)
        .map(dir => ({ nombre: dir.direccionNombre }))
    };

    generarInformePDF(res, datosPDF);
  } catch (error) {
    console.error('Error en POST /api/reportes/generar-informe-pdf:', error);
    if (!res.headersSent) {
      const statusCode = error?.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Error al generar informe PDF' });
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// INFORME 2: DETALLE DE CAMBIOS Y ACTIVIDAD POR DIRECCIÓN
// ──────────────────────────────────────────────────────────────────────────────

async function generarInformeDetallePDF(res, datos) {
  let browser;
  try {
    const html = generarHTMLInformeDetalle(datos);

    // Lanzar navegador
    browser = await lanzarNavegador();
    const page = await browser.newPage();

    // Configurar viewport
    await page.setViewport({ width: 1200, height: 1200 });

    // Cargar HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: false,
      printBackground: true
    });

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${datos.filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error en generarInformeDetallePDF:', error);
    if (!res.headersSent) {
      const statusCode = error?.statusCode || 500;
      res.status(statusCode).json({ error: 'Error al generar PDF: ' + error.message });
    }
  } finally {
    // Cerrar navegador
    if (browser) {
      await browser.close();
    }
  }
}

// POST /api/reportes/generar-informe-detalle-pdf
router.post('/generar-informe-detalle-pdf', async (req, res) => {
  try {
    const scope = getScopeFromReq(req);
    const { fechaInicio, fechaFin } = req.body || {};

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Se requieren fechaInicio y fechaFin' });
    }

    const subtareas = await mysql.getAllSubtareasByScope(scope);
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);

    // Parsear fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    // Obtener auditoría en el período
    const auditoria = await mysql.getEventosAuditoria({
      desde: inicio.toISOString().split('T')[0],
      hasta: fin.toISOString().split('T')[0],
      limit: 10000
    });

    // Obtener comentarios de seguimientos_diarios en el período
    const comentariosPeriodo = await mysql.query(`
      SELECT sd.subtarea_id, sd.etapa_id, sd.fecha, sd.comentario, sd.responsable
      FROM seguimientos_diarios sd
      WHERE sd.fecha >= ? AND sd.fecha <= ?
      ORDER BY sd.fecha DESC
    `, [
      inicio.toISOString().split('T')[0],
      fin.toISOString().split('T')[0]
    ]);

    // Procesar datos por dirección
    const porDireccion = {};
    let totalCambios = 0;
    let totalComentarios = 0;
    let ultimaActualizacion = null;

    // Agrupar procesos por dirección
    reporte.procesos.forEach(proc => {
      const dir = proc.direccionNombre || 'Sin dirección';
      if (!porDireccion[dir]) {
        porDireccion[dir] = {
          nombre: dir,
          procesos: [],
          totalCambios: 0,
          totalComentarios: 0,
          ultimaActualizacion: null
        };
      }

      const procData = {
        codigo: proc.codigoOlympo,
        nombre: proc.nombre,
        monto: proc.presupuesto,
        etapas: [] // Tabla unificada de etapas con estado y comentarios
      };

      // Obtener etapas de este proceso
      const etapasDelProceso = reporte.etapas.filter(e =>
        e.codigoOlympo === proc.codigoOlympo && e.proceso === proc.nombre
      );

      // Crear mapa de etapas con sus comentarios
      const etapasConInfo = {};

      // Procesar cada etapa base
      etapasDelProceso.forEach(etapa => {
        const fechaReal = etapa.fechaReal ? parseDateOnly(etapa.fechaReal) : null;
        const fechaPlanificada = etapa.fechaPlanificada ? parseDateOnly(etapa.fechaPlanificada) : null;
        const fechaEtapa = fechaReal || fechaPlanificada;
        const estaDentroDelPeriodo = fechaEtapa && fechaEtapa >= inicio && fechaEtapa <= fin;

        if (!etapasConInfo[etapa.etapaNombre]) {
          etapasConInfo[etapa.etapaNombre] = {
            nombre: etapa.etapaNombre,
            estado: etapa.estado,
            comentarios: [],
            tieneModificacion: false
          };
        }

        // Si la etapa cambió de estado en el período
        if (etapa.estado !== 'pendiente' && estaDentroDelPeriodo) {
          etapasConInfo[etapa.etapaNombre].tieneModificacion = true;
          totalCambios++;
          porDireccion[dir].totalCambios++;
        }

        // Agregar observaciones de la etapa si las hay
        if (etapa.observaciones && etapa.observaciones.trim() && estaDentroDelPeriodo) {
          etapasConInfo[etapa.etapaNombre].comentarios.push({
            texto: etapa.observaciones,
            fecha: fechaReal
              ? new Date(fechaReal).toLocaleString('es-EC')
              : (fechaPlanificada ? new Date(fechaPlanificada).toLocaleString('es-EC') : new Date().toLocaleString('es-EC')),
            usuario: etapa.responsableNombre || 'Sistema'
          });
          totalComentarios++;
          porDireccion[dir].totalComentarios++;
          etapasConInfo[etapa.etapaNombre].tieneModificacion = true;
        }
      });

      // Agregar comentarios de seguimientos_diarios
      if (comentariosPeriodo && comentariosPeriodo.length > 0) {
        comentariosPeriodo.forEach(comentario => {
          const etapaDelComentario = etapasDelProceso.find(
            e => e.subtareaId === comentario.subtarea_id && e.etapaId === comentario.etapa_id
          );
          if (etapaDelComentario) {
            if (!etapasConInfo[etapaDelComentario.etapaNombre]) {
              etapasConInfo[etapaDelComentario.etapaNombre] = {
                nombre: etapaDelComentario.etapaNombre,
                estado: etapaDelComentario.estado,
                comentarios: [],
                tieneModificacion: false
              };
            }

            etapasConInfo[etapaDelComentario.etapaNombre].comentarios.push({
              texto: comentario.comentario,
              fecha: new Date(comentario.fecha).toLocaleString('es-EC'),
              usuario: comentario.responsable || 'Sistema'
            });

            totalComentarios++;
            porDireccion[dir].totalComentarios++;
            etapasConInfo[etapaDelComentario.etapaNombre].tieneModificacion = true;
          }
        });
      }

      // Convertir mapa a array y agregar al proceso si tiene modificaciones
      procData.etapas = Object.values(etapasConInfo).filter(e => e.tieneModificacion);

      if (procData.etapas.length > 0) {
        porDireccion[dir].procesos.push(procData);
      }
    });

    // Obtener última actualización y ordenar dirección
    const direccionArray = Object.values(porDireccion).map(dir => {
      if (dir.procesos.length > 0) {
        const ultimaFecha = Math.max(...dir.procesos.flatMap(p =>
          [...(p.cambios || []), ...(p.comentarios || [])].map(c =>
            new Date(c.fecha).getTime()
          )
        ));
        dir.ultimaActualizacion = new Date(ultimaFecha).toLocaleDateString('es-EC');
      }
      return dir;
    });

    // Encontrar la última actualización global
    const todasLasFechas = direccionArray.flatMap(dir =>
      dir.procesos.flatMap(p =>
        [...(p.cambios || []), ...(p.comentarios || [])].map(c => new Date(c.fecha).getTime())
      )
    );
    if (todasLasFechas.length > 0) {
      ultimaActualizacion = new Date(Math.max(...todasLasFechas)).toLocaleDateString('es-EC');
    }

    // Últimos ingresos por dirección (ordenados)
    const ultimosIngresos = direccionArray
      .filter(d => d.ultimaActualizacion)
      .sort((a, b) => new Date(b.ultimaActualizacion) - new Date(a.ultimaActualizacion))
      .map(d => ({
        direccion: d.nombre,
        ultimaActualizacion: d.ultimaActualizacion,
        cambios: d.totalCambios
      }));

    const datosPDF = {
      filename: `informe_detalle_${sanitizeFileName(new Date().toISOString().slice(0, 10))}.pdf`,
      fechaInicio: new Date(inicio).toLocaleDateString('es-EC'),
      fechaFin: new Date(fin).toLocaleDateString('es-EC'),
      totalDirecciones: direccionArray.length,
      totalProcesosConCambios: direccionArray.reduce((sum, d) => sum + d.procesos.length, 0),
      ultimaActualizacion: ultimaActualizacion || 'N/A',
      resumen: {
        totalCambios,
        totalComentarios
      },
      ultimosIngresos,
      porDireccion: direccionArray
    };

    await generarInformeDetallePDF(res, datosPDF);
  } catch (error) {
    console.error('Error en POST /api/reportes/generar-informe-detalle-pdf:', error);
    if (!res.headersSent) {
      const statusCode = error?.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Error al generar informe de detalle' });
    }
  }
});

// POST /api/reportes/generar-informe-ultimos-comentarios
router.post('/generar-informe-ultimos-comentarios', async (req, res) => {
  let browser;
  try {
    const scope = getScopeFromReq(req);
    const { fechaInicio, fechaFin } = req.body || {};

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Se requieren fechaInicio y fechaFin' });
    }

    const subtareas = await mysql.getAllSubtareasByScope(scope);
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);

    // Parsear fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    // Obtener todos los comentarios del período
    const comentariosPeriodo = await mysql.query(`
      SELECT sd.subtarea_id, sd.etapa_id, sd.fecha, sd.comentario, sd.responsable
      FROM seguimientos_diarios sd
      WHERE sd.fecha >= ? AND sd.fecha <= ?
      ORDER BY sd.subtarea_id, sd.fecha DESC
    `, [
      inicio.toISOString().split('T')[0],
      fin.toISOString().split('T')[0]
    ]);

    // Procesar datos por dirección - obtener ÚLTIMO comentario por proceso
    const porDireccion = {};

    reporte.procesos.forEach(proc => {
      const dir = proc.direccionNombre || 'Sin dirección';
      if (!porDireccion[dir]) {
        porDireccion[dir] = {
          nombre: dir,
          procesos: []
        };
      }

      // Obtener etapas de este proceso
      const etapasDelProceso = reporte.etapas.filter(e =>
        e.codigoOlympo === proc.codigoOlympo && e.proceso === proc.nombre
      );

      // Buscar el ÚLTIMO comentario de este proceso
      const comentariosDelProceso = comentariosPeriodo.filter(com =>
        etapasDelProceso.some(e => e.subtareaId === com.subtarea_id && e.etapaId === com.etapa_id)
      );

      if (comentariosDelProceso.length > 0) {
        // Tomar el más reciente (está ordenado DESC por fecha)
        const ultimoComentario = comentariosDelProceso[0];

        porDireccion[dir].procesos.push({
          codigo: proc.codigoOlympo,
          nombre: proc.nombre,
          monto: proc.presupuesto,
          ultimoComentario: {
            texto: ultimoComentario.comentario,
            fecha: new Date(ultimoComentario.fecha).toLocaleDateString('es-EC'),
            usuario: ultimoComentario.responsable || 'Sistema'
          }
        });
      }
    });

    const datosPDF = {
      filename: `informe_ultimos_comentarios_${sanitizeFileName(new Date().toISOString().slice(0, 10))}.pdf`,
      fechaInicio: new Date(inicio).toLocaleDateString('es-EC'),
      fechaFin: new Date(fin).toLocaleDateString('es-EC'),
      porDireccion: Object.values(porDireccion).filter(d => d.procesos.length > 0)
    };

    browser = await lanzarNavegador();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1200 });

    const html = generarHTMLUltimosComentarios(datosPDF);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: false,
      printBackground: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${datosPDF.filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error en POST /api/reportes/generar-informe-ultimos-comentarios:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Error al generar informe de comentarios' });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// POST /api/reportes/generar-informe-ultimos-comentarios-todos
// Genera informe de últimos comentarios de TODOS los procesos sin filtro de fechas
router.post('/generar-informe-ultimos-comentarios-todos', async (req, res) => {
  let browser;
  try {
    const scope = getScopeFromReq(req);
    const subtareas = await mysql.getAllSubtareasByScope(scope);
    const filtros = getFiltros(req.query);
    const reporte = construirReporte(subtareas, filtros);

    // Obtener TODOS los comentarios de todas las fechas
    const todosLosComentarios = await mysql.query(`
      SELECT sd.subtarea_id, sd.etapa_id, sd.fecha, sd.comentario, sd.responsable
      FROM seguimientos_diarios sd
      ORDER BY sd.subtarea_id, sd.fecha DESC
    `);

    // Procesar datos por dirección - obtener ÚLTIMO comentario por proceso
    const porDireccion = {};

    reporte.procesos.forEach(proc => {
      const dir = proc.direccionNombre || 'Sin dirección';
      if (!porDireccion[dir]) {
        porDireccion[dir] = {
          nombre: dir,
          procesos: []
        };
      }

      // Obtener etapas de este proceso
      const etapasDelProceso = reporte.etapas.filter(e =>
        e.codigoOlympo === proc.codigoOlympo && e.proceso === proc.nombre
      );

      // Buscar el ÚLTIMO comentario de este proceso (de TODOS los comentarios)
      const comentariosDelProceso = todosLosComentarios.filter(com =>
        etapasDelProceso.some(e => e.subtareaId === com.subtarea_id && e.etapaId === com.etapa_id)
      );

      // Obtener cuatrimestre
      const subtarea = subtareas.find(s => s.codigoOlympo === proc.codigoOlympo);
      const cuatrimestre = subtarea?.cuatrimestre || 'No definido';

      // Obtener última etapa registrada (más reciente por fecha)
      let ultimaEtapaInfo = {
        nombre: 'No definida',
        fecha: 'No definida',
        diasTarde: 0
      };

      if (etapasDelProceso.length > 0) {
        // Encontrar etapa con la fecha planificada más reciente
        let ultimaEtapa = null;
        let maxFecha = null;

        for (const etapa of etapasDelProceso) {
          const fechaStr = etapa.fechaPlanificada;
          if (fechaStr) {
            const fecha = new Date(fechaStr);
            if (!maxFecha || fecha > maxFecha) {
              maxFecha = fecha;
              ultimaEtapa = etapa;
            }
          }
        }

        // Si ninguna etapa tiene fecha planificada, tomar la que tenga mayor orden
        if (!ultimaEtapa && etapasDelProceso.length > 0) {
          ultimaEtapa = etapasDelProceso.reduce((max, current) =>
            (Number(current.orden || 0) > Number(max.orden || 0)) ? current : max
          );
        }

        try {
          if (ultimaEtapa) {
            ultimaEtapaInfo.nombre = ultimaEtapa.etapaNombre || 'Sin nombre';
            const fechaStr = ultimaEtapa.fechaPlanificada;
            if (fechaStr) {
              // Usar la fecha directamente sin conversión de zona horaria
              // Si es formato YYYY-MM-DD, convertir a DD/MM/YYYY
              if (fechaStr && fechaStr.length === 10 && fechaStr[4] === '-') {
                const [year, month, day] = fechaStr.split('-');
                ultimaEtapaInfo.fecha = `${day}/${month}/${year}`;
              } else {
                ultimaEtapaInfo.fecha = new Date(fechaStr).toLocaleDateString('es-EC');
              }
            }
            ultimaEtapaInfo.diasTarde = Number(ultimaEtapa.diasAtraso) || 0;
          }
        } catch (e) {
          // Si hay error, dejar valores por defecto
        }
      }

      // Calcular etapa pendiente más atrasada (excluyendo "REGISTRO DE INFORMACIÓN ERP")
      let etapaPendienteMasAtrasada = null;
      let maxDiasTarde = 0;

      etapasDelProceso.forEach(etapa => {
        const nombreEtapa = etapa.etapaNombre || '';
        const diasTarde = Number(etapa.diasAtraso) || 0;
        const nombreMayuscula = nombreEtapa.toUpperCase();

        if (etapa.estado === 'pendiente' &&
            !nombreMayuscula.includes('CARGA EN EL ERP DE RESOLUCION DE INICIO') &&
            !nombreMayuscula.includes('REGISTRO DE INFORMACIÓN ERP') &&
            diasTarde > maxDiasTarde) {
          maxDiasTarde = diasTarde;
          etapaPendienteMasAtrasada = {
            nombre: nombreEtapa,
            diasTarde: diasTarde
          };
        }
      });

      // Incluir procesos con comentarios O sin comentarios pero sin días tarde
      if (comentariosDelProceso.length > 0 || !etapaPendienteMasAtrasada) {
        const ultimoComentario = comentariosDelProceso.length > 0 ? {
          texto: comentariosDelProceso[0].comentario,
          fecha: new Date(comentariosDelProceso[0].fecha).toLocaleDateString('es-EC'),
          usuario: comentariosDelProceso[0].responsable || 'Sistema'
        } : null;

        porDireccion[dir].procesos.push({
          codigo: proc.codigoOlympo,
          nombre: proc.nombre,
          monto: proc.presupuesto,
          tipoPlan: proc.tipoPlan || 'No definido',
          cuatrimestre: cuatrimestre,
          ultimaEtapa: {
            nombre: ultimaEtapaInfo.nombre,
            fecha: ultimaEtapaInfo.fecha,
            diasTarde: ultimaEtapaInfo.diasTarde
          },
          ultimoComentario: ultimoComentario,
          etapaPendienteMasAtrasada: etapaPendienteMasAtrasada
        });
      }
    });

    const ahora = new Date();
    const datosPDF = {
      filename: `informe_ultimos_comentarios_completo_${sanitizeFileName(ahora.toISOString().slice(0, 10))}.pdf`,
      fechaInicio: 'Histórico completo',
      fechaFin: ahora.toLocaleDateString('es-EC'),
      porDireccion: Object.values(porDireccion).filter(d => d.procesos.length > 0)
    };

    browser = await lanzarNavegador();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1200 });

    const html = generarHTMLUltimosComentarios(datosPDF);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      displayHeaderFooter: false,
      printBackground: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${datosPDF.filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error en POST /api/reportes/generar-informe-ultimos-comentarios-todos:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Error al generar informe de comentarios' });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// ── MATRIZ DE ETAPAS POR DÍAS DE RETRASO ──────────────────────────────────────

async function construirMatrizEtapas(procesos) {
  // Obtener todas las etapas del catálogo ordenadas por fase
  const todasLasEtapas = await mysql.getEtapasCatalogo();
  const ordenFases = ['preparatoria', 'precontractual', 'contractual', 'sin_clasificar'];

  // Agrupar etapas por clasificación (fase)
  const etapasPorFase = {};
  ordenFases.forEach(fase => {
    etapasPorFase[fase] = todasLasEtapas.filter(e => e.clasificacion === fase);
  });

  // Crear mapa de etapas por ID para búsqueda rápida
  const mapEtapasDelProceso = new Map();
  procesos.forEach(proceso => {
    const clave = `${proceso.codigoOlympo}::${proceso.nombre}`;
    const etapasDetalle = proceso.etapasDetalle || [];
    mapEtapasDelProceso.set(clave, new Map(
      etapasDetalle.map(e => [e.etapaId, e])
    ));
  });

  // Construir datos para cada bloque
  const procesosConDatos = procesos.map(proceso => {
    const clave = `${proceso.codigoOlympo}::${proceso.nombre}`;
    const etapasDelProceso = mapEtapasDelProceso.get(clave) || new Map();

    const datosBloque = {
      codigoOlympo: proceso.codigoOlympo,
      nombreProceso: proceso.nombre,
      direccion: proceso.direccionNombre || '',
      responsable: proceso.responsableNombre || '',
      tipoPlan: proceso.tipoPlan || '',
      estadoGeneral: proceso.estadoGeneralLabel || '',
      avance: `${proceso.porcentajeAvance}%`,
      etapasEtapasTarde: {},
      etapasDiasTarde: {},
      etapasProximosAVencer: {}
    };

    // Procesar cada etapa del catálogo
    todasLasEtapas.forEach(etapaCatalogo => {
      const etapaDelProceso = etapasDelProceso.get(etapaCatalogo.id);
      const etapaId = etapaCatalogo.id;

      if (!etapaDelProceso) {
        // Etapa no asignada
        datosBloque.etapasEtapasTarde[etapaId] = 'N/A';
        datosBloque.etapasDiasTarde[etapaId] = 'N/A';
        datosBloque.etapasProximosAVencer[etapaId] = 'N/A';
      } else {
        // Etapa está en el proceso
        const estado = normalizarEstado(etapaDelProceso.estado);
        const esPendiente = estado === 'pendiente';
        const diasAtraso = Number(etapaDelProceso.diasAtraso) || 0;

        // Bloque: Etapas Tarde (1 = tarde, 0 = a tiempo, N/A = no asignada)
        if (esPendiente && diasAtraso > 0) {
          datosBloque.etapasEtapasTarde[etapaId] = 1;
        } else if (esPendiente) {
          datosBloque.etapasEtapasTarde[etapaId] = 0;
        } else {
          datosBloque.etapasEtapasTarde[etapaId] = 0;
        }

        // Bloque: Días Tarde (solo número si está tarde, N/A si no)
        if (esPendiente && diasAtraso > 0) {
          datosBloque.etapasDiasTarde[etapaId] = diasAtraso;
        } else {
          datosBloque.etapasDiasTarde[etapaId] = 'N/A';
        }

        // Bloque: Próximos a Vencer (solo si está entre 1-5 días antes de vencer y pendiente)
        if (esPendiente && diasAtraso < 0 && diasAtraso >= -5) {
          // diasAtraso es negativo: -1 a -5 significa 1 a 5 días para vencer
          datosBloque.etapasProximosAVencer[etapaId] = Math.abs(diasAtraso);
        } else {
          datosBloque.etapasProximosAVencer[etapaId] = 'N/A';
        }
      }
    });

    return datosBloque;
  });

  return {
    etapasPorFase,
    todasLasEtapas,
    procesosConDatos,
    ordenFases
  };
}

// Agregar nueva hoja de matriz de etapas al workbook (una sola hoja, etapas en filas, procesos en columnas)
async function agregarHojaMatrizEtapas(wb, procesos, bloquesMatriz = {}) {
  try {
    const { todasLasEtapas, procesosConDatos } = await construirMatrizEtapas(procesos);

    const ws = wb.addWorksheet('Etapas por retraso');

    // Extraer qué bloques incluir (todos por defecto si no se especifica)
    const incluirInfoGeneral = bloquesMatriz.informacionGeneral !== false;
    const incluirEtapasTarde = bloquesMatriz.etapasTarde !== false;
    const incluirDiasTarde = bloquesMatriz.diasTarde !== false;

    const COLOR_TITULO_BLOQUE = '1E40AF'; // azul oscuro
    const COLOR_HEADER_PROCESO = '0F2F55'; // azul más oscuro
    const COLOR_HEADER_ETAPA = '1E3A8A'; // azul medio

    let filaActual = 1;

    // ════════════════════════════════════════════════════════════════════════════
    // BLOQUE 1: INFORMACIÓN GENERAL
    // ════════════════════════════════════════════════════════════════════════════
    if (incluirInfoGeneral) {
      // Título del bloque
      const titleRow = ws.getRow(filaActual);
      titleRow.getCell(1).value = '📋 INFORMACIÓN GENERAL';
      titleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITULO_BLOQUE } };
      titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      titleRow.height = 20;
      filaActual++;

      // Encabezados
      const headerRow = ws.getRow(filaActual);
      const headers = ['Código Olimpo', 'Nombre Proceso', 'Dirección', 'Responsable', 'Tipo Plan', 'Estado', 'Avance'];
      headers.forEach((header, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_PROCESO } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      headerRow.height = 18;
      filaActual++;

      // Datos
      procesosConDatos.forEach((proceso, idx) => {
        const dataRow = ws.getRow(filaActual);
        dataRow.getCell(1).value = proceso.codigoOlympo;
        dataRow.getCell(2).value = proceso.nombreProceso;
        dataRow.getCell(3).value = proceso.direccion;
        dataRow.getCell(4).value = proceso.responsable;
        dataRow.getCell(5).value = proceso.tipoPlan;
        dataRow.getCell(6).value = proceso.estadoGeneral;
        dataRow.getCell(7).value = proceso.avance;

        // Estilos
        if (idx % 2 === 1) {
          dataRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          });
        }
        dataRow.height = 16;
        filaActual++;
      });

      filaActual++; // Espacio
    }

    // Función auxiliar para crear bloque de etapas
    const crearBloqueEtapas = (nombreBloque, tipoBloque) => {
      const titleRow = ws.getRow(filaActual);
      titleRow.getCell(1).value = nombreBloque;
      titleRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFF' } };
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITULO_BLOQUE } };
      titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      titleRow.height = 20;
      filaActual++;

      // Encabezado: Etapa + Procesos (Código)
      const headerRow = ws.getRow(filaActual);
      const headerCell = headerRow.getCell(1);
      headerCell.value = 'Verificable';
      headerCell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_ETAPA } };
      headerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      procesosConDatos.forEach((proceso, procIdx) => {
        const cell = headerRow.getCell(procIdx + 2);
        cell.value = proceso.codigoOlympo;
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_PROCESO } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      headerRow.height = 20;
      filaActual++;

      // Datos: una fila por cada etapa
      todasLasEtapas.forEach((etapa, etapaIdx) => {
        const dataRow = ws.getRow(filaActual);

        // Primera columna: nombre de la etapa
        const nameCell = dataRow.getCell(1);
        nameCell.value = etapa.nombre;
        nameCell.font = { bold: true, size: 9, color: { argb: '1E40AF' } };
        nameCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4FF' } };

        // Datos de cada proceso
        procesosConDatos.forEach((proceso, procIdx) => {
          const cell = dataRow.getCell(procIdx + 2);
          let valor = '';

          if (tipoBloque === 'tarde') {
            valor = proceso.etapasEtapasTarde[etapa.id];
          } else if (tipoBloque === 'dias') {
            valor = proceso.etapasDiasTarde[etapa.id];
          } else if (tipoBloque === 'vencer') {
            valor = proceso.etapasProximosAVencer[etapa.id];
          }

          cell.value = valor;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };

          // Estilos según tipo de valor
          if (valor === 1) {
            // Tarde (rojo)
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5' } };
            cell.font = { bold: true, color: { argb: 'D32F2F' } };
          } else if (valor === 0) {
            // A tiempo (verde)
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E9' } };
            cell.font = { bold: true, color: { argb: '2E7D32' } };
          } else if (typeof valor === 'number' && valor > 0) {
            // Números (amarillo/naranja)
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
            cell.font = { bold: true, color: { argb: 'E65100' } };
          } else {
            // N/A (gris)
            cell.font = { color: { argb: '9CA3AF' } };
          }
        });

        dataRow.height = 18;
        filaActual++;
      });

      filaActual++; // Espacio entre bloques
    };

    // ════════════════════════════════════════════════════════════════════════════
    // BLOQUE 2: ETAPAS TARDE
    // ════════════════════════════════════════════════════════════════════════════
    if (incluirEtapasTarde) {
      crearBloqueEtapas('⚠️ ETAPAS TARDE (1=Tarde, 0=A Tiempo, N/A=No Asignada)', 'tarde');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // BLOQUE 3: DÍAS DE RETRASO
    // ════════════════════════════════════════════════════════════════════════════
    if (incluirDiasTarde) {
      crearBloqueEtapas('📅 DÍAS DE RETRASO', 'dias');
    }

    // Ajustar ancho de columnas
    ws.getColumn(1).width = 28; // Nombre de etapa/Verificable

    for (let i = 0; i < procesosConDatos.length; i++) {
      ws.getColumn(i + 2).width = 14; // Código de cada proceso
    }

  } catch (error) {
    console.error('Error al construir matriz de etapas:', error);
  }
}

export default router;

