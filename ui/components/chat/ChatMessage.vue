<script setup>
import {computed} from 'vue'
import MessageAck from "./MessageAck.vue";
import {useI18nDate} from '../../composables/useI18nDate'
import JsonDataViewer from "../common/JsonDataViewer.vue";
import InlineMessage from "primevue/inlinemessage";
import {useI18n} from "vue-i18n";
import {resolveMediaUrl} from "../../utils/media";

const {t} = useI18n();

const props = defineProps({
  message: Object,
  serverId: String,
  sessionName: String,
})
const emit = defineEmits(['reply', 'react', 'forward', 'delete'])

const toast = useToast()
const actionPanel = ref(null)
const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏']

function toggleActions(event) {
  actionPanel.value?.toggle(event)
}

function hideActions() {
  actionPanel.value?.hide()
}

function react(emoji) {
  emit('react', {message: props.message, reaction: emoji})
  hideActions()
}

function doReply() {
  emit('reply', props.message)
  hideActions()
}

function doForward() {
  emit('forward', props.message)
  hideActions()
}

function doDelete() {
  emit('delete', props.message)
  hideActions()
}

async function doCopy() {
  const text = props.message?.body || ''
  try {
    await navigator.clipboard.writeText(text)
    toast.add({severity: 'success', summary: t('chat.actions.copied'), life: 2000})
  } catch (e) {
    toast.add({severity: 'warn', summary: t('chat.actions.copyFailed'), life: 3000})
  }
  hideActions()
}

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

const CENTER_MESSAGE_TYPES = ['e2e_notification', 'notification_template']
const isCenterMessage = computed(() => {
  const type = props.message?._data?.type || props.message?.type
  return CENTER_MESSAGE_TYPES.includes(type)
})

const centerMessageKey = computed(() => {
  const type = props.message?._data?.type || props.message?.type
  const subtype = props.message?._data?.subtype || props.message?.subtype
  if (type === 'notification_template' && subtype === 'disappearing_mode_update') {
    return 'chat.message.disappearing-mode-update'
  }
  return 'chat.message.e2e-notification'
})

const messageAlignClass = computed(() => {
  if (isCenterMessage.value) return 'flex justify-content-center'
  if (props.message?.fromMe) return 'flex justify-content-end'
  return ''
})

function view() {
  showDetails.value = !showDetails.value
}

//
// Media preview
//
const store = useServerStore()

const mediaBlobUrl = ref(null)
const mediaThumbnailUrl = ref(null)
const mediaLoading = ref(false)
const mediaFailed = ref(false)
const mediaMimetype = ref(null)
const mediaFilename = ref(null)

const mediaType = computed(() => {
  const mime = mediaMimetype.value || ''
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'other'
})

const isFile = computed(() => !!(mediaFilename.value || props.message?.media?.filename))

function initThumbnail() {
  if (!props.message?.hasMedia) return
  // WEBJS: _data.body is always a JPEG thumbnail for image/video types.
  const dataBody = props.message._data?.body
  const dataMime = props.message._data?.mimetype
  const dataType = props.message._data?.type
  if (dataBody && (dataType === 'image' || dataType === 'video')) {
    mediaMimetype.value = dataMime || (dataType === 'image' ? 'image/jpeg' : 'video/mp4')
    mediaThumbnailUrl.value = `data:image/jpeg;base64,${dataBody}`
    return
  }
  // GOWS: _data.Message (capital M), JPEGThumbnail (all caps)
  // NOWEB: _data.message (lowercase m), jpegThumbnail (camelCase)
  const rawMsg = props.message._data?.Message || props.message._data?.message
  if (!rawMsg) return
  const imgMsg = rawMsg.imageMessage
  const vidMsg = rawMsg.videoMessage
  const docMsg = rawMsg.documentMessage
  const audMsg = rawMsg.audioMessage
  if (imgMsg) {
    mediaMimetype.value = imgMsg.mimetype || 'image/jpeg'
    const thumb = imgMsg.JPEGThumbnail || imgMsg.jpegThumbnail
    if (thumb) mediaThumbnailUrl.value = `data:image/jpeg;base64,${thumb}`
  } else if (vidMsg) {
    mediaMimetype.value = vidMsg.mimetype || 'video/mp4'
    const thumb = vidMsg.JPEGThumbnail || vidMsg.jpegThumbnail
    if (thumb) mediaThumbnailUrl.value = `data:image/jpeg;base64,${thumb}`
  } else if (docMsg) {
    mediaMimetype.value = docMsg.mimetype || 'application/octet-stream'
    if (docMsg.fileName) mediaFilename.value = docMsg.fileName
    const thumb = docMsg.JPEGThumbnail || docMsg.jpegThumbnail
    if (thumb) mediaThumbnailUrl.value = `data:image/jpeg;base64,${thumb}`
  } else if (audMsg) {
    mediaMimetype.value = audMsg.mimetype || 'audio/ogg'
  }
}

