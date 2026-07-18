<script setup>
import ContactChip from "../sessions/ContactChip.vue";
import MessageAck from "./MessageAck.vue";

const props = defineProps({
  id: String,
  name: String,
  picture: String,
  message: Object,
  pinned: Boolean,
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
    <i v-if="pinned" class="pi pi-thumbtack ml-auto text-color-secondary" style="font-size:0.8rem" v-tooltip.left="'Pinned'"></i>
  </div>
  <div class="flex gap-1 mt-1">
    <MessageAck v-if="textPreview && message.fromMe" :ack="message.ack" class="pb-2"/>
    {{ textPreview }}
  </div>
</template>

<style scoped lang="scss">

</style>