<template>
  <section class="chat-ia-view">
    <header class="chat-ia-header">
      <div>
        <h1>Chat IA</h1>
        <p>Asistente para apoyo operativo en seguimiento de contrataciones.</p>
      </div>
      <div class="chat-ia-badges">
        <span class="badge" :class="config?.enabled ? 'badge-ok' : 'badge-warn'">
          {{ estadoConfiguracion }}
        </span>
        <span v-if="config" class="badge badge-neutral">{{ config.provider }} · {{ config.model }}</span>
      </div>
    </header>

    <div class="chat-shell">
      <aside class="chat-side">
        <div class="side-block">
          <h2>Dirección a consultar</h2>
          <select
            v-model="direccionFiltro"
            class="dir-select"
            :disabled="loadingDirecciones || loading"
          >
            <option value="">Todas las direcciones</option>
            <option v-for="d in direcciones" :key="d.id" :value="d.nombre">{{ d.nombre }}</option>
          </select>
          <p v-if="loadingDirecciones" class="dir-hint">Cargando...</p>
          <p v-else-if="direccionFiltro" class="dir-hint dir-active">Filtrando: {{ direccionFiltro }}</p>
          <p v-else class="dir-hint">Consulta a todas las direcciones</p>
        </div>

        <div class="side-block">
          <h2>Recomendaciones</h2>
          <ul>
            <li>Solicita respuestas concretas y con pasos accionables.</li>
            <li>Incluye código Olympo, etapa o dirección para mayor precisión.</li>
            <li>No compartas credenciales ni datos sensibles en el chat.</li>
          </ul>
        </div>
      </aside>

      <div class="chat-main">
        <div ref="messagesContainer" class="messages">
          <article
            v-for="(item, index) in messages"
            :key="`msg-${index}`"
            class="message"
            :class="item.role"
          >
            <div class="message-meta">{{ item.role === 'user' ? 'Tú' : 'Asistente' }}</div>
            <p class="message-content">{{ item.content }}</p>
          </article>

          <article v-if="loading" class="message assistant">
            <div class="message-meta">Asistente</div>
            <p class="message-content">Pensando respuesta...</p>
          </article>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <form class="composer" @submit.prevent="submitMessage">
          <label for="chat-input">Escribe tu consulta</label>
          <textarea
            id="chat-input"
            v-model="input"
            :maxlength="maxChars"
            :disabled="loading || !chatDisponible"
            rows="4"
            placeholder="Ejemplo: Resume los procesos atrasados de mi dirección y sugiere acciones para esta semana"
            @keydown.enter.exact.prevent="submitMessage"
          />
          <div class="composer-footer">
            <small>{{ input.length }} / {{ maxChars }} caracteres</small>
            <small v-if="lastIntent" class="meta-ia">
              intent: {{ lastIntent }}<template v-if="lastRegistrosUsados !== null"> · {{ lastRegistrosUsados }} registros</template>
            </small>
            <button type="submit" :disabled="!canSend">
              {{ loading ? 'Enviando...' : 'Enviar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { chatIaService } from '../services/api';
import type { ChatIaConfig, ChatIaMessage, DireccionCatalogItem } from '../services/api';

const messagesContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const error = ref('');
const input = ref('');
const config = ref<ChatIaConfig | null>(null);
const lastIntent = ref<string | null>(null);
const lastRegistrosUsados = ref<number | null>(null);
const direcciones = ref<DireccionCatalogItem[]>([]);
const loadingDirecciones = ref(false);
const direccionFiltro = ref('');

const messages = ref<ChatIaMessage[]>([
  {
    role: 'assistant',
    content: 'Hola. Puedo ayudarte con análisis operativo, redacción técnica y seguimiento de procesos POA/PAC.'
  }
]);

function buildWelcomeMessage(filter: string) {
  return filter
    ? `Hola. Continuaremos con el filtro activo: ${filter}. Si cambias la dirección, reiniciaré este chat para no mezclar contextos.`
    : 'Hola. Puedo ayudarte con análisis operativo, redacción técnica y seguimiento de procesos POA/PAC. Si eliges otra dirección, reiniciaré el chat para mantener el contexto limpio.';
}

function resetChatForDirectionChange(filter: string) {
  messages.value = [
    {
      role: 'assistant',
      content: buildWelcomeMessage(filter)
    }
  ];
  input.value = '';
  error.value = '';
  lastIntent.value = null;
  lastRegistrosUsados.value = null;
  scrollToBottom();
}

const maxChars = computed(() => {
  const value = Number(config.value?.maxInputChars || 2000);
  return Number.isFinite(value) && value > 0 ? value : 2000;
});

const chatDisponible = computed(() => Boolean(config.value?.enabled));

const estadoConfiguracion = computed(() => {
  if (!config.value?.enabled) return 'Deshabilitado';
  if (config.value?.fallbackActive) return 'Modo respaldo local';
  if (!config.value?.configured) return 'Falta configuración';
  return 'Operativo';
});

const canSend = computed(() => {
  if (loading.value) return false;
  if (!chatDisponible.value) return false;
  return input.value.trim().length > 0;
});

function scrollToBottom() {
  nextTick(() => {
    if (!messagesContainer.value) return;
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  });
}

async function cargarConfig() {
  try {
    config.value = await chatIaService.getConfig();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cargar la configuración del chat IA.';
  }
}

async function cargarDirecciones() {
  loadingDirecciones.value = true;
  try {
    direcciones.value = await chatIaService.getDirecciones();
  } catch {
    // fallo silencioso — la consulta seguirá funcionando sin filtro
  } finally {
    loadingDirecciones.value = false;
  }
}

async function submitMessage() {
  if (!canSend.value) return;

  const text = input.value.trim();
  error.value = '';
  input.value = '';
  lastIntent.value = null;
  lastRegistrosUsados.value = null;

  messages.value.push({ role: 'user', content: text });
  scrollToBottom();

  loading.value = true;
  try {
    const maxHistory = Math.max(0, Number(config.value?.maxHistory || 10));
    // Excluir mensaje de bienvenida (slice(1)) y el mensaje recién agregado (slice(0,-1))
    const historial = messages.value
      .slice(1)
      .slice(0, -1)
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .slice(-maxHistory);

    const resultado = await chatIaService.sendMessage(text, historial, direccionFiltro.value || null);
    messages.value.push({ role: 'assistant', content: String(resultado.response || '').trim() || 'Sin respuesta del asistente.' });
    lastIntent.value = resultado.intent ?? null;
    lastRegistrosUsados.value = resultado.registros_usados ?? null;
    scrollToBottom();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo procesar el mensaje con IA.';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([cargarConfig(), cargarDirecciones()]);
  resetChatForDirectionChange(direccionFiltro.value);
  scrollToBottom();
});

watch(direccionFiltro, (nextValue, previousValue) => {
  if (previousValue === undefined || nextValue === previousValue) return;
  if (loading.value) return;
  resetChatForDirectionChange(nextValue);
});
</script>

<style scoped>
.chat-ia-view {
  display: grid;
  gap: 1rem;
}

.chat-ia-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.chat-ia-header h1 {
  margin: 0;
  color: #0f2f55;
}

.chat-ia-header p {
  margin: 0.35rem 0 0;
  color: #476486;
}

.chat-ia-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.badge {
  border-radius: 999px;
  padding: 0.34rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.badge-ok {
  background: #ddf7eb;
  color: #0d6b44;
}

.badge-warn {
  background: #fde9cf;
  color: #915f07;
}

.badge-neutral {
  background: #e7eefb;
  color: #2f4f80;
}

.chat-shell {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
}

.chat-side,
.chat-main {
  background: #ffffff;
  border: 1px solid #dce6f5;
  border-radius: 16px;
  box-shadow: 0 16px 28px rgba(18, 43, 76, 0.08);
}

.chat-side {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.side-block h2 {
  margin: 0 0 0.8rem;
  font-size: 1rem;
  color: #20436c;
}

.side-block ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #385579;
  display: grid;
  gap: 0.6rem;
}

.dir-select {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #c7d7ee;
  border-radius: 10px;
  font: inherit;
  font-size: 0.88rem;
  color: #1c3a5a;
  background: #f6faff;
  cursor: pointer;
}

.dir-select:focus {
  outline: none;
  border-color: #2f6eb0;
  box-shadow: 0 0 0 3px rgba(47, 110, 176, 0.15);
}

.dir-hint {
  margin: 0.4rem 0 0;
  font-size: 0.76rem;
  color: #7a9cbf;
}

.dir-hint.dir-active {
  color: #0d6b44;
  font-weight: 600;
}

.chat-main {
  min-height: 70vh;
  display: grid;
  grid-template-rows: 1fr auto auto;
}

.messages {
  padding: 1rem;
  overflow-y: auto;
  border-bottom: 1px solid #e3ebf7;
  background: linear-gradient(180deg, #f9fcff 0%, #f4f8ff 100%);
}

.message {
  max-width: 86%;
  margin-bottom: 0.85rem;
  border-radius: 14px;
  padding: 0.65rem 0.8rem;
  box-shadow: 0 8px 16px rgba(21, 44, 74, 0.08);
}

.message.user {
  margin-left: auto;
  background: #2f5f98;
  color: #f5fbff;
}

.message.assistant {
  margin-right: auto;
  background: #ffffff;
  border: 1px solid #d7e6fb;
  color: #203a5a;
}

.message-meta {
  font-size: 0.72rem;
  opacity: 0.85;
  margin-bottom: 0.3rem;
}

.message-content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.42;
}

.error-msg {
  margin: 0;
  padding: 0.75rem 1rem;
  color: #8e1b1b;
  background: #fef2f2;
  border-top: 1px solid #f6d0d0;
}

.composer {
  padding: 0.85rem 1rem 1rem;
  display: grid;
  gap: 0.45rem;
}

.composer label {
  font-weight: 600;
  color: #244a73;
}

.composer textarea {
  width: 100%;
  border: 1px solid #c7d7ee;
  border-radius: 12px;
  resize: vertical;
  font: inherit;
  padding: 0.75rem;
}

.composer textarea:focus {
  outline: none;
  border-color: #2f6eb0;
  box-shadow: 0 0 0 3px rgba(47, 110, 176, 0.15);
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.composer-footer small {
  color: #5c7292;
}

.meta-ia {
  color: #7a9cbf;
  font-style: italic;
  font-size: 0.78rem;
}

.composer-footer button {
  border: 0;
  border-radius: 10px;
  padding: 0.56rem 1rem;
  background: #184e8a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.composer-footer button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .chat-main {
    min-height: 60vh;
  }
}
</style>