async function downloadMedia() {
  if (!props.message?.hasMedia || !props.serverId || !props.sessionName) return
  if (mediaBlobUrl.value || mediaLoading.value) return

  const chatId = props.message.id.split('_')[1] ?? 'all'

  mediaLoading.value = true
  mediaFailed.value = false
  try {
    const fullMessage = await store.getChatMessage(
        props.serverId,
        props.sessionName,
        props.message.id,
        chatId,
    )
    // Merge full message data back so the JSON viewer shows media fields
    Object.assign(props.message, fullMessage)

    const rawUrl = fullMessage?.media?.url
    const mime = fullMessage?.media?.mimetype
    const filename = fullMessage?.media?.filename
    if (!rawUrl) {
      mediaFailed.value = true
      return
    }
    mediaMimetype.value = mime || ''
    if (filename) mediaFilename.value = filename

    const connection = store.getServer(props.serverId)?.connection
    const url = resolveMediaUrl(rawUrl, connection?.url)
    const headers = {}
    if (connection?.key) {
      headers['X-Api-Key'] = connection.key
    }
    const response = await fetch(url, {headers: headers})
    if (!response.ok) {
      mediaFailed.value = true
      return
    }
    const blob = await response.blob()
    mediaBlobUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    mediaFailed.value = true
  } finally {
    mediaLoading.value = false
  }
}

