
import express from 'express';
import XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import * as mysql from '../data/mysql.js';
import { getScopeFromReq, normalizeText, parseDateOnly, obtenerEstadoProceso, obtenerPresupuestoProceso, procesoCuentaEnReporte } from '../utils/helpers.js';

const router = express.Router();

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
    const { areas = 'ALL', campos = [], incluirVerificables = false } = req.body || {};

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
  doc.fontSize(28).font('Helvetica-Bold').text('INFORME DE ACTIVIDADES', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica').text('Seguimiento de Contrataciones', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(11).text(`Período: ${datos.fechaInicio} al ${datos.fechaFin}`, { align: 'center' });
  doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-EC')}`, { align: 'center' });
  doc.moveDown(2);

  // Logo/branding area
  doc.fontSize(9).fillColor('#666666').text('QuitoTurismo - Sistema de Seguimiento POA/PAC 2026', { align: 'center' });

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
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#000');

  const resumen = datos.resumen;
  const texto = `En el período comprendido entre ${datos.fechaInicio} y ${datos.fechaFin}, se ha registrado un avance general del ${resumen.cumplimientoGeneral}% en los procesos de contratación supervisados. Se han completado ${resumen.completados} de ${resumen.totalVerificables} verificables programados. El presupuesto total administrado alcanza $${formatMonto(resumen.presupuestoTotal)}.`;

  doc.text(texto, { align: 'justify', width: 495 });
  doc.moveDown(0.5);

  // KPIs principales
  const kpiBoxWidth = (495 - 10) / 3;
  const kpiY = doc.y;

  const kpis = [
    { label: 'Procesos', valor: resumen.totalProcesos },
    { label: 'Cumplimiento', valor: `${resumen.cumplimientoGeneral}%` },
    { label: 'Atrasadas', valor: resumen.atrasadas }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 50 + idx * (kpiBoxWidth + 5);
    doc.rect(x, kpiY, kpiBoxWidth, 60).stroke('#e2e8f0');
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a5fad').text(String(kpi.valor), x + 5, kpiY + 15, { width: kpiBoxWidth - 10 });
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(kpi.label, x + 5, kpiY + 40, { width: kpiBoxWidth - 10 });
  });

  doc.moveDown(4);

  // ── INDICADORES GENERALES ───────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('2. INDICADORES GENERALES');
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#000');

  const tablaIndicadores = [
    { label: 'Total Procesos', valor: resumen.totalProcesos },
    { label: 'Total Verificables', valor: resumen.totalVerificables },
    { label: 'Completados', valor: resumen.completados },
    { label: 'En Proceso', valor: resumen.enProceso },
    { label: 'Pendientes', valor: resumen.pendientes },
    { label: 'Etapas Atrasadas', valor: resumen.atrasadas },
    { label: 'Cumplimiento %', valor: `${resumen.cumplimientoGeneral}%` },
    { label: 'Presupuesto Total', valor: `$${formatMonto(resumen.presupuestoTotal)}` }
  ];

  let currentY = doc.y;
  tablaIndicadores.forEach((item, idx) => {
    if (currentY > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
    }
    doc.fontSize(9).text(`${item.label}: `, 50, currentY, { width: 200, continued: true }).font('Helvetica-Bold').text(String(item.valor));
    currentY = doc.y + 5;
  });

  doc.addPage();

  // ── ANÁLISIS POR DIRECCIÓN ──────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('3. ANÁLISIS POR DIRECCIÓN');
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor('#000');

  const direcciones = datos.porDireccion || [];
  let dirY = doc.y;

  direcciones.forEach((dir, idx) => {
    if (dirY > doc.page.height - 150) {
      doc.addPage();
      dirY = 50;
    }

    // Encabezado dirección
    doc.rect(50, dirY, 495, 20).fill('#ecfdf5');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#166534').text(dir.nombre, 60, dirY + 5, { width: 400 });
    dirY = doc.y + 5;

    // Contratos principales de esta dirección (top 3)
    const contratos = (dir.contratos || []).slice(0, 3);
    if (contratos.length > 0) {
      doc.fontSize(8).font('Helvetica').fillColor('#000').text('Contratos principales:', 60, dirY);
      dirY = doc.y + 3;

      contratos.forEach(contrato => {
        const textoContrato = `• ${contrato.nombre} - Monto: $${formatMonto(contrato.monto)} (${contrato.avance}% completado)`;
        doc.text(textoContrato, 70, dirY, { width: 450 });
        dirY = doc.y + 3;
      });
    }

    // Estadísticas
    dirY += 5;
    const statsText = `Procesos: ${dir.procesos} | Verificables: ${dir.verificables} | Completados: ${dir.completados} | Atrasadas: ${dir.atrasadas} | Cumplimiento: ${dir.cumplimiento}%`;
    doc.fontSize(8).text(statsText, 60, dirY, { width: 450 });
    dirY = doc.y + 10;
  });

  doc.addPage();

  // ── ETAPAS TARDÍAS ──────────────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('4. ETAPAS TARDÍAS POR DIRECCIÓN');
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor('#000');

  const etapasTardias = datos.etapasTardias || [];
  let etapasY = doc.y;

  if (etapasTardias.length === 0) {
    doc.text('No hay etapas tardías registradas en el período.', 60, etapasY, { fill: '#059669' });
  } else {
    etapasTardias.forEach(item => {
      if (etapasY > doc.page.height - 80) {
        doc.addPage();
        etapasY = 50;
      }
      const textoEtapa = `${item.direccion} - ${item.proceso}: "${item.etapa}" (${item.diasAtraso} días de atraso)`;
      doc.text(textoEtapa, 60, etapasY, { width: 450 });
      etapasY = doc.y + 3;
    });
  }

  doc.addPage();

  // ── DIRECCIONES MÁS ACTIVAS ─────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5fad').text('5. DIRECCIONES MÁS ACTIVAS');
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica').fillColor('#000');

  const activas = datos.activas || [];
  let activasY = doc.y;

  activas.forEach((dir, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
    doc.text(`${medal} ${dir.nombre} - ${dir.cambios} cambios | ${dir.comentarios} comentarios`, 60, activasY);
    activasY = doc.y + 4;
  });

  doc.moveDown(1);

  // Direcciones inactivas
  const inactivas = datos.inactivas || [];
  if (inactivas.length > 0) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626').text('Direcciones sin cambios registrados:');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor('#000');
    inactivas.forEach(dir => {
      doc.text(`• ${dir.nombre}`);
    });
  }

  doc.addPage();

  // ── PIE DE PÁGINA EN TODAS LAS PÁGINAS ──────────────────────────────────
  const pages = doc.bufferedPageRange().count;
  for (let i = 0; i < pages; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#999999').text(
      `Página ${i + 1} de ${pages}`,
      50,
      doc.page.height - 30,
      { align: 'center' }
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
      res.status(500).json({ error: error.message || 'Error al generar informe PDF' });
    }
  }
});

export default router;

