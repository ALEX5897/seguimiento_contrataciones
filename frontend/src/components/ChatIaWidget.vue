<template>
  <div class="chat-widget" :class="{ open: isOpen }">
    <!-- Floating trigger button -->
    <button
      class="chat-trigger"
      :title="isOpen ? 'Cerrar asistente' : 'Abrir asistente IA'"
      @click="toggle"
    >
      <i :class="isOpen ? 'ri-close-line' : 'ri-robot-2-line'" />
      <span v-if="unread && !isOpen" class="unread-dot" />
    </button>

    <!-- Chat panel -->
    <div v-if="isOpen" class="chat-panel">
      <header class="panel-header">
        <div class="panel-title">
          <i class="ri-robot-2-line" />
          <span>Asistente IA</span>
        </div>
        <div class="panel-badges">
          <span
            class="pbadge"
            :class="config?.enabled ? 'pbadge-ok' : 'pbadge-warn'"
          >{{ statusLabel }}</span>
        </div>
      </header>

      <div v-if="direcciones.length > 0" class="panel-filter">
        <select v-model="direccionFiltro" class="filter-select" :disabled="loading">
          <option value="">Todas las direcciones</option>
          <option v-for="d in direcciones" :key="d.id" :value="d.nombre">{{ d.nombre }}</option>
        </select>
      </div>

      <div ref="messagesEl" class="panel-messages">
        <article
          v-for="(msg, i) in messages"
          :key="i"
          class="pmsg"
          :class="msg.role"
        >
          <p>{{ msg.content }}</p>
        </article>

        <article v-if="loading" class="pmsg assistant loading-pulse">
          <p>Pensando...</p>
        </article>
      </div>

      <p v-if="error" class="panel-error">{{ error }}</p>

      <form class="panel-composer" @submit.prevent="send">
        <textarea
          v-model="input"
          :disabled="loading || !chatEnabled"
          :maxlength="maxChars"
          rows="2"
          placeholder="Escribe tu consulta…"
          @keydown.enter.exact.prevent="send"
        />
        <div class="panel-composer-row">
          <small>{{ input.length }}/{{ maxChars }}</small>
          <button type="submit" :disabled="!canSend">
            <i class="ri-send-plane-fill" />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { chatIaService } from '../services/api';
import type { ChatIaConfig, ChatIaMessage, DireccionCatalogItem } from '../services/api';

const isOpen = ref(false);
const unread = ref(false);
const loading = ref(false);
const error = ref('');
const input = ref('');
const config = ref<ChatIaConfig | null>(null);
const messagesEl = ref<HTMLElement | null>(null);
const direcciones = ref<DireccionCatalogItem[]>([]);
const direccionFiltro = ref('');

const messages = ref<ChatIaMessage[]>([
  { role: 'assistant', content: 'Hola. Puedo ayudarte con análisis operativo y seguimiento de procesos.' }
]);

const maxChars = computed(() => {
  const v = Number(config.value?.maxInputChars || 2000);
  return Number.isFinite(v) && v > 0 ? v : 2000;
});

const chatEnabled = computed(() => Boolean(config.value?.enabled));

const statusLabel = computed(() => {
  if (!config.value?.enabled) return 'Deshabilitado';
  if (config.value?.fallbackActive) return 'Respaldo';
  if (!config.value?.configured) return 'Sin config';
  return 'Operativo';
});

const canSend = computed(() => !loading.value && chatEnabled.value && input.value.trim().length > 0);

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  });
}

function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    unread.value = false;
    scrollToBottom();
  }
}

async function send() {
  if (!canSend.value) return;

  const text = input.value.trim();
  input.value = '';
  error.value = '';

  messages.value.push({ role: 'user', content: text });
  scrollToBottom();

  loading.value = true;
  try {
    const maxHistory = Math.max(0, Number(config.value?.maxHistory || 10));
    const historial = messages.value
      .slice(1)
      .slice(0, -1)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-maxHistory);

    const result = await chatIaService.sendMessage(text, historial, direccionFiltro.value || null);
    const reply = String(result.response || '').trim() || 'Sin respuesta del asistente.';
    messages.value.push({ role: 'assistant', content: reply });
    scrollToBottom();

    if (!isOpen.value) unread.value = true;
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo procesar el mensaje.';
  } finally {
    loading.value = false;
  }
}

