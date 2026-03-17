import { ESTADOS } from '../data/database.js';
import { getDatabaseSnapshot } from '../data/mysql.js';
import { enviarAlertaVencimiento, enviarAlertaAtraso } from './notificaciones.js';

// Verificar tareas próximas a vencer
export async function verificarVencimientos() {
  const diasAnticipacion = parseInt(process.env.ALERT_DAYS_BEFORE || '3');
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(hoy.getDate() + diasAnticipacion);
  const database = await getDatabaseSnapshot();

  console.log(`\n🔍 Verificando vencimientos próximos (${diasAnticipacion} días)...`);

  const tareasProximasVencer = database.tareas.filter(tarea => {
    if (!tarea.fechaFin || tarea.estado === ESTADOS.COMPLETADA || tarea.estado === ESTADOS.CERRADA) {
      return false;
    }
    const fechaFin = new Date(tarea.fechaFin);
    return fechaFin >= hoy && fechaFin <= fechaLimite;
  });

  console.log(`   Encontradas ${tareasProximasVencer.length} tareas próximas a vencer`);

  for (const tarea of tareasProximasVencer) {
    const fechaFin = new Date(tarea.fechaFin);
    const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
    console.log(`   - ${tarea.nombre}: ${diasRestantes} días restantes`);
    await enviarAlertaVencimiento(tarea, diasRestantes);
  }

  return tareasProximasVencer;
}

// Verificar tareas atrasadas
export async function verificarAtrasos() {
  const hoy = new Date();
  const database = await getDatabaseSnapshot();

  console.log('\n🔍 Verificando tareas atrasadas...');

  const tareasAtrasadas = database.tareas.filter(tarea => {
    if (!tarea.fechaFin || tarea.estado === ESTADOS.COMPLETADA || tarea.estado === ESTADOS.CERRADA) {
      return false;
    }
    const fechaFin = new Date(tarea.fechaFin);
    return fechaFin < hoy;
  });

  console.log(`   Encontradas ${tareasAtrasadas.length} tareas atrasadas`);

  for (const tarea of tareasAtrasadas) {
    const fechaFin = new Date(tarea.fechaFin);
    const diasAtraso = Math.floor((hoy - fechaFin) / (1000 * 60 * 60 * 24));
    console.log(`   - ${tarea.nombre}: ${diasAtraso} días de atraso`);
    await enviarAlertaAtraso(tarea, diasAtraso);
  }

  return tareasAtrasadas;
}

// Verificar hitos críticos pendientes
export async function verificarHitosCriticos() {
  const hoy = new Date();
  const database = await getDatabaseSnapshot();
  const hitosProximos = database.hitosContratacion.filter(hito => {
    if (hito.estado !== 'pendiente') return false;
    
    const fechaPlanificada = new Date(hito.fechaPlanificada);
    const diasHasta = Math.ceil((fechaPlanificada - hoy) / (1000 * 60 * 60 * 24));
    
    return diasHasta <= 2 && diasHasta >= 0; // Alertar 2 días antes
  });

  console.log(`   Encontrados ${hitosProximos.length} hitos críticos próximos`);

  return hitosProximos;
}
