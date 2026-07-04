<script setup>
const props = defineProps({
  chat: Object,
  me: Object,
  mePicture: Object,
  fetching: Boolean,
  fetch: Function,
  callActive: Boolean,
  callBusy: Boolean,
})

const emit = defineEmits(['start-call', 'end-call'])

import ContactChip from "../sessions/ContactChip.vue";
</script>

<template>
  <div class="chat-header my-2">
    <div class="flex align-items-center">
      <ContactChip
          :id="chat.id"
          :name="chat.name"
          :image="chat.picture"
      />
    </div>
    <div class="flex justify-content-center align-items-center gap-2">
      <Button
          v-if="!callActive"
          icon="pi pi-phone"
          severity="success"
          rounded
          text
          :loading="callBusy"
          v-tooltip.bottom="'Start native audio call'"
          aria-label="Start call"
          @click="emit('start-call')"
      />
      <Button
          v-else
          icon="pi pi-phone"
          severity="danger"
          rounded
          :loading="callBusy"
          v-tooltip.bottom="'End call'"
          aria-label="End call"
          @click="emit('end-call')"
      />
      <RefreshButton
          @click="fetch"
          :refreshing="fetching"
      />
    </div>
    <div class="flex justify-content-end align-items-center">
      <ContactChip
          :name="me?.pushName || me?.id"
          :image="mePicture"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
}
</style>