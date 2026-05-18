<template>
  <div class="informes-view">
    <header class="inf-header">
      <div>
        <h1>Informes Gerenciales</h1>
        <p>Genera dos tipos de informes PDF: Resumen Ejecutivo o Detalle de Cambios</p>
      </div>
      <span class="scope-tag" :class="auth.isDireccion ? 'scope-dir' : 'scope-global'">
        {{ auth.isDireccion ? auth.user?.direccionNombre || 'Tu dirección' : 'Vista consolidada' }}
      </span>
    </header>

    <!-- Selector de tipo de informe -->
    <div class="tabs-selector">
      <button
        class="tab-button"
        :class="{ active: tipoInforme === 'ejecutivo' }"
        @click="tipoInforme = 'ejecutivo'"
      >
        <i class="ri-bar-chart-2-line" />
        Resumen Ejecutivo
      </button>
      <button
        class="tab-button"
        :class="{ active: tipoInforme === 'detalle' }"
        @click="tipoInforme = 'detalle'"
      >
        <i class="ri-list-details-line" />
        Detalle de Cambios
      </button>
    </div>

    <p v-if="errorMsg" class="alert-error">{{ errorMsg }}</p>
    <p v-if="successMsg" class="alert-success">{{ successMsg }}</p>

    <div class="inf-content">
      <!-- Panel de Últimos Comentarios (sin selección de fechas) -->
      <div class="panel-ultimos-comentarios">
        <div class="info-tipo">
          <h4>💬 Últimos Comentarios de Todos los Procesos</h4>
          <p>Genera un informe completo con el último comentario de cada proceso sin importar la fecha. Ideal para revisar el estado actual de todos los trabajos.</p>
        </div>

        <button
          class="btn-generar-comentarios"
          :disabled="generandoComentarios"
          @click="generarUltimosComentarios"
        >
          <i class="ri-file-pdf-line" />
          {{ generandoComentarios ? 'Generando PDF...' : 'Descargar Informe Completo' }}
        </button>
      </div>
    </div>

    <div class="inf-content">
      <!-- Panel de generación -->
      <div class="panel-generacion">
        <div class="info-tipo">
          <h4 v-if="tipoInforme === 'ejecutivo'">📊 Resumen Ejecutivo</h4>
          <h4 v-else>📋 Detalle de Cambios por Dirección</h4>
          <p v-if="tipoInforme === 'ejecutivo'">
            Visión general del cumplimiento, indicadores KPI y análisis de direcciones.
          </p>
          <p v-else>
            Detalle línea por línea de cambios de estado y comentarios agregados en cada proceso.
          </p>
        </div>

        <div class="form-group">
          <label for="fechaInicio">Fecha de inicio</label>
          <input
            id="fechaInicio"
            v-model="formData.fechaInicio"
            type="date"
            class="input-field"
          />
        </div>

        <div class="form-group">
          <label for="fechaFin">Fecha de fin</label>
          <input
            id="fechaFin"
            v-model="formData.fechaFin"
            type="date"
            class="input-field"
          />
        </div>

        <button
          class="btn-generar"
          :disabled="generando || !formData.fechaInicio || !formData.fechaFin"
          @click="generarInforme"
        >
          <i class="ri-file-pdf-line" />
          {{ generando ? 'Generando PDF...' : `Generar ${tipoInforme === 'ejecutivo' ? 'Resumen' : 'Detalle'}` }}
        </button>
      </div>

      <!-- Vista previa de información -->
      <div class="panel-preview">
        <h3 v-if="tipoInforme === 'ejecutivo'">Contenido - Resumen Ejecutivo</h3>
        <h3 v-else>Contenido - Detalle de Cambios</h3>

        <div class="checklist" v-if="tipoInforme === 'ejecutivo'">
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Resumen ejecutivo con indicadores principales</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Análisis detallado por dirección</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Contratos con mayor monto por dirección</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Etapas tardías y avance de cumplimiento</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Rankings de direcciones más activas</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Direcciones sin cambios registrados</span>
          </div>
        </div>

        <div class="checklist" v-else>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Desglose por cada dirección</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Para cada proceso: cambios de estado en etapas</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Comentarios agregados en el período</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Fecha de última actualización por dirección</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Cronología de cambios con usuario responsable</span>
          </div>
          <div class="check-item">
            <i class="ri-checkbox-circle-line" />
            <span>Resumen de actividad total en el período</span>
          </div>
        </div>
      </div>

      <!-- Historial de generaciones -->
      <div class="panel-historial">
        <h3>Informes Generados Recientemente</h3>
        <div v-if="historial.length === 0" class="empty-state">
          <i class="ri-file-pdf-line" />
          <p>No hay informes generados aún</p>
        </div>
        <div v-else class="historial-list">
          <div v-for="(item, idx) in historial" :key="idx" class="historial-item">
            <div class="item-info">
              <span class="item-fecha">{{ item.fecha }}</span>
              <span class="item-tipo">{{ item.tipo === 'ejecutivo' ? '📊 Resumen' : '📋 Detalle' }}</span>
              <span class="item-periodo">{{ item.periodo }}</span>
            </div>
            <a href="#" class="item-action" @click.prevent="descargarInfomeStorage(idx)">
              <i class="ri-download-2-line" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const tipoInforme = ref<'ejecutivo' | 'detalle'>('ejecutivo');
