import { ESTADOS } from '../data/database.js';
import { getDatabaseSnapshot } from '../data/mysql.js';
import { enviarCorreo } from './notificaciones.js';

// Generar resumen semanal por dirección
export async function generarResumenSemanal() {
  console.log('\n📊 Generando resumen semanal...');

  const database = await getDatabaseSnapshot();

  const direcciones = database.direcciones;
  
  for (const direccion of direcciones) {
    const responsables = database.responsables.filter(r => r.direccionId === direccion.id);
    const actividades = database.actividades.filter(a => a.direccionId === direccion.id);
    
    // Obtener todas las tareas de esta dirección
    const actividadIds = actividades.map(a => a.id);
    const tareas = database.tareas.filter(t => actividadIds.includes(t.actividadId));
    
    if (tareas.length === 0) continue;

    // Estadísticas
    const tareasEnRiesgo = tareas.filter(t => {
      if (!t.fechaFin || t.estado === ESTADOS.COMPLETADA || t.estado === ESTADOS.CERRADA) {
        return false;
      }
      const diasHastaFin = Math.ceil((new Date(t.fechaFin) - new Date()) / (1000 * 60 * 60 * 24));
      return diasHastaFin >= 0 && diasHastaFin <= 7;
    });

    const tareasAtrasadas = tareas.filter(t => {
      if (!t.fechaFin || t.estado === ESTADOS.COMPLETADA || t.estado === ESTADOS.CERRADA) {
        return false;
      }
      return new Date(t.fechaFin) < new Date();
    });

    const tareasCompletadas = tareas.filter(t => 
      t.estado === ESTADOS.COMPLETADA || t.estado === ESTADOS.CERRADA
    );

    // Generar contenido HTML del resumen
    const contenido = `
      <h2>📊 Resumen Semanal - ${direccion.nombre}</h2>
      <p><strong>Período:</strong> ${new Date().toLocaleDateString('es-EC')}</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Resumen General</h3>
        <ul style="list-style: none; padding: 0;">
          <li>📝 Total de procesos: <strong>${tareas.length}</strong></li>
          <li>✅ Procesos completados: <strong>${tareasCompletadas.length}</strong> (${Math.round(tareasCompletadas.length / tareas.length * 100)}%)</li>
          <li>⚠️ Procesos en riesgo: <strong style="color: #f59e0b;">${tareasEnRiesgo.length}</strong></li>
          <li>🚨 Procesos atrasados: <strong style="color: #dc2626;">${tareasAtrasadas.length}</strong></li>
        </ul>
      </div>

      ${tareasAtrasadas.length > 0 ? `
      <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
        <h3 style="color: #dc2626;">🚨 Procesos atrasados</h3>
        <ul>
          ${tareasAtrasadas.slice(0, 5).map(t => {
            const diasAtraso = Math.floor((new Date() - new Date(t.fechaFin)) / (1000 * 60 * 60 * 24));
            const resp = database.responsables.find(r => r.id === t.responsableId);
            return `<li><strong>${t.nombre}</strong> - ${diasAtraso} días de atraso (${resp?.nombre || 'Sin asignar'})</li>`;
          }).join('')}
          ${tareasAtrasadas.length > 5 ? `<li><em>... y ${tareasAtrasadas.length - 5} más</em></li>` : ''}
        </ul>
      </div>
      ` : ''}

      ${tareasEnRiesgo.length > 0 ? `
      <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <h3 style="color: #f59e0b;">⚠️ Procesos en riesgo (próximos 7 días)</h3>
        <ul>
          ${tareasEnRiesgo.slice(0, 5).map(t => {
            const diasRestantes = Math.ceil((new Date(t.fechaFin) - new Date()) / (1000 * 60 * 60 * 24));
            const resp = database.responsables.find(r => r.id === t.responsableId);
            return `<li><strong>${t.nombre}</strong> - ${diasRestantes} días restantes (${resp?.nombre || 'Sin asignar'})</li>`;
          }).join('')}
          ${tareasEnRiesgo.length > 5 ? `<li><em>... y ${tareasEnRiesgo.length - 5} más</em></li>` : ''}
        </ul>
      </div>
      ` : ''}

      ${tareasCompletadas.length > 0 ? `
      <div style="background-color: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
        <h3 style="color: #10b981;">✅ Procesos completados</h3>
        <p>Se completaron <strong>${tareasCompletadas.length}</strong> procesos esta semana.</p>
      </div>
      ` : ''}

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un resumen automático generado el ${new Date().toLocaleString('es-EC')}<br>
        Sistema de Seguimiento de Contrataciones - QuitoTurismo
      </p>
    `;

    // Enviar a todos los responsables de la dirección
    const destinatarios = responsables.map(r => r.email);
    const supervisores = process.env.SUPERVISOR_EMAILS?.split(',').filter(e => e.trim());
    if (supervisores && supervisores.length > 0) {
      destinatarios.push(...supervisores);
    }

    if (destinatarios.length > 0) {
      await enviarCorreo(
        destinatarios,
        `📊 Resumen Semanal - ${direccion.nombre}`,
        contenido
      );
      console.log(`   ✅ Resumen enviado a ${direccion.nombre}`);
    }
  }

  console.log('   Resúmenes semanales generados\n');
}
