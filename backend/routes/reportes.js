import express from 'express';
import XLSX from 'xlsx';
import * as mysql from '../data/mysql.js';

const router = express.Router();

function getScopeFromReq(req) {
  return {
    role: req.user?.role,
    direccionNombre: req.user?.direccionNombre || null
  };
}

function normalizarTexto(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
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

function obtenerEstadoProcesoReporte(subtarea) {
  const valor = subtarea?.activo;
  if (valor === undefined || valor === null || valor === '') return 1;
  if (typeof valor === 'number') {
    if (valor === 2) return 2;
    return valor === 0 ? 0 : 1;
  }
  if (typeof valor === 'boolean') return valor ? 1 : 0;

  const normalizado = String(valor).trim().toLowerCase();
  if (['2', 'desierto'].includes(normalizado)) return 2;
  if (['0', 'false', 'inactivo'].includes(normalizado)) return 0;
  return 1;
}

function obtenerPresupuestoReporte(subtarea) {
  const valor = Number(subtarea?.presupuesto || subtarea?.presupuesto2026Inicial || 0);
  return Number.isFinite(valor) ? valor : 0;
}

function procesoCuentaEnReporte(subtarea) {
  const estado = obtenerEstadoProcesoReporte(subtarea);
  if (estado === 0) return false;
  if (estado === 1 && obtenerPresupuestoReporte(subtarea) <= 0) return false;
  return true;
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
    presupuesto: obtenerPresupuestoReporte(subtarea),
    costoReforma2: Number(subtarea?.costoReforma2 || subtarea?.costo2026 || 0),
    activo: obtenerEstadoProcesoReporte(subtarea) !== 0,
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
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 50 }
  ];
  agregarAutofiltro(wsEtapas, 0, reporte.etapas.length, 13);
  XLSX.utils.book_append_sheet(wb, wsEtapas, 'Verificables');

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

export default router;