const formData = ref<{ fechaInicio: string; fechaFin: string }>({
  fechaInicio: '',
  fechaFin: ''
});

const generando = ref(false);
const generandoComentarios = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const historial = ref<Array<{ fecha: string; periodo: string; tipo: string; blob?: Blob }>>([]);

onMounted(() => {
  // Establecer rango predeterminado: últimos 30 días
  const hoy = new Date();
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

  formData.value.fechaFin = hoy.toISOString().split('T')[0];
  formData.value.fechaInicio = hace30.toISOString().split('T')[0];

  // Cargar historial de localStorage
  cargarHistorial();
});

function cargarHistorial() {
  try {
    const stored = localStorage.getItem('informes_historial');
    if (stored) {
      const items = JSON.parse(stored);
      historial.value = items.slice(0, 5); // últimos 5
    }
  } catch {
    // ignorar errores de localStorage
  }
}

function guardarHistorial(_fecha: string, periodo: string, tipo: string) {
  const items = [
    { fecha: new Date().toLocaleString('es-EC'), periodo, tipo },
    ...historial.value
  ].slice(0, 5);

  localStorage.setItem('informes_historial', JSON.stringify(items));
  historial.value = items;
}

function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function generarInforme() {
  errorMsg.value = '';
  successMsg.value = '';

  if (!formData.value.fechaInicio || !formData.value.fechaFin) {
    errorMsg.value = 'Debes seleccionar ambas fechas';
    return;
  }

  if (formData.value.fechaInicio > formData.value.fechaFin) {
    errorMsg.value = 'La fecha de inicio no puede ser posterior a la de fin';
    return;
  }

  generando.value = true;

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const endpoint = tipoInforme.value === 'ejecutivo'
      ? '/api/reportes/generar-informe-pdf'
      : '/api/reportes/generar-informe-detalle-pdf';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fechaInicio: formData.value.fechaInicio,
        fechaFin: formData.value.fechaFin
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar el informe');
    }

    const blob = await response.blob();
    const fecha = new Date().toISOString().slice(0, 10);
    const suffix = tipoInforme.value === 'ejecutivo' ? 'resumen' : 'detalle';
    const filename = `informe_${suffix}_${fecha}.pdf`;

    descargarBlob(blob, filename);

    const periodo = `${formData.value.fechaInicio} al ${formData.value.fechaFin}`;
    guardarHistorial(new Date().toLocaleString('es-EC'), periodo, tipoInforme.value);

    successMsg.value = '✓ Informe generado exitosamente';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch (err: any) {
    errorMsg.value = err?.message || 'No se pudo generar el informe';
  } finally {
    generando.value = false;
  }
}

function descargarInfomeStorage(_idx: number) {
  // Nota: localStorage no puede guardar blobs directamente
  // Por ahora, regenerar es la opción
  alert('Por favor, regenera el informe para descargarlo nuevamente');
}

