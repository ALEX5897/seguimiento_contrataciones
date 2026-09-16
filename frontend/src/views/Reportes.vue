<template>
  <div class="reportes-view">
    <header class="rep-header">
      <div>
        <h1>Reportes</h1>
        <p>Selecciona áreas y columnas. El archivo se descarga automáticamente.</p>
      </div>
      <span class="scope-tag" :class="auth.isDireccion ? 'scope-dir' : 'scope-global'">
        {{ auth.isDireccion ? auth.user?.direccionNombre || 'Tu dirección' : 'Vista consolidada' }}
      </span>
    </header>

    <p v-if="errorGen" class="alert-error">{{ errorGen }}</p>

    <div class="gen-shell">

      <!-- ── Panel izquierdo: Áreas + opciones ── -->
      <aside class="gen-aside">

        <section class="aside-block">
          <div class="aside-title">
            <span>Áreas</span>
            <label v-if="!auth.isDireccion" class="check-all-label">
              <input type="checkbox" :checked="genTodasAreas" @change="toggleTodasAreas" />
              Todas
            </label>
          </div>

          <div v-if="auth.isDireccion" class="dir-pill">
            <i class="ri-building-line" />
            {{ auth.user?.direccionNombre || 'Tu dirección' }}
          </div>

          <div v-else class="areas-list" :class="{ disabled: genTodasAreas }">
            <label
              v-for="area in areasDisponibles"
              :key="area"
              class="area-item"
              :class="{ selected: genAreasSeleccionadas.includes(area) }"
            >
              <input
                type="checkbox"
                :checked="genAreasSeleccionadas.includes(area)"
                :disabled="genTodasAreas"
                @change="toggleArea(area)"
              />
              {{ area }}
            </label>
            <p v-if="areasDisponibles.length === 0" class="empty-hint">Cargando áreas…</p>
          </div>
        </section>

        <section class="aside-block">
          <div class="aside-title">Opciones</div>
          <label class="option-toggle" :class="{ active: incluirVerificables }">
            <input type="checkbox" v-model="incluirVerificables" />
            <span class="toggle-track"><span class="toggle-thumb" /></span>
            <div>
              <strong>Todos los verificables</strong>
              <small>Una fila por verificable con todas sus fechas</small>
            </div>
          </label>
          <div class="bloques-section" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
            <strong style="display: block; margin-bottom: 8px;">Hojas adicionales</strong>
            <label class="option-toggle" :class="{ active: bloqueDiasVerificables }">
              <input type="checkbox" v-model="bloqueDiasVerificables" />
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <div>
                <strong>Días tarde por verificables</strong>
                <small>Número de días de retraso</small>
              </div>
            </label>
            <label class="option-toggle" :class="{ active: bloqueProximosAVencer }">
              <input type="checkbox" v-model="bloqueProximosAVencer" />
              <span class="toggle-track"><span class="toggle-thumb" /></span>
              <div>
                <strong>Próximos a vencer</strong>
                <small>Días para vencer (rango 1-5)</small>
              </div>
            </label>
          </div>
        </section>

        <button
          class="btn-generar"
          :disabled="generando || genCamposSeleccionados.length === 0"
          @click="generarExcel"
        >
          <i class="ri-file-excel-2-line" />
          {{ generando ? 'Generando…' : `Descargar Excel` }}
          <span v-if="!generando" class="col-count">{{ genCamposSeleccionados.length }} col{{ genCamposSeleccionados.length !== 1 ? 's' : '' }}</span>
        </button>

      </aside>

      <!-- ── Panel derecho: Selección de campos ── -->
      <main class="gen-campos">
        <div
          v-for="(campos, grupo) in camposPorGrupo"
          :key="grupo"
          class="campo-grupo"
        >
          <div class="grupo-header">
            <span>{{ grupo }}</span>
            <div class="grupo-actions">
              <button type="button" @click="seleccionarGrupo(grupo, true)">Todo</button>
              <button type="button" @click="seleccionarGrupo(grupo, false)">Nada</button>
            </div>
          </div>
          <div class="campos-grid">
            <label
              v-for="campo in campos"
              :key="campo.key"
              class="campo-chip"
              :class="[{ selected: genCamposSeleccionados.includes(campo.key) }, `tipo-${campo.tipo}`]"
            >
              <input
                type="checkbox"
                :checked="genCamposSeleccionados.includes(campo.key)"
                @change="toggleCampo(campo.key)"
              />
              {{ campo.label }}
              <span class="chip-tipo">{{ campo.tipo }}</span>
            </label>
          </div>
        </div>

        <!-- Verificables info box -->
        <div v-if="incluirVerificables" class="verif-info">
          <i class="ri-information-line" />
          <span>
            Se agregará una fila por cada verificable con columnas:
            <strong>Verificable · Orden · Estado · Fecha planificada · Fecha reforma · Fecha real · Días atraso</strong>.
          </span>
        </div>

        <p v-if="camposDisponibles.length === 0" class="empty-hint">Cargando campos…</p>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { reportesService, type CampoReporte } from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const errorGen        = ref('');
