import { initMySQL, getAllSubtareas } from './backend/data/mysql.js';

const norm = (v = '') => String(v || '').toLowerCase();

const run = async () => {
  await initMySQL();
  const all = await getAllSubtareas();

  const tics = all.filter((s) => {
    const d1 = norm(s?.direccionNombre);
    const d2 = norm(s?.direccionEncargada);
    const d = `${d1} ${d2}`;
    return d.includes('tics') || d.includes('tecnolog');
  });

  const out = tics.map((s) => ({
    codigoOlympo: s?.codigoOlympo || null,
    nombre: s?.nombre || null,
    direccion: s?.direccionNombre || s?.direccionEncargada || null
  }));

  console.log(JSON.stringify({ total: out.length, items: out }, null, 2));
};

run().catch((e) => {
  console.error('VALIDATION_ERROR', e?.message || e);
  process.exit(1);
});