async function generarUltimosComentarios() {
  errorMsg.value = '';
  successMsg.value = '';

  generandoComentarios.value = true;

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const response = await fetch('/api/reportes/generar-informe-ultimos-comentarios-todos', {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar el informe');
    }

    const blob = await response.blob();
    const fecha = new Date().toISOString().slice(0, 10);
    const filename = `informe_ultimos_comentarios_${fecha}.pdf`;

    descargarBlob(blob, filename);

    guardarHistorial(new Date().toLocaleString('es-EC'), 'Histórico completo', 'comentarios');

    successMsg.value = '✓ Informe de comentarios generado exitosamente';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch (err: any) {
    errorMsg.value = err?.message || 'No se pudo generar el informe de comentarios';
  } finally {
    generandoComentarios.value = false;
  }
}
</script>

<style scoped>
.informes-view {
  display: grid;
  gap: 1.5rem;
}

.inf-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1.5rem;
}

.inf-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
}

.inf-header p {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.scope-tag {
  border-radius: 999px;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.scope-global { background: #eff6ff; color: #1e3a8a; }
.scope-dir { background: #ecfdf5; color: #166534; }

/* Selector de tabs */
.tabs-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: #fff;
  padding: 0.75rem;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  border-color: #1a5fad;
  background: #eff6ff;
}

.tab-button.active {
  background: #1a5fad;
  border-color: #1a5fad;
  color: #fff;
}

.tab-button i {
  font-size: 1.1rem;
}

/* Panel info tipo informe */
.info-tipo {
  background: #eff6ff;
  border-left: 4px solid #1a5fad;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.info-tipo h4 {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  color: #1a5fad;
}

.info-tipo p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.alert-error {
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #b91c1c;
  font-size: 0.9rem;
  margin: 0;
}

.alert-success {
  padding: 0.75rem 1rem;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 12px;
  color: #15803d;
  font-size: 0.9rem;
  margin: 0;
}

.inf-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* Panel de generación */
.panel-generacion {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-field {
  padding: 0.6rem 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s;
}

.input-field:focus {
  outline: none;
  border-color: #1a5fad;
  box-shadow: 0 0 0 3px rgba(26, 95, 173, 0.1);
}

.btn-generar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1rem;
  background: linear-gradient(135deg, #1a5fad, #2f86eb);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 0.5rem;
}

.btn-generar:hover:not(:disabled) {
  opacity: 0.95;
}

.btn-generar:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-generar i {
  font-size: 1.2rem;
}

/* Panel preview */
.panel-preview {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
}

.panel-preview h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #0f172a;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: #334155;
}

.check-item i {
  color: #16a34a;
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* Panel historial */
.panel-historial {
  grid-column: 1 / -1;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
}

.panel-historial h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #0f172a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #94a3b8;
  text-align: center;
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.historial-list {
  display: grid;
  gap: 0.6rem;
}

.historial-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.item-fecha {
  font-size: 0.8rem;
  color: #94a3b8;
}

.item-tipo {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1a5fad;
}

.item-periodo {
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 500;
}

.item-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1a5fad;
  text-decoration: none;
  transition: background 0.15s;
}

.item-action:hover {
  background: #bfdbfe;
}

@media (max-width: 1024px) {
  .inf-content {
    grid-template-columns: 1fr;
  }
}

/* Panel de Últimos Comentarios */
.panel-ultimos-comentarios {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border: 2px solid #10b981;
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.panel-ultimos-comentarios .info-tipo {
  background: transparent;
  border-left: none;
  flex: 1;
}

.panel-ultimos-comentarios .info-tipo h4 {
  color: #047857;
}

.btn-generar-comentarios {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #10b981;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-generar-comentarios:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-generar-comentarios:disabled {
  background: #d1fae5;
  color: #047857;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-generar-comentarios i {
  font-size: 1.1rem;
}

@media (max-width: 1024px) {
  .panel-ultimos-comentarios {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .btn-generar-comentarios {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .inf-header {
    flex-direction: column;
  }

  .panel-ultimos-comentarios {
    padding: 1rem;
  }
}
</style>