function saveMedia() {
  const url = mediaBlobUrl.value
  if (!url) return
  let name = mediaFilename.value
  if (!name) {
    const ext = (mediaMimetype.value || '').split('/')[1]?.split(';')[0] || 'bin'
    name = `${props.message.id}.${ext}`
  }
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

onMounted(() => {
  initThumbnail()
})

onUnmounted(() => {
  if (mediaBlobUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(mediaBlobUrl.value)
  }
})
</script>


<template>
  <div :class="messageAlignClass">
    <div class="wa-msg" :class="{ 'wa-msg--me': message.fromMe, 'wa-msg--wide': showDetails }">
      <button
          v-if="!isCenterMessage"
          class="wa-msg__arrow"
          :aria-label="t('chat.actions.menu')"
          @click.stop="toggleActions"
      >
        <i class="pi pi-chevron-down"></i>
      </button>
      <Chip
        :class="message.fromMe ? 'wa-bubble wa-bubble--me' : 'wa-bubble'"
        class="py-1 px-3">
      <div>
        <!-- From -->
        <div v-if="!message.fromMe && message.participant">
          <div class="p-text-secondary my-1" style="font-size: 0.9rem">{{ message.participant }}</div>
        </div>

        <!-- Body -->
        <div class="wa-body">
            <!-- Center system message body -->
            <template v-if="isCenterMessage">
              <span class="p-text-secondary" style="font-size: 0.85rem">{{ t(centerMessageKey) }}</span>
            </template>
            <!-- Not Supported Message -->
            <template v-else-if="!message.body && !message.hasMedia">
              <InlineMessage severity="warn" class="mt-2">
                <p v-html="t('chat.message.not-supported')"></p>
              </InlineMessage>
            </template>
            <!-- Media Message -->
            <template v-if="message.hasMedia">
              <!-- 1. Open on phone sign -->
              <div class="flex justify-content-center mt-1 mb-1">
                <InlineMessage severity="info">
                  <template #icon>
                    <i class="pi pi-mobile mr-2"></i>
                  </template>
                  <p v-html="t('chat.message.media')"></p>
                </InlineMessage>
              </div>
              <!-- 2. Media preview -->
              <!-- Loading skeleton (only when no thumbnail available yet) -->
              <div v-if="mediaLoading && !mediaThumbnailUrl" class="my-2 flex justify-content-center">
                <Skeleton width="120px" height="80px" border-radius="6px"/>
              </div>
              <!-- Thumbnail or full blob -->
              <div v-else-if="mediaBlobUrl || mediaThumbnailUrl" class="my-2 flex flex-column align-items-center gap-1">
                <!-- Image: overlay download button on top of preview -->
                <div v-if="mediaType === 'image' && !isFile" class="media-overlay-wrapper">
                  <img
                      :src="mediaBlobUrl || mediaThumbnailUrl"
                      class="media-preview-image"
                      alt="media"
                  />
                  <div v-if="!mediaBlobUrl" class="media-overlay" @click="downloadMedia">
                    <Button
                        icon="pi pi-download"
                        rounded
                        :loading="mediaLoading"
                        :aria-label="t('chat.message.download')"
                    />
                  </div>
                </div>
                <!-- Video: overlay download button on poster -->
                <div v-else-if="mediaType === 'video' && !isFile" class="media-overlay-wrapper">
                  <video
                      :src="mediaBlobUrl || undefined"
                      :poster="mediaThumbnailUrl || undefined"
                      :controls="!!mediaBlobUrl"
                      class="media-preview-video"
                  />
                  <div v-if="!mediaBlobUrl" class="media-overlay" @click="downloadMedia">
                    <Button
                        icon="pi pi-download"
                        rounded
                        :loading="mediaLoading"
                        :aria-label="t('chat.message.download')"
                    />
                  </div>
                </div>
                <!-- Audio: no thumbnail, just controls -->
                <audio
                    v-else-if="mediaType === 'audio' && !isFile"
                    :src="mediaBlobUrl"
                    controls
                    class="media-preview-audio"
                />
                <!-- File / unknown type -->
                <div v-else class="flex flex-column align-items-center gap-1 p-2">
                  <div class="flex align-items-center gap-2">
                    <i class="pi pi-file" style="font-size: 2rem"></i>
                    <span v-if="mediaFilename" class="p-text-secondary" style="word-break: break-all">{{ mediaFilename }}</span>
                  </div>
                  <Button
                      v-if="!mediaBlobUrl"
                      icon="pi pi-download"
                      size="small"
                      outlined
                      :loading="mediaLoading"
                      :label="t('chat.message.download')"
                      @click="downloadMedia"
                  />
                </div>
              </div>
              <!-- No thumbnail yet: show download button placeholder -->
              <div v-else class="my-2 flex justify-content-center">
                <Button
                    icon="pi pi-download"
                    size="small"
                    outlined
                    :loading="mediaLoading"
                    :label="t('chat.message.download')"
                    @click="downloadMedia"
                />
              </div>
              <!-- 3. Caption -->
              <p v-if="message.body" v-html="message.body.replace(/\n/g, '<br>')"></p>
              <!-- 4. Save button -->
              <div v-if="mediaBlobUrl" class="flex justify-content-center mt-1">
                <Button
                    icon="pi pi-save"
                    size="small"
                    text
                    :label="t('chat.message.save')"
                    @click="saveMedia"
                />
              </div>
            </template>
            <!-- Plain text (no media) -->
            <template v-else-if="message.body">
              <p v-html="message.body.replace(/\n/g, '<br>')"></p>
            </template>
        </div>

        <!-- Meta row: time + ack + details -->
        <div class="wa-meta">
          <span class="wa-meta__time">{{ date }}</span>
          <MessageAck v-if="message.fromMe" :ack="message.ack" class="wa-meta__ack"/>
          <a href="#" class="wa-meta__code" @click.prevent="view">
            <i class="pi pi-code"></i>
          </a>
        </div>

        <!-- Details -->
        <div v-if="showDetails" class="my-2">
          <hr/>
          <JsonDataViewer :data="message"></JsonDataViewer>
        </div>
      </div>
    </Chip>

      <OverlayPanel ref="actionPanel" :pt="{ content: { style: 'padding:0.4rem' } }">
        <div class="wa-msg-actions">
          <div class="wa-msg-react">
            <button
                v-for="e in quickReactions"
                :key="e"
                class="wa-msg-react__btn"
                @click="react(e)"
            >{{ e }}</button>
          </div>
          <button class="wa-msg-act" @click="doReply">
            <i class="pi pi-reply"></i> {{ t('chat.actions.reply') }}
          </button>
          <button v-if="message.body" class="wa-msg-act" @click="doCopy">
            <i class="pi pi-copy"></i> {{ t('chat.actions.copy') }}
          </button>
          <button class="wa-msg-act" @click="doForward">
            <i class="pi pi-share-alt"></i> {{ t('chat.actions.forward') }}
          </button>
          <button class="wa-msg-act wa-msg-act--danger" @click="doDelete">
            <i class="pi pi-trash"></i> {{ t('chat.actions.delete') }}
          </button>
        </div>
      </OverlayPanel>
    </div>
  </div>

</template>


<style scoped lang="scss">
.wa-msg {
  position: relative;
  display: block;
  width: fit-content;
  max-width: 85%;
}

.wa-msg--me {
  margin-left: auto;
}

.wa-msg--wide {
  max-width: 100%;
  width: 100%;
}

.wa-msg__arrow {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 2;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(11, 20, 26, 0.06);
  color: #54656f;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.12s, transform 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.wa-msg__arrow:hover {
  background: rgba(11, 20, 26, 0.14);
}

.wa-msg:hover .wa-msg__arrow {
  opacity: 1;
  transform: scale(1);
}

.wa-msg-actions {
  display: flex;
  flex-direction: column;
  min-width: 180px;
}

.wa-msg-react {
  display: flex;
  gap: 0.15rem;
  padding: 0.15rem 0.25rem 0.4rem;
  border-bottom: 1px solid var(--surface-border);
  margin-bottom: 0.25rem;
}

.wa-msg-react__btn {
  border: none;
  background: transparent;
  font-size: 1.25rem;
  cursor: pointer;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  transition: transform 0.1s, background 0.1s;
}

.wa-msg-react__btn:hover {
  transform: scale(1.25);
  background: var(--surface-hover);
}

.wa-msg-act {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: none;
  background: transparent;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  color: var(--text-color);

  i {
    color: var(--text-color-secondary);
    width: 1rem;
  }
}

.wa-msg-act:hover {
  background: var(--surface-hover);
}

.wa-msg-act--danger {
  color: #e11d48;

  i {
    color: #e11d48;
  }
}

.wa-bubble :deep(.p-chip),
.wa-bubble.p-chip {
  display: block;
  width: auto;
  min-width: 3.5rem;
  background: #ffffff;
  color: #111b21;
  border-radius: 10px;
  box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13);
}

