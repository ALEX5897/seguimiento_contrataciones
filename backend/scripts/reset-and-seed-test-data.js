import { initMySQL, query } from '../data/mysql.js';

const DIRECCIONES = [
  ['Dirección de Asesoría Jurídica', 'DAJ'],
  ['DPEI / Jefatura de TICS', 'DPEI-TICS'],
  ['DAF / Jefatura Administrativa', 'DAF-ADM'],
  ['DAF / Jefatura de Talento Humano', 'DAF-TTHH'],
  ['Dirección de Comercialización', 'DCOM']
];

const RESPONSABLES = [
  ['Juan Pérez', 'juan.perez@quitoturismo.gob.ec', 1],
  ['María García', 'maria.garcia@quitoturismo.gob.ec', 2],
  ['Carlos Rodríguez', 'carlos.rodriguez@quitoturismo.gob.ec', 3],
  ['Ana Martínez', 'ana.martinez@quitoturismo.gob.ec', 4],
  ['Pedro López', 'pedro.lopez@quitoturismo.gob.ec', 5],
  ['Sofía Herrera', 'sofia.herrera@quitoturismo.gob.ec', 1],
  ['Diego Cevallos', 'diego.cevallos@quitoturismo.gob.ec', 2]
];

const ETAPAS_PAC = [
  'Solicitud de certificación problemática',
  'Certificación POA/PAI',
  'Informe técnico',
  'Informe de necesidad',
  'Términos de referencia',
  'Especificaciones técnicas',
  'Mesa técnica',
  'Corrección',
  'Solicitud de autorización de informe',
  'Autorización del informe',
  'Solicitud de CATE',
  'CATE',
  'Solicitud de publicación',
  'Publicación de proformas',
  'Recepción de proformas',
  'Estudio de mercado',
  'Solicitud de certificación presupuestaria',
  'Certificación PAC'
];

