import { initMySQL, query } from '../data/mysql.js';

function repairMojibake(value = '') {
  let text = String(value || '');

  const directReplacements = new Map([
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'],
    ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ']
  ]);

  for (const [bad, good] of directReplacements.entries()) {
    text = text.split(bad).join(good);
  }

  const replacementCharPatterns = new Map([
    [/Direcci.n/gi, 'Dirección'],
    [/Asesor.a/gi, 'Asesoría'],
    [/Jur.dica/gi, 'Jurídica'],
    [/Comercializaci.n/gi, 'Comercialización'],
    [/Comunicaci.n/gi, 'Comunicación'],
    [/Promoci.n/gi, 'Promoción'],
    [/Planificaci.n/gi, 'Planificación'],
    [/Informaci.n/gi, 'Información'],
    [/Tecnolog.as/gi, 'Tecnologías'],
    [/Tur.stica/gi, 'Turística'],
    [/Tur.stico/gi, 'Turístico'],
    [/Atracci.n/gi, 'Atracción'],
    [/Estad.stica/gi, 'Estadística'],
    [/Gesti.n/gi, 'Gestión'],
    [/Administraci.n/gi, 'Administración']
  ]);

  for (const [pattern, replacement] of replacementCharPatterns.entries()) {
    text = text.replace(pattern, replacement);
  }

  return text.trim().replace(/\s+/g, ' ');
}

async function fixTable(table, idCol, textCols) {
  const rows = await query(`SELECT ${idCol}, ${textCols.join(', ')} FROM ${table}`);
  let changed = 0;

  for (const row of rows) {
    const sets = [];
    const values = [];

    for (const col of textCols) {
      const original = row[col];
      if (original === null || original === undefined) continue;
      const repaired = repairMojibake(original);
      if (repaired !== original) {
        sets.push(`${col} = ?`);
        values.push(repaired);
      }
    }

    if (sets.length > 0) {
      values.push(row[idCol]);
      await query(`UPDATE ${table} SET ${sets.join(', ')} WHERE ${idCol} = ?`, values);
      changed += 1;
    }
  }

  return changed;
}

async function main() {
  await initMySQL();

  const usuarios = await fixTable('usuarios', 'id', ['nombre', 'direccion_nombre']);
  const direcciones = await fixTable('direcciones_catalogo', 'id', ['nombre']);
  const responsables = await fixTable('responsables_catalogo', 'id', ['nombre']);

  console.log(JSON.stringify({
    success: true,
    updatedRows: {
      usuarios,
      direcciones_catalogo: direcciones,
      responsables_catalogo: responsables
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
