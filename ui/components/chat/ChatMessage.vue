<script setup>
import {computed} from 'vue'
import MessageAck from "./MessageAck.vue";
import {useI18nDate} from '../../composables/useI18nDate'
import JsonDataViewer from "../common/JsonDataViewer.vue";
import InlineMessage from "primevue/inlinemessage";
import {useI18n} from "vue-i18n";

const {t} = useI18n();

const props = defineProps({
  message: Object,
})
const Ack = {
  ERROR: -1,
  PENDING: 0,
  SERVER: 1,
  DEVICE: 2,
  READ: 3,
  PLAYED: 4,
}

const {formatChatTimestamp} = useI18nDate()

const date = computed(() => formatChatTimestamp(props.message?.timestamp))
const showDetails = ref(false)

function view() {
  showDetails.value = !showDetails.value
}
</script>


<template>
  <div :class="{'flex justify-content-end': message.fromMe}">
    <Chip :class="showDetails? 'chip-100' :'chip-70'" class="py-1 px-3">
      <div>
        <!-- From -->
        <div v-if="!message.fromMe && message.participant">
          <div class="p-text-secondary my-1" style="font-size: 0.9rem">{{ message.participant }}</div>
        </div>

        <!-- Body + ACK -->
        <div class="flex">
          <div class="flex-1">
            <!-- Text Message -->
            <template v-if="message.body || message.hasMedia">
              <!-- Replace /n to <br> -->
              <p v-html="message.body?.replace(/\n/g, '<br>')"></p>
            </template>
            <!-- Not Supported Message -->
            <template v-else>
              <InlineMessage severity="warn" class="mt-2">
                <p v-html="t('chat.message.not-supported')"></p>
              </InlineMessage>
            </template>
            <!-- Media Message -->
            <template v-if="message.hasMedia">
              <InlineMessage severity="info">
                <template #icon>
                  <i class="pi pi-image mr-2"></i>
                </template>
                <p v-html="t('chat.message.media')"></p>
              </InlineMessage>
            </template>
          </div>
          <!-- ack at the bottom of div-->
          <div class="flex flex-column justify-content-end" style="height: 100%" v-if="message.fromMe">
            <MessageAck :ack="message.ack" class="mt-1 ml-2"/>
          </div>
        </div>

        <!-- Details Button + Datetime -->
        <div class="flex align-items-center justify-content-end my-1">
          <div
              class="p-text-secondary"
              style="font-size: 0.7rem"
          >
            {{ date }}
          </div>
          <div class="ml-2">
            <a
                href="#"
                @click.prevent="view">
              <i
                  class="pi"
                  :class="showDetails? 'pi-code' : 'pi-code'"
              > </i>
            </a>
          </div>
        </div>

        <!-- Details -->
        <div v-if="showDetails" class="my-2">
          <hr/>
          <JsonDataViewer :data="message"></JsonDataViewer>
        </div>
      </div>
    </Chip>
  </div>

</template>

<style scoped lang="scss">
.chip-70 {
  max-width: 70%;
}

.chip-100 {
  max-width: 100%;
}

</style>
