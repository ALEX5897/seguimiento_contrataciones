// Plantillas HTML para Informe 2 - Detalle de Cambios
// Personaliza aquí los estilos y estructura del informe

function formatearMonto(monto) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto || 0);
}

function getEstadoIcono(estado) {
  const estados = {
    'completado': { icono: '✅', label: 'Completado', color: '#2e7d32' },
    'en_proceso': { icono: '⏳', label: 'En proceso', color: '#f57c00' },
    'pendiente': { icono: '⏹', label: 'Pendiente', color: '#c62828' }
  };
  return estados[estado] || estados['pendiente'];
}

function generarHTMLInformeDetalle(datos) {
  const { fechaInicio, fechaFin, ultimaActualizacion, resumen, ultimosIngresos, porDireccion } = datos;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Informe Detalle de Cambios</title>
      <style>
        ${getEstilosGlobales()}
      </style>
    </head>
    <body>
      ${generarPortada(fechaInicio, fechaFin)}
      ${generarResumen(resumen, ultimaActualizacion)}
      ${generarUltimosIngresos(ultimosIngresos)}
      ${generarDetallePorDireccion(porDireccion)}
      ${generarPiePagina()}
    </body>
    </html>
  `;
}

function getEstilosGlobales() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }

    .page {
      page-break-after: always;
      padding: 40px;
      min-height: 100vh;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* ─── PORTADA ─── */
    .portada {
      background: linear-gradient(135deg, #165e4e 0%, #0d4a38 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
      padding: 60px 40px;
    }

    .portada h1 {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .portada .subtitulo {
      font-size: 24px;
      margin-bottom: 40px;
      opacity: 0.95;
    }

    .portada .periodo {
      font-size: 18px;
      margin-bottom: 60px;
      background: rgba(255,255,255,0.1);
      padding: 20px 40px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .portada .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
      max-width: 400px;
    }

    .portada .stat-item {
      background: rgba(255,255,255,0.15);
      padding: 15px;
      border-radius: 8px;
    }

    .portada .stat-number {
      font-size: 32px;
      font-weight: bold;
    }

    .portada .stat-label {
      font-size: 14px;
      margin-top: 5px;
    }

    .portada .footer {
      position: absolute;
      bottom: 40px;
      font-size: 12px;
      opacity: 0.8;
    }

    /* ─── RESUMEN ─── */
    .resumen {
      margin-bottom: 40px;
    }

    .resumen h2 {
      color: #165e4e;
      font-size: 28px;
      margin-bottom: 20px;
      border-bottom: 3px solid #165e4e;
      padding-bottom: 10px;
    }

    .resumen-texto {
      background: #f5f5f5;
      padding: 20px;
      border-left: 4px solid #165e4e;
      border-radius: 4px;
      margin-bottom: 20px;
      line-height: 1.8;
    }

    /* ─── TABLA ÚLTIMOS INGRESOS ─── */
    .ultimos-ingresos {
      margin-bottom: 40px;
    }

    .ultimos-ingresos h3 {
      color: #165e4e;
      font-size: 16px;
      margin-bottom: 15px;
    }

    .tabla-simple {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .tabla-simple th {
      background: #e0f2f1;
      color: #00897b;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
    }

    .tabla-simple td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .tabla-simple tr:nth-child(even) {
      background: #f5f5f5;
    }

    .tabla-simple tr:hover {
      background: #f0f0f0;
    }

    /* ─── DETALLE POR DIRECCIÓN ─── */
    .detalle-direcciones {
      margin-bottom: 40px;
    }

    .detalle-direcciones h2 {
      color: #165e4e;
      font-size: 28px;
      margin-bottom: 30px;
      border-bottom: 3px solid #165e4e;
      padding-bottom: 10px;
    }

    .direccion-bloque {
      margin-bottom: 40px;
      break-inside: avoid;
    }

    .direccion-encabezado {
      background: #ecfdf5;
      border: 2px solid #bbf7d0;
      border-radius: 6px;
      padding: 15px 20px;
      margin-bottom: 20px;
    }

    .direccion-encabezado h3 {
      color: #166534;
      font-size: 18px;
      margin-bottom: 8px;
    }

    .direccion-encabezado p {
      color: #047857;
      font-size: 13px;
      margin: 0;
    }

    /* ─── PROCESO ─── */
    .proceso-bloque {
      margin-bottom: 25px;
      break-inside: avoid;
    }

    .proceso-titulo {
      background: #f5f5f5;
      border-left: 4px solid #165e4e;
      padding: 12px 15px;
      margin-bottom: 12px;
      border-radius: 3px;
    }

    .proceso-titulo h4 {
      color: #0f172a;
      font-size: 16px;
      margin: 0 0 5px 0;
    }

    .proceso-titulo p {
      color: #666;
      font-size: 12px;
      margin: 0;
    }

    /* ─── TABLA DE ETAPAS ─── */
    .tabla-etapas {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }

    .tabla-etapas th {
      background: #e0f2f1;
      color: #00897b;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #00897b;
    }

    .tabla-etapas td {
      padding: 10px;
      border: 1px solid #e0e0e0;
      vertical-align: top;
    }

    .tabla-etapas tr:nth-child(even) {
      background: #f9f9f9;
    }

    .estado-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .estado-completado {
      background: #c8e6c9;
      color: #2e7d32;
    }

    .estado-proceso {
      background: #ffe0b2;
      color: #f57c00;
    }

    .estado-pendiente {
      background: #ffcdd2;
      color: #c62828;
    }

    .comentario-texto {
      color: #424242;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .fecha-hora {
      color: #666;
      font-size: 11px;
      white-space: nowrap;
    }

    /* ─── PIE DE PÁGINA ─── */
    .pie-pagina {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      margin-top: 40px;
      font-size: 11px;
      color: #9ca3af;
    }

    @media print {
      .page {
        page-break-after: always;
      }
    }
  `;
}

