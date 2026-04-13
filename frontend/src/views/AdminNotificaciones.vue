<template>
  <div class="notificaciones-view">
    <div class="encabezado">
      <div>
        <h1>Notificaciones por correo</h1>
        <p class="subtitulo">
          Parametriza el servidor de correo, la plantilla HTML y el envío automático para procesos con etapas atrasadas.
        </p>
      </div>

      <div class="acciones-principales">
        <button type="button" @click="guardar" :disabled="guardando || cargando || !canEdit">
          {{ guardando ? 'Guardando...' : 'Guardar configuración' }}
        </button>
        <button type="button" class="btn-secundario" @click="ejecutarAhora" :disabled="ejecutando || cargando">
          {{ ejecutando ? 'Ejecutando...' : 'Ejecutar ahora' }}
        </button>
      </div>
    </div>

    <p v-if="mensaje" class="mensaje">{{ mensaje }}</p>

    <div v-if="modalEjecucionVisible" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-ejecucion">
        <div class="modal-ejecucion-header">
          <div>
            <span class="badge" :class="estadoEjecucionClase">{{ estadoEjecucionTexto }}</span>
            <h3>Envío de notificaciones</h3>
          </div>
          <button type="button" class="btn-cerrar-modal" @click="cerrarModalEjecucion">×</button>
        </div>

        <p class="modal-descripcion">{{ progresoEjecucion?.message || 'Preparando ejecución...' }}</p>

        <div class="progreso-barra-modal">
          <div class="progreso-barra-modal-fill" :style="{ width: `${porcentajeEjecucion}%` }"></div>
        </div>

        <div class="progreso-meta-modal">
          <strong>{{ porcentajeEjecucion }}%</strong>
          <span v-if="(progresoEjecucion?.totalRecipients || 0) > 0">
            {{ progresoEjecucion?.processedRecipients || 0 }} / {{ progresoEjecucion?.totalRecipients || 0 }} correos procesados
          </span>
          <span v-else>Preparando información de envío...</span>
        </div>

        <p v-if="(progresoEjecucion?.totalStages || 0) > 0" class="nota">
          Etapas atrasadas detectadas: <strong>{{ progresoEjecucion?.totalStages || 0 }}</strong>
          · enviados: <strong>{{ progresoEjecucion?.sent || 0 }}</strong>
        </p>

        <p v-if="progresoEjecucion?.error" class="mensaje-error-modal">{{ progresoEjecucion.error }}</p>

        <div class="modal-actions">
          <button type="button" class="btn-secundario" @click="cerrarModalEjecucion">
            {{ ejecutando ? 'Ocultar' : 'Cerrar' }}
          </button>
        </div>
      </div>
    </div>

    <section class="card grid-2">
      <div>
        <h2>Estado y programación</h2>
        <label class="switch-row">
          <input v-model="form.enabled" type="checkbox" :disabled="!canEdit || guardando" />
          <span>Habilitar envíos automáticos de correo</span>
        </label>

        <div class="campo-grid two-cols">
          <label>
            Hora de envío diaria
            <input v-model="form.sendTime" type="time" :disabled="!canEdit || guardando" />
          </label>
          <label>
            Zona horaria
            <input v-model="form.timezone" type="text" placeholder="America/Guayaquil" :disabled="!canEdit || guardando" />
          </label>
        </div>

        <label class="switch-row">
          <input v-model="form.notifyDelayedStages" type="checkbox" :disabled="!canEdit || guardando" />
          <span>Notificar responsables con etapas atrasadas</span>
        </label>

        <label>
          Notificar a partir de
          <div class="inline-field">
            <input v-model.number="form.delayedStageDays" type="number" min="1" :disabled="!canEdit || guardando || !form.notifyDelayedStages" />
            <span>días de atraso por etapa</span>
          </div>
        </label>

        <label>
          Correos en copia / supervisión
          <textarea
            v-model="form.supervisorEmails"
            rows="3"
            placeholder="supervisor1@dominio.gob.ec, supervisor2@dominio.gob.ec"
            :disabled="!canEdit || guardando"
          />
        </label>

        <p class="nota">
          Última ejecución registrada:
          <strong>{{ form.lastExecutionAt ? formatearFecha(form.lastExecutionAt) : 'Aún no ejecutado' }}</strong>
        </p>
      </div>

      <div>
        <h2>Remitente y servidor</h2>
        <div class="campo-grid two-cols">
          <label>
            Nombre remitente
            <input v-model="form.fromName" type="text" placeholder="Sistema de Seguimiento" :disabled="!canEdit || guardando" />
          </label>
          <label>
            Correo remitente
            <input v-model="form.fromEmail" type="email" placeholder="noreply@quitoturismo.gob.ec" :disabled="!canEdit || guardando" />
          </label>
        </div>

        <div class="campo-grid three-cols">
          <label>
            Tipo de servidor
            <select v-model="form.serverType" :disabled="!canEdit || guardando">
              <option value="smtp">SMTP personalizado</option>
              <option value="gmail">Gmail</option>
              <option value="office365">Office 365</option>
              <option value="sendgrid">SendGrid</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label>
            Host / servidor
            <input v-model="form.smtpHost" type="text" placeholder="smtp.midominio.gob.ec" :disabled="!canEdit || guardando" />
          </label>
          <label>
            Puerto
            <input v-model.number="form.smtpPort" type="number" min="1" :disabled="!canEdit || guardando" />
          </label>
        </div>

        <div class="campo-grid two-cols">
          <label class="switch-row compact">
            <input v-model="form.smtpSecure" type="checkbox" :disabled="!canEdit || guardando" />
            <span>Usar conexión segura (SSL/TLS)</span>
          </label>
          <label class="switch-row compact">
            <input v-model="form.requireAuth" type="checkbox" :disabled="!canEdit || guardando" />
            <span>Requiere autenticación</span>
          </label>
        </div>

        <div class="campo-grid two-cols">
          <label>
            Usuario SMTP
            <input v-model="form.smtpUser" type="text" placeholder="usuario_smtp" :disabled="!canEdit || guardando || !form.requireAuth" />
          </label>
          <label>
            Contraseña SMTP
            <input
              v-model="form.smtpPassword"
              type="password"
              :placeholder="form.smtpPasswordConfigured ? '•••••••• (se conserva si no la cambia)' : 'Ingrese la contraseña SMTP'"
              :disabled="!canEdit || guardando || !form.requireAuth"
            />
          </label>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2>Plantilla HTML del correo</h2>
          <p>Puede editar el diseño base que envolverá cada notificación automática.</p>
        </div>
      </div>

      <div class="campo-grid two-cols">
        <label>
          Asunto base
          <input v-model="form.subjectTemplate" type="text" :disabled="!canEdit || guardando" />
        </label>
        <label>
          Texto de pie
          <input v-model="form.footerText" type="text" :disabled="!canEdit || guardando" />
        </label>
      </div>

      <div class="tokens-box">
        <strong>Variables disponibles:</strong>
        <code v-pre>{{titulo}}</code>
        <code v-pre>{{motivo}}</code>
        <code v-pre>{{asunto}}</code>
        <code v-pre>{{contenido}}</code>
        <code v-pre>{{fecha}}</code>
        <code v-pre>{{pie}}</code>
      </div>

      <label>
        HTML plantilla
        <textarea v-model="form.htmlTemplate" rows="18" class="template-editor" :disabled="!canEdit || guardando" />
      </label>

      <div class="preview-wrapper">
        <div>
          <h3>Vista previa</h3>
          <p class="nota">Se renderiza con datos de ejemplo para revisar el diseño antes de guardar.</p>
        </div>
        <div class="preview-box" v-html="vistaPreviaHtml"></div>
      </div>
    </section>

    <section class="card">
      <h2>Prueba rápida</h2>
      <div class="campo-grid test-grid">
        <label>
          Correo para prueba
          <input v-model="correoPrueba" type="email" placeholder="usuario@quitoturismo.gob.ec" :disabled="probando" />
        </label>
        <div class="test-actions">
          <button type="button" class="btn-secundario" @click="enviarPrueba" :disabled="probando || !correoPrueba.trim()">
            {{ probando ? 'Enviando prueba...' : 'Enviar prueba' }}
          </button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-header">
        <div>
          <h2>Historial reciente</h2>
          <p>Últimos correos registrados por el sistema.</p>
        </div>
        <button type="button" class="btn-secundario" @click="cargarHistorial" :disabled="cargandoHistorial">
          {{ cargandoHistorial ? 'Actualizando...' : 'Actualizar historial' }}
        </button>
      </div>

      <div v-if="historial.length" class="tabla-wrapper">
        <table class="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Destinatario</th>
              <th>Asunto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in historial" :key="item.id">
              <td>{{ formatearFecha(item.fecha) }}</td>
              <td>{{ item.destinatario }}</td>
              <td>{{ item.asunto }}</td>
              <td>
                <span :class="['badge', item.enviada ? 'badge-ok' : 'badge-warn']">
                  {{ item.enviada ? 'Enviado' : 'Registrado / pendiente' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">No hay notificaciones registradas todavía.</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  notificacionesService,
  type NotificacionEmailConfig,
  type NotificacionExecutionStatus,
  type NotificacionHistorialItem
} from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const cargando = ref(false);
const guardando = ref(false);
const probando = ref(false);
const ejecutando = ref(false);
const cargandoHistorial = ref(false);
const mensaje = ref('');
const correoPrueba = ref('');
const historial = ref<NotificacionHistorialItem[]>([]);
const modalEjecucionVisible = ref(false);
const progresoEjecucion = ref<NotificacionExecutionStatus | null>(null);

function defaultConfig(): NotificacionEmailConfig {
  return {
    enabled: false,
    fromName: 'Sistema de Seguimiento',
    fromEmail: 'noreply@quitoturismo.gob.ec',
    serverType: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    requireAuth: true,
    smtpUser: '',
    smtpPassword: '',
    smtpPasswordConfigured: false,
    supervisorEmails: '',
    sendTime: '08:00',
    timezone: 'America/Guayaquil',
    notifyDelayedStages: true,
    delayedStageDays: 2,
    subjectTemplate: 'Seguimiento de contrataciones - {{motivo}}',
    htmlTemplate: '',
    footerText: 'Este es un mensaje automático del Sistema de Seguimiento de Contrataciones - QuitoTurismo',
    lastExecutionAt: null,
    lastExecutionDate: null
  };
}

const form = ref<NotificacionEmailConfig>(defaultConfig());
const canEdit = computed(() => auth.can('notificaciones', 'update'));
const porcentajeEjecucion = computed(() => {
  const raw = Number(progresoEjecucion.value?.percent ?? (ejecutando.value ? 5 : 0));
  return Math.max(0, Math.min(100, Math.round(raw)));
});
const estadoEjecucionTexto = computed(() => {
  const status = progresoEjecucion.value?.status;
  if (status === 'failed') return 'Error';
  if (status === 'completed') return progresoEjecucion.value?.skipped ? 'Omitido' : 'Completo';
  return 'Enviando';
});
const estadoEjecucionClase = computed(() => {
  const status = progresoEjecucion.value?.status;
  if (status === 'failed') return 'badge-error';
  if (status === 'completed') return progresoEjecucion.value?.skipped ? 'badge-warn' : 'badge-ok';
  return 'badge-info';
});

const SERVER_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  smtp: { host: '', port: 587, secure: false },
  gmail: { host: 'smtp.gmail.com', port: 465, secure: true },
  office365: { host: 'smtp.office365.com', port: 587, secure: false },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false },
  otro: { host: '', port: 587, secure: false }
};