const SUBTAREAS_BASE = [
  { nombre: 'Consultoría jurídica para pliegos', tipoPlan: 'PAC', presupuesto: 45000, avance: 25, activo: 1, estado: 'pendiente' },
  { nombre: 'Actualización de infraestructura tecnológica', tipoPlan: 'PAC', presupuesto: 128000, avance: 60, activo: 1, estado: 'con_pendientes' },
  { nombre: 'Auditoría de procesos administrativos', tipoPlan: 'POA', presupuesto: 76000, avance: 80, activo: 1, estado: 'en_retraso' },
  { nombre: 'Programa de capacitación institucional', tipoPlan: 'POA', presupuesto: 32000, avance: 100, activo: 1, estado: 'completado' },
  { nombre: 'Mantenimiento preventivo de equipos', tipoPlan: 'PAC', presupuesto: 54000, avance: 15, activo: 1, estado: 'pendiente' },
  { nombre: 'Servicio de comunicación digital', tipoPlan: 'PAC', presupuesto: 41000, avance: 45, activo: 0, estado: 'con_pendientes' },
  { nombre: 'Evaluación de seguridad física', tipoPlan: 'POA', presupuesto: 69000, avance: 70, activo: 1, estado: 'en_retraso' },
  { nombre: 'Soporte de gestión documental', tipoPlan: 'PAC', presupuesto: 38000, avance: 90, activo: 1, estado: 'completado' }
];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function addDays(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

async function ensureCatalogos() {
  for (const [nombre, codigo] of DIRECCIONES) {
    await query(
      'INSERT INTO direcciones (nombre, codigo) VALUES (?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)',
      [nombre, codigo]
    );
  }

  for (const [nombre, email, direccionId] of RESPONSABLES) {
    const rows = await query('SELECT id FROM responsables WHERE email = ? LIMIT 1', [email]);
    if (rows.length) continue;

    await query(
      'INSERT INTO responsables (nombre, email, direccion_id) VALUES (?, ?, ?)',
      [nombre, email, direccionId]
    );
  }

  for (let i = 0; i < ETAPAS_PAC.length; i++) {
    const nombre = ETAPAS_PAC[i];
    await query(
      'INSERT INTO etapas_pac (nombre, orden, es_personalizada) VALUES (?, ?, false) ON DUPLICATE KEY UPDATE orden = VALUES(orden)',
      [nombre, i + 1]
    );
  }
}

async function limpiarDatosTransaccionales() {
  await query('DELETE FROM seguimientos_diarios');
  await query('DELETE FROM seguimiento_etapas');
  await query('DELETE FROM subtareas_etapas');
  await query('DELETE FROM notificaciones');
  await query('DELETE FROM subtareas');
}

async function insertarSubtareasYSeguimiento() {
  const responsables = await query('SELECT id FROM responsables ORDER BY id');
  const etapas = await query('SELECT id, orden FROM etapas_pac ORDER BY orden');

  const baseStart = new Date('2026-01-06');

  for (let index = 0; index < SUBTAREAS_BASE.length; index++) {
    const item = SUBTAREAS_BASE[index];
    const direccionId = (index % 5) + 1;
    const responsableId = responsables[index % responsables.length]?.id || null;
    const codigoOlympo = `99.99.00${index + 1}.530702.TEST.${String(index + 1).padStart(3, '0')}`;
    const fechaInicio = addDays(baseStart, index * 4);
    const fechaFin = addDays(fechaInicio, 120 + index * 6);

    const insert = await query(
      `INSERT INTO subtareas
       (nombre, direccion_id, tipo_plan, codigo_olympo, responsable_id, partida_presupuestaria,
        fuente_financiamiento, presupuesto, costo_reforma_2, fecha_inicio, fecha_fin,
        estado, avance_general, activo, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.nombre,
        direccionId,
        item.tipoPlan,
        codigoOlympo,
        responsableId,
        '530702',
        index % 2 === 0 ? 'Fondos Propios' : 'Transferencia',
        item.presupuesto,
        Math.round(item.presupuesto * 0.08),
        formatDate(fechaInicio),
        formatDate(fechaFin),
        item.estado,
        item.avance,
        item.activo,
        `Dataset QA variante ${index + 1}`
      ]
    );

    const subtareaId = insert.insertId;
    const etapasAplicables = 8 + (index % 5);

    for (let step = 0; step < etapasAplicables; step++) {
      const etapa = etapas[step];
      const fechaTentativa = addDays(fechaInicio, step * 10 - (index % 3) * 2);
      const aplica = !(index % 4 === 0 && step >= etapasAplicables - 2);

      await query(
        'INSERT INTO subtareas_etapas (subtarea_id, etapa_id, aplica, fecha_tentativa) VALUES (?, ?, ?, ?)',
        [subtareaId, etapa.id, aplica ? 1 : 0, formatDate(fechaTentativa)]
      );

      if (!aplica) continue;

      let estado = 'pendiente';
      if (step <= 1) estado = 'completado';
      else if (step === 2 || step === 3) estado = 'con_pendientes';
      else if (step === 4 && index % 2 === 0) estado = 'en_retraso';

      const fechaPlanificada = formatDate(fechaTentativa);
      const fechaReal = estado === 'completado' ? formatDate(addDays(fechaTentativa, 2 + (index % 4))) : null;

      await query(
        `INSERT INTO seguimiento_etapas
         (subtarea_id, etapa_id, estado, fecha_planificada, fecha_real, responsable_id, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          subtareaId,
          etapa.id,
          estado,
          fechaPlanificada,
          fechaReal,
          responsableId,
          `Seguimiento inicial (${estado}) - caso ${index + 1}.${step + 1}`
        ]
      );

      if (step <= 4) {
        const comentarioBase = `Bitácora etapa ${step + 1} - subtarea ${index + 1}`;
        await query(
          `INSERT INTO seguimientos_diarios
           (subtarea_id, etapa_id, fecha, comentario, tiene_alerta, responsable_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            subtareaId,
            etapa.id,
            formatDate(addDays(new Date(), -step - index)),
            `${comentarioBase} | revisión diaria`,
            estado === 'en_retraso' ? 1 : 0,
            responsableId
          ]
        );

        await query(
          `INSERT INTO seguimientos_diarios
           (subtarea_id, etapa_id, fecha, comentario, tiene_alerta, responsable_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            subtareaId,
            etapa.id,
            formatDate(addDays(new Date(), -step - index)),
            `${comentarioBase} | ajuste mismo día`,
            step % 3 === 0 ? 1 : 0,
            responsableId
          ]
        );
      }
    }
  }
}

async function printResumen() {
  const [subtareas] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM subtareas')
  ]);
  const [activos] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM subtareas WHERE activo = true')
  ]);
  const [seguimientoEtapas] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM seguimiento_etapas')
  ]);
  const [seguimientosDiarios] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM seguimientos_diarios')
  ]);

  const estados = await query(
    `SELECT estado, COUNT(*) AS total
     FROM seguimiento_etapas
     GROUP BY estado
     ORDER BY total DESC`
  );

  console.log('\n✅ Datos de prueba regenerados correctamente');
  console.log(`- Subtareas: ${subtareas[0].total}`);
  console.log(`- Subtareas activas: ${activos[0].total}`);
  console.log(`- Seguimiento por etapas: ${seguimientoEtapas[0].total}`);
  console.log(`- Seguimientos diarios: ${seguimientosDiarios[0].total}`);
  console.log('- Distribución de estados:', estados);
}

async function run() {
  try {
    await initMySQL();
    await ensureCatalogos();
    await limpiarDatosTransaccionales();
    await insertarSubtareasYSeguimiento();
    await printResumen();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al generar datos de prueba:', error.message);
    process.exit(1);
  }
}

run();