function generarPortada(fechaInicio, fechaFin) {
  return `
    <div class="page portada">
      <h1>📋 DETALLE DE CAMBIOS Y ACTIVIDAD</h1>
      <p class="subtitulo">Análisis por Dirección y Proceso</p>

      <div class="periodo">
        Período: <strong>${fechaInicio}</strong> al <strong>${fechaFin}</strong>
      </div>

      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">Sistema</div>
          <div class="stat-label">Seguimiento POA</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">2026</div>
          <div class="stat-label">Año Fiscal</div>
        </div>
      </div>

      <div class="footer">
        <p>QuitoTurismo - Sistema de Seguimiento</p>
        <p>Generado: ${new Date().toLocaleString('es-EC')}</p>
      </div>
    </div>
  `;
}

function generarResumen(resumen, ultimaActualizacion) {
  return `
    <div class="page">
      <div class="resumen">
        <h2>RESUMEN DE ACTIVIDAD</h2>
        <div class="resumen-texto">
          <p>
            Se han registrado <strong>${resumen.totalCambios}</strong> cambios de estado
            y <strong>${resumen.totalComentarios}</strong> comentarios en el período analizado.
            La última actualización se registró el <strong>${ultimaActualizacion}</strong>.
          </p>
        </div>

        <h3>Últimas Actualizaciones por Dirección</h3>
        <table class="tabla-simple">
          <thead>
            <tr>
              <th>Dirección</th>
              <th>Última Actualización</th>
            </tr>
          </thead>
          <tbody>
            ${(Array.isArray(ultimaActualizacion) && ultimaActualizacion.length > 0)
              ? ultimaActualizacion.map(item => `
                <tr>
                  <td>${item.direccion}</td>
                  <td>${item.ultimaActualizacion}</td>
                </tr>
              `).join('')
              : '<tr><td colspan="2" style="text-align: center; color: #999;">Sin datos</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function generarUltimosIngresos(ultimosIngresos) {
  return `
    <!-- Incluido en generarResumen -->
  `;
}

function generarDetallePorDireccion(porDireccion) {
  if (!porDireccion || porDireccion.length === 0) {
    return '<div class="page"><p style="color: #999; text-align: center;">Sin datos para mostrar</p></div>';
  }

  return `
    <div class="page">
      <div class="detalle-direcciones">
        <h2>DETALLE POR DIRECCIÓN</h2>

        ${porDireccion.map(dir => `
          <div class="direccion-bloque">
            <div class="direccion-encabezado">
              <h3>${dir.nombre}</h3>
              <p>Última actualización: ${dir.ultimaActualizacion} • ${dir.totalCambios} cambios • ${dir.totalComentarios} comentarios</p>
            </div>

            ${(dir.procesos && dir.procesos.length > 0)
              ? dir.procesos.map(proc => `
                <div class="proceso-bloque">
                  <div class="proceso-titulo">
                    <h4>📋 ${proc.nombre}</h4>
                    <p>Código: ${proc.codigo} | Monto: ${formatearMonto(proc.monto)}</p>
                  </div>

                  ${(proc.etapas && proc.etapas.length > 0)
                    ? `
                      <table class="tabla-etapas">
                        <thead>
                          <tr>
                            <th style="width: 25%;">Etapa</th>
                            <th style="width: 15%;">Estado</th>
                            <th style="width: 45%;">Comentario</th>
                            <th style="width: 15%;">Fecha/Hora</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${proc.etapas.map((etapa, idx) => {
                            const estado = getEstadoIcono(etapa.estado);
                            const comentarios = etapa.comentarios || [];

                            if (comentarios.length === 0) {
                              return `
                                <tr>
                                  <td>${etapa.nombre}</td>
                                  <td><span class="estado-badge estado-${etapa.estado}">${estado.icono} ${estado.label}</span></td>
                                  <td class="comentario-texto">-</td>
                                  <td class="fecha-hora">-</td>
                                </tr>
                              `;
                            }

                            return comentarios.map((com, comIdx) => `
                              <tr>
                                ${comIdx === 0 ? `
                                  <td rowspan="${comentarios.length}">${etapa.nombre}</td>
                                  <td rowspan="${comentarios.length}"><span class="estado-badge estado-${etapa.estado}">${estado.icono} ${estado.label}</span></td>
                                ` : ''}
                                <td class="comentario-texto">${com.texto}</td>
                                <td class="fecha-hora">${com.fecha}</td>
                              </tr>
                            `).join('');
                          }).join('')}
                        </tbody>
                      </table>
                    `
                    : '<p style="color: #999; font-size: 12px;">Sin etapas registradas en el período</p>'
                  }
                </div>
              `).join('')
              : '<p style="color: #999; font-size: 12px;">Sin procesos con cambios en el período</p>'
            }
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generarPiePagina() {
  return `
    <div class="pie-pagina">
      <p>Sistema de Seguimiento POA/PAC 2026 • Detalle de Cambios</p>
      <p>Este documento fue generado automáticamente. Para consultas, contacte al área de reportería.</p>
    </div>
  `;
}

export {
  generarHTMLInformeDetalle,
  getEstilosGlobales,
  formatearMonto,
  getEstadoIcono
};