watch(() => form.value.serverType, (tipo) => {
  const preset = SERVER_PRESETS[String(tipo)] ?? { host: '', port: 587, secure: false };
  if (tipo !== 'smtp' && tipo !== 'otro') {
    form.value.smtpHost = preset.host;
    form.value.smtpPort = preset.port;
    form.value.smtpSecure = preset.secure;
  }
});

const vistaPreviaHtml = computed(() => {
  const template = String(form.value.htmlTemplate || '');
  const contenidoEjemplo = `
    <p>Estimado/a <strong>Responsable del proceso</strong>,</p>
    <p>Se detectaron etapas atrasadas en sus procesos de contratación.</p>
    <div style="margin:18px 0 22px;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <div style="background:#eff6ff;padding:14px 16px;border-bottom:1px solid #dbeafe;">
        <div style="font-size:12px;color:#1d4ed8;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">Proceso</div>
        <h3 style="margin:6px 0 0;font-size:18px;color:#0f172a;">Adquisición de servicios turísticos</h3>
        <div style="margin-top:6px;font-size:13px;color:#334155;"><strong>Código:</strong> QT-2026-001 | <strong>Dirección:</strong> Dirección de Asesoría Jurídica</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Etapa atrasada</th>
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Fecha tentativa</th>
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:center;">Días tarde</th>
            <th style="padding:10px;border:1px solid #e2e8f0;text-align:left;">Último comentario de seguimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;">Validación jurídica</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">05/04/2026</td>
            <td style="padding:10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#b91c1c;">${form.value.delayedStageDays || 2}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">Se remitió observación para revisión final.</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;">Aprobación administrativa</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">03/04/2026</td>
            <td style="padding:10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#b91c1c;">${(form.value.delayedStageDays || 2) + 2}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">Sin seguimiento registrado</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  return template
    .replace(/{{\s*titulo\s*}}/g, 'Vista previa del correo')
    .replace(/{{\s*motivo\s*}}/g, `Etapas con ${form.value.delayedStageDays || 2}+ día(s) de atraso`)
    .replace(/{{\s*asunto\s*}}/g, 'Seguimiento de contrataciones - Etapas atrasadas')
    .replace(/{{\s*fecha\s*}}/g, formatearFecha(new Date().toISOString()))
    .replace(/{{\s*pie\s*}}/g, form.value.footerText || '')
    .replace(/{{\s*bannerHtml\s*}}/g, '<div style="padding:20px 24px 10px;background:#ffffff;border-bottom:1px solid #e2e8f0;"><img src="https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT.png" alt="Quito Turismo" style="display:block;max-width:220px;width:100%;height:auto;" /></div>')
    .replace(/{{\s*contenido\s*}}/g, contenidoEjemplo);
});

function formatearFecha(valor?: string | null) {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(fecha);
}

async function cargarConfiguracion() {
  cargando.value = true;
  mensaje.value = '';
  try {
    form.value = { ...defaultConfig(), ...(await notificacionesService.getConfiguracion()) };
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo cargar la configuración de correo';
  } finally {
    cargando.value = false;
  }
}

async function cargarHistorial() {
  cargandoHistorial.value = true;
  try {
    const data = await notificacionesService.getAll({ tipo: 'email' });
    historial.value = Array.isArray(data) ? data.slice(0, 12) : [];
  } catch {
    historial.value = [];
  } finally {
    cargandoHistorial.value = false;
  }
}

async function guardar() {
  if (!canEdit.value) {
    mensaje.value = 'Su usuario no tiene permisos para editar esta configuración';
    return;
  }

  guardando.value = true;
  mensaje.value = '';
  try {
    const actualizado = await notificacionesService.guardarConfiguracion(form.value);
    form.value = { ...form.value, ...actualizado, smtpPassword: '' };
    mensaje.value = 'Configuración de correo guardada correctamente';
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo guardar la configuración';
  } finally {
    guardando.value = false;
  }
}

async function enviarPrueba() {
  probando.value = true;
  mensaje.value = '';
  try {
    const resultado = await notificacionesService.enviarPrueba(correoPrueba.value);
    mensaje.value = resultado.sent
      ? 'Correo de prueba enviado correctamente'
      : (resultado.message || 'La prueba se registró pero no se pudo enviar');
    await cargarHistorial();
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo enviar el correo de prueba';
  } finally {
    probando.value = false;
  }
}

function cerrarModalEjecucion() {
  modalEjecucionVisible.value = false;
}

function esperar(ms = 1200) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function obtenerMensajeError(error: any) {
  const backendMessage = error?.response?.data?.error || error?.message;
  if (String(backendMessage || '').match(/timed out|timeout/i)) {
    return 'La ejecución tardó demasiado en responder. Ahora se procesa en segundo plano y se muestra el avance en pantalla.';
  }
  return backendMessage || 'No se pudo ejecutar el proceso automático';
}

async function monitorearEjecucion(jobId: string) {
  for (let intento = 0; intento < 180; intento += 1) {
    const estado = await notificacionesService.getEstadoEjecucion(jobId);
    progresoEjecucion.value = estado;

    if (estado.status === 'completed' || estado.status === 'failed') {
      return estado;
    }

    await esperar(1200);
  }

  throw new Error('La ejecución sigue en proceso. Revise nuevamente el historial en unos minutos.');
}

async function ejecutarAhora() {
  ejecutando.value = true;
  mensaje.value = '';
  modalEjecucionVisible.value = true;
  progresoEjecucion.value = {
    jobId: 'pendiente',
    status: 'running',
    percent: 2,
    message: 'Iniciando la ejecución manual de notificaciones...'
  };

  try {
    const inicio = await notificacionesService.ejecutarAhora();
    progresoEjecucion.value = inicio;

    const resultadoFinal = inicio.jobId ? await monitorearEjecucion(inicio.jobId) : inicio;
    progresoEjecucion.value = resultadoFinal;

    if (resultadoFinal.status === 'failed') {
      throw new Error(resultadoFinal.error || resultadoFinal.message || 'La ejecución terminó con errores');
    }

    if (resultadoFinal.skipped) {
      mensaje.value = resultadoFinal.message || 'La ejecución fue omitida por la configuración actual';
    } else {
      const resumen = resultadoFinal.delayedStages;
      mensaje.value = resumen
        ? `Proceso ejecutado: ${resumen.sent} correo(s) enviados a ${resumen.totalRecipients} responsable(s)`
        : (resultadoFinal.message || 'Proceso ejecutado correctamente');
    }

    await Promise.all([cargarConfiguracion(), cargarHistorial()]);
  } catch (error: any) {
    const textoError = obtenerMensajeError(error);
    mensaje.value = textoError;
    progresoEjecucion.value = {
      ...(progresoEjecucion.value || { jobId: 'pendiente' }),
      status: 'failed',
      percent: 100,
      message: textoError,
      error: textoError
    } as NotificacionExecutionStatus;
    modalEjecucionVisible.value = true;
  } finally {
    ejecutando.value = false;
  }
}

onMounted(async () => {
  await Promise.all([cargarConfiguracion(), cargarHistorial()]);
});
</script>

<style scoped>
.notificaciones-view {
  display: grid;
  gap: 1rem;
}

.encabezado,
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.subtitulo {
  margin: 0.35rem 0 0;
  color: #475569;
}

.acciones-principales {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 1rem 1.1rem;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.campo-grid {
  display: grid;
  gap: 0.85rem;
  margin: 0.8rem 0;
}

.two-cols {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.three-cols {
  grid-template-columns: 1fr 1.2fr 0.7fr;
}

.test-grid {
  grid-template-columns: 1.5fr auto;
  align-items: end;
}

label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.95rem;
  color: #0f172a;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  background: #fff;
}

textarea {
  resize: vertical;
}

button {
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  background: #0f766e;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-secundario {
  background: #334155;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0.8rem 0;
}

.switch-row input {
  width: auto;
}

.compact {
  margin: 0;
}

.inline-field {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inline-field input {
  max-width: 110px;
}

.template-editor {
  font-family: 'Consolas', 'Courier New', monospace;
  min-height: 320px;
}

.tokens-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 0.75rem;
  margin-bottom: 0.9rem;
}

.tokens-box code {
  background: #e2e8f0;
  border-radius: 6px;
  padding: 0.15rem 0.45rem;
}

.preview-wrapper {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.preview-box {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  padding: 0.75rem;
  overflow: auto;
}

.mensaje {
  margin: 0;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  background: #ecfeff;
  color: #155e75;
  border: 1px solid #a5f3fc;
}

.nota {
  color: #64748b;
  font-size: 0.9rem;
}

.tabla-wrapper {
  overflow-x: auto;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
}

.tabla th,
.tabla td {
  padding: 0.7rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.badge-ok {
  background: #dcfce7;
  color: #166534;
}

.badge-warn {
  background: #fef3c7;
  color: #92400e;
}

.badge-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-error {
  background: #fee2e2;
  color: #b91c1c;
}

.empty-state {
  color: #64748b;
  padding: 1rem 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 1200;
}

.modal-ejecucion {
  width: min(520px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
  border: 1px solid #e2e8f0;
  display: grid;
  gap: 0.85rem;
}

.modal-ejecucion-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.modal-ejecucion-header h3 {
  margin: 0.45rem 0 0;
}

.btn-cerrar-modal {
  background: transparent;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.2rem 0.55rem;
  line-height: 1;
}

.modal-descripcion {
  margin: 0;
  color: #334155;
}

.progreso-barra-modal {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.progreso-barra-modal-fill {
  height: 100%;
  background: linear-gradient(90deg, #0f766e 0%, #14b8a6 100%);
  transition: width 0.35s ease;
}

.progreso-meta-modal {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  color: #334155;
  font-size: 0.92rem;
}

.mensaje-error-modal {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
}

.test-actions {
  display: flex;
  align-items: end;
}

@media (max-width: 960px) {
  .grid-2,
  .two-cols,
  .three-cols,
  .test-grid {
    grid-template-columns: 1fr;
  }

  .encabezado,
  .section-header {
    flex-direction: column;
  }
}
</style>
