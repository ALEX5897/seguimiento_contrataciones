<template>
  <div class="carga-masiva">
    <div class="header">
      <h1>📥 Carga Masiva de Procesos POA 2026</h1>
      <p>Importa procesos desde Matriz_Base_POA_2026_1.xlsx con validaciones automáticas</p>
      <div class="info-archivo">
        <span>📄 Archivo base: Matriz_Base_POA_2026_1.xlsx</span>
        <span>📊 Estructura: 20 columnas × 341 procesos</span>
      </div>
    </div>

    <!-- Paso 1: Selección de archivo -->
    <div v-if="paso === 1" class="paso paso-1">
      <div class="card">
        <h2>Paso 1: Carga el archivo</h2>

        <div class="info-version">
          <span>📋 Versión activa: Reforma 10 - 2026</span>
        </div>

        <div class="section">
          <div class="drop-zone" @drop="handleDrop" @dragover.prevent @dragleave="dragover = false"
               :class="{ dragover }">
            <input
              type="file"
              ref="fileInput"
              @change="handleFileSelect"
              accept=".xlsx,.xls,.csv"
              style="display: none"
            />
            <div @click="$refs.fileInput.click()" class="drop-zone-content">
              <span class="drop-icon">📄</span>
              <p><strong>Arrastra el archivo aquí</strong></p>
              <p class="text-muted">o haz clic para seleccionar</p>
              <p class="text-info">Formatos: Excel (.xlsx, .xls) o CSV</p>
            </div>
          </div>
        </div>

        <div v-if="archivo" class="archivo-seleccionado">
          <span>✅ {{ archivo.name }}</span>
          <button @click="archivo = null" class="btn-limpiar">Cambiar archivo</button>
        </div>

        <div class="botones">
          <button
            @click="validarArchivo"
            :disabled="!archivo || cargando"
            class="btn-primary"
          >
            {{ cargando ? '⏳ Validando...' : '🔍 Validar archivo' }}
          </button>
          <button @click="descargarPlantilla" class="btn-secondary">
            📋 Descargar plantilla
          </button>
        </div>

        <div v-if="error" class="alert alert-error">
          ⚠️ {{ error }}
        </div>
      </div>
    </div>

    <!-- Paso 2: Revisión de validación -->
    <div v-if="paso === 2" class="paso paso-2">
      <div class="card">
        <h2>Paso 2: Revisión de validación</h2>

        <div class="resumen-validacion">
          <div class="stat">
            <span class="stat-label">Total de filas</span>
            <span class="stat-value">{{ resumenValidacion.totalFilas }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Procesos válidos</span>
            <span class="stat-value ok">{{ resumenValidacion.procesosValidos }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Errores</span>
            <span class="stat-value error">{{ resumenValidacion.erroresEncontrados }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Advertencias</span>
            <span class="stat-value warning">{{ resumenValidacion.advertenciasEncontradas }}</span>
          </div>
        </div>

        <!-- Errores -->
        <div v-if="erroresValidacion.length > 0" class="seccion-errores">
          <h3>❌ Errores encontrados ({{ erroresValidacion.length }})</h3>
          <div class="tabla-errores">
            <div v-for="(error, idx) in erroresValidacion.slice(0, 20)" :key="idx" class="error-row">
              <span class="error-fila">Fila {{ error.fila }}</span>
              <span class="error-campo">{{ error.campo }}</span>
              <span class="error-msg">{{ error.mensaje }}</span>
            </div>
            <div v-if="erroresValidacion.length > 20" class="mas-errores">
              +{{ erroresValidacion.length - 20 }} errores más
            </div>
          </div>
        </div>

        <!-- Advertencias -->
        <div v-if="advertenciasValidacion.length > 0" class="seccion-advertencias">
          <h3>⚠️ Advertencias ({{ advertenciasValidacion.length }})</h3>
          <div class="tabla-errores">
            <div v-for="(adv, idx) in advertenciasValidacion.slice(0, 10)" :key="idx" class="warning-row">
              <span class="error-fila">Fila {{ adv.fila }}</span>
              <span class="error-campo">{{ adv.campo }}</span>
              <span class="error-msg">{{ adv.mensaje }}</span>
            </div>
          </div>
        </div>

        <!-- Procesos a cargar -->
        <div class="seccion-procesos">
          <h3>📊 Procesos a cargar ({{ procesosValidados.length }})</h3>
          <div class="tabla-procesos">
            <table>
              <thead>
                <tr>
                  <th>Código Olympo</th>
                  <th>Subtarea</th>
                  <th>Dirección</th>
                  <th>PAC/No PAC</th>
                  <th>Presupuesto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in procesosValidados.slice(0, 10)" :key="p.rowNum">
                  <td class="mono">{{ p.codigo_olympo }}</td>
                  <td title="">{{ p.subtarea.substring(0, 50) }}</td>
                  <td>{{ (p.direccion_encargada || '').substring(0, 20) }}</td>
                  <td>{{ p.pac_no_pac || 'N/A' }}</td>
                  <td class="numero">${{ formatearMonto(p.presupuesto_con_reformas) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="procesosValidados.length > 10" class="mas-procesos">
              +{{ procesosValidados.length - 10 }} procesos más
            </div>
          </div>
        </div>

        <!-- Opciones de carga -->
        <div class="opciones-carga">
          <label>
            <input type="checkbox" v-model="opcionesCargar.limpiarDatos" />
            Limpiar datos previos de esta versión
          </label>
          <label>
            <input type="checkbox" v-model="opcionesCargar.actualizarExistentes" />
            Actualizar procesos existentes
          </label>
        </div>

        <div class="botones">
          <button @click="paso = 1" class="btn-secondary">
            ← Atrás
          </button>
          <button
            @click="ejecutarCarga"
            :disabled="erroresValidacion.length > 0 || cargando"
            class="btn-primary"
          >
            {{ cargando ? '⏳ Cargando...' : '✅ Proceder con la carga' }}
          </button>
        </div>

        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Paso 3: Resultado de carga -->
    <div v-if="paso === 3" class="paso paso-3">
      <div class="card">
        <h2>✅ Carga completada</h2>

        <div class="resumen-carga">
          <div class="stat success">
            <span class="stat-label">Procesos cargados</span>
            <span class="stat-value">{{ resultadoCarga.cargados }}</span>
          </div>
          <div class="stat info">
            <span class="stat-label">Procesos actualizados</span>
            <span class="stat-value">{{ resultadoCarga.actualizados }}</span>
          </div>
          <div class="stat error" v-if="resultadoCarga.errores.length > 0">
            <span class="stat-label">Errores</span>
            <span class="stat-value">{{ resultadoCarga.errores.length }}</span>
          </div>
        </div>

        <!-- Errores de carga -->
        <div v-if="resultadoCarga.errores.length > 0" class="seccion-errores">
          <h3>❌ Errores en la carga ({{ resultadoCarga.errores.length }})</h3>
          <div class="tabla-errores">
            <div v-for="(err, idx) in resultadoCarga.errores.slice(0, 20)" :key="idx" class="error-row">
              <span class="error-fila">{{ err.codigo_olympo }}</span>
              <span class="error-msg">{{ err.mensaje }}</span>
            </div>
          </div>
        </div>

        <div class="botones">
          <button @click="reiniciar" class="btn-primary">
            ➕ Cargar otro archivo
          </button>
          <button @click="$router.push('/admin/actividades')" class="btn-secondary">
            📋 Ver procesos cargados
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

// Estado
const paso = ref(1);
const archivo = ref(null);
const versionId = ref(null);
const cargando = ref(false);
const error = ref(null);
const dragover = ref(false);

const resumenValidacion = reactive({
  totalFilas: 0,
  procesosValidos: 0,
  erroresEncontrados: 0,
  advertenciasEncontradas: 0
});

const erroresValidacion = ref([]);
const advertenciasValidacion = ref([]);
const procesosValidados = ref([]);

const opcionesCargar = reactive({
  limpiarDatos: false,
  actualizarExistentes: false
});

const resultadoCarga = reactive({
  cargados: 0,
  actualizados: 0,
  errores: []
});

// Métodos
const obtenerVersionActiva = async () => {
  // Hardcodear versionId a 1 (versión por defecto)
  versionId.value = 1;
  console.log('✅ Versión configurada: ID 1');
};

const handleDrop = (e) => {
  e.preventDefault();
  dragover.value = false;
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    archivo.value = files[0];
  }
};

const handleFileSelect = (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    archivo.value = files[0];
  }
};

const validarArchivo = async () => {
  if (!archivo.value) {
    error.value = 'Selecciona un archivo';
    return;
  }

  // Si no tenemos versionId, intentar cargarlo ahora
  if (!versionId.value) {
    cargando.value = true;
    await obtenerVersionActiva();
    cargando.value = false;

    if (!versionId.value) {
      error.value = 'No se pudo obtener la versión activa. Verifica la conexión con el servidor.';
      return;
    }
  }

  cargando.value = true;
  error.value = null;

  const formData = new FormData();
  formData.append('archivo', archivo.value);

  try {
    const response = await fetch('/api/carga-masiva/validar', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${auth.token}` },
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Error en validación');
    }

    const result = await response.json();
    Object.assign(resumenValidacion, result.resumen);
    erroresValidacion.value = result.errores || [];
    advertenciasValidacion.value = result.advertencias || [];
    procesosValidados.value = result.procesos || [];
    paso.value = 2;
  } catch (err) {
    error.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const ejecutarCarga = async () => {
  cargando.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/carga-masiva/ejecutar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        procesos: procesosValidados.value,
        versionId: versionId.value,
        opciones: opcionesCargar
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Error en carga');
    }

    const result = await response.json();
    Object.assign(resultadoCarga, result.resultados);
    paso.value = 3;
  } catch (err) {
    error.value = err.message;
  } finally {
    cargando.value = false;
  }
};

const descargarPlantilla = async () => {
  try {
    const response = await fetch('/api/carga-masiva/plantilla', {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    if (!response.ok) throw new Error('Error al descargar plantilla');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-carga-procesos.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err.message;
  }
};

const reiniciar = () => {
  paso.value = 1;
  archivo.value = null;
  error.value = null;
  Object.assign(resumenValidacion, {
    totalFilas: 0,
    procesosValidos: 0,
    erroresEncontrados: 0,
    advertenciasEncontradas: 0
  });
  erroresValidacion.value = [];
  advertenciasValidacion.value = [];
  procesosValidados.value = [];
};

const formatearMonto = (valor) => {
  if (!valor) return '0';
  return new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 0
  }).format(valor);
};

onMounted(() => {
  obtenerVersionActiva();
});
</script>

<style scoped>
.carga-masiva {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 15px;
}

.header h1 {
  margin: 0 0 5px 0;
  color: #333;
}

.header p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
}

.info-archivo {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #1976d2;
}

.info-version {
  display: inline-block;
  font-size: 13px;
  color: #1976d2;
  background: #e3f2fd;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 3px solid #1976d2;
}

.paso {
  animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.card h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.section {
  margin-bottom: 20px;
}

.label-version {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-version span {
  font-weight: 500;
  color: #333;
}

.input-version {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.drop-zone {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.drop-zone.dragover {
  border-color: #4CAF50;
  background: #e8f5e9;
}

.drop-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.drop-zone-content p {
  margin: 8px 0;
}

.drop-zone-content strong {
  color: #333;
}

.text-muted {
  color: #999;
  font-size: 13px;
}

.text-info {
  color: #1976d2;
  font-size: 12px;
  margin-top: 5px;
}

.archivo-seleccionado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  background: #e8f5e9;
  border: 1px solid #4CAF50;
  border-radius: 4px;
  margin-top: 15px;
  color: #2e7d32;
}

.btn-limpiar {
  background: none;
  border: none;
  color: #d32f2f;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;
}

.botones {
  display: flex;
  gap: 10px;
  margin-top: 25px;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #efefef;
}

.alert {
  padding: 12px 15px;
  border-radius: 4px;
  margin-top: 15px;
  font-size: 14px;
}

.alert-error {
  background: #ffebee;
  color: #c62828;
  border-left: 4px solid #d32f2f;
}

.resumen-validacion {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.stat {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
  border-left: 4px solid #ddd;
  text-align: center;
}

.stat.success {
  border-left-color: #4CAF50;
  background: #e8f5e9;
}

.stat.error {
  border-left-color: #d32f2f;
  background: #ffebee;
}

.stat.warning {
  border-left-color: #f57f17;
  background: #fff3e0;
}

.stat.info {
  border-left-color: #1976d2;
  background: #e3f2fd;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-value.ok {
  color: #2e7d32;
}

.stat-value.error {
  color: #c62828;
}

.stat-value.warning {
  color: #e65100;
}

.seccion-errores, .seccion-advertencias, .seccion-procesos {
  margin-bottom: 25px;
}

.seccion-errores h3, .seccion-advertencias h3, .seccion-procesos h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.tabla-errores {
  background: #f5f5f5;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.error-row, .warning-row {
  display: grid;
  grid-template-columns: 80px 120px 1fr;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #ddd;
  font-size: 12px;
  align-items: start;
}

.error-row {
  color: #c62828;
}

.warning-row {
  color: #e65100;
}

.error-fila {
  font-weight: 600;
}

.error-campo {
  color: #666;
  font-size: 11px;
}

.mas-errores, .mas-procesos {
  padding: 10px 12px;
  color: #999;
  font-size: 12px;
  text-align: center;
}

.tabla-procesos table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tabla-procesos th {
  background: #f5f5f5;
  padding: 10px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #ddd;
}

.tabla-procesos td {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
}

.tabla-procesos tbody tr:hover {
  background: #fafafa;
}

.tabla-procesos .mono {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #666;
}

.tabla-procesos .numero {
  text-align: right;
  font-weight: 500;
}

.opciones-carga {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 20px;
}

.opciones-carga label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
}

.opciones-carga input[type="checkbox"] {
  cursor: pointer;
}

.resumen-carga {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}
</style>
