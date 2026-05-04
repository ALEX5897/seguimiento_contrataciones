/**
 * Plantillas HTML para Informe 2 - Detalle de Cambios
 * Optimizadas para legibilidad y exportación PDF
 */

function formatearMonto(monto) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2, // Generalmente mejor 2 para montos financieros
    maximumFractionDigits: 2
  }).format(monto || 0);
}

function getEstadoConfig(estado) {
  const estados = {
    'completado': { icono: '✅', label: 'Completado', class: 'estado-completado' },
    'en_proceso': { icono: '⏳', label: 'En proceso', class: 'estado-proceso' },
    'pendiente': { icono: '⏹', label: 'Pendiente', class: 'estado-pendiente' }
  };
  return estados[estado] || { icono: '⚪', label: estado || 'Sin estado', class: 'estado-pendiente' };
}

function generarHTMLInformeDetalle(datos) {
  const { fechaInicio, fechaFin, ultimaActualizacion, resumen, porDireccion } = datos;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Informe Detalle de Cambios - QuitoTurismo</title>
      <style>
        ${getEstilosGlobales()}
      </style>
    </head>
    <body>
      ${generarPortada(fechaInicio, fechaFin, resumen)}
      ${generarResumen(resumen, ultimaActualizacion)}
      ${generarDetallePorDireccion(porDireccion)}
      ${generarPiePagina()}
    </body>
    </html>
  `;
}

function getEstilosGlobalesAzul() {
  return `
    :root {
      --primary: #1e3a8a;
      --primary-dark: #1e40af;
      --secondary: #dbeafe;
      --accent: #2563eb;
      --text-main: #334155;
      --text-light: #64748b;
      --border: #e2e8f0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      line-height: 1.5;
      color: var(--text-main);
      background: #fff;
    }

    .page {
      padding: 50px;
      page-break-after: always;
      position: relative;
    }

    /* Portada */
    .portada {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .portada h1 { font-size: 3.5rem; margin-bottom: 0.5rem; letter-spacing: -1px; }
    .portada .subtitulo { font-size: 1.5rem; opacity: 0.9; margin-bottom: 3rem; }

    .portada .periodo {
      background: rgba(255,255,255,0.15);
      padding: 1.5rem 3rem;
      border-radius: 12px;
      backdrop-filter: blur(5px);
      margin-bottom: 3rem;
    }

    /* Tablas */
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
    th { background: var(--secondary); color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border); padding: 12px; }
    td { padding: 10px; border: 1px solid var(--border); vertical-align: middle; }

    /* Badges */
    .estado-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .estado-completado { background: #dcfce7; color: #166534; }
    .estado-proceso { background: #fef9c3; color: #854d0e; }
    .estado-pendiente { background: #fee2e2; color: #991b1b; }

    /* Contenedores de Dirección */
    .direccion-header {
      background: var(--secondary);
      border-left: 6px solid var(--primary);
      padding: 1.5rem;
      margin-top: 2rem;
      border-radius: 0 8px 8px 0;
    }

    .proceso-card {
      margin: 1.5rem 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .proceso-header {
      background: #f8fafc;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    @media print {
      .page { padding: 30px; }
      .no-break { page-break-inside: avoid; }
    }
  `;
}

function getEstilosGlobales() {
  return `
    :root {
      --primary: #165e4e;
      --primary-dark: #0d4a38;
      --secondary: #ecfdf5;
      --accent: #00897b;
      --text-main: #334155;
      --text-light: #64748b;
      --border: #e2e8f0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      line-height: 1.5;
      color: var(--text-main);
      background: #fff;
    }

    .page {
      padding: 50px;
      page-break-after: always;
      position: relative;
    }

    /* Portada */
    .portada {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .portada h1 { font-size: 3.5rem; margin-bottom: 0.5rem; letter-spacing: -1px; }
    .portada .subtitulo { font-size: 1.5rem; opacity: 0.9; margin-bottom: 3rem; }
    
    .portada .periodo {
      background: rgba(255,255,255,0.15);
      padding: 1.5rem 3rem;
      border-radius: 12px;
      backdrop-filter: blur(5px);
      margin-bottom: 3rem;
    }

    /* Tablas */
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
    th { background: var(--secondary); color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border); padding: 12px; }
    td { padding: 10px; border: 1px solid var(--border); vertical-align: middle; }

    /* Badges */
    .estado-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .estado-completado { background: #dcfce7; color: #166534; }
    .estado-proceso { background: #fef9c3; color: #854d0e; }
    .estado-pendiente { background: #fee2e2; color: #991b1b; }

    /* Contenedores de Dirección */
    .direccion-header {
      background: var(--secondary);
      border-left: 6px solid var(--primary);
      padding: 1.5rem;
      margin-top: 2rem;
      border-radius: 0 8px 8px 0;
    }

    .proceso-card {
      margin: 1.5rem 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .proceso-header {
      background: #f8fafc;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    @media print {
      .page { padding: 30px; }
      .no-break { page-break-inside: avoid; }
    }
  `;
}

function generarPortada(inicio, fin, resumen) {
  return `
    <div class="page portada">
      <h1>REPORTES POA</h1>
      <p class="subtitulo">Detalle de Cambios y Actividades</p>
      <div class="periodo">
        <p>Desde: <strong>${inicio}</strong> — Hasta: <strong>${fin}</strong></p>
      </div>
      <div style="display: flex; gap: 20px;">
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; min-width: 150px;">
          <h3 style="font-size: 2rem;">${resumen.totalCambios}</h3>
          <p style="font-size: 0.8rem; text-transform: uppercase;">Cambios</p>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; min-width: 150px;">
          <h3 style="font-size: 2rem;">2026</h3>
          <p style="font-size: 0.8rem; text-transform: uppercase;">Año Fiscal</p>
        </div>
      </div>
      <div style="position: absolute; bottom: 50px; opacity: 0.7; font-size: 0.9rem;">
        QuitoTurismo | Generado el ${new Date().toLocaleDateString('es-EC')}
      </div>
    </div>
  `;
}

function generarResumen(resumen, ultimaActualizacion) {
  // Manejo de datos para la tabla de actualizaciones
  let filasActualizacion = '<tr><td colspan="2" style="text-align: center; color: #94a3b8;">No hay datos recientes</td></tr>';
  
  if (Array.isArray(ultimaActualizacion) && ultimaActualizacion.length > 0) {
    filasActualizacion = ultimaActualizacion.map(item => `
      <tr>
        <td style="font-weight: 600;">${item.direccion}</td>
        <td style="color: var(--text-light);">${item.ultimaActualizacion}</td>
      </tr>
    `).join('');
  }

  return `
    <div class="page">
      <h2 style="color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 10px;">
        Resumen Ejecutivo de Actividad
      </h2>
      
      <div style="background: #f1f5f9; padding: 2rem; border-radius: 12px; margin: 2rem 0;">
        <p style="font-size: 1.1rem; color: var(--text-main);">
          Durante el período reportado, el sistema procesó <strong>${resumen.totalCambios}</strong> cambios de estado 
          y <strong>${resumen.totalComentarios}</strong> observaciones técnicas en las diferentes direcciones.
        </p>
      </div>

      <h3 style="margin-top: 2rem; color: var(--text-main);">Estado de Actualización por Dirección</h3>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Dirección / Unidad</th>
            <th style="text-align: left; width: 250px;">Última Intervención</th>
          </tr>
        </thead>
        <tbody>
          ${filasActualizacion}
        </tbody>
      </table>
    </div>
  `;
}

function generarDetallePorDireccion(porDireccion) {
  if (!porDireccion?.length) return '<div class="page"><h3>No hay movimientos para mostrar.</h3></div>';

  return porDireccion.map(dir => `
    <div class="page">
      <div class="direccion-header">
        <h2 style="color: var(--primary); text-transform: uppercase;">${dir.nombre}</h2>
        <p style="font-size: 0.9rem; color: var(--primary-dark);">
          ${dir.totalCambios} cambios registrados • ${dir.totalComentarios} comentarios
        </p>
      </div>

      ${dir.procesos.map(proc => `
        <div class="no-break">
          <div class="proceso-card">
            <div class="proceso-header">
              <div>
                <strong style="color: var(--primary);">${proc.nombre}</strong>
                <div style="font-size: 0.75rem; color: var(--text-light);">CÓDIGO: ${proc.codigo}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: bold; color: var(--accent);">${formatearMonto(proc.monto)}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 20%;">Etapa</th>
                  <th style="width: 15%;">Estado</th>
                  <th style="width: 50%;">Comentario / Observación</th>
                  <th style="width: 15%;">Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${generarFilasEtapa(proc.etapas)}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function generarFilasEtapa(etapas) {
  if (!etapas?.length) return '<tr><td colspan="4" style="text-align: center;">Sin etapas registradas</td></tr>';

  return etapas.map(etapa => {
    const config = getEstadoConfig(etapa.estado);
    const comentarios = etapa.comentarios || [];
    
    if (comentarios.length === 0) {
      return `
        <tr>
          <td><strong>${etapa.nombre}</strong></td>
          <td><span class="estado-badge ${config.class}">${config.icono} ${config.label}</span></td>
          <td style="color: #cbd5e1;">Sin comentarios</td>
          <td style="color: var(--text-light);">-</td>
        </tr>
      `;
    }

    return comentarios.map((com, idx) => `
      <tr>
        ${idx === 0 ? `
          <td rowspan="${comentarios.length}"><strong>${etapa.nombre}</strong></td>
          <td rowspan="${comentarios.length}">
            <span class="estado-badge ${config.class}">${config.icono} ${config.label}</span>
          </td>
        ` : ''}
        <td style="font-size: 0.8rem;">${com.texto}</td>
        <td style="font-size: 0.75rem; color: var(--text-light);">${com.fecha}</td>
      </tr>
    `).join('');
  }).join('');
}

function generarPiePagina() {
  return `
    <div style="text-align: center; margin-top: 50px; padding: 20px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-light);">
      <p>Sistema de Gestión POA-PAC 2026 - QuitoTurismo</p>
      <p>Documento de uso interno. La información presentada corresponde al corte del período indicado.</p>
    </div>
  `;
}

function generarHTMLUltimosComentarios(datos) {
  const { fechaInicio, fechaFin, porDireccion } = datos;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Informe Últimos Comentarios - QuitoTurismo</title>
      <style>
        ${getEstilosGlobalesAzul()}
        .comentario-card {
          background: #f8fafc;
          border-left: 4px solid var(--primary);
          padding: 1.5rem;
          margin: 1rem 0;
          border-radius: 0 8px 8px 0;
        }
        .comentario-texto {
          font-style: italic;
          color: var(--text-light);
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        .comentario-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #94a3b8;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
      </style>
    </head>
    <body>
      ${generarPortadaComentarios(fechaInicio, fechaFin)}
      ${generarDetalleComentarios(porDireccion)}
      ${generarPiePagina()}
    </body>
    </html>
  `;
}

function generarPortadaComentarios(inicio, fin) {
  return `
    <div class="page portada">
      <img src="https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT-1024x166.png"
           style="width: 180px; margin-bottom: 2rem; opacity: 0.95;">
      <h1>ÚLTIMOS COMENTARIOS</h1>
      <p class="subtitulo">Seguimiento por Proceso</p>
      <div class="periodo">
        <p>Desde: <strong>${inicio}</strong> — Hasta: <strong>${fin}</strong></p>
      </div>
      <div style="position: absolute; bottom: 50px; opacity: 0.7; font-size: 0.9rem;">
        QuitoTurismo | Generado el ${new Date().toLocaleDateString('es-EC')}
      </div>
    </div>
  `;
}

function generarDetalleComentarios(porDireccion) {
  if (!porDireccion?.length) return '<div class="page"><h3>No hay comentarios para mostrar.</h3></div>';

  return porDireccion.map(dir => {
    const procesosConComentarios = dir.procesos.filter(p => p.ultimoComentario);

    if (procesosConComentarios.length === 0) {
      return '';
    }

    return `
      <div class="page">
        <div class="direccion-header">
          <h2 style="color: var(--primary); text-transform: uppercase;">${dir.nombre}</h2>
          <p style="font-size: 0.9rem; color: var(--text-light);">
            ${procesosConComentarios.length} proceso(s) con comentarios
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.85rem;">
          <thead>
            <tr style="background: var(--secondary); border: 1px solid var(--border);">
              <th style="padding: 12px; text-align: left; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Proceso</th>
              <th style="padding: 12px; text-align: center; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Tipo</th>
              <th style="padding: 12px; text-align: right; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Monto</th>
              <th style="padding: 12px; text-align: center; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Cuatrimestre</th>
              <th style="padding: 12px; text-align: left; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Última Etapa / Fecha</th>
              <th style="padding: 12px; text-align: center; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Días Tarde</th>
              <th style="padding: 12px; text-align: left; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Último Comentario</th>
              <th style="padding: 12px; text-align: center; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid var(--border);">Fecha Comentario</th>
            </tr>
          </thead>
          <tbody>
            ${procesosConComentarios.map(proc => `
              <tr style="border: 1px solid var(--border);">
                <td style="padding: 10px; border: 1px solid var(--border); vertical-align: middle;">
                  <div style="font-weight: 600; color: var(--primary);">${proc.nombre}</div>
                  <div style="font-size: 0.75rem; color: var(--text-light);">${proc.codigo}</div>
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center; vertical-align: middle;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; ${
                    proc.tipoPlan === 'PAC'
                      ? 'background: #c7d2fe; color: #3730a3;'
                      : 'background: #ddd6fe; color: #6d28d9;'
                  }">
                    ${proc.tipoPlan}
                  </span>
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: right; vertical-align: middle; font-weight: 600; color: var(--text-main);">
                  ${formatearMonto(proc.monto)}
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center; vertical-align: middle; font-size: 0.9rem;">
                  ${proc.cuatrimestre}
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); vertical-align: middle;">
                  <div style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">${proc.ultimaEtapa?.nombre || 'No definida'}</div>
                  <div style="font-size: 0.8rem; color: var(--text-light); margin-top: 3px;">${proc.ultimaEtapa?.fecha || 'No definida'}</div>
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center; vertical-align: middle;">
                  ${proc.ultimaEtapa && proc.ultimaEtapa.diasTarde > 0 ? `
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: #fee2e2; color: #991b1b; font-weight: 600; font-size: 0.9rem;">
                      ${proc.ultimaEtapa.diasTarde}
                    </span>
                  ` : '<span style="color: #94a3b8;">-</span>'}
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); vertical-align: middle; max-width: 250px;">
                  <div style="font-size: 0.85rem; color: var(--text-light); line-height: 1.4;">"${proc.ultimoComentario.texto}"</div>
                </td>
                <td style="padding: 10px; border: 1px solid var(--border); text-align: center; vertical-align: middle; font-size: 0.8rem; color: var(--text-light);">
                  ${proc.ultimoComentario.fecha}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${procesosConComentarios.some(p => p.etapaPendienteMasAtrasada) ? `
          <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 1rem; padding: 1rem; border-top: 1px solid var(--border); background: #f8fafc; border-radius: 8px;">
            <p><strong>Etapa Pendiente con Mayor Atraso:</strong></p>
            ${procesosConComentarios.filter(p => p.etapaPendienteMasAtrasada).map(proc => `
              <div style="margin: 0.5rem 0;">
                <strong>${proc.nombre}</strong> → ${proc.etapaPendienteMasAtrasada.nombre} (${proc.etapaPendienteMasAtrasada.diasTarde} días tarde)
              </div>
            `).join('')}
          </div>
        ` : ''}

      </div>
    `;
  }).filter(Boolean).join('');
}

export {
  generarHTMLInformeDetalle,
  generarHTMLUltimosComentarios,
  formatearMonto
};