watch(isOpen, (open) => {
  if (open) scrollToBottom();
});

onMounted(async () => {
  try {
    const [cfg, dirs] = await Promise.allSettled([
      chatIaService.getConfig(),
      chatIaService.getDirecciones()
    ]);
    if (cfg.status === 'fulfilled') config.value = cfg.value;
    if (dirs.status === 'fulfilled') direcciones.value = dirs.value;
  } catch {
    // widget still renders; chat will be disabled
  }
});
</script>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.chat-trigger {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #1a5fad, #2f86eb);
  color: #fff;
  font-size: 1.5rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(15, 60, 130, 0.38);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.chat-trigger:hover {
  transform: scale(1.08);
  box-shadow: 0 12px 30px rgba(15, 60, 130, 0.48);
}

.chat-trigger:active {
  transform: scale(0.96);
}

.unread-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
}

.chat-panel {
  width: 360px;
  max-height: 520px;
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  background: #fff;
  border-radius: 18px;
  border: 1px solid #dce6f5;
  box-shadow: 0 20px 48px rgba(12, 38, 80, 0.18);
  overflow: hidden;
}

.panel-filter {
  padding: 0.45rem 0.85rem;
  background: #f0f6ff;
  border-bottom: 1px solid #dce6f5;
}

.filter-select {
  width: 100%;
  padding: 0.32rem 0.55rem;
  border: 1px solid #c7d7ee;
  border-radius: 8px;
  font: inherit;
  font-size: 0.78rem;
  color: #1c3a5a;
  background: #fff;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #2f6eb0;
  box-shadow: 0 0 0 2px rgba(47, 110, 176, 0.15);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(90deg, #0f2f55, #1a4f8a);
  color: #fff;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.panel-title i {
  font-size: 1.1rem;
}

.pbadge {
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
}

.pbadge-ok {
  background: rgba(16, 185, 129, 0.22);
  color: #6ee7b7;
}

.pbadge-warn {
  background: rgba(245, 158, 11, 0.22);
  color: #fcd34d;
}

.panel-messages {
  padding: 0.85rem;
  overflow-y: auto;
  background: linear-gradient(180deg, #f9fcff, #f4f8ff);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.pmsg {
  max-width: 88%;
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
}

.pmsg p {
  margin: 0;
  font-size: 0.83rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.pmsg.user {
  margin-left: auto;
  background: #2f5f98;
  color: #f5fbff;
}

.pmsg.assistant {
  margin-right: auto;
  background: #fff;
  border: 1px solid #d7e6fb;
  color: #203a5a;
}

.loading-pulse {
  opacity: 0.7;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 0.4; }
}

.panel-error {
  margin: 0;
  padding: 0.5rem 1rem;
  font-size: 0.78rem;
  color: #8e1b1b;
  background: #fef2f2;
  border-top: 1px solid #f6d0d0;
}

.panel-composer {
  padding: 0.65rem 0.85rem 0.8rem;
  border-top: 1px solid #e3ebf7;
  display: grid;
  gap: 0.4rem;
}

.panel-composer textarea {
  width: 100%;
  border: 1px solid #c7d7ee;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font: inherit;
  font-size: 0.83rem;
  resize: none;
}

.panel-composer textarea:focus {
  outline: none;
  border-color: #2f6eb0;
  box-shadow: 0 0 0 3px rgba(47, 110, 176, 0.12);
}

.panel-composer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-composer-row small {
  font-size: 0.72rem;
  color: #7a9cbf;
}

.panel-composer-row button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: #184e8a;
  color: #fff;
  font-size: 1rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.18s ease;
}

.panel-composer-row button:hover {
  background: #1a5fad;
}

.panel-composer-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .chat-panel {
    width: calc(100vw - 2rem);
    max-height: 70vh;
  }

  .chat-widget {
    bottom: 1rem;
    right: 1rem;
  }
}
</style>
