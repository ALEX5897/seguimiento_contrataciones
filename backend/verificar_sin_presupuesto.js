import * as mysql from './data/mysql.js';

async function verificarSinPresupuesto() {
  try {
    console.log('🔍 Buscando procesos sin presupuesto...\n');

    // Obtener versión actual
    const versionActual = await mysql.getVersionActual();
    if (!versionActual) {
      console.log('❌ No hay versión actual activa');
      return;
    }

    console.log(`Versión: ${versionActual.nombre} (ID: ${versionActual.id})\n`);

    // Obtener procesos de la versión
    const procesos = await mysql.getActividadesByVersion(versionActual.id);

    // Filtrar procesos sin presupuesto
    const sinPresupuesto = procesos.filter(p => !p.presupuesto || p.presupuesto === 0 || isNaN(p.presupuesto));

    console.log(`📊 Estadísticas:`);
    console.log(`   Total procesos: ${procesos.length}`);
    console.log(`   Sin presupuesto: ${sinPresupuesto.length}`);
    console.log(`   Con presupuesto: ${procesos.length - sinPresupuesto.length}\n`);

    if (sinPresupuesto.length > 0) {
      console.log(`📋 Procesos sin presupuesto:\n`);
      sinPresupuesto.forEach((p, idx) => {
        console.log(`${idx + 1}. ID: ${p.id}`);
        console.log(`   Nombre: ${p.nombre}`);
        console.log(`   Código: ${p.codigoOlympo}`);
        console.log(`   Presupuesto: ${p.presupuesto || 'NULL/0'}`);
        console.log(`   Dirección: ${p.direccionEncargada || p.direccionNombre || 'N/A'}`);
        console.log(`   Activo: ${p.activo ? 'Sí' : 'No'}`);
        console.log();
      });
    } else {
      console.log('✅ Todos los procesos tienen presupuesto asignado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

verificarSinPresupuesto();
