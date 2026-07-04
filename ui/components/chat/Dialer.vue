<script setup>
import {computed, ref} from "vue";

const visible = defineModel("visible");
const props = defineProps({
  // idle | calling | active
  callState: {type: String, default: "idle"},
  peer: {type: String, default: ""},
  busy: Boolean,
  durationSecs: {type: Number, default: 0},
});
const emit = defineEmits(["call", "hangup"]);

const number = ref("");
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function press(k) {
  number.value += k;
}

function backspace() {
  number.value = number.value.slice(0, -1);
}

function onCall() {
  const value = number.value.trim();
  if (value) {
    emit("call", value);
  }
}

const inCall = computed(() => props.callState === "calling" || props.callState === "active");

function formatDuration(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function displayPeer(value) {
  return (value || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
}
</script>

<template>
  <Dialog
      v-model:visible="visible"
      modal
      header="📞 Discador"
      :closable="!inCall"
      :style="{ width: '340px' }"
  >
    <div v-if="!inCall" class="dialer">
      <InputText
          v-model="number"
          class="dialer-display"
          placeholder="Número (ex: 5511999999999)"
          @keyup.enter="onCall"
      />
      <div class="keypad">
        <Button
            v-for="k in keys"
            :key="k"
            :label="k"
            text
            class="key"
            @click="press(k)"
        />
      </div>
      <div class="controls">
        <Button
            icon="pi pi-delete-left"
            text
            severity="secondary"
            aria-label="Apagar"
            @click="backspace"
        />
        <Button
            icon="pi pi-phone"
            label="Ligar"
            severity="success"
            rounded
            :loading="busy"
            :disabled="!number"
            @click="onCall"
        />
        <span class="spacer"></span>
      </div>
    </div>

    <div v-else class="active-call">
      <i class="pi pi-phone active-icon"></i>
      <div class="peer">{{ displayPeer(peer || number) }}</div>
      <div class="status">
        <span v-if="callState === 'calling'">Chamando…</span>
        <span v-else>Em chamada · {{ formatDuration(durationSecs) }}</span>
      </div>
      <Button
          icon="pi pi-phone"
          label="Desligar"
          severity="danger"
          rounded
          :loading="busy"
          @click="emit('hangup')"
      />
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.dialer-display {
  width: 100%;
  text-align: center;
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.key {
  font-size: 1.3rem;
  height: 3rem;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
}

.spacer {
  width: 2.5rem;
}

.active-call {
  text-align: center;
  padding: 1rem 0;
}

.active-icon {
  font-size: 2.5rem;
  color: var(--green-500);
}

.peer {
  font-size: 1.4rem;
  margin: 0.75rem 0 0.25rem;
}

.status {
  margin-bottom: 1.25rem;
  color: var(--text-color-secondary);
}
</style>
