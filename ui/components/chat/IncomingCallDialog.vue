<script setup>
const visible = defineModel("visible");
const props = defineProps({
  from: {type: String, default: ""},
  busy: Boolean,
});
const emit = defineEmits(["accept", "reject"]);

function displayFrom(value) {
  return (value || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
}
</script>

<template>
  <Dialog
      v-model:visible="visible"
      modal
      :closable="false"
      header="📲 Chamada recebida"
      :style="{ width: '320px' }"
  >
    <div class="incoming">
      <i class="pi pi-phone incoming-icon"></i>
      <div class="from">{{ displayFrom(from) }}</div>
      <div class="actions">
        <Button
            icon="pi pi-phone"
            label="Atender"
            severity="success"
            rounded
            :loading="busy"
            @click="emit('accept')"
        />
        <Button
            icon="pi pi-times"
            label="Recusar"
            severity="danger"
            rounded
            :loading="busy"
            @click="emit('reject')"
        />
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.incoming {
  text-align: center;
  padding: 0.5rem 0;
}

.incoming-icon {
  font-size: 2.5rem;
  color: var(--primary-color);
  animation: ring 1s ease-in-out infinite;
}

.from {
  font-size: 1.4rem;
  margin: 0.75rem 0 1.25rem;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

@keyframes ring {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-15deg); }
  75% { transform: rotate(15deg); }
}
</style>