.wa-body {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wa-body :deep(p) {
  margin: 0;
  white-space: pre-wrap;
}

.wa-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  margin-top: 2px;
}

.wa-meta__time {
  font-size: 0.68rem;
  color: #667781;
}

.wa-meta__ack {
  display: inline-flex;
}

.wa-meta__code {
  color: #8696a0;
  font-size: 0.7rem;
  line-height: 1;
  opacity: 0.6;
}

.wa-bubble--me :deep(.p-chip),
.wa-bubble--me.p-chip {
  background: #d9fdd3;
  color: #111b21;
}

/* Force readable text on the light bubbles regardless of theme */
.wa-bubble :deep(.p-chip-text),
.wa-bubble :deep(p),
.wa-bubble :deep(b),
.wa-bubble :deep(span) {
  color: #111b21;
}

.wa-bubble :deep(.p-text-secondary) {
  color: #667781 !important;
}

.wa-bubble :deep(a) {
  color: #027eb5;
}

.chip-70 {
  max-width: 70%;
}

.chip-100 {
  max-width: 100%;
}

.media-overlay-wrapper {
  position: relative;
  width: 240px;
  line-height: 0;
}

.media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  cursor: pointer;
  box-sizing: border-box;
}

.media-preview-image {
  width: 240px;
  height: auto;
  display: block;
  margin: 0;
  border-radius: 6px;
}

.media-preview-video {
  width: 240px;
  height: auto;
  display: block;
  margin: 0;
  border-radius: 6px;
}

.media-preview-audio {
  max-width: 100%;
  display: block;
}
</style>
