import { initMySQL, getAllSubtareas } from './backend/data/mysql.js';

const codes = new Set([
  '02.01.001.047.730249.000.002',
  '02.01.001.021.730207.000.002'
]);

const run = async () => {
  await initMySQL();
  const all = await getAllSubtareas();
  const found = all
    .filter((s) => codes.has(String(s?.codigoOlympo || '').trim()))
    .map((s) => ({ codigoOlympo: s.codigoOlympo, nombre: s.nombre, direccion: s?.direccionNombre || s?.direccionEncargada || null }));

  console.log(JSON.stringify({ totalFound: found.length, found }, null, 2));
};

run().catch((e) => {
  console.error('VALIDATION_ERROR', e?.message || e);
  process.exit(1);
});
