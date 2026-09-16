import ExcelJS from 'exceljs';
import mysql from 'mysql2/promise';

(async () => {
  try {
    // Leer Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\acasa\\OneDrive - QuitoTurismo\\Documentos\\Desarrollo\\Seguimiento_contrataciones\\Matriz_Base_POA_2026_1.xlsx');
    const worksheet = workbook.getWorksheet(1);

    // Conectar BD
    const conn = await mysql.createConnection({
      host: '172.16.1.80',
      user: 'usr-cont',
      password: 'mas_TER$*25@',
      database: 'poa_pac'
    });

    console.log('📂 CARGANDO EXCEL A BD\n');

    let insertados = 0;
    let actualizados = 0;
    let vinculados = 0;
    let errores = 0;

    // Procesar filas secuencialmente
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push({ row, rowNumber });
    });

    for (const { row, rowNumber } of rows) {
      const values = row.values;

      // Mapear columnas (basado en índices del Excel)
      const proceso = {
        subtarea: values[58],           // col 58: subtarea
        codigo_olympo: values[60],      // col 60: codigo_olympo
        codigo_unico_proceso: values[160], // col 160: codigo_unico_proceso
        direccion: values[1],           // col 1: direccion
        tipo_contratacion: values[156], // col 156: tipo_contratacion
        pac_no_pac: values[155],        // col 155: pac_no_pac
        presupuesto_2026_inicial: values[65], // col 65: presupuesto_2026_anual
        fuente_financiamiento: values[64],    // col 64: fuente_financiamiento
        partida_presupuestaria: values[62],   // col 62: partida_presupuestaria
        reforma_8: values[85]           // col 85: reforma_8
      };

      if (!proceso.subtarea || !proceso.codigo_olympo) continue;

      try {
        // Verificar si existe
        const [existing] = await conn.query(
          'SELECT id FROM subtareas WHERE codigo_olympo = ?',
          [proceso.codigo_olympo]
        );

        let subtarea_id;

        if (existing.length > 0) {
          // Actualizar
          subtarea_id = existing[0].id;
          await conn.query(
            `UPDATE subtareas SET nombre = ?, direccion_encargada = ?, tipo_contratacion = ?,
             pac_no_pac = ?, presupuesto_2026_inicial = ?, fuente_financiamiento = ?,
             partida_presupuestaria = ?, updated_at = NOW()
             WHERE id = ?`,
            [proceso.subtarea, proceso.direccion, proceso.tipo_contratacion,
             proceso.pac_no_pac, proceso.presupuesto_2026_inicial, proceso.fuente_financiamiento,
             proceso.partida_presupuestaria, subtarea_id]
          );
          actualizados++;
        } else {
          // Insertar
          const [result] = await conn.query(
            `INSERT INTO subtareas (nombre, codigo_olympo, codigo_unico_proceso, direccion_encargada,
             tipo_contratacion, pac_no_pac, presupuesto_2026_inicial, fuente_financiamiento,
             partida_presupuestaria, activo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [proceso.subtarea, proceso.codigo_olympo, proceso.codigo_unico_proceso,
             proceso.direccion, proceso.tipo_contratacion, proceso.pac_no_pac,
             proceso.presupuesto_2026_inicial, proceso.fuente_financiamiento,
             proceso.partida_presupuestaria]
          );
          subtarea_id = result.insertId;
          insertados++;
        }

        // Vincular a Reforma 8 si tiene valor en esa columna
        if (proceso.reforma_8) {
          const [existingVersion] = await conn.query(
            'SELECT id FROM subtareas_versiones WHERE subtarea_id_original = ? AND version_id = 12',
            [subtarea_id]
          );

          if (existingVersion.length === 0) {
            await conn.query(
              `INSERT INTO subtareas_versiones (subtarea_id_original, version_id, nombre, codigo_olympo,
               codigo_unico_proceso, direccion_encargada, tipo_contratacion, pac_no_pac,
               presupuesto_2026_inicial, fuente_financiamiento, partida_presupuestaria, activo,
               created_at, updated_at)
               VALUES (?, 12, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
              [subtarea_id, proceso.subtarea, proceso.codigo_olympo, proceso.codigo_unico_proceso,
               proceso.direccion, proceso.tipo_contratacion, proceso.pac_no_pac,
               proceso.presupuesto_2026_inicial, proceso.fuente_financiamiento, proceso.partida_presupuestaria]
            );
            vinculados++;
          }
        }

        if ((insertados + actualizados) % 50 === 0) {
          console.log(`⏳ Procesados: ${insertados + actualizados}...`);
        }

      } catch (err) {
        console.error(`❌ Error en fila ${rowNumber}: ${err.message}`);
        errores++;
      }
    }

    console.log(`\n✅ Insertados: ${insertados}`);
    console.log(`🔄 Actualizados: ${actualizados}`);
    console.log(`🔗 Vinculados a Reforma 8: ${vinculados}`);
    if (errores > 0) console.log(`❌ Errores: ${errores}`);

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
