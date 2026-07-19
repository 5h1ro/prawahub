<script setup>
import {sleep} from "../../services/utils";

const props = defineProps({
  messages: Array,
  loadEarlier: Function,
  loadingEarlier: Boolean,
  hasEarlierMessages: Boolean,
  serverId: String,
  sessionName: String,
  contactIndex: {type: Object, default: null},
})
const emit = defineEmits(['reply', 'react', 'forward', 'delete'])
const scroll = ref(null)
const isLoadingEarlier = ref(false)

async function scrollToBottom() {
  await sleep(10)
  if (scroll.value) {
    scroll.value.scrollTop = scroll.value.scrollHeight
  }
}

watch(() => props.messages, async () => {
  if (isLoadingEarlier.value) return
  scrollToBottom()
})

async function handleLoadEarlier() {
  if (!props.loadEarlier || isLoadingEarlier.value) return
  const container = scroll.value
  const oldScrollHeight = container.scrollHeight
  isLoadingEarlier.value = true
  await props.loadEarlier()
  await nextTick()
  await sleep(10)
  if (container) {
    container.scrollTop = container.scrollHeight - oldScrollHeight
  }
  isLoadingEarlier.value = false
}
</script>

<template>
  <div class="wa-messages my-2 pb-3" style="width: 100%; height: 100%; overflow: auto;" ref="scroll">
    <div class="flex flex-column gap-2">
      <div class="flex justify-content-center py-2">
        <Button
            v-tooltip.bottom="!hasEarlierMessages ? $t('chat.noMoreMessages') : undefined"
            :label="$t('chat.loadMoreMessages')"
            icon="pi pi-arrow-up"
            size="small"
            outlined
            :loading="loadingEarlier || isLoadingEarlier"
            @click="handleLoadEarlier"
        />
      </div>
      <template v-for="message in messages">
        <div>
          <ChatMessage
              :key="message.id"
              :message="message"
              :serverId="serverId"
              :sessionName="sessionName"
              :contactIndex="contactIndex"
              @reply="emit('reply', $event)"
              @react="emit('react', $event)"
              @forward="emit('forward', $event)"
              @delete="emit('delete', $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.wa-messages {
  background-color: #efeae2;
  background-image:
      radial-gradient(rgba(11, 20, 26, 0.04) 1px, transparent 1px),
      radial-gradient(rgba(11, 20, 26, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0, 12px 12px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

:global(.p-dark) .wa-messages {
  background-color: #0b141a;
  background-image:
      radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}
</style>
