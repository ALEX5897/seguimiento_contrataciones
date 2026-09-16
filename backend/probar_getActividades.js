import { getActividadesByVersion, initMySQL } from './data/mysql.js';

(async () => {
  try {
    console.log('🔄 Inicializando MySQL...\n');
    await initMySQL();

    console.log('🔄 Obteniendo actividades de Reforma 8...\n');
    const actividades = await getActividadesByVersion(12);

    console.log(`✅ Total procesos: ${actividades.length}`);

    // Mostrar primeros 5
    console.log(`\n🔹 Primeros 5 procesos:\n`);
    actividades.slice(0, 5).forEach((a, idx) => {
      console.log(`${idx + 1}. ${a.codigoOlympo}`);
      console.log(`   Etapas: ${a.etapas?.length || 0}`);
      if (a.etapas && a.etapas.length > 0) {
        const completadas = a.etapas.filter(e => e.estado === 'completado').length;
        const porcentaje = ((completadas / a.etapas.length) * 100).toFixed(0);
        console.log(`   Completadas: ${completadas}/${a.etapas.length} (${porcentaje}%)`);
      }
      console.log();
    });

    // Contar procesos con etapas
    const conEtapas = actividades.filter(a => a.etapas && a.etapas.length > 0).length;
    console.log(`📊 Procesos con etapas: ${conEtapas}/${actividades.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
