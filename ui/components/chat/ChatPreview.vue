<script setup>
import ContactChip from "../sessions/ContactChip.vue";
import MessageAck from "./MessageAck.vue";

const props = defineProps({
  id: String,
  name: String,
  picture: String,
  message: Object,
  pinned: Boolean,
  unread: {type: Number, default: 0},
})
// limit to 20 symbols
const limit = 60
const textPreview = computed(() => {
  const text = props.message?.body
  if (!text) return ''
  return props.message?.body?.length > limit ? props.message.body.slice(0, limit) + '...' : props.message.body
})

</script>

<template>
  <div class="flex align-items-center gap-2">
    <ContactChip
        :id="props.id"
        :name="props.name"
        :image="props.picture"
    />
    <div class="ml-auto flex align-items-center gap-2">
      <i v-if="pinned" class="pi pi-thumbtack text-color-secondary" style="font-size:0.8rem" v-tooltip.left="'Pinned'"></i>
      <span v-if="unread > 0" class="wa-unread">{{ unread > 99 ? '99+' : unread }}</span>
    </div>
  </div>
  <div class="flex gap-1 mt-1">
    <MessageAck v-if="textPreview && message.fromMe" :ack="message.ack" class="pb-2"/>
    {{ textPreview }}
  </div>
</template>

<style scoped lang="scss">
.wa-unread {
  background: #25d366;
  color: #0b141a;
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>