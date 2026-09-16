import { getAllSubtareas, initMySQL, query } from '../data/mysql.js';
import { enviarCorreo } from '../services/notificaciones.js';
import { getConfiguracionCorreo } from '../services/notificacionesConfig.js';

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDateOnly(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatDate(value, timeZone = 'America/Guayaquil') {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
}

function normalizarEstado(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (['completado', 'completada', 'cerrado', 'cerrada', 'closed', 'done'].includes(normalized)) return 'completado';
  return normalized || 'pendiente';
}

function obtenerEstadoProceso(subtarea) {
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

function obtenerPresupuesto(subtarea) {
  const valor = Number(subtarea?.presupuesto || subtarea?.presupuesto2026Inicial || 0);
  return Number.isFinite(valor) ? valor : 0;
}

function procesoElegible(subtarea) {
  const estado = obtenerEstadoProceso(subtarea);
  if (estado === 0 || estado === 2) return false;
  if (obtenerPresupuesto(subtarea) <= 0) return false;
  return true;
}

async function main() {
  const destinatario = String(process.argv[2] || '').trim();
  const filtroTextoOriginal = String(process.argv[3] || process.env.TEST_DIRECTION || '').trim();
  const filtroTexto = filtroTextoOriginal.toLowerCase();
  if (!destinatario) {
    throw new Error('Debe enviar el destinatario. Ejemplo: node scripts/send-delayed-alert-test.js correo@dominio.com "nombre del proceso o dirección"');
  }

  await initMySQL();

  const config = await getConfiguracionCorreo({ includeSecret: true });
  const subtareas = await getAllSubtareas();
  const seguimientoRows = await query(
    `SELECT subtarea_id, etapa_id, comentario, fecha, updated_at, created_at, id
     FROM seguimientos_diarios
     ORDER BY subtarea_id ASC, etapa_id ASC, fecha DESC, updated_at DESC, created_at DESC, id DESC`
  );

  const comentariosMap = new Map();
  for (const row of seguimientoRows) {
    const key = `${Number(row.subtarea_id)}:${Number(row.etapa_id)}`;
    if (!comentariosMap.has(key) && String(row.comentario || '').trim()) {
      comentariosMap.set(key, {
        comentario: String(row.comentario || '').trim(),
        fecha: row.fecha || row.updated_at || row.created_at || null
      });
    }
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const procesosSeleccionados = [];

  for (const subtarea of subtareas) {
    if (!procesoElegible(subtarea)) continue;

    const nombreProceso = String(subtarea?.nombre || '').trim().toLowerCase();
    const codigoProceso = String(subtarea?.codigoOlympo || '').trim().toLowerCase();
    const direccionProceso = String(subtarea?.direccionNombre || '').trim().toLowerCase();
    if (
      filtroTexto
      && !nombreProceso.includes(filtroTexto)
      && !codigoProceso.includes(filtroTexto)
      && !direccionProceso.includes(filtroTexto)
    ) {
      continue;
    }

    const etapasAtrasadas = [];

    for (const etapa of subtarea.seguimientoEtapas || []) {
      const estado = normalizarEstado(etapa?.estado);
      if (estado === 'completado') continue;

      const fechaPlanificada = parseDateOnly(etapa?.fechaPlanificada || etapa?.fechaTentativa || etapa?.fechaReforma);
      if (!fechaPlanificada) continue;

      const etapaId = Number(etapa?.etapaId || etapa?.id || 0);
      const comentarioInfo = comentariosMap.get(`${Number(subtarea?.id || 0)}:${etapaId}`);
      const diasAtraso = Math.floor((hoy.getTime() - fechaPlanificada.getTime()) / 86400000);
      if (diasAtraso < 1) continue;

      etapasAtrasadas.push({
        etapa: etapa?.etapaNombre || 'Etapa',
        fechaPlanificada,
        diasAtraso,
        ultimoComentario: String(comentarioInfo?.comentario || etapa?.observaciones || '').trim(),
        fechaComentario: comentarioInfo?.fecha || null
      });
    }

    if (etapasAtrasadas.length) {
      procesosSeleccionados.push({
        subtarea,
        etapas: etapasAtrasadas.sort((a, b) => b.diasAtraso - a.diasAtraso || a.etapa.localeCompare(b.etapa))
      });
    }
  }

  if (!procesosSeleccionados.length) {
    throw new Error(
      filtroTexto
        ? `No se encontraron procesos con etapas atrasadas para el criterio solicitado: ${filtroTextoOriginal}`
        : 'No se encontraron procesos pendientes con días de atraso reales para enviar la validación.'
    );
  }

  const totalProcesos = procesosSeleccionados.length;
  const etapasTotales = procesosSeleccionados.reduce((sum, item) => sum + item.etapas.length, 0);
  const contextoDireccion = filtroTextoOriginal || procesosSeleccionados[0]?.subtarea?.direccionNombre || 'su dirección';

  const procesosHtml = procesosSeleccionados.map(({ subtarea, etapas }) => {
    const rowsHtml = etapas.map((item) => `
      <tr>
        <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(item.etapa)}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(formatDate(item.fechaPlanificada, config.timezone || 'America/Guayaquil'))}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;text-align:center;font-weight:700;color:#b91c1c;">${item.diasAtraso}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top;">${item.ultimoComentario ? escapeHtml(item.ultimoComentario) : '<span style="color:#94a3b8;">Sin comentario registrado</span>'}</td>
      </tr>
    `).join('');

    return `
      <div style="margin:18px 0 22px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div style="background:#eff6ff;padding:14px 16px;border-bottom:1px solid #dbeafe;">
          <div style="font-size:12px;color:#1d4ed8;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Proceso</div>
          <h3 style="margin:6px 0 0;font-size:18px;color:#0f172a;">${escapeHtml(subtarea?.nombre || 'Proceso sin nombre')}</h3>
          <div style="margin-top:6px;font-size:13px;color:#334155;">
            <strong>Código:</strong> ${escapeHtml(subtarea?.codigoOlympo || '-')} &nbsp;|&nbsp;
            <strong>Dirección:</strong> ${escapeHtml(subtarea?.direccionNombre || 'Sin dirección')}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Etapa atrasada</th>
              <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Fecha tentativa</th>
              <th style="padding:10px;border:1px solid #e2e8f0;text-align:center;">Días tarde</th>
              <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Último comentario</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }).join('');

  const contenido = `
    <p>Estimado/a,</p>
    <p>Este correo simula el escenario real en el que usted es el encargado de los procesos de la <strong>${escapeHtml(contextoDireccion)}</strong>.</p>
    <p>Actualmente se identifican <strong>${totalProcesos} proceso(s)</strong> en estado pendiente con <strong>${etapasTotales} etapa(s) atrasadas</strong> dentro de ese ámbito.</p>
    ${procesosHtml}
    <p>Los procesos sin comentario de seguimiento se muestran como <em>Sin comentario registrado</em>.</p>
    <p>Mensaje enviado para validar el formato de notificación en un escenario operativo real.</p>
  `;

  const asunto = filtroTexto
    ? `Notificación de procesos atrasados - ${contextoDireccion}`
    : `Validación de notificación - ${etapasTotales} etapa(s) atrasadas en ${totalProcesos} proceso(s)`;
  const resultado = await enviarCorreo(destinatario, asunto, contenido, null, {
    config,
    forceSend: true,
    reason: `Validación manual para ${contextoDireccion}`,
    title: `Procesos pendientes con atraso - ${contextoDireccion}`,
    proceso: procesosSeleccionados[0]?.subtarea?.nombre || ''
  });

  console.log(JSON.stringify({
    destinatario,
    filtroProceso: filtroTexto || null,
    procesosIncluidos: procesosSeleccionados.map((item) => ({
      proceso: item.subtarea?.nombre || null,
      codigoOlympo: item.subtarea?.codigoOlympo || null,
      etapasIncluidas: item.etapas.length
    })),
    etapasIncluidas: etapasTotales,
    resultado
  }, null, 2));

  if (!resultado?.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
