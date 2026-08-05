import mysql from 'mysql2/promise';

const dbConfig = {
  host: '172.16.1.80',
  port: 3306,
  user: 'usr-cont',
  password: 'mas_TER$*25@',
  database: 'poa_pac'
};

// Definición del catálogo de etapas con su clasificación
const catalogoEtapas = {
  preparatoria: [
    'SOLICTUD DE CERTIFICACION PROGRAMATICA',
    'CERTIFICACION POA PAI',
    'SOLICITUD DE CATE',
    'CATE',
    'INFORME TECNICO',
    'INFORME DE NECESIDAD',
    'SOLICITUD DE AUTORIZACION DE INFORME DE NECESIDAD',
    'AUTORIZACION DEL INFORME',
    'TERMINOS DE REFERENCIA - ESPECIFICACIONES TECNICAS'
  ],
  precontractual: [
    'SOLICITUD DE PUBLICACION',
    'PUBLICACION PROFORMAS',
    'ENTREGA DE PROFORMAS',
    'RECEPCION PROFORMAS',
    'ESTUDIO DE MERCADO',
    'SOLICITUD DE CERTIFICACION PRESUPUESTARIA',
    'CERTIFICACION PRESUESTARIA',
    'SOLICITUD DE CERTICACION PAC',
    'CERTIFICACION PAC',
    'SOLICTUD DE AUTORIZACION DE INICIO',
    'AUTORIZACION INICIO',
    'ELABORACION DE PLIEGOS',
    'SOLICITUD DE RESOLUCION DE INICO',
    'RESOLUCION DE INICIO',
    'FECHA DE PUBLICACION EN EL PORTAL - SUSCRIPCION DE INFIMA CUANTIA',
    'PREGUNTAS',
    'RESPUESTA',
    'ENTREA DE OFERTA',
    'REVISION PARA CONVALIDACION',
    'SOLICITUD DE CONVALIDACION',
    'ENTREGA DE CONVALIDACION',
    'CALIFICACION',
    'ADJUDICACION'
  ],
  contractual: [
    'CONTRATO'
  ]
};

async function crearTablaYActualizarCatalogo() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // Crear tabla si no existe
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS etapas_catalogo (
        id INT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        clasificacion ENUM('preparatoria', 'precontractual', 'contractual', 'sin_clasificar') DEFAULT 'sin_clasificar',
        orden INT,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id) REFERENCES etapas_pac(id) ON DELETE CASCADE
      )
    `);

    console.log('✓ Tabla etapas_catalogo creada/verificada\n');

    // Obtener todas las etapas actuales
    const [etapas] = await conn.execute(`
      SELECT id, nombre FROM etapas_pac ORDER BY id ASC
    `);

    console.log('Clasificando etapas...\n');

    let preparatoria = 0;
    let precontractual = 0;
    let contractual = 0;
    let sinClasificar = 0;

    for (const etapa of etapas) {
      let clasificacion = 'sin_clasificar';
      let orden = null;

      // Determinar clasificación
      if (catalogoEtapas.preparatoria.some(e =>
        e.toLowerCase().trim() === etapa.nombre.toLowerCase().trim())) {
        clasificacion = 'preparatoria';
        orden = catalogoEtapas.preparatoria.indexOf(
          catalogoEtapas.preparatoria.find(e =>
            e.toLowerCase().trim() === etapa.nombre.toLowerCase().trim()
          )
        ) + 1;
        preparatoria++;
      } else if (catalogoEtapas.precontractual.some(e =>
        e.toLowerCase().trim() === etapa.nombre.toLowerCase().trim())) {
        clasificacion = 'precontractual';
        orden = catalogoEtapas.precontractual.indexOf(
          catalogoEtapas.precontractual.find(e =>
            e.toLowerCase().trim() === etapa.nombre.toLowerCase().trim()
          )
        ) + 1;
        precontractual++;
      } else if (catalogoEtapas.contractual.some(e =>
        e.toLowerCase().trim() === etapa.nombre.toLowerCase().trim())) {
        clasificacion = 'contractual';
        orden = 1;
        contractual++;
      } else {
        sinClasificar++;
      }

      // Insertar o actualizar
      await conn.execute(`
        INSERT INTO etapas_catalogo (id, nombre, clasificacion, orden)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          clasificacion = VALUES(clasificacion),
          orden = VALUES(orden),
          updated_at = CURRENT_TIMESTAMP
      `, [etapa.id, etapa.nombre, clasificacion, orden]);

      const icon = clasificacion === 'sin_clasificar' ? '?' : '✓';
      console.log(`${icon} [${clasificacion.toUpperCase()}] ${etapa.nombre}`);
    }

    console.log(`\n\n=== RESUMEN DE CLASIFICACIÓN ===`);
    console.log(`✓ Preparatoria: ${preparatoria} etapas`);
    console.log(`✓ Precontractual: ${precontractual} etapas`);
    console.log(`✓ Contractual: ${contractual} etapas`);
    console.log(`? Sin clasificar: ${sinClasificar} etapas`);
    console.log(`\nTotal: ${etapas.length} etapas`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

crearTablaYActualizarCatalogo();