const generando       = ref(false);
const camposDisponibles = ref<CampoReporte[]>([]);
const areasDisponibles  = ref<string[]>([]);

const genTodasAreas         = ref(true);
const genAreasSeleccionadas = ref<string[]>([]);
const incluirVerificables   = ref(false);
const bloqueDiasVerificables = ref(false);
const bloqueProximosAVencer = ref(false);

const genCamposSeleccionados = ref<string[]>([
  'codigoOlympo', 'nombre', 'direccionNombre', 'responsableNombre',
  'tipoPlan', 'estadoGeneralLabel', 'porcentajeAvance', 'presupuesto', 'atrasadas'
]);

const camposPorGrupo = computed<Record<string, CampoReporte[]>>(() =>
  camposDisponibles.value.reduce((acc, c) => {
    if (!acc[c.grupo]) acc[c.grupo] = [];
    (acc[c.grupo] as CampoReporte[]).push(c);
    return acc;
  }, {} as Record<string, CampoReporte[]>)
);

function toggleCampo(key: string) {
  const idx = genCamposSeleccionados.value.indexOf(key);
  if (idx === -1) genCamposSeleccionados.value.push(key);
  else genCamposSeleccionados.value.splice(idx, 1);
}

function toggleTodasAreas() {
  genTodasAreas.value = !genTodasAreas.value;
  if (genTodasAreas.value) genAreasSeleccionadas.value = [];
}

function toggleArea(area: string) {
  const idx = genAreasSeleccionadas.value.indexOf(area);
  if (idx === -1) genAreasSeleccionadas.value.push(area);
  else genAreasSeleccionadas.value.splice(idx, 1);
}

function seleccionarGrupo(grupo: string, seleccionar: boolean) {
  const keys = (camposPorGrupo.value[grupo] || []).map((c) => c.key);
  if (seleccionar) {
    keys.forEach((k) => { if (!genCamposSeleccionados.value.includes(k)) genCamposSeleccionados.value.push(k); });
  } else {
    genCamposSeleccionados.value = genCamposSeleccionados.value.filter((k) => !keys.includes(k));
  }
}

function descargarBlob(data: unknown, filename: string) {
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = data instanceof Blob ? data : new Blob([data as ArrayBuffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function generarExcel() {
  if (genCamposSeleccionados.value.length === 0) {
    errorGen.value = 'Selecciona al menos un campo.';
    return;
  }

  const areas: string[] | 'ALL' = auth.isDireccion && auth.user?.direccionNombre
    ? [auth.user.direccionNombre]
    : genTodasAreas.value ? 'ALL' : genAreasSeleccionadas.value;

  if (areas !== 'ALL' && (areas as string[]).length === 0) {
    errorGen.value = 'Selecciona al menos un área o marca "Todas".';
    return;
  }

  generando.value = true;
  errorGen.value = '';
  try {
    const bloquesMatriz = {
      diasVerificables: bloqueDiasVerificables.value,
      proximosAVencer: bloqueProximosAVencer.value
    };
    const { blob, filename } = await reportesService.generarReporte(
      areas,
      genCamposSeleccionados.value,
      incluirVerificables.value,
      bloquesMatriz
    );
    descargarBlob(blob, filename);
  } catch (err: any) {
    errorGen.value = err?.message || err?.response?.data?.error || 'No se pudo generar el reporte.';
  } finally {
    generando.value = false;
  }
}

onMounted(async () => {
  if (auth.isDireccion && auth.user?.direccionNombre) {
    genTodasAreas.value = false;
    genAreasSeleccionadas.value = [auth.user.direccionNombre];
  }

  try {
    const [campos, resumen] = await Promise.all([
      reportesService.getCampos(),
      reportesService.getResumen({})
    ]);
    camposDisponibles.value = campos;
    areasDisponibles.value  = resumen.direccionesDisponibles || [];
  } catch {
    // no bloquear la UI si falla la carga inicial
  }
});
</script>

<style scoped>
.reportes-view {
  display: grid;
  gap: 1rem;
}

.rep-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1.1rem 1.3rem;
}

.rep-header h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.rep-header p {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.88rem;
}

.scope-tag {
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.scope-global { background: #eff6ff; color: #1e3a8a; }
.scope-dir    { background: #ecfdf5; color: #166534; }

.alert-error {
  border-radius: 12px;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 0.88rem;
}

/* ── Shell ── */
.gen-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1rem;
  align-items: start;
}

/* ── Aside ── */
.gen-aside {
  display: grid;
  gap: 0.75rem;
}

.aside-block {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0.9rem;
}

.aside-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 0.65rem;
}

.check-all-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  color: #334155;
}

.dir-pill {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  font-size: 0.83rem;
  color: #166534;
  font-weight: 500;
}

.areas-list {
  display: grid;
  gap: 0.3rem;
  max-height: 280px;
  overflow-y: auto;
}

.areas-list.disabled { opacity: 0.4; pointer-events: none; }

.area-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.38rem 0.55rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.81rem;
  cursor: pointer;
  transition: background 0.14s;
}

.area-item:hover  { background: #f0f7ff; border-color: #bfdbfe; }
.area-item.selected { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; font-weight: 600; }

/* toggle switch */
.option-toggle {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  user-select: none;
}

.option-toggle input { display: none; }

.toggle-track {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 0.2s;
}

.option-toggle.active .toggle-track { background: #2563eb; }

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
  transition: left 0.2s;
}

.option-toggle.active .toggle-thumb { left: 19px; }

.option-toggle strong {
  display: block;
  font-size: 0.84rem;
  color: #0f172a;
}

.option-toggle small {
  display: block;
  font-size: 0.74rem;
  color: #64748b;
  margin-top: 0.1rem;
}

.btn-generar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.72rem 1rem;
  background: linear-gradient(135deg, #1a5fad, #2f86eb);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-generar:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-generar i { font-size: 1.1rem; }

.col-count {
  background: rgba(255,255,255,.22);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.74rem;
}

/* ── Campos ── */
.gen-campos {
  display: grid;
  gap: 0.75rem;
}

.campo-grupo {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
}

.grupo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.9rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #475569;
}

.grupo-actions {
  display: flex;
  gap: 0.6rem;
}

.grupo-actions button {
  background: none;
  border: none;
  color: #2563eb;
  font-size: 0.74rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.campos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.65rem 0.9rem;
}

.campo-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  font-size: 0.79rem;
  cursor: pointer;
  background: #fff;
  user-select: none;
  transition: all 0.14s;
}

.campo-chip input { display: none; }
.campo-chip:hover  { border-color: #93c5fd; background: #f0f7ff; }

.campo-chip.selected                  { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.campo-chip.selected.tipo-moneda      { background: #065f46; border-color: #065f46; }
.campo-chip.selected.tipo-fecha       { background: #6d28d9; border-color: #6d28d9; }
.campo-chip.selected.tipo-boolean     { background: #9a3412; border-color: #9a3412; }

.chip-tipo {
  font-size: 0.64rem;
  opacity: 0.65;
}

.verif-info {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  font-size: 0.83rem;
  color: #1e40af;
}

.verif-info i { font-size: 1rem; flex-shrink: 0; margin-top: 0.05rem; }

.empty-hint { color: #94a3b8; font-size: 0.83rem; padding: 0.5rem; }

@media (max-width: 900px) {
  .gen-shell { grid-template-columns: 1fr; }
}
</style